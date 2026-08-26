import React from 'react';
import { formatOccurrenceTime } from '../utils/timeFormatting';

function DDFAAnalysis({ results, extrema, averageOverride }) {
  const ddfa = results?.ddfa;
  if (!ddfa) return null;
  const values = ddfa.profile.map(point => point.alpha);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const range = Math.max(0.01, max - min);

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
      {ddfa.profile.length ? (
        <div className="ddfa-profile" aria-label="Latest DDFA Scale Profile">
          <h3>Latest Scale Profile</h3>
          <div className="ddfa-profile-bars">
            {ddfa.profile.map(point => (
              <div className="ddfa-profile-column" key={point.scale}>
                <span className="ddfa-profile-value">{point.alpha.toFixed(2)}</span>
                <span
                  className="ddfa-profile-bar"
                  style={{ height: `${18 + ((point.alpha - min) / range) * 62}px` }}
                  aria-hidden="true"
                />
                <span className="ddfa-profile-scale">{point.scale}</span>
              </div>
            ))}
          </div>
          <p className="hrv-note">Scale (RR Intervals) · {ddfa.acceptedCount} Accepted, {ddfa.removedCount} Removed</p>
        </div>
      ) : <p className="hrv-note">{ddfa.reason}</p>}
    </section>
  );
}

export default DDFAAnalysis;
