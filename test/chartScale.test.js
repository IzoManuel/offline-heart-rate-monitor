import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLinearAxis, formatAxisTick } from '../src/utils/chartScale.js';

test('creates a padded clean linear domain containing every value', () => {
  const axis = calculateLinearAxis([62, 70, 81]);
  assert.ok(axis.min < 62);
  assert.ok(axis.max > 81);
  assert.ok(axis.ticks.includes(axis.min));
  assert.ok(axis.ticks.includes(axis.max));
  assert.equal(axis.ticks.every(tick => Number.isFinite(tick)), true);
});

test('includes zero only when padding naturally reaches it', () => {
  assert.equal(calculateLinearAxis([2, 4, 6]).min, 0);
  assert.ok(calculateLinearAxis([60, 70, 80]).min > 0);
});

test('handles flat and decimal series with readable ticks', () => {
  const flat = calculateLinearAxis([14, 14, 14]);
  assert.ok(flat.min < 14 && flat.max > 14);
  assert.equal(formatAxisTick(12.5, 0.5), '12.5');
  assert.equal(formatAxisTick(60, 5), '60');
});
