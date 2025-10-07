import React from 'react';

function ConnectionButton({ isConnected, isConnecting, deviceName, onConnect, onDisconnect }) {
  return (
    <>
      {!isConnected ? (
        <button
          className="btn-primary"
          onClick={onConnect}
          disabled={isConnecting}
          style={{ width: '100%' }}
        >
          {isConnecting ? 'Connecting...' : 'Connect to HR Monitor'}
        </button>
      ) : (
        <div className="connection-status">
          <div className="device-info">
            <span className="status-indicator connected"></span>
            <span className="device-name">{deviceName}</span>
          </div>
          <button className="btn-danger" onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      )}
    </>
  );
}

export default ConnectionButton;
