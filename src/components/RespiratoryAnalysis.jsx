import React from 'react';
import { formatOccurrenceTime } from '../utils/timeFormatting';

function RespiratoryAnalysis({ results, rrCount, brpmExtrema, averageOverride }) {
  const respiration = results?.respiration;

  return (
    <section className="respiratory-section" aria-labelledby="respiratory-heading">
      <h2 id="respiratory-heading">Breathing Rate</h2>

      {(!results || results.error) && (
        <div className="respiratory-pending">
          <p>Collecting Data · {rrCount} RR Intervals</p>
        </div>
      )}

      {results && !results.error && !respiration?.available && (
        <div className="respiratory-unavailable">
          <h3>Estimate Unavailable</h3>
          <p>{respiration?.error || 'No respiratory estimate was produced.'}</p>
        </div>
      )}

      {respiration?.available && (
        <div className="respiratory-results">
          <div className="respiratory-rate-card metric-headline-card">
            <span className="respiratory-rate-label">2-Minute Rolling Estimate</span>
            <span className="respiratory-rate-value">
              {respiration.breathsPerMinute.toFixed(1)}
              <span className="respiratory-rate-unit"> BRPM</span>
            </span>
            <div className="metric-extrema respiratory-extrema">
              <span>Min {brpmExtrema?.min.value.toFixed(1) ?? '—'} BRPM · {formatOccurrenceTime(brpmExtrema?.min.occurredAt)}</span>
              <span>Average {Number.isFinite(averageOverride) ? averageOverride.toFixed(1) : Number.isFinite(brpmExtrema?.average) ? brpmExtrema.average.toFixed(1) : '—'} BRPM</span>
              <span>Max {brpmExtrema?.max.value.toFixed(1) ?? '—'} BRPM · {formatOccurrenceTime(brpmExtrema?.max.occurredAt)}</span>
            </div>
          </div>

        </div>
      )}
    </section>
  );
}

export default RespiratoryAnalysis;
