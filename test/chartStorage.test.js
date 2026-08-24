import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateChartPoints,
  boundChartPoints,
  calendarBucketStart,
  compactChartPoints,
  findNearestPointIndex
} from '../src/utils/chartStorage.js';

test('sorts chart history and retains only the newest bounded points', () => {
  const points = [5, 1, 4, 2, 3].map(timestamp => ({ timestamp }));
  assert.deepEqual(boundChartPoints(points, 3).map(point => point.timestamp), [3, 4, 5]);
});

test('drops malformed chart points', () => {
  assert.deepEqual(boundChartPoints([{ timestamp: 1 }, {}, null]), [{ timestamp: 1 }]);
});

test('finds the nearest chart sample and favors the earlier point on a tie', () => {
  const points = [1000, 6000, 11000].map(timestamp => ({ timestamp }));
  assert.equal(findNearestPointIndex(points, 8200), 1);
  assert.equal(findNearestPointIndex(points, 8500), 1);
  assert.equal(findNearestPointIndex(points, 9000), 2);
  assert.equal(findNearestPointIndex(points, -100), 0);
  assert.equal(findNearestPointIndex(points, 99999), 2);
  assert.equal(findNearestPointIndex([], 1000), -1);
});

test('aggregates each available metric independently within a session bucket', () => {
  const points = [
    { sessionStartedAt: 1, timestamp: 1000, heartRate: 60, rmssd: null },
    { sessionStartedAt: 1, timestamp: 6000, heartRate: 80, rmssd: 40 },
    { sessionStartedAt: 2, timestamp: 7000, heartRate: 100, rmssd: 60 }
  ];
  const aggregated = aggregateChartPoints(points, 60000);
  assert.equal(aggregated.length, 2);
  assert.equal(aggregated[0].heartRate, 70);
  assert.equal(aggregated[0].rmssd, 40);
  assert.equal(aggregated[1].heartRate, 100);
});

test('compacts adjacent samples without averaging across session boundaries', () => {
  const points = [
    { sessionStartedAt: 1, timestamp: 1000, heartRate: 60 },
    { sessionStartedAt: 1, timestamp: 6000, heartRate: 80 },
    { sessionStartedAt: 2, timestamp: 11000, heartRate: 100 }
  ];
  const compacted = compactChartPoints(points);
  assert.equal(compacted.length, 2);
  assert.equal(compacted[0].heartRate, 70);
  assert.equal(compacted[0].sessionStartedAt, 1);
  assert.equal(compacted[1].heartRate, 100);
  assert.equal(compacted[1].sessionStartedAt, 2);
});

test('preserves weighted averages when already-compacted points are compacted again', () => {
  const points = [
    { sessionStartedAt: 1, timestamp: 1000, heartRate: 60, heartRateCount: 2, sampleCount: 2 },
    { sessionStartedAt: 1, timestamp: 6000, heartRate: 90, heartRateCount: 1, sampleCount: 1 }
  ];
  const [compacted] = compactChartPoints(points);
  assert.equal(compacted.heartRate, 70);
  assert.equal(compacted.heartRateCount, 3);
  assert.equal(compacted.sampleCount, 3);
});

test('uses local calendar boundaries for week, month, and year buckets', () => {
  const wednesday = new Date(2026, 7, 26, 15, 30).getTime();
  const monday = new Date(2026, 7, 24, 0, 0).getTime();
  assert.equal(calendarBucketStart(wednesday, 'week'), monday);
  assert.equal(calendarBucketStart(wednesday, 'month'), new Date(2026, 7, 1).getTime());
  assert.equal(calendarBucketStart(wednesday, 'year'), new Date(2026, 0, 1).getTime());
});

test('aggregates calendar periods while preserving separate sessions', () => {
  const points = [
    { sessionStartedAt: 1, timestamp: new Date(2026, 0, 2).getTime(), heartRate: 60 },
    { sessionStartedAt: 1, timestamp: new Date(2026, 0, 20).getTime(), heartRate: 80 },
    { sessionStartedAt: 2, timestamp: new Date(2026, 0, 21).getTime(), heartRate: 100 },
    { sessionStartedAt: 1, timestamp: new Date(2026, 1, 2).getTime(), heartRate: 90 }
  ];
  const monthly = aggregateChartPoints(points, 'month');
  assert.equal(monthly.length, 3);
  assert.equal(monthly[0].heartRate, 70);
  assert.equal(monthly[1].heartRate, 100);
  assert.equal(monthly[2].heartRate, 90);
});
