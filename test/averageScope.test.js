import test from 'node:test';
import assert from 'node:assert/strict';
import { isLiveAverageScope } from '../src/utils/averageScope.js';

test('session and today scopes are live while custom ranges remain manual', () => {
  assert.equal(isLiveAverageScope('session'), true);
  assert.equal(isLiveAverageScope('today'), true);
  assert.equal(isLiveAverageScope('custom'), false);
});
