import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { areTrendGraphPropsEqual } from '../src/utils/trendGraphMemo.js';

test('memoized trend graph skips renders when live clock updates keep points unchanged', () => {
  const points = [{ timestamp: 1, heartRate: 60 }];
  let renders = 0;
  const Chart = React.memo(() => {
    renders += 1;
    return null;
  }, areTrendGraphPropsEqual);

  let renderer;
  act(() => { renderer = TestRenderer.create(React.createElement(Chart, { points })); });
  act(() => { renderer.update(React.createElement(Chart, { points })); });
  assert.equal(renders, 1);

  act(() => { renderer.update(React.createElement(Chart, { points: [...points] })); });
  assert.equal(renders, 2);
});
