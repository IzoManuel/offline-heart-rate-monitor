import React, { useState, useEffect, useRef, useMemo } from 'react';
import ConnectionButton from './ConnectionButton';
import HRDisplay from './HRDisplay';
import Stats from './Stats';
import HRVAnalysis from './HRVAnalysis';
import RespiratoryAnalysis from './RespiratoryAnalysis';
import {
  connectToHeartRateMonitor,
  startHeartRateNotifications,
  stopHeartRateNotifications,
  disconnectDevice,
  readBatteryLevel,
  readDeviceInformation,
  readBodySensorLocation
} from '../utils/bluetooth';
import debugRecorder from '../utils/debugBluetooth';
import {
  ANALYSIS_REFRESH_INTERVAL,
  ANALYSIS_WINDOW_DURATION,
  analyzeRollingWindow,
  isRollingWindowReady,
  pruneRollingReadings,
  timestampReading
} from '../utils/rollingAnalysis';
import { calculateHeartRateStats, updateExtrema } from '../utils/sessionExtrema';

function HRMonitor() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentHR, setCurrentHR] = useState(0);
  const [heartRateReadings, setHeartRateReadings] = useState([]);
  const [deviceName, setDeviceName] = useState('');
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState({});
  const [sensorLocation, setSensorLocation] = useState(null);
  const [error, setError] = useState('');
  const [server, setServer] = useState(null);
  const [characteristic, setCharacteristic] = useState(null);
  const isPlaybackMode = useRef(false);

  // Rolling HRV and breathing-rate analysis state
  const [analysisStartedAt, setAnalysisStartedAt] = useState(null);
  const [hrvClock, setHRVClock] = useState(Date.now());
  const [hrvReadings, setHRVReadings] = useState([]);
  const [hrvResults, setHRVResults] = useState(null);
  const [rmssdExtrema, setRMSSDExtrema] = useState(null);
  const [brpmExtrema, setBRPMExtrema] = useState(null);
  const hrvReadingsRef = useRef([]);
  const lastAnalysisAtRef = useRef(null);

  const collectRRReading = (data) => {
    if (!data.rrIntervals?.length) return;

    const now = Date.now();
    setHRVReadings(previous => {
      const retained = pruneRollingReadings(
        [...previous, timestampReading(data, now)],
        now
      );
      hrvReadingsRef.current = retained;
      return retained;
    });
  };

  const stats = useMemo(
    () => calculateHeartRateStats(heartRateReadings),
    [heartRateReadings]
  );

  // Register playback callbacks with debug system
  useEffect(() => {
    // Register UI integration callbacks with hrDebug
    debugRecorder.registerUICallbacks({
      onStart: async (sessionData) => {
        // Set up playback mode
        isPlaybackMode.current = true;
        setDeviceName(sessionData.deviceName + ' (Playback)');
        setIsConnected(true);
        setCurrentHR(0);
        setHeartRateReadings([]);
        setHRVReadings([]);
        setError('');
      },
      onReading: (data) => {
        // Playback reading callback
        setCurrentHR(data.heartRate);
        setHeartRateReadings(previous => [
          ...previous,
          { value: data.heartRate, receivedAt: Date.now() }
        ]);

        collectRRReading(data);
      },
      onComplete: () => {
        // Playback end callback
        console.log('📊 Playback completed');
        setDeviceName(prev => prev + ' - Completed');
      },
      onStop: () => {
        handleDisconnect();
      },
      onError: (error) => {
        setError('Failed to load recording: ' + error.message);
        console.error('Playback error:', error);
      }
    });

    return () => {
      debugRecorder.unregisterUICallbacks();
    };
  }, []);

  // Handle disconnection events
  useEffect(() => {
    if (!server) return;

    const handleDisconnect = () => {
      setIsConnected(false);
      setCurrentHR(0);
      setDeviceName('');
      setError('Device disconnected');
    };

    server.device.addEventListener('gattserverdisconnected', handleDisconnect);

    return () => {
      server.device.removeEventListener('gattserverdisconnected', handleDisconnect);
    };
  }, [server]);

  // Periodic battery level polling (every 60 seconds)
  useEffect(() => {
    if (!server || !isConnected || isPlaybackMode.current) return;

    const pollBattery = async () => {
      const battery = await readBatteryLevel(server);
      if (battery !== null) {
        setBatteryLevel(battery);
      }
    };

    // Poll immediately, then every 60 seconds
    pollBattery();
    const interval = setInterval(pollBattery, 60000);

    return () => clearInterval(interval);
  }, [server, isConnected]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError('');

    try {
      // Connect to device
      const gattServer = await connectToHeartRateMonitor();
      setServer(gattServer);
      const deviceNameStr = gattServer.device.name || 'Unknown Device';
      setDeviceName(deviceNameStr);

      // Set connected device for debug recorder
      debugRecorder.setConnectedDevice(deviceNameStr);

      // Read initial battery level
      const battery = await readBatteryLevel(gattServer);
      setBatteryLevel(battery);

      // Read device information and sensor location
      const devInfo = await readDeviceInformation(gattServer);
      setDeviceInfo(devInfo);

      const location = await readBodySensorLocation(gattServer);
      setSensorLocation(location);

      // Start receiving heart rate data
      const char = await startHeartRateNotifications(gattServer, (data) => {
        // Record data for debugging (only if recording is active)
        debugRecorder.recordReading(data);

        setCurrentHR(data.heartRate);
        setHeartRateReadings(previous => [
          ...previous,
          { value: data.heartRate, receivedAt: Date.now() }
        ]);

        collectRRReading(data);
      });

      setCharacteristic(char);
      setIsConnected(true);
    } catch (err) {
      setError(err.message || 'Failed to connect to heart rate monitor');
      console.error('Connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Stop debug recording if active
      if (debugRecorder.getStatus().isRecording) {
        debugRecorder.stopRecording();
      }

      // Stop playback if active
      if (isPlaybackMode.current) {
        debugRecorder.stopPlayback();
        isPlaybackMode.current = false;
      } else {
        // Only disconnect real device if not in playback mode
        if (characteristic) {
          await stopHeartRateNotifications(characteristic);
        }
        if (server) {
          disconnectDevice(server);
        }
      }

      setIsConnected(false);
      setCurrentHR(0);
      setDeviceName('');
      setBatteryLevel(null);
      setDeviceInfo({});
      setSensorLocation(null);
      setServer(null);
      setCharacteristic(null);

      // Clear connected device from debug recorder
      debugRecorder.setConnectedDevice('');
    } catch (err) {
      setError('Error disconnecting: ' + err.message);
    }
  };

  // Start a fresh rolling analysis session whenever a device connects.
  useEffect(() => {
    if (!isConnected) {
      setAnalysisStartedAt(null);
      setHRVReadings([]);
      hrvReadingsRef.current = [];
      lastAnalysisAtRef.current = null;
      return;
    }

    const startedAt = Date.now();
    setAnalysisStartedAt(startedAt);
    setHRVClock(startedAt);
    setHRVReadings([]);
    hrvReadingsRef.current = [];
    setHRVResults(null);
    setRMSSDExtrema(null);
    setBRPMExtrema(null);
    lastAnalysisAtRef.current = startedAt;
  }, [isConnected]);

  // Recompute one bounded two-minute rolling window every five seconds.
  useEffect(() => {
    if (!isConnected || analysisStartedAt === null) return;

    const timer = setInterval(() => {
      const now = Date.now();
      setHRVClock(now);

      if (!isRollingWindowReady(analysisStartedAt, now)) return;
      if (now - lastAnalysisAtRef.current < ANALYSIS_REFRESH_INTERVAL) return;

      const retained = pruneRollingReadings(hrvReadingsRef.current, now);
      hrvReadingsRef.current = retained;
      setHRVReadings(retained);
      const results = analyzeRollingWindow(retained, now);
      setHRVResults(results);
      if (!results.error) {
        setRMSSDExtrema(previous => updateExtrema(previous, results.rmssd, now));
      }
      if (results.respiration.available) {
        setBRPMExtrema(previous => updateExtrema(
          previous,
          results.respiration.breathsPerMinute,
          now
        ));
      }
      lastAnalysisAtRef.current = now;
    }, 1000);

    return () => clearInterval(timer);
  }, [isConnected, analysisStartedAt]);

  const analysisState = useMemo(() => {
    if (!isConnected || analysisStartedAt === null) {
      return { isRunning: false, duration: 0, elapsed: 0, rrCount: 0, nextRefreshIn: 0 };
    }

    const elapsed = Math.min(hrvClock - analysisStartedAt, ANALYSIS_WINDOW_DURATION);
    const rrCount = hrvReadings.flatMap(r => r.rrIntervals || []).length;
    const sinceLastAnalysis = hrvClock - (lastAnalysisAtRef.current ?? analysisStartedAt);

    return {
      isRunning: true,
      duration: ANALYSIS_WINDOW_DURATION,
      elapsed,
      rrCount,
      nextRefreshIn: Math.max(0, ANALYSIS_REFRESH_INTERVAL - sinceLastAnalysis)
    };
  }, [isConnected, analysisStartedAt, hrvClock, hrvReadings]);

  return (
    <div className="hr-monitor">
      <header className="header">
        <h1>Web HR Monitor</h1>
      </header>

      <main className="main-content">
        <ConnectionButton
          isConnected={isConnected}
          isConnecting={isConnecting}
          deviceName={deviceName}
          batteryLevel={batteryLevel}
          deviceInfo={deviceInfo}
          sensorLocation={sensorLocation}
          currentHR={currentHR}
          analysisResults={hrvResults}
          heartRateStats={stats}
          rmssdExtrema={rmssdExtrema}
          brpmExtrema={brpmExtrema}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {isConnected && (
          <>
            <HRDisplay currentHR={currentHR} />
            <Stats stats={stats} readingsCount={heartRateReadings.length} />
            <HRVAnalysis
              isConnected={isConnected}
              analysisState={analysisState}
              results={hrvResults}
              rmssdExtrema={rmssdExtrema}
            />
            <RespiratoryAnalysis
              results={hrvResults}
              rrCount={analysisState.rrCount}
              brpmExtrema={brpmExtrema}
            />
          </>
        )}

        {!isConnected && !error && (
          <div className="info-message">
            <p>Make sure your heart rate monitor is turned on and in pairing mode</p>
            <p>This app requires a browser with Web Bluetooth support (Chrome or Edge)</p>
            <p>Linux users: Enable Web Bluetooth at <code>chrome://flags#enable-experimental-web-platform-features</code></p>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>© 2025. Licensed under MIT.</p>
      </footer>
    </div>
  );
}

export default HRMonitor;
