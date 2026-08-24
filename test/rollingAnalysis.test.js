import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYSIS_REFRESH_INTERVAL,
  ANALYSIS_WINDOW_DURATION,
  analyzeRollingWindow,
  isRollingWindowReady,
  pruneRollingReadings,
  timestampReading
} from '../src/utils/rollingAnalysis.js';

function readings(startAt, count = 75, interval = 850, spread = 1) {
  return Array.from({ length: count }, (_, index) => timestampReading({
    heartRate: 72,
    rrIntervals: [interval + (index % 7) * spread]
  }, startAt + index * 1000));
}

test('uses a five-second refresh interval and a two-minute rolling window', () => {
  assert.equal(ANALYSIS_REFRESH_INTERVAL, 5000);
  assert.equal(ANALYSIS_WINDOW_DURATION, 120000);
});

test('waits for the initial two-minute window before publishing results', () => {
  assert.equal(isRollingWindowReady(1000, 120999), false);
  assert.equal(isRollingWindowReady(1000, 121000), true);
});

test('prunes readings older than two minutes without splitting into overlapping tests', () => {
  const now = 200000;
  const input = [
    timestampReading({ rrIntervals: [800] }, 79000),
    timestampReading({ rrIntervals: [810] }, 80000),
    timestampReading({ rrIntervals: [820] }, 200000)
  ];

  const retained = pruneRollingReadings(input, now);
  assert.deepEqual(retained.map(reading => reading.receivedAt), [80000, 200000]);
});

test('recomputes results from the retained rolling data every refresh', () => {
  const firstNow = 100000;
  const firstWindow = readings(25000, 75, 820, 1);
  const first = analyzeRollingWindow(firstWindow, firstNow);

  const secondNow = firstNow + ANALYSIS_REFRESH_INTERVAL;
  const secondWindow = [
    ...firstWindow,
    ...readings(101000, 5, 900, 4)
  ];
  const second = analyzeRollingWindow(secondWindow, secondNow);

  assert.equal(first.error, null);
  assert.equal(second.error, null);
  assert.equal(second.analyzedAt - first.analyzedAt, 5000);
  assert.ok(second.rrCount > first.rrCount);
  assert.notEqual(second.sdnn, first.sdnn);
});

test('returns a safe insufficient-data state until enough RR intervals arrive', () => {
  const result = analyzeRollingWindow(readings(0, 10), 10000);

  assert.match(result.error, /Insufficient data/);
  assert.equal(result.respiration.available, false);
});
