import { filterOutliers } from './hrvCalculations.js';

const MIN_INTERVALS = 60;
const MIN_DURATION_SECONDS = 60;
const MIN_FREQUENCY_HZ = 0.1;
const MAX_FREQUENCY_HZ = 0.5;
// A conservative floor helps avoid reporting the strongest peak in random noise.
const MIN_PEAK_RATIO = 8;

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function detrend(values, times) {
  const count = values.length;
  const meanTime = times.reduce((sum, value) => sum + value, 0) / count;
  const meanValue = values.reduce((sum, value) => sum + value, 0) / count;
  const denominator = times.reduce((sum, time) => sum + (time - meanTime) ** 2, 0);
  const slope = denominator === 0
    ? 0
    : times.reduce(
      (sum, time, index) => sum + (time - meanTime) * (values[index] - meanValue),
      0
    ) / denominator;

  return values.map((value, index) => value - (meanValue + slope * (times[index] - meanTime)));
}

/**
 * Lomb-Scargle power for unevenly sampled RR intervals.
 * This avoids pretending beat-to-beat measurements arrive on a fixed time grid.
 */
function lombScarglePower(times, values, frequency) {
  const omega = 2 * Math.PI * frequency;
  let sin2 = 0;
  let cos2 = 0;

  for (const time of times) {
    sin2 += Math.sin(2 * omega * time);
    cos2 += Math.cos(2 * omega * time);
  }

  const tau = Math.atan2(sin2, cos2) / (2 * omega);
  let cosineProjection = 0;
  let sineProjection = 0;
  let cosineEnergy = 0;
  let sineEnergy = 0;

  for (let index = 0; index < times.length; index++) {
    const phase = omega * (times[index] - tau);
    const cosine = Math.cos(phase);
    const sine = Math.sin(phase);
    cosineProjection += values[index] * cosine;
    sineProjection += values[index] * sine;
    cosineEnergy += cosine * cosine;
    sineEnergy += sine * sine;
  }

  if (cosineEnergy === 0 || sineEnergy === 0) return 0;
  return 0.5 * (
    (cosineProjection ** 2) / cosineEnergy +
    (sineProjection ** 2) / sineEnergy
  );
}

function describeRestingRate(rate) {
  if (rate < 12) return 'Below the typical adult resting range';
  if (rate <= 20) return 'Within the typical adult resting range';
  return 'Above the typical adult resting range';
}

/**
 * Estimate breathing rate from respiratory modulation in an RR tachogram.
 * This is an indirect wellness estimate, not a directly measured vital sign.
 */
export function estimateRespiratoryRate(readings) {
  const rrIntervals = filterOutliers(readings.flatMap(reading => reading.rrIntervals || []));

  if (rrIntervals.length < MIN_INTERVALS) {
    return {
      available: false,
      error: `Insufficient RR data: ${rrIntervals.length} intervals (need at least ${MIN_INTERVALS})`
    };
  }

  const times = [];
  let elapsedSeconds = 0;
  for (const interval of rrIntervals) {
    elapsedSeconds += interval / 1000;
    times.push(elapsedSeconds);
  }

  if (elapsedSeconds < MIN_DURATION_SECONDS) {
    return {
      available: false,
      error: `RR data covers only ${Math.round(elapsedSeconds)} seconds (need at least ${MIN_DURATION_SECONDS})`
    };
  }

  const signal = detrend(rrIntervals, times);
  const variance = signal.reduce((sum, value) => sum + value * value, 0) / signal.length;
  if (variance < 1) {
    return {
      available: false,
      error: 'RR variability is too small to identify a breathing rhythm'
    };
  }

  const frequencyStep = 1 / (elapsedSeconds * 4);
  const spectrum = [];
  for (let frequency = MIN_FREQUENCY_HZ; frequency <= MAX_FREQUENCY_HZ; frequency += frequencyStep) {
    spectrum.push({
      frequency,
      power: lombScarglePower(times, signal, frequency)
    });
  }

  const peak = spectrum.reduce((best, point) => point.power > best.power ? point : best);
  const background = spectrum
    .filter(point => Math.abs(point.frequency - peak.frequency) > frequencyStep * 2)
    .map(point => point.power);
  const backgroundPower = median(background);
  const peakRatio = backgroundPower > 0 ? peak.power / backgroundPower : 0;
  const atBoundary = peak.frequency <= MIN_FREQUENCY_HZ + frequencyStep ||
    peak.frequency >= MAX_FREQUENCY_HZ - frequencyStep;

  if (!Number.isFinite(peakRatio) || peakRatio < MIN_PEAK_RATIO || atBoundary) {
    return {
      available: false,
      error: 'No clear respiratory rhythm was found in this RR window',
      peakRatio: Number.isFinite(peakRatio) ? peakRatio : 0
    };
  }

  const breathsPerMinute = peak.frequency * 60;
  const confidence = Math.min(1, Math.max(0, (peakRatio - MIN_PEAK_RATIO) / 20));
  const quality = peakRatio >= 25 ? 'High' : peakRatio >= 12 ? 'Moderate' : 'Low';

  return {
    available: true,
    breathsPerMinute,
    quality,
    confidence,
    peakRatio,
    rrCount: rrIntervals.length,
    durationSeconds: elapsedSeconds,
    interpretation: describeRestingRate(breathsPerMinute),
    method: 'RR-derived respiratory sinus arrhythmia (Lomb–Scargle spectrum)'
  };
}
