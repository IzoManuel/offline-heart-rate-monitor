import React from 'react';
import { formatOccurrenceTime } from '../utils/timeFormatting';

/**
 * HRVAnalysis Component
 *
 * Displays HRV (Heart Rate Variability) analysis interface
 * Displays rolling-window collection progress and the latest five-second refresh.
 *
 * @param {boolean} isConnected - Whether a device is connected
 * @param {Object} analysisState - Current rolling analysis state
 * @param {Object} results - Test results (null if no results)
 * @param {number} results.rmssd - RMSSD value in ms
 * @param {number} results.sdnn - SDNN value in ms
 * @param {number} results.rrCount - Number of RR intervals used
 * @param {string} results.warning - Warning message if RR intervals are suspicious
 * @param {string} results.error - Error message if test failed
 */
function HRVAnalysis({
  isConnected,
  analysisState,
  results,
  rmssdExtrema
}) {
  // Don't show if not connected
  if (!isConnected) return null;

  /**
   * Format milliseconds to MM:SS display
   */
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="hrv-section">
      <h2>HRV Analysis</h2>

      {analysisState.isRunning && (
        <div className="hrv-testing">
          <p className="hrv-status">Rolling 2-Minute Window</p>

          <div className="hrv-progress-container">
            <div className="hrv-progress-bar">
              <div
                className="hrv-progress-fill"
              style={{ width: `${Math.min(100, (analysisState.elapsed / analysisState.duration) * 100)}%` }}
              />
            </div>
            <p className="hrv-countdown">
              {formatTime(analysisState.elapsed)} / {formatTime(analysisState.duration)}
            </p>
          </div>

          <div className="hrv-rr-count">
            <span className="hrv-label">RR Intervals:</span>
            <span className="hrv-value">{analysisState.rrCount}</span>
          </div>
        </div>
      )}

      {results && !results.error && (
        <div className="hrv-results">
          <h3>Latest Results</h3>
          <p className="hrv-note">
            Updated {new Date(results.analyzedAt).toLocaleTimeString()}
          </p>

          {/* Warning message for suspicious RR intervals */}
          {results.warning && !results.error && (
            <div className="hrv-warning">
              {results.warning}
            </div>
          )}

          {/* HRV Metrics */}
          <div className="hrv-metrics-grid">
              <div className="hrv-metric">
                <span className="hrv-metric-label">RMSSD</span>
                <span className="hrv-metric-value">
                  {results.rmssd.toFixed(1)} <span className="hrv-unit">ms</span>
                </span>
                <span className="hrv-metric-description">Short-Term Variability</span>
                <div className="metric-extrema">
                  <span>Min {rmssdExtrema?.min.value.toFixed(1) ?? '—'} ms · {formatOccurrenceTime(rmssdExtrema?.min.occurredAt)}</span>
                  <span>Max {rmssdExtrema?.max.value.toFixed(1) ?? '—'} ms · {formatOccurrenceTime(rmssdExtrema?.max.occurredAt)}</span>
                </div>
              </div>

              <div className="hrv-metric">
                <span className="hrv-metric-label">SDNN</span>
                <span className="hrv-metric-value">
                  {results.sdnn.toFixed(1)} <span className="hrv-unit">ms</span>
                </span>
                <span className="hrv-metric-description">Overall Variability</span>
              </div>

              <div className="hrv-metric">
                <span className="hrv-metric-label">RR Intervals</span>
                <span className="hrv-metric-value">
                  {results.rrCount}
                </span>
                <span className="hrv-metric-description">Data Points Analyzed</span>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HRVAnalysis;
