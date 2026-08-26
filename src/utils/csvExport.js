import { CHART_METRICS, aggregateChartPoints, boundChartPoints } from './chartStorage.js';

export const EXPORT_GRANULARITIES = [
  { value: 5000, label: 'Raw (5 Seconds)' },
  { value: 60000, label: '1 Minute' },
  { value: 300000, label: '5 Minutes' },
  { value: 900000, label: '15 Minutes' },
  { value: 3600000, label: '1 Hour' },
  { value: 86400000, label: '1 Day' },
  { value: 'week', label: '1 Week' },
  { value: 'month', label: '1 Month' },
  { value: 'year', label: '1 Year' },
];

export const CSV_COLUMNS = ['Timestamp ISO', 'Local Time', 'Session Started ISO', 'DDFA Alpha10 (unitless)', 'RMSSD (ms)', 'SDNN (ms)', 'Heart Rate (BPM)', 'BRPM', 'Sample Count', 'DDFA Alpha10 Sample Count', 'RMSSD Sample Count', 'SDNN Sample Count', 'Heart Rate Sample Count', 'BRPM Sample Count'];

function csvCell(value) {
  if (value === null || value === undefined || (typeof value === 'number' && !Number.isFinite(value))) return '';
  const stringValue = String(value);
  return /[",\r\n]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
}

function isoTime(timestamp) {
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : '';
}

export function chartPointsToCsv(points) {
  const rows = boundChartPoints(points, Number.MAX_SAFE_INTEGER).map(point => [
    isoTime(point.timestamp),
    Number.isFinite(point.timestamp) ? new Date(point.timestamp).toLocaleString() : '',
    isoTime(point.sessionStartedAt),
    ...CHART_METRICS.map(metric => Number.isFinite(point[metric]) ? point[metric] : ''),
    point.sampleCount ?? 1,
    ...CHART_METRICS.map(metric => point[`${metric}Count`] ?? (Number.isFinite(point[metric]) ? 1 : 0))
  ]);
  return [CSV_COLUMNS, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}

export function selectExportPoints(points, { granularity = 5000, from = null, to = null } = {}) {
  const bounded = boundChartPoints(points, Number.MAX_SAFE_INTEGER).filter(point =>
    (from === null || point.timestamp >= from) && (to === null || point.timestamp <= to));
  return aggregateChartPoints(bounded, granularity);
}

export function createCsvFilename(now = new Date()) {
  return `heart-rate-history-${now.toISOString().slice(0, 10)}.csv`;
}

export function downloadChartCsv(points, options = {}, documentObject = document) {
  if (options && typeof options.createElement === 'function') {
    documentObject = options;
    options = {};
  }
  const blob = new Blob([`\uFEFF${chartPointsToCsv(selectExportPoints(points, options))}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = documentObject.createElement('a');
  link.href = url;
  link.download = createCsvFilename();
  documentObject.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
