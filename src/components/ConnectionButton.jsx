import React, { useState } from 'react';
import MetricSummary from './MetricSummary';
import { formatOccurrenceTime } from '../utils/timeFormatting';

function ConnectionButton({
  isConnected,
  isConnecting,
  deviceName,
  batteryLevel,
  deviceInfo,
  sensorLocation,
  currentHR,
  analysisResults,
  heartRateStats,
  ddfaExtrema,
  rmssdExtrema,
  sdnnExtrema,
  brpmExtrema,
  savedSession,
  onClearSavedData,
  onConnect,
  onDisconnect
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClearSavedData = () => {
    const confirmed = window.confirm(
      'Clear the saved session? This removes the latest saved measurements and cannot be undone.'
    );

    if (confirmed) onClearSavedData();
  };

  const toggle = (
    <button
      className="connection-summary-toggle"
      onClick={() => setIsExpanded(!isExpanded)}
      aria-expanded={isExpanded}
      aria-controls="connection-summary"
    >
      <span>{isExpanded ? 'Hide Summary' : 'Show Summary'}</span>
      <span aria-hidden="true">{isExpanded ? '▲' : '▼'}</span>
    </button>
  );

  const summary = (
    <MetricSummary
      currentHR={currentHR}
      analysisResults={analysisResults}
      heartRateStats={heartRateStats}
      ddfaExtrema={ddfaExtrema}
      rmssdExtrema={rmssdExtrema}
      sdnnExtrema={sdnnExtrema}
      brpmExtrema={brpmExtrema}
      deviceInfo={deviceInfo}
      sensorLocation={sensorLocation}
      includeDeviceDetails={isConnected}
    />
  );

  if (!isConnected) {
    return (
      <div className="disconnected-stack">
        <button
          className="btn-primary"
          onClick={onConnect}
          disabled={isConnecting}
          style={{ width: '100%' }}
        >
          {isConnecting ? 'Connecting...' : 'Connect to HR Monitor'}
        </button>

        {savedSession && (
          <section className="connection-status saved-session-status" aria-label="Saved Session">
            <div className="saved-session-header">
              <div>
                <strong>Saved Session</strong>
                <span>Saved {formatOccurrenceTime(savedSession.savedAt)}</span>
              </div>
              <button className="btn-clear-saved" onClick={handleClearSavedData}>Clear Saved Data</button>
            </div>
            {toggle}
            {isExpanded && <div className="device-info-extended" id="connection-summary">{summary}</div>}
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="connection-status">
      <div className="connection-header">
        <div className="device-info">
          <span className="status-indicator connected"></span>
          <span className="device-name">{deviceName}</span>
          {batteryLevel !== null && (
            <span className="battery-level"><span className="battery-icon">🔋</span>{batteryLevel}%</span>
          )}
        </div>
        <button className="btn-danger" onClick={onDisconnect}>Disconnect</button>
      </div>
      {toggle}
      {isExpanded && <div className="device-info-extended" id="connection-summary">{summary}</div>}
    </div>
  );
}

export default ConnectionButton;
