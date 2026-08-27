import React from 'react';
import { formatOccurrenceTime } from '../utils/timeFormatting';

function DDFAAnalysis({ results, extrema, averageOverride }) {
  const ddfa = results?.ddfa;
  if (!ddfa) return null;
  return (
    <section className="hrv-section ddfa-section" aria-labelledby="ddfa-heading">
      <h2 id="ddfa-heading">DDFA Analysis</h2>
      <p className="hrv-note">DDFA-2 Local Correlation Exponents · Updated {formatOccurrenceTime(results.analyzedAt)}</p>
      <div className="hrv-metrics-grid ddfa-headline-grid">
        <div className="hrv-metric ddfa-headline-card">
          <span className="hrv-metric-label">DDFA α10</span>
          <span className="hrv-metric-value">{ddfa.available ? ddfa.alpha10.toFixed(2) : '—'}</span>
          <span className="hrv-metric-description">Unitless · 10-Beat Scale</span>
          <div className="metric-extrema">
            <span>Min {extrema ? extrema.min.value.toFixed(2) : '—'} · {formatOccurrenceTime(extrema?.min.occurredAt)}</span>
            <span>Average {Number.isFinite(averageOverride) ? averageOverride.toFixed(2) : Number.isFinite(extrema?.average) ? extrema.average.toFixed(2) : '—'}</span>
            <span>Max {extrema ? extrema.max.value.toFixed(2) : '—'} · {formatOccurrenceTime(extrema?.max.occurredAt)}</span>
          </div>
        </div>
      </div>
      {!ddfa.profile.length && <p className="hrv-note">{ddfa.reason}</p>}
    </section>
  );
}

export default DDFAAnalysis;
