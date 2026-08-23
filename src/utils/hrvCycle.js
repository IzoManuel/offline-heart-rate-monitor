import { analyzeHRV } from './hrvCalculations.js';

export const HRV_CYCLE_DURATION = 120000;

/**
 * Publish one HRV window and define the immediately following empty window.
 * Keeping this transition pure makes the continuous-cycle behavior testable.
 */
export function completeHRVCycle(readings, cycleNumber, completedAt) {
  return {
    results: {
      ...analyzeHRV(readings),
      cycleNumber,
      completedAt
    },
    nextCycle: {
      cycleNumber: cycleNumber + 1,
      startedAt: completedAt,
      readings: []
    }
  };
}
