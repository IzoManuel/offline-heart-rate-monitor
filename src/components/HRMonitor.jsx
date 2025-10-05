import React, { useState, useEffect } from 'react';
import ConnectionButton from './ConnectionButton';
import HRDisplay from './HRDisplay';
import Stats from './Stats';
import {
  connectToHeartRateMonitor,
  startHeartRateNotifications,
  stopHeartRateNotifications,
  disconnectDevice
} from '../utils/bluetooth';

function HRMonitor() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentHR, setCurrentHR] = useState(0);
  const [heartRateReadings, setHeartRateReadings] = useState([]);
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState('');
  const [server, setServer] = useState(null);
  const [characteristic, setCharacteristic] = useState(null);

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

  const handleConnect = async () => {
    setIsConnecting(true);
    setError('');

    try {
      // Connect to device
      const gattServer = await connectToHeartRateMonitor();
      setServer(gattServer);
      setDeviceName(gattServer.device.name || 'Unknown Device');

      // Start receiving heart rate data
      const char = await startHeartRateNotifications(gattServer, (data) => {
        setCurrentHR(data.heartRate);
        setHeartRateReadings(prev => [...prev, data.heartRate]);
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
      if (characteristic) {
        await stopHeartRateNotifications(characteristic);
      }
      if (server) {
        disconnectDevice(server);
      }
      setIsConnected(false);
      setCurrentHR(0);
      setDeviceName('');
      setServer(null);
      setCharacteristic(null);
    } catch (err) {
      setError('Error disconnecting: ' + err.message);
    }
  };

  return (
    <div className="hr-monitor">
      <header className="header">
        <h1>❤️ Heart Rate Monitor</h1>
        <p className="subtitle">Connect to your BLE heart rate sensor</p>
      </header>

      <main className="main-content">
        <ConnectionButton
          isConnected={isConnected}
          isConnecting={isConnecting}
          deviceName={deviceName}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {isConnected && (
          <>
            <HRDisplay currentHR={currentHR} />
            <Stats stats={stats} readingsCount={heartRateReadings.length} />
          </>
        )}

        {!isConnected && !error && (
          <div className="info-message">
            <p>📱 Make sure your heart rate monitor is turned on and in pairing mode</p>
            <p>🔒 This app requires a browser with Web Bluetooth support (Chrome or Edge)</p>
            <p>🐧 Linux users: Enable Web Bluetooth at <code>chrome://flags#enable-experimental-web-platform-features</code></p>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Powered by Web Bluetooth API</p>
      </footer>
    </div>
  );
}

export default HRMonitor;
