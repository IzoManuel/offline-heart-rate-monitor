import React, { useState, useEffect, useRef, useMemo } from 'react';
import ConnectionButton from './ConnectionButton';
import HRDisplay from './HRDisplay';
import Stats from './Stats';
import HRVAnalysis from './HRVAnalysis';
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
import { completeHRVCycle, HRV_CYCLE_DURATION } from '../utils/hrvCycle';

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

  // HRV test state
  const [hrvTestStart, setHRVTestStart] = useState(null);
  const [hrvClock, setHRVClock] = useState(Date.now());
  const [hrvCycleNumber, setHRVCycleNumber] = useState(1);
  const [hrvReadings, setHRVReadings] = useState([]);
  const [hrvResults, setHRVResults] = useState(null);
  const hrvReadingsRef = useRef([]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (heartRateReadings.length === 0) {
      return { average: 0, max: 0, min: 0 };
    }

    const validReadings = heartRateReadings.filter(hr => hr > 0);
    if (validReadings.length === 0) {
      return { average: 0, max: 0, min: 0 };
    }

    const sum = validReadings.reduce((acc, hr) => acc + hr, 0);
    const average = Math.round(sum / validReadings.length);
    const max = Math.max(...validReadings);
    const min = Math.min(...validReadings);

    return { average, max, min };
  }, [heartRateReadings]);

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
        setHeartRateReadings(prev => [...prev, data.heartRate]);

        // Collect RR intervals for the current automatic HRV cycle.
        if (data.rrIntervals && data.rrIntervals.length > 0) {
          setHRVReadings(prev => {
            const newReadings = [...prev, data];
            hrvReadingsRef.current = newReadings; // Keep ref in sync
            return newReadings;
          });
        }
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
        setHeartRateReadings(prev => [...prev, data.heartRate]);

        // Collect RR intervals for the current automatic HRV cycle.
        if (data.rrIntervals && data.rrIntervals.length > 0) {
          setHRVReadings(prev => {
            const newReadings = [...prev, data];
            hrvReadingsRef.current = newReadings; // Keep ref in sync
            return newReadings;
          });
        }
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

  // Start a fresh automatic HRV session whenever a device connects.
  useEffect(() => {
    if (!isConnected) {
      setHRVTestStart(null);
      setHRVReadings([]);
      hrvReadingsRef.current = [];
      return;
    }

    const startedAt = Date.now();
    setHRVTestStart(startedAt);
    setHRVClock(startedAt);
    setHRVCycleNumber(1);
    setHRVReadings([]);
    hrvReadingsRef.current = [];
    setHRVResults(null);
  }, [isConnected]);

  // Complete the current window every two minutes and immediately start another.
  useEffect(() => {
    if (!isConnected || hrvTestStart === null) return;

    const timer = setInterval(() => {
      const now = Date.now();
      setHRVClock(now);

      if (now - hrvTestStart < HRV_CYCLE_DURATION) return;

      const transition = completeHRVCycle(hrvReadingsRef.current, hrvCycleNumber, now);
      setHRVResults(transition.results);

      // Reset only the active collection window; the published results stay visible.
      setHRVReadings([]);
      hrvReadingsRef.current = [];
      setHRVCycleNumber(transition.nextCycle.cycleNumber);
      setHRVTestStart(transition.nextCycle.startedAt);
    }, 1000);

    return () => clearInterval(timer);
  }, [isConnected, hrvTestStart, hrvCycleNumber]);

  // Calculate HRV test state for component
  const hrvTestState = useMemo(() => {
    if (!isConnected || hrvTestStart === null) {
      return { isRunning: false, duration: 0, elapsed: 0, rrCount: 0 };
    }

    const elapsed = Math.min(hrvClock - hrvTestStart, HRV_CYCLE_DURATION);
    const rrCount = hrvReadings.flatMap(r => r.rrIntervals || []).length;

    return {
      isRunning: true,
      duration: HRV_CYCLE_DURATION,
      elapsed,
      rrCount,
      cycleNumber: hrvCycleNumber
    };
  }, [isConnected, hrvTestStart, hrvClock, hrvReadings, hrvCycleNumber]);

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
              testState={hrvTestState}
              results={hrvResults}
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
