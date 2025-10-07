/**
 * HRV (Heart Rate Variability) Calculation Utilities
 *
 * Provides functions for calculating HRV metrics from RR intervals:
 * - RMSSD: Root Mean Square of Successive Differences (short-term HRV)
 * - SDNN: Standard Deviation of NN intervals (overall HRV)
 * - Fake RR interval detection
 * - Data filtering and validation
 */

/**
 * Calculate RMSSD (Root Mean Square of Successive Differences)
 * Measures short-term heart rate variability
 *
 * Formula: sqrt(mean(diff(RR[i] - RR[i-1])^2))
 *
 * @param {number[]} rrIntervals - Array of RR intervals in milliseconds
 * @returns {number|null} RMSSD value in milliseconds, or null if insufficient data
 */
export function calculateRMSSD(rrIntervals) {
  if (rrIntervals.length < 2) return null;

  // Calculate successive differences and square them
  const squaredDifferences = [];
  for (let i = 1; i < rrIntervals.length; i++) {
    const diff = rrIntervals[i] - rrIntervals[i - 1];
    squaredDifferences.push(diff * diff);  // Square BEFORE averaging
  }

  // Mean of squared differences
  const meanSquared = squaredDifferences.reduce((a, b) => a + b, 0) / squaredDifferences.length;

  // Square root of the mean
  return Math.sqrt(meanSquared);
}

/**
 * Calculate SDNN (Standard Deviation of NN intervals)
 * Measures overall heart rate variability
 *
 * NN intervals = Normal-to-Normal intervals (RR intervals with ectopic beats removed)
 *
 * @param {number[]} rrIntervals - Array of RR intervals in milliseconds
 * @returns {number|null} SDNN value in milliseconds, or null if insufficient data
 */
export function calculateSDNN(rrIntervals) {
  if (rrIntervals.length < 2) return null;

  // Filter to get NN intervals (remove ectopic beats)
  const nnIntervals = filterEctopicBeats(rrIntervals);

  if (nnIntervals.length < 2) return null;

  // Calculate mean of NN intervals
  const mean = nnIntervals.reduce((a, b) => a + b, 0) / nnIntervals.length;

  // Calculate variance
  const variance = nnIntervals
    .map(nn => Math.pow(nn - mean, 2))
    .reduce((a, b) => a + b, 0) / nnIntervals.length;

  // Standard deviation
  return Math.sqrt(variance);
}

/**
 * Filter out ectopic beats to get NN (normal-to-normal) intervals
 * Removes intervals that differ by >20% from the median RR interval
 *
 * Ectopic beats are abnormal heartbeats that can skew HRV analysis
 *
 * @param {number[]} rrIntervals - Array of RR intervals in milliseconds
 * @returns {number[]} Filtered array of NN intervals
 */
export function filterEctopicBeats(rrIntervals) {
  if (rrIntervals.length < 3) return rrIntervals;

  // Calculate median RR interval
  const sorted = [...rrIntervals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];

  // Filter out beats that differ >20% from median
  return rrIntervals.filter(rr => {
    const percentDiff = Math.abs(rr - median) / median;
    return percentDiff <= 0.20;  // Keep if within 20% of median
  });
}

/**
 * Detect fake RR intervals (calculated as 60000/HR instead of measured)
 *
 * Some heart rate monitors don't measure actual RR intervals, but instead
 * calculate them from the heart rate as: RR = 60000 / HR
 * This defeats HRV analysis as it shows zero variability.
 *
 * Detection strategy: If RR intervals are within 1ms of the calculated value
 * (60000/HR), they're likely fake.
 *
 * @param {Object[]} readings - Array of heart rate readings with rrIntervals
 * @param {number} readings[].heartRate - Heart rate in BPM
 * @param {number[]} readings[].rrIntervals - Array of RR intervals in ms
 * @returns {Object} Detection result with isSuspicious flag, confidence, and message
 */
export function detectFakeRRIntervals(readings) {
  let suspiciousCount = 0;
  let totalChecked = 0;

  for (const reading of readings) {
    if (!reading.rrIntervals || reading.rrIntervals.length === 0) continue;

    // Calculate what the RR interval would be if it were fake (calculated from HR)
    const expectedRR = 60000 / reading.heartRate;

    for (const rr of reading.rrIntervals) {
      const absoluteError = Math.abs(rr - expectedRR);

      // If within 1ms of calculated value, likely fake
      // Real RR intervals should vary more than 1ms
      if (absoluteError <= 1) {
        suspiciousCount++;
      }
      totalChecked++;
    }
  }

  if (totalChecked === 0) {
    return {
      isSuspicious: false,
      confidence: 0,
      message: null
    };
  }

  const suspiciousRatio = suspiciousCount / totalChecked;

  return {
    isSuspicious: suspiciousRatio > 0.8,
    confidence: suspiciousRatio,
    message: suspiciousRatio > 0.8
      ? '⚠️ RR intervals appear calculated (60000/HR) rather than measured. HRV accuracy is compromised.'
      : null
  };
}

/**
 * Filter out physiologically impossible RR intervals
 * Removes values outside the 300-2000ms range
 * (Corresponds to heart rates between 30-200 BPM)
 *
 * @param {number[]} rrIntervals - Array of RR intervals in milliseconds
 * @returns {number[]} Filtered array with outliers removed
 */
export function filterOutliers(rrIntervals) {
  return rrIntervals.filter(rr => rr >= 300 && rr <= 2000);
}

/**
 * Validate HRV data quality
 * Checks if there's sufficient data for reliable HRV analysis
 *
 * @param {number[]} rrIntervals - Array of RR intervals in milliseconds
 * @returns {Object} Validation result with isValid flag and message
 */
export function validateHRVData(rrIntervals) {
  const MIN_INTERVALS = 60;  // Minimum ~1 minute of data at 60 BPM

  if (rrIntervals.length < MIN_INTERVALS) {
    return {
      isValid: false,
      message: `Insufficient data: ${rrIntervals.length} intervals (need at least ${MIN_INTERVALS})`
    };
  }

  // Check if we have any valid intervals after filtering
  const filtered = filterOutliers(rrIntervals);
  if (filtered.length < MIN_INTERVALS) {
    return {
      isValid: false,
      message: `Too many outliers: only ${filtered.length} valid intervals remaining`
    };
  }

  return {
    isValid: true,
    message: null
  };
}

/**
 * Calculate all HRV metrics from a set of readings
 * Convenience function that performs all calculations and validations
 *
 * @param {Object[]} readings - Array of heart rate readings with rrIntervals
 * @returns {Object|null} HRV analysis results or null if insufficient data
 */
export function analyzeHRV(readings) {
  // Extract all RR intervals from readings
  const allRRIntervals = readings.flatMap(r => r.rrIntervals || []);

  if (allRRIntervals.length === 0) {
    return {
      error: 'No RR intervals found in data',
      hasRRData: false
    };
  }

  // Filter outliers
  const filtered = filterOutliers(allRRIntervals);

  // Validate data quality
  const validation = validateHRVData(filtered);
  if (!validation.isValid) {
    return {
      error: validation.message,
      hasRRData: true
    };
  }

  // Detect fake RR intervals
  const fakeDetection = detectFakeRRIntervals(readings);

  // Calculate metrics
  const rmssd = calculateRMSSD(filtered);
  const sdnn = calculateSDNN(filtered);

  return {
    rmssd,
    sdnn,
    rrCount: filtered.length,
    warning: fakeDetection.message,
    fakeConfidence: fakeDetection.confidence,
    hasRRData: true,
    error: null
  };
}
