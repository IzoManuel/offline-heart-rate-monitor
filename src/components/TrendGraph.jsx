import React, { useMemo, useState } from 'react';
import { formatOccurrenceTime } from '../utils/timeFormatting';

const SERIES = [
  { key: 'heartRate', label: 'Heart Rate', unit: 'BPM', color: '#dc2626', dash: '' },
  { key: 'rmssd', label: 'RMSSD', unit: 'ms', color: '#2563eb', dash: '10 4' },
  { key: 'sdnn', label: 'SDNN', unit: 'ms', color: '#7c3aed', dash: '3 4' },
  { key: 'brpm', label: 'BRPM', unit: 'BRPM', color: '#059669', dash: '12 4 3 4' }
];

const WIDTH = 680;
const HEIGHT = 280;
const PADDING = { top: 20, right: 18, bottom: 38, left: 42 };

function TrendGraph({ points }) {
  const [selected, setSelected] = useState(() => new Set(SERIES.map(series => series.key)));
  const validPoints = useMemo(
    () => points.filter(point => Number.isFinite(point.timestamp)).sort((a, b) => a.timestamp - b.timestamp),
    [points]
  );
  const start = validPoints[0]?.timestamp;
  const end = validPoints.at(-1)?.timestamp;

  const plottedSeries = useMemo(() => SERIES.filter(series => selected.has(series.key)).map(series => {
    const samples = validPoints.filter(point => Number.isFinite(point[series.key]));
    const values = samples.map(point => point[series.key]);
    const min = values.length ? Math.min(...values) : null;
    const max = values.length ? Math.max(...values) : null;
    const x = timestamp => PADDING.left + ((timestamp - start) / Math.max(1, end - start)) *
      (WIDTH - PADDING.left - PADDING.right);
    const y = value => {
      const relative = max === min ? 0.5 : (value - min) / (max - min);
      return PADDING.top + (1 - relative) * (HEIGHT - PADDING.top - PADDING.bottom);
    };
    const path = samples.map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${x(point.timestamp).toFixed(1)} ${y(point[series.key]).toFixed(1)}`
    ).join(' ');

    return { ...series, samples, min, max, path, latest: values.at(-1) };
  }), [validPoints, selected, start, end]);

  const toggleSeries = key => {
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section className="trend-section" aria-labelledby="trend-heading">
      <div className="trend-heading-row">
        <div>
          <h2 id="trend-heading">Metric Trends</h2>
          <p>Relative trend within each metric’s observed range</p>
        </div>
        <span>{validPoints.length} Points</span>
      </div>

      <fieldset className="trend-controls">
        <legend>Choose Metrics</legend>
        {SERIES.map(series => (
          <label key={series.key} style={{ '--series-color': series.color }}>
            <input
              type="checkbox"
              checked={selected.has(series.key)}
              onChange={() => toggleSeries(series.key)}
            />
            <span className="trend-line-key" aria-hidden="true"></span>
            {series.label}
          </label>
        ))}
      </fieldset>

      {validPoints.length < 2 ? (
        <p className="trend-empty">Trend data appears after two five-second samples.</p>
      ) : (
        <div className="trend-chart-scroll">
          <svg
            className="trend-chart"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`Relative trend chart from ${formatOccurrenceTime(start)} to ${formatOccurrenceTime(end)}. Raw values and ranges are listed below.`}
          >
            {[0, 0.25, 0.5, 0.75, 1].map(position => {
              const y = PADDING.top + position * (HEIGHT - PADDING.top - PADDING.bottom);
              return <line key={position} x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y} y2={y} className="trend-grid-line" />;
            })}
            <text x="8" y={PADDING.top + 5} className="trend-axis-label">High</text>
            <text x="10" y={HEIGHT - PADDING.bottom} className="trend-axis-label">Low</text>
            <text x={PADDING.left} y={HEIGHT - 12} className="trend-axis-label">{formatOccurrenceTime(start)}</text>
            <text x={WIDTH - PADDING.right} y={HEIGHT - 12} textAnchor="end" className="trend-axis-label">{formatOccurrenceTime(end)}</text>
            {plottedSeries.map(series => series.samples.length > 1 && (
              <path
                key={series.key}
                d={series.path}
                fill="none"
                stroke={series.color}
                strokeWidth="3"
                strokeDasharray={series.dash}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        </div>
      )}

      <div className="trend-legend" aria-label="Latest values and observed ranges">
        {plottedSeries.map(series => (
          <div key={series.key}>
            <strong>{series.label}</strong>
            <span>
              Latest {Number.isFinite(series.latest) ? series.latest.toFixed(1) : '—'} {series.unit}
            </span>
            <span>
              Range {Number.isFinite(series.min) ? series.min.toFixed(1) : '—'}–{Number.isFinite(series.max) ? series.max.toFixed(1) : '—'} {series.unit}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TrendGraph;
