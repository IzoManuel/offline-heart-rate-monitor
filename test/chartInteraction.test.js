import test from 'node:test';
import assert from 'node:assert/strict';
import { latestInspectionIndex, pointerInspectionEnabled } from '../src/utils/chartInteraction.js';

test('live following selects each newest point', () => {
  assert.equal(latestInspectionIndex(5, true, true), 4);
  assert.equal(latestInspectionIndex(6, true, true), 5);
});

test('disabled inspection or paused following does not force a point', () => {
  assert.equal(latestInspectionIndex(5, false, true), null);
  assert.equal(latestInspectionIndex(5, true, false), null);
  assert.equal(latestInspectionIndex(0, true, true), null);
});

test('latest lock prevents pointer inspection while retaining inspection when unlocked', () => {
  assert.equal(pointerInspectionEnabled(true, true), false);
  assert.equal(pointerInspectionEnabled(true, false), true);
  assert.equal(pointerInspectionEnabled(false, false), false);
});
