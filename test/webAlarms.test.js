import test from 'node:test';
import assert from 'node:assert/strict';
import { isAlarmSafe, isAlarmViolated, loadWebAlarms, saveWebAlarms } from '../src/utils/webAlarms.js';

test('evaluates above and below thresholds with hysteresis', () => {
  const below = { metric: 'rmssd', condition: 'below', threshold: 10 };
  assert.equal(isAlarmViolated(below, 9), true);
  assert.equal(isAlarmSafe(below, 12), true);
  const above = { metric: 'heartRate', condition: 'above', threshold: 120 };
  assert.equal(isAlarmViolated(above, 121), true);
  assert.equal(isAlarmSafe(above, 117), true);
});

test('persists malformed-safe alarm lists locally', () => {
  const storage = { values: new Map(), getItem(key) { return this.values.get(key) ?? null; }, setItem(key, value) { this.values.set(key, value); } };
  const alarms = [{ id: '1', metric: 'brpm', condition: 'above', threshold: 30, repeatSeconds: 5 }];
  assert.equal(saveWebAlarms(alarms, storage), true);
  assert.deepEqual(loadWebAlarms(storage), alarms);
});
