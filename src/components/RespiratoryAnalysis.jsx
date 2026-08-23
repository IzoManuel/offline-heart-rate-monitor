import React from 'react';

function RespiratoryAnalysis({ results, cycleNumber }) {
  const respiration = results?.respiration;

  return (
    <section className="respiratory-section" aria-labelledby="respiratory-heading">
      <h2 id="respiratory-heading">Estimated Average Resting Respiration Rate</h2>

      {!results && (
        <div className="respiratory-pending">
          <p>Waiting for automatic HRV cycle {cycleNumber} to complete.</p>
          <p className="analysis-disclaimer">
            The estimate uses breathing-related variation in RR intervals; the strap does not transmit breaths directly.
          </p>
        </div>
      )}

      {results && !respiration?.available && (
        <div className="respiratory-unavailable">
          <h3>Estimate unavailable</h3>
          <p>{respiration?.error || 'No respiratory estimate was produced.'}</p>
          <p className="analysis-disclaimer">
            Stay still, keep the strap snug, and allow the next two-minute cycle to finish.
          </p>
        </div>
      )}

      {respiration?.available && (
        <div className="respiratory-results">
          <div className="respiratory-rate-card">
            <span className="respiratory-rate-label">2-minute window average</span>
            <span className="respiratory-rate-value">
              {respiration.breathsPerMinute.toFixed(1)}
              <span className="respiratory-rate-unit"> brpm</span>
            </span>
            <span className="respiratory-interpretation">{respiration.interpretation}</span>
          </div>

          <dl className="respiratory-details">
            <div><dt>Signal quality</dt><dd>{respiration.quality}</dd></div>
            <div><dt>RR intervals</dt><dd>{respiration.rrCount}</dd></div>
            <div><dt>Window</dt><dd>{Math.round(respiration.durationSeconds)} sec</dd></div>
            <div><dt>Method</dt><dd>RR spectral estimate</dd></div>
          </dl>

          <p className="analysis-disclaimer">
            Wellness estimate only. Movement, irregular rhythms, medication, weak respiratory sinus arrhythmia, and sensor artifacts can reduce accuracy. It is not a medical measurement or diagnosis.
          </p>
        </div>
      )}
    </section>
  );
}

export default RespiratoryAnalysis;
