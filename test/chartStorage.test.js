import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateChartPoints,
  boundChartPoints,
  calendarBucketStart,
  compactChartPoints,
  countChartPoints,
  findNearestPointIndex,
  saveChartPoint
} from '../src/utils/chartStorage.js';

function createIndexedDbSoakDouble() {
  const records = new Map();
  let openCount = 0;
  let transactionCount = 0;
  const request = (result, callback) => {
    const operation = { result, onsuccess: null, onerror: null };
    queueMicrotask(() => {
      callback?.();
      operation.onsuccess?.({ target: operation });
    });
    return operation;
  };
  const database = {
    objectStoreNames: { contains: () => true },
    transaction: () => {
      transactionCount += 1;
      const transaction = { oncomplete: null, onerror: null };
      const store = {
        put: value => request(value, () => records.set(value.timestamp, value)),
        count: () => request(records.size),
        getAll: () => request([...records.values()]),
        clear: () => request(undefined, () => records.clear())
      };
      queueMicrotask(() => transaction.oncomplete?.());
      return { objectStore: () => store, ...transaction };
    },
    close: () => {}
  };
  return {
    indexedDB: {
      open: () => {
        openCount += 1;
        const opened = { result: database, onupgradeneeded: null, onsuccess: null, onerror: null };
        queueMicrotask(() => {
          opened.onupgradeneeded?.({ target: opened });
          opened.onsuccess?.({ target: opened });
        });
        return opened;
      }
    },
    get openCount() { return openCount; },
    get transactionCount() { return transactionCount; },
    get size() { return records.size; }
  };
}

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

test('simulates a multi-day five-second charting session with bounded IndexedDB writes', async () => {
  const fake = createIndexedDbSoakDouble();
  const originalIndexedDb = globalThis.indexedDB;
  globalThis.indexedDB = fake.indexedDB;
  try {
    // 20,000 five-second samples is more than a day and exercises the same
    // save/compact path used by a continuously connected sensor.
    for (let index = 0; index < 20_000; index += 1) {
      await saveChartPoint({ timestamp: index * 5_000, sessionStartedAt: 1, heartRate: 60 + (index % 30) });
    }
    assert.equal(fake.openCount, 1);
    assert.equal(fake.transactionCount <= 2_000, true);
    assert.equal(fake.size <= 10_000, true);
    assert.equal(await countChartPoints(), fake.size);
  } finally {
    globalThis.indexedDB = originalIndexedDb;
  }
});
