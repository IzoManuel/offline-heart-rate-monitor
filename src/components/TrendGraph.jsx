import React, { useMemo, useState } from 'react';
import { formatOccurrenceTime } from '../utils/timeFormatting';
import { aggregateChartPoints, findNearestPointIndex } from '../utils/chartStorage';
import { calculateLinearAxis, formatAxisTick } from '../utils/chartScale';

const SERIES = [
  { key: 'heartRate', label: 'Heart Rate', unit: 'BPM', color: '#dc2626', dash: '' },
  { key: 'rmssd', label: 'RMSSD', unit: 'ms', color: '#2563eb', dash: '10 4' },
  { key: 'sdnn', label: 'SDNN', unit: 'ms', color: '#7c3aed', dash: '3 4' },
  { key: 'brpm', label: 'BRPM', unit: 'BRPM', color: '#059669', dash: '12 4 3 4' }
];
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
const WIDTH = 680;
const HEIGHT = 230;
const PADDING = { top: 18, right: 18, bottom: 36, left: 58 };

function MetricChart({ series, points, start, end, gapThresholdMs, inspectedPoint, onInspect, onKeyDown }) {
  const samples = points.filter(point => Number.isFinite(point[series.key]));
  const values = samples.map(point => point[series.key]);
  const axis = calculateLinearAxis(values, 5);
  const x = timestamp => PADDING.left + ((timestamp - start) / Math.max(1, end - start)) *
    (WIDTH - PADDING.left - PADDING.right);
  const y = value => PADDING.top + (1 - (value - axis.min) / (axis.max - axis.min)) *
    (HEIGHT - PADDING.top - PADDING.bottom);
  const path = samples.map((point, index) => {
    const previous = samples[index - 1];
    const beginsSegment = index === 0 ||
      previous.sessionStartedAt !== point.sessionStartedAt ||
      point.timestamp - previous.timestamp > gapThresholdMs;
    return `${beginsSegment ? 'M' : 'L'} ${x(point.timestamp).toFixed(1)} ${y(point[series.key]).toFixed(1)}`;
  }).join(' ');

  return (
    <article className="metric-chart-card">
      <div className="metric-chart-heading">
        <h3>{series.label}</h3>
        <span>{series.unit}</span>
      </div>
      <div className="trend-chart-scroll">
        <svg
          className="trend-chart metric-chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          tabIndex="0"
          aria-label={`${series.label} in ${series.unit} from ${formatOccurrenceTime(start)} to ${formatOccurrenceTime(end)}`}
          onPointerMove={onInspect}
          onPointerDown={onInspect}
          onKeyDown={onKeyDown}
        >
          {axis.ticks.map(tick => {
            const tickY = y(tick);
            return (
              <g key={tick}>
                <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={tickY} y2={tickY} className="trend-grid-line" />
                <text x={PADDING.left - 8} y={tickY + 4} textAnchor="end" className="trend-axis-label">
                  {formatAxisTick(tick, axis.step)}
                </text>
              </g>
            );
          })}
          <text
            x="13"
            y={(PADDING.top + HEIGHT - PADDING.bottom) / 2}
            textAnchor="middle"
            transform={`rotate(-90 13 ${(PADDING.top + HEIGHT - PADDING.bottom) / 2})`}
            className="trend-axis-title"
          >{series.unit}</text>
          <text x={PADDING.left} y={HEIGHT - 11} className="trend-axis-label">{formatOccurrenceTime(start)}</text>
          <text x={WIDTH - PADDING.right} y={HEIGHT - 11} textAnchor="end" className="trend-axis-label">{formatOccurrenceTime(end)}</text>
          {samples.length > 1 && (
            <path d={path} fill="none" stroke={series.color} strokeWidth="3" strokeDasharray={series.dash} vectorEffect="non-scaling-stroke" />
          )}
          {inspectedPoint && (
            <line x1={x(inspectedPoint.timestamp)} x2={x(inspectedPoint.timestamp)} y1={PADDING.top} y2={HEIGHT - PADDING.bottom} className="trend-inspection-line" />
          )}
          {inspectedPoint && Number.isFinite(inspectedPoint[series.key]) && (
            <circle cx={x(inspectedPoint.timestamp)} cy={y(inspectedPoint[series.key])} r="5" fill={series.color} stroke="white" strokeWidth="2" />
          )}
        </svg>
      </div>
    </article>
  );
}

function TrendGraph({ points }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inspectedIndex, setInspectedIndex] = useState(null);
  const [granularity, setGranularity] = useState('auto');
  const storedPoints = useMemo(
    () => points.filter(point => Number.isFinite(point.timestamp)).sort((a, b) => a.timestamp - b.timestamp),
    [points]
  );
  const storedStart = storedPoints[0]?.timestamp;
  const storedEnd = storedPoints.at(-1)?.timestamp;
  const effectiveBucket = useMemo(() => {
    if (granularity !== 'auto') return ['week', 'month', 'year'].includes(granularity) ? granularity : Number(granularity);
    return Math.max(5000, Math.ceil(Math.max(0, (storedEnd ?? 0) - (storedStart ?? 0)) / 500 / 5000) * 5000);
  }, [granularity, storedStart, storedEnd]);
  const displayedPoints = useMemo(
    () => aggregateChartPoints(storedPoints, effectiveBucket),
    [storedPoints, effectiveBucket]
  );
  const start = displayedPoints[0]?.timestamp;
  const end = displayedPoints.at(-1)?.timestamp;
  const gapThresholdMs = typeof effectiveBucket === 'number'
    ? effectiveBucket * 3
    : { week: 21 * 86400000, month: 93 * 86400000, year: 1098 * 86400000 }[effectiveBucket];
  const inspectedPoint = inspectedIndex === null ? null : displayedPoints[inspectedIndex];

  const inspectAtPointer = event => {
    if (!displayedPoints.length) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const viewX = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
    const ratio = Math.max(0, Math.min(1, (viewX - PADDING.left) / (WIDTH - PADDING.left - PADDING.right)));
    setInspectedIndex(findNearestPointIndex(displayedPoints, start + ratio * Math.max(1, end - start)));
  };

  const inspectWithKeyboard = event => {
    if (!displayedPoints.length) return;
    const current = inspectedIndex ?? displayedPoints.length - 1;
    if (event.key === 'ArrowLeft') setInspectedIndex(Math.max(0, current - 1));
    else if (event.key === 'ArrowRight') setInspectedIndex(Math.min(displayedPoints.length - 1, current + 1));
    else if (event.key === 'Home') setInspectedIndex(0);
    else if (event.key === 'End') setInspectedIndex(displayedPoints.length - 1);
    else return;
    event.preventDefault();
  };

  const seriesStats = SERIES.map(series => {
    const values = displayedPoints.map(point => point[series.key]).filter(Number.isFinite);
    return { ...series, min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null, latest: values.at(-1) };
  });

  return (
    <section className="trend-section" aria-labelledby="trend-heading">
      <div className="trend-heading-row">
        <div><h2 id="trend-heading">Metric Trends</h2><p>Separate Raw-Value Time Series</p></div>
        <span>{displayedPoints.length} of {storedPoints.length} Points</span>
      </div>
      <button
        className="connection-summary-toggle"
        onClick={() => setIsExpanded(previous => !previous)}
        aria-expanded={isExpanded}
        aria-controls="metric-trend-graphs"
      >
        <span>{isExpanded ? 'Hide Graphs' : 'Show Graphs'}</span>
        <span aria-hidden="true">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div id="metric-trend-graphs" className="trend-expanded">
          <label className="trend-granularity">
            <span>Granularity</span>
            <select value={granularity} onChange={event => { setGranularity(event.target.value); setInspectedIndex(null); }}>
              {GRANULARITIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          {displayedPoints.length < 2 ? (
            <p className="trend-empty">Trend data appears after two five-second samples.</p>
          ) : (
            <div className="metric-charts-grid">
              {SERIES.map(series => (
                <MetricChart
                  key={series.key}
                  series={series}
                  points={displayedPoints}
                  start={start}
                  end={end}
                  gapThresholdMs={gapThresholdMs}
                  inspectedPoint={inspectedPoint}
                  onInspect={inspectAtPointer}
                  onKeyDown={inspectWithKeyboard}
                />
              ))}
            </div>
          )}

          <div className="trend-inspector" aria-live="polite">
            <strong>{inspectedPoint ? formatOccurrenceTime(inspectedPoint.timestamp) : 'Inspect A Point'}</strong>
            <span>{inspectedPoint ? `${effectiveBucket === 5000 ? 'Exact Sampled' : 'Averaged'} Values` : 'Hover, tap, or focus a graph and use the arrow keys'}</span>
            {inspectedPoint && <dl>{SERIES.map(series => <div key={series.key}><dt>{series.label}</dt><dd>{Number.isFinite(inspectedPoint[series.key]) ? inspectedPoint[series.key].toFixed(1) : '—'} {series.unit}</dd></div>)}</dl>}
          </div>

          <div className="trend-legend" aria-label="Latest values and observed ranges">
            {seriesStats.map(series => (
              <div key={series.key}><strong>{series.label}</strong><span>Latest {Number.isFinite(series.latest) ? series.latest.toFixed(1) : '—'} {series.unit}</span><span>Range {Number.isFinite(series.min) ? series.min.toFixed(1) : '—'}–{Number.isFinite(series.max) ? series.max.toFixed(1) : '—'} {series.unit}</span></div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default TrendGraph;
