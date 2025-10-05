import React from 'react';

function ConnectionButton({ isConnected, isConnecting, deviceName, onConnect, onDisconnect }) {
  return (
    <div className="connection-section">
      {!isConnected ? (
        <button
          className="connect-button"
          onClick={onConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <span className="spinner"></span>
              Connecting...
            </>
          ) : (
            <>
              <span className="icon">🔗</span>
              Connect to HR Monitor
            </>
          )}
        </button>
      ) : (
        <div className="connected-info">
          <div className="device-info">
            <span className="status-dot connected"></span>
            <span className="device-name">{deviceName}</span>
          </div>
          <button className="disconnect-button" onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export default ConnectionButton;
