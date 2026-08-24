import React, { useMemo, useState } from 'react';
import { formatOccurrenceTime } from '../utils/timeFormatting';
import { aggregateChartPoints, findNearestPointIndex } from '../utils/chartStorage';

const SERIES = [
  { key: 'heartRate', label: 'Heart Rate', unit: 'BPM', color: '#dc2626', dash: '' },
  { key: 'rmssd', label: 'RMSSD', unit: 'ms', color: '#2563eb', dash: '10 4' },
  { key: 'sdnn', label: 'SDNN', unit: 'ms', color: '#7c3aed', dash: '3 4' },
  { key: 'brpm', label: 'BRPM', unit: 'BRPM', color: '#059669', dash: '12 4 3 4' }
];

const WIDTH = 680;
const HEIGHT = 280;
const PADDING = { top: 20, right: 18, bottom: 38, left: 42 };
const GRANULARITIES = [
  { value: 'auto', label: 'Auto' },
  { value: 5000, label: '5 Seconds' },
  { value: 60000, label: '1 Minute' },
  { value: 900000, label: '15 Minutes' },
  { value: 3600000, label: '1 Hour' },
  { value: 86400000, label: '1 Day' },
  { value: 'week', label: '1 Week' },
  { value: 'month', label: '1 Month' },
  { value: 'year', label: '1 Year' }
];

function TrendGraph({ points }) {
  const [selected, setSelected] = useState(() => new Set(SERIES.map(series => series.key)));
  const [inspectedIndex, setInspectedIndex] = useState(null);
  const storedPoints = useMemo(
    () => points.filter(point => Number.isFinite(point.timestamp)).sort((a, b) => a.timestamp - b.timestamp),
    [points]
  );
  const [granularity, setGranularity] = useState('auto');
  const storedStart = storedPoints[0]?.timestamp;
  const storedEnd = storedPoints.at(-1)?.timestamp;
  const effectiveBucketMs = useMemo(() => {
    if (granularity !== 'auto') return ['week', 'month', 'year'].includes(granularity)
      ? granularity
      : Number(granularity);
    const target = Math.max(5000, Math.ceil(
      Math.max(0, (storedEnd ?? 0) - (storedStart ?? 0)) / 500 / 5000
    ) * 5000);
    return target;
  }, [granularity, storedStart, storedEnd]);
  const validPoints = useMemo(
    () => aggregateChartPoints(storedPoints, effectiveBucketMs),
    [storedPoints, effectiveBucketMs]
  );
  const gapThresholdMs = typeof effectiveBucketMs === 'number'
    ? effectiveBucketMs * 3
    : { week: 21 * 86400000, month: 93 * 86400000, year: 1098 * 86400000 }[effectiveBucketMs];
  const start = validPoints[0]?.timestamp;
  const end = validPoints.at(-1)?.timestamp;

  const chartSeries = useMemo(() => SERIES.map(series => {
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
    const path = samples.map((point, index) => {
      const previous = samples[index - 1];
      const beginsSegment = index === 0 ||
        previous.sessionStartedAt !== point.sessionStartedAt ||
        point.timestamp - previous.timestamp > gapThresholdMs;
      return `${beginsSegment ? 'M' : 'L'} ${x(point.timestamp).toFixed(1)} ${y(point[series.key]).toFixed(1)}`;
    }).join(' ');

    return { ...series, samples, min, max, path, latest: values.at(-1), x, y };
  }), [validPoints, start, end, gapThresholdMs]);
  const plottedSeries = chartSeries.filter(series => selected.has(series.key));

  const inspectedPoint = inspectedIndex === null ? null : validPoints[inspectedIndex];

  const toggleSeries = key => {
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const inspectAtPointer = event => {
    if (validPoints.length === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const viewX = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
    const ratio = Math.max(0, Math.min(1,
      (viewX - PADDING.left) / (WIDTH - PADDING.left - PADDING.right)
    ));
    const timestamp = start + ratio * Math.max(1, end - start);
    setInspectedIndex(findNearestPointIndex(validPoints, timestamp));
  };

  const inspectWithKeyboard = event => {
    if (validPoints.length === 0) return;
    const current = inspectedIndex ?? validPoints.length - 1;
    if (event.key === 'ArrowLeft') setInspectedIndex(Math.max(0, current - 1));
    else if (event.key === 'ArrowRight') setInspectedIndex(Math.min(validPoints.length - 1, current + 1));
    else if (event.key === 'Home') setInspectedIndex(0);
    else if (event.key === 'End') setInspectedIndex(validPoints.length - 1);
    else return;
    event.preventDefault();
  };

  return (
    <section className="trend-section" aria-labelledby="trend-heading">
      <div className="trend-heading-row">
        <div>
          <h2 id="trend-heading">Metric Trends</h2>
          <p>Relative trend within each metric’s observed range</p>
        </div>
        <span>{validPoints.length} of {storedPoints.length} Points</span>
      </div>

      <label className="trend-granularity">
        <span>Granularity</span>
        <select
          value={granularity}
          onChange={event => {
            setGranularity(event.target.value);
            setInspectedIndex(null);
          }}
        >
          {GRANULARITIES.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

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
            tabIndex="0"
            aria-label={`Relative trend chart from ${formatOccurrenceTime(start)} to ${formatOccurrenceTime(end)}. Raw values and ranges are listed below.`}
            onPointerMove={inspectAtPointer}
            onPointerDown={inspectAtPointer}
            onKeyDown={inspectWithKeyboard}
          >
            {[0, 0.25, 0.5, 0.75, 1].map(position => {
              const y = PADDING.top + position * (HEIGHT - PADDING.top - PADDING.bottom);
              return (
                <g key={position}>
                  <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y} y2={y} className="trend-grid-line" />
                  <text x={PADDING.left - 7} y={y + 4} textAnchor="end" className="trend-axis-label">{Math.round((1 - position) * 100)}%</text>
                </g>
              );
            })}
            <text
              x="13"
              y={(PADDING.top + HEIGHT - PADDING.bottom) / 2}
              textAnchor="middle"
              transform={`rotate(-90 13 ${(PADDING.top + HEIGHT - PADDING.bottom) / 2})`}
              className="trend-axis-title"
            >Relative Position</text>
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
            {inspectedPoint && (
              <>
                <line
                  x1={chartSeries[0]?.x(inspectedPoint.timestamp) ?? PADDING.left}
                  x2={chartSeries[0]?.x(inspectedPoint.timestamp) ?? PADDING.left}
                  y1={PADDING.top}
                  y2={HEIGHT - PADDING.bottom}
                  className="trend-inspection-line"
                />
                {plottedSeries.map(series => Number.isFinite(inspectedPoint[series.key]) && (
                  <circle
                    key={series.key}
                    cx={series.x(inspectedPoint.timestamp)}
                    cy={series.y(inspectedPoint[series.key])}
                    r="5"
                    fill={series.color}
                    stroke="white"
                    strokeWidth="2"
                  />
                ))}
              </>
            )}
          </svg>
        </div>
      )}

      <div className="trend-inspector" aria-live="polite">
        <strong>{inspectedPoint ? formatOccurrenceTime(inspectedPoint.timestamp) : 'Inspect A Point'}</strong>
        <span>{inspectedPoint
          ? `${effectiveBucketMs === 5000 ? 'Exact Sampled' : 'Averaged'} Values`
          : 'Hover, tap, or focus the chart and use the arrow keys'}</span>
        {inspectedPoint && (
          <dl>
            {chartSeries.map(series => (
              <div key={series.key}>
                <dt>{series.label}</dt>
                <dd>{Number.isFinite(inspectedPoint[series.key]) ? inspectedPoint[series.key].toFixed(1) : '—'} {series.unit}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="trend-legend" aria-label="Latest values and observed ranges">
        {chartSeries.map(series => (
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
