import React from 'react';

/**
 * HRVAnalysis Component
 *
 * Displays HRV (Heart Rate Variability) analysis interface
 * Continuously displays collection progress and the latest completed results.
 *
 * @param {boolean} isConnected - Whether a device is connected
 * @param {Object} testState - Current test state
 * @param {boolean} testState.isRunning - Whether test is in progress
 * @param {number} testState.duration - Total test duration in ms
 * @param {number} testState.elapsed - Elapsed time in ms
 * @param {number} testState.rrCount - Number of RR intervals collected
 * @param {Object} results - Test results (null if no results)
 * @param {number} results.rmssd - RMSSD value in ms
 * @param {number} results.sdnn - SDNN value in ms
 * @param {number} results.rrCount - Number of RR intervals used
 * @param {string} results.warning - Warning message if RR intervals are suspicious
 * @param {string} results.error - Error message if test failed
 */
function HRVAnalysis({
  isConnected,
  testState,
  results
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

      {/* The next collection window remains visible while prior results are shown. */}
      {testState.isRunning && (
        <div className="hrv-testing">
          <p className="hrv-status">
            Cycle {testState.cycleNumber}: collecting RR intervals automatically...
          </p>

          <div className="hrv-progress-container">
            <div className="hrv-progress-bar">
              <div
                className="hrv-progress-fill"
              style={{ width: `${Math.min(100, (testState.elapsed / testState.duration) * 100)}%` }}
              />
            </div>
            <p className="hrv-countdown">
              {formatTime(testState.duration - testState.elapsed)}
            </p>
          </div>

          <div className="hrv-rr-count">
            <span className="hrv-label">RR intervals:</span>
            <span className="hrv-value">{testState.rrCount}</span>
          </div>

          <p className="hrv-note">
            Results update every 2 minutes. Keep the sensor connected and remain still.
          </p>
        </div>
      )}

      {/* Results State - Test completed */}
      {results && (
        <div className="hrv-results">
          <h3>Latest Results — Cycle {results.cycleNumber}</h3>
          <p className="hrv-note">
            Completed {new Date(results.completedAt).toLocaleTimeString()}; displayed while the next cycle runs.
          </p>

          {/* Error message */}
          {results.error && (
            <div className="hrv-error">
              ❌ {results.error}
            </div>
          )}

          {/* Warning message for suspicious RR intervals */}
          {results.warning && !results.error && (
            <div className="hrv-warning">
              {results.warning}
            </div>
          )}

          {/* HRV Metrics */}
          {!results.error && (
            <div className="hrv-metrics-grid">
              <div className="hrv-metric">
                <span className="hrv-metric-label">RMSSD</span>
                <span className="hrv-metric-value">
                  {results.rmssd.toFixed(1)} <span className="hrv-unit">ms</span>
                </span>
                <span className="hrv-metric-description">Short-term variability</span>
              </div>

              <div className="hrv-metric">
                <span className="hrv-metric-label">SDNN</span>
                <span className="hrv-metric-value">
                  {results.sdnn.toFixed(1)} <span className="hrv-unit">ms</span>
                </span>
                <span className="hrv-metric-description">Overall variability</span>
              </div>

              <div className="hrv-metric">
                <span className="hrv-metric-label">RR Intervals</span>
                <span className="hrv-metric-value">
                  {results.rrCount}
                </span>
                <span className="hrv-metric-description">Data points analyzed</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HRVAnalysis;
