import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHeartRateStats, updateExtrema } from '../src/utils/sessionExtrema.js';

test('calculates BPM extrema with the time each first occurred', () => {
  const stats = calculateHeartRateStats([
    { value: 72, receivedAt: 1000 },
    { value: 64, receivedAt: 2000 },
    { value: 91, receivedAt: 3000 },
    { value: 64, receivedAt: 4000 }
  ]);

  assert.equal(stats.average, 73);
  assert.deepEqual({ value: stats.min, occurredAt: stats.minAt }, { value: 64, occurredAt: 2000 });
  assert.deepEqual({ value: stats.max, occurredAt: stats.maxAt }, { value: 91, occurredAt: 3000 });
});

test('updates RMSSD extrema while preserving occurrence times', () => {
  let extrema = updateExtrema(null, 42.5, 5000);
  extrema = updateExtrema(extrema, 35.2, 10000);
  extrema = updateExtrema(extrema, 51.8, 15000);
  extrema = updateExtrema(extrema, 40.1, 20000);

  assert.deepEqual(extrema.min, { value: 35.2, occurredAt: 10000 });
  assert.deepEqual(extrema.max, { value: 51.8, occurredAt: 15000 });
});

test('ignores invalid extrema samples', () => {
  const extrema = { min: { value: 20, occurredAt: 1 }, max: { value: 30, occurredAt: 2 } };
  assert.deepEqual(updateExtrema(extrema, Number.NaN, 3), extrema);
});

test('tracks decimal BRPM extrema and their refresh times', () => {
  let extrema = updateExtrema(null, 15.4, 5000);
  extrema = updateExtrema(extrema, 13.8, 10000);
  extrema = updateExtrema(extrema, 17.1, 15000);

  assert.deepEqual(extrema.min, { value: 13.8, occurredAt: 10000 });
  assert.deepEqual(extrema.max, { value: 17.1, occurredAt: 15000 });
});
