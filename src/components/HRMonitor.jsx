import React, { useState, useEffect, useRef, useMemo } from 'react';
import ConnectionButton from './ConnectionButton';
import HRDisplay from './HRDisplay';
import Stats from './Stats';
import HRVAnalysis from './HRVAnalysis';
import RespiratoryAnalysis from './RespiratoryAnalysis';
import DDFAAnalysis from './DDFAAnalysis';
import TrendGraph from './TrendGraph';
import ScreenReaderControls from './ScreenReaderControls';
import AverageScopeControls from './AverageScopeControls';
import WebAlarmControls from './WebAlarmControls';
import DashboardTabs from './DashboardTabs';
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
import {
  clearSessionSnapshot,
  createSessionSnapshot,
  loadSessionSnapshot,
  saveSessionSnapshot
} from '../utils/sessionStorage';
import {
  CHART_POINT_LIMIT,
  boundChartPoints,
  clearChartPoints,
  compactChartPoints,
  loadChartPoints,
  saveChartPoint
} from '../utils/chartStorage';

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
  const [sessionStartedAt, setSessionStartedAt] = useState(null);
  const [savedSession, setSavedSession] = useState(() => loadSessionSnapshot());
  const isPlaybackMode = useRef(false);

  // Rolling HRV and breathing-rate analysis state
  const [analysisStartedAt, setAnalysisStartedAt] = useState(null);
  const [hrvClock, setHRVClock] = useState(Date.now());
  const [hrvReadings, setHRVReadings] = useState([]);
  const [hrvResults, setHRVResults] = useState(null);
  const [rmssdExtrema, setRMSSDExtrema] = useState(null);
  const [ddfaExtrema, setDDFAExtrema] = useState(null);
  const [sdnnExtrema, setSDNNExtrema] = useState(null);
  const [brpmExtrema, setBRPMExtrema] = useState(null);
  const [chartPoints, setChartPoints] = useState([]);
  const [averageScope, setAverageScope] = useState({ values: {}, label: 'Current Session' });
  const hrvReadingsRef = useRef([]);
  const lastAnalysisAtRef = useRef(null);
  const currentHRRef = useRef(0);
  const hrvResultsRef = useRef(null);

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
        setSessionStartedAt(Date.now());
        setHRVResults(null);
        setRMSSDExtrema(null);
        setDDFAExtrema(null);
        setSDNNExtrema(null);
        setBRPMExtrema(null);
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
      setCurrentHR(0);
      setHeartRateReadings([]);
      setSessionStartedAt(Date.now());
      setHRVResults(null);
      setRMSSDExtrema(null);
      setDDFAExtrema(null);
      setSDNNExtrema(null);
      setBRPMExtrema(null);
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
    setDDFAExtrema(null);
    setSDNNExtrema(null);
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
        if (results.ddfa?.available) {
          setDDFAExtrema(previous => updateExtrema(previous, results.ddfa.alpha10, now));
        }
        setRMSSDExtrema(previous => updateExtrema(previous, results.rmssd, now));
        setSDNNExtrema(previous => updateExtrema(previous, results.sdnn, now));
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

  useEffect(() => {
    currentHRRef.current = currentHR;
    hrvResultsRef.current = hrvResults;
  }, [currentHR, hrvResults]);

  useEffect(() => {
    if (!isConnected || !sessionStartedAt) return;

    const sample = () => {
      if (!currentHRRef.current) return;
      const results = hrvResultsRef.current;
      const point = {
        sessionStartedAt,
        timestamp: Date.now(),
        heartRate: currentHRRef.current,
        ddfaAlpha10: results?.ddfa?.available ? results.ddfa.alpha10 : null,
        rmssd: results && !results.error ? results.rmssd : null,
        sdnn: results && !results.error ? results.sdnn : null,
        brpm: results?.respiration?.available
          ? results.respiration.breathsPerMinute
          : null
      };
      setChartPoints(previous => previous.length >= CHART_POINT_LIMIT
        ? compactChartPoints([...previous, point])
        : boundChartPoints([...previous, point]));
      saveChartPoint(point);
    };

    const timer = setInterval(sample, ANALYSIS_REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [isConnected, sessionStartedAt]);

  useEffect(() => {
    if (isConnected || !savedSession) return;
    let active = true;
    loadChartPoints().then(points => {
      if (active) setChartPoints(points);
    });
    return () => { active = false; };
  }, [isConnected, Boolean(savedSession)]);

  useEffect(() => {
    if (!isConnected || !sessionStartedAt || heartRateReadings.length === 0) return;

    const snapshot = createSessionSnapshot({
      sessionStartedAt,
      currentHR,
      stats,
      readingsCount: heartRateReadings.length,
      analysisResults: hrvResults,
      ddfaExtrema,
      rmssdExtrema,
      sdnnExtrema,
      brpmExtrema
    });
    saveSessionSnapshot(snapshot);
    setSavedSession(snapshot);
  }, [
    isConnected,
    sessionStartedAt,
    currentHR,
    stats,
    heartRateReadings.length,
    hrvResults,
    ddfaExtrema,
    rmssdExtrema,
    sdnnExtrema,
    brpmExtrema
  ]);

  const handleClearSavedData = () => {
    clearSessionSnapshot();
    clearChartPoints();
    setSavedSession(null);
    setChartPoints([]);
  };

  const displayedCurrentHR = isConnected ? currentHR : savedSession?.currentHR ?? 0;
  const displayedStats = isConnected ? stats : savedSession?.stats;
  const displayedReadingsCount = isConnected
    ? heartRateReadings.length
    : savedSession?.readingsCount ?? 0;
  const displayedResults = isConnected ? hrvResults : savedSession?.analysisResults;
  const displayedRMSSDExtrema = isConnected ? rmssdExtrema : savedSession?.rmssdExtrema;
  const displayedDDFAExtrema = isConnected ? ddfaExtrema : savedSession?.ddfaExtrema;
  const displayedSDNNExtrema = isConnected ? sdnnExtrema : savedSession?.sdnnExtrema;
  const displayedBRPMExtrema = isConnected ? brpmExtrema : savedSession?.brpmExtrema;
  const hasDisplayedData = isConnected || Boolean(savedSession);
  const scopedAverage = key => averageScope.values[key];
  const screenReaderSnapshot = {
    ddfaAlpha10: displayedResults?.ddfa?.alpha10 ?? displayedResults?.ddfaAlpha10,
    rmssd: displayedResults?.rmssd,
    sdnn: displayedResults?.sdnn,
    heartRate: displayedCurrentHR,
    brpm: displayedResults?.respiration?.breathsPerMinute ?? displayedResults?.brpm
  };

  return (
    <div className="hr-monitor">
      <header className="header">
        <h1>Offline Heart Rate Monitor</h1>
      </header>

      <main className="main-content">
        <section className="dashboard-connection" aria-label="Connection">
          <ConnectionButton
          isConnected={isConnected}
          isConnecting={isConnecting}
          deviceName={deviceName}
          batteryLevel={batteryLevel}
          deviceInfo={deviceInfo}
          sensorLocation={sensorLocation}
          currentHR={displayedCurrentHR}
          analysisResults={displayedResults}
          heartRateStats={displayedStats}
          ddfaExtrema={displayedDDFAExtrema}
          rmssdExtrema={displayedRMSSDExtrema}
          sdnnExtrema={displayedSDNNExtrema}
          brpmExtrema={displayedBRPMExtrema}
          averageOverrides={averageScope.values}
          averageLabel={averageScope.label}
          savedSession={isConnected ? null : savedSession}
          onClearSavedData={handleClearSavedData}
          onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </section>

        {hasDisplayedData && (
          <>
            <DashboardTabs
              overview={(
                <section className="dashboard-workspace" aria-label="Current Metrics">
                  <section className="dashboard-metrics">
                <DDFAAnalysis results={displayedResults} extrema={displayedDDFAExtrema} averageOverride={scopedAverage('ddfaAlpha10')} />
                <HRVAnalysis
                  isConnected={isConnected}
                  analysisState={analysisState}
                  results={displayedResults}
                  rmssdExtrema={displayedRMSSDExtrema}
                  sdnnExtrema={displayedSDNNExtrema}
                  averageOverride={scopedAverage('rmssd')}
                  sdnnAverageOverride={scopedAverage('sdnn')}
                />
                <HRDisplay currentHR={displayedCurrentHR} />
                <Stats stats={{ ...displayedStats, average: Number.isFinite(scopedAverage('heartRate')) ? scopedAverage('heartRate').toFixed(1) : displayedStats?.average }} readingsCount={displayedReadingsCount} averageLabel={averageScope.label} />
                <RespiratoryAnalysis
                  results={displayedResults}
                  rrCount={isConnected ? analysisState.rrCount : 0}
                  brpmExtrema={displayedBRPMExtrema}
                  averageOverride={scopedAverage('brpm')}
                />
                  </section>
                </section>
              )}
              tools={(
                <aside className="dashboard-tools" aria-label="Controls">
                <AverageScopeControls points={chartPoints} sessionStartedAt={sessionStartedAt ?? savedSession?.sessionStartedAt} onChange={setAverageScope} />
                <ScreenReaderControls snapshot={screenReaderSnapshot} disabled={!hasDisplayedData} />
                <WebAlarmControls snapshot={screenReaderSnapshot} />
                </aside>
              )}
              trends={(
                <section className="dashboard-trends" aria-label="Trends">
                  <TrendGraph points={chartPoints} />
                </section>
              )}
            />
          </>
        )}

        {!isConnected && !error && !savedSession && (
          <div className="info-message">
            <p>Make sure your heart rate monitor is turned on and in pairing mode</p>
            <p>This app requires a browser with Web Bluetooth support (Chrome or Edge)</p>
            <p>Linux users: Enable Web Bluetooth at <code>chrome://flags#enable-experimental-web-platform-features</code></p>
          </div>
        )}
      </main>

      <aside className="about-app" aria-labelledby="about-app-heading">
        <h2 id="about-app-heading">Private Offline DDFA And HRV Monitoring</h2>
        <p>Install this free progressive web app on a compatible Android phone to monitor a Bluetooth Low Energy heart-rate strap after the application shell has been cached. Measurements and retained history stay in this browser unless you export a CSV file.</p>
        <details>
          <summary>How The Metrics Work</summary>
          <p>DDFA α10 is a unitless, ten-beat-scale DDFA-2 correlation exponent. RMSSD and SDNN are HRV measurements in milliseconds. Heart Rate is shown in BPM, while BRPM is an RR-derived breathing-rate estimate rather than a direct respiratory sensor measurement.</p>
          <p>The rolling two-minute analysis refreshes every five seconds. Results are wellness information, not a medical measurement, diagnosis, or exercise-threshold determination.</p>
        </details>
      </aside>

      <footer className="footer">
        <p>© 2025. Licensed under MIT.</p>
      </footer>
    </div>
  );
}

export default HRMonitor;
