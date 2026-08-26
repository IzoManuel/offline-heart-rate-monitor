export const ALARM_STORAGE_KEY = 'offline-hr-monitor.web-alarms';
export const ALARM_METRICS = [
  { key: 'ddfaAlpha10', label: 'DDFA α10', unit: '' },
  { key: 'rmssd', label: 'RMSSD', unit: 'ms' },
  { key: 'sdnn', label: 'SDNN', unit: 'ms' },
  { key: 'heartRate', label: 'Heart Rate', unit: 'BPM' },
  { key: 'brpm', label: 'BRPM', unit: 'BRPM' }
];
export const ALARM_INTERVALS = [5, 10, 30, 60, 300];

export function loadWebAlarms(storage = globalThis.localStorage) {
  try { const alarms = JSON.parse(storage?.getItem(ALARM_STORAGE_KEY)); return Array.isArray(alarms) ? alarms : []; } catch { return []; }
}
export function saveWebAlarms(alarms, storage = globalThis.localStorage) { try { storage?.setItem(ALARM_STORAGE_KEY, JSON.stringify(alarms)); return true; } catch { return false; } }
export function alarmValue(alarm, snapshot) { return Number.isFinite(snapshot?.[alarm.metric]) ? snapshot[alarm.metric] : null; }
export function isAlarmViolated(alarm, value) { return value !== null && (alarm.condition === 'below' ? value < alarm.threshold : value > alarm.threshold); }
export function isAlarmSafe(alarm, value) {
  const hysteresis = Math.max(1, Math.abs(alarm.threshold) * 0.02);
  return value !== null && (alarm.condition === 'below' ? value > alarm.threshold + hysteresis : value < alarm.threshold - hysteresis);
}
