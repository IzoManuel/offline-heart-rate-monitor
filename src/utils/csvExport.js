import { CHART_METRICS, boundChartPoints } from './chartStorage.js';

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

export function createCsvFilename(now = new Date()) {
  return `heart-rate-history-${now.toISOString().slice(0, 10)}.csv`;
}

export function downloadChartCsv(points, documentObject = document) {
  const blob = new Blob([`\uFEFF${chartPointsToCsv(points)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = documentObject.createElement('a');
  link.href = url;
  link.download = createCsvFilename();
  documentObject.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
