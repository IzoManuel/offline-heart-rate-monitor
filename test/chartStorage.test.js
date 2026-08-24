import test from 'node:test';
import assert from 'node:assert/strict';
import { boundChartPoints, findNearestPointIndex } from '../src/utils/chartStorage.js';

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
