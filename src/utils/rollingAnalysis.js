import { analyzeHRV } from './hrvCalculations.js';
import { estimateRespiratoryRate } from './respiratoryCalculations.js';

export const ANALYSIS_WINDOW_DURATION = 120000;
export const ANALYSIS_REFRESH_INTERVAL = 5000;

export function timestampReading(reading, receivedAt) {
  return { ...reading, receivedAt };
}

export function isRollingWindowReady(startedAt, now) {
  return startedAt !== null && now - startedAt >= ANALYSIS_WINDOW_DURATION;
}

export function pruneRollingReadings(readings, now) {
  const cutoff = now - ANALYSIS_WINDOW_DURATION;
  return readings.filter(reading => reading.receivedAt >= cutoff && reading.receivedAt <= now);
}

export function analyzeRollingWindow(readings, analyzedAt) {
  const windowReadings = pruneRollingReadings(readings, analyzedAt);
  return {
    ...analyzeHRV(windowReadings),
    respiration: estimateRespiratoryRate(windowReadings),
    analyzedAt,
    windowStartedAt: Math.max(
      analyzedAt - ANALYSIS_WINDOW_DURATION,
      windowReadings[0]?.receivedAt ?? analyzedAt
    )
  };
}
