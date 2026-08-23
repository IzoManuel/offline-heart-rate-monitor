import test from 'node:test';
import assert from 'node:assert/strict';
import { completeHRVCycle, HRV_CYCLE_DURATION } from '../src/utils/hrvCycle.js';

function readings(start, count = 70, spread = 1) {
  return Array.from({ length: count }, (_, index) => ({
    heartRate: 72,
    rrIntervals: [start + (index % 7) * spread]
  }));
}

test('a completed two-minute window publishes results and immediately creates the next cycle', () => {
  assert.equal(HRV_CYCLE_DURATION, 120000);

  const completedAt = 120000;
  const transition = completeHRVCycle(readings(820), 1, completedAt);

  assert.equal(transition.results.cycleNumber, 1);
  assert.equal(transition.results.completedAt, completedAt);
  assert.equal(transition.results.rrCount, 70);
  assert.equal(transition.nextCycle.cycleNumber, 2);
  assert.equal(transition.nextCycle.startedAt, completedAt);
  assert.deepEqual(transition.nextCycle.readings, []);
});

test('each later cycle replaces metrics with its own window while continuing the sequence', () => {
  const first = completeHRVCycle(readings(800), 1, 120000);
  const second = completeHRVCycle(readings(900, 70, 3), first.nextCycle.cycleNumber, 240000);

  assert.equal(first.results.cycleNumber, 1);
  assert.equal(second.results.cycleNumber, 2);
  assert.notEqual(first.results.sdnn, second.results.sdnn);
  assert.equal(second.nextCycle.cycleNumber, 3);
  assert.equal(second.nextCycle.startedAt, 240000);
});

test('a no-data window still publishes its status and continues automatically', () => {
  const transition = completeHRVCycle([], 4, 600000);

  assert.equal(transition.results.error, 'No RR intervals found in data');
  assert.equal(transition.results.cycleNumber, 4);
  assert.equal(transition.nextCycle.cycleNumber, 5);
});
