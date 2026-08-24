import test from 'node:test';
import assert from 'node:assert/strict';
import { boundChartPoints } from '../src/utils/chartStorage.js';

test('sorts chart history and retains only the newest bounded points', () => {
  const points = [5, 1, 4, 2, 3].map(timestamp => ({ timestamp }));
  assert.deepEqual(boundChartPoints(points, 3).map(point => point.timestamp), [3, 4, 5]);
});

test('drops malformed chart points', () => {
  assert.deepEqual(boundChartPoints([{ timestamp: 1 }, {}, null]), [{ timestamp: 1 }]);
});
