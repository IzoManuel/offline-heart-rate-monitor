export const DDFA_MIN_RR_MS = 200;
export const DDFA_MAX_RR_MS = 2000;
export const DDFA_MEDIAN_KERNEL = 7;
export const DDFA_MEDIAN_TOLERANCE = 0.10;
export const DDFA_SEGMENT_FACTOR = 5;
export const DDFA_MIN_SCALE = 5;
export const DDFA_MAX_SCALE = 20;
export const DDFA_HEADLINE_SCALE = 10;

function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

export function extractDDFAIntervals(readings) {
  return readings
    .flatMap(reading => reading.rrIntervals || [])
    .filter(value => Number.isFinite(value));
}

export function filterDDFAIntervals(intervals) {
  const bounded = intervals.filter(value => value >= DDFA_MIN_RR_MS && value <= DDFA_MAX_RR_MS);
  const radius = Math.floor(DDFA_MEDIAN_KERNEL / 2);
  const accepted = bounded.filter((value, index) => {
    const local = bounded.slice(Math.max(0, index - radius), index + radius + 1);
    const localMedian = median(local);
    return Math.abs(value - localMedian) <= DDFA_MEDIAN_TOLERANCE * localMedian;
  });
  return {
    accepted,
    inputCount: intervals.length,
    boundedCount: bounded.length,
    removedCount: intervals.length - accepted.length
  };
}

function solve3x3(matrix, vector) {
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < 3; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-12) return null;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    for (let item = column; item < 4; item += 1) augmented[column][item] /= divisor;
    for (let row = 0; row < 3; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let item = column; item < 4; item += 1) {
        augmented[row][item] -= factor * augmented[column][item];
      }
    }
  }
  return augmented.map(row => row[3]);
}

function quadraticResidualSum(values) {
  const center = (values.length - 1) / 2;
  let sx2 = 0;
  let sx4 = 0;
  let sy = 0;
  let sxy = 0;
  let sx2y = 0;
  for (let index = 0; index < values.length; index += 1) {
    const x = index - center;
    const x2 = x * x;
    sx2 += x2;
    sx4 += x2 * x2;
    sy += values[index];
    sxy += x * values[index];
    sx2y += x2 * values[index];
  }
  const coefficients = solve3x3(
    [[values.length, 0, sx2], [0, sx2, 0], [sx2, 0, sx4]],
    [sy, sxy, sx2y]
  );
  if (!coefficients) return null;
  return values.reduce((sum, value, index) => {
    const x = index - center;
    const fitted = coefficients[0] + coefficients[1] * x + coefficients[2] * x * x;
    return sum + (value - fitted) ** 2;
  }, 0);
}

export function ddfaFluctuation(segment, windowSize) {
  if (windowSize < 3 || segment.length < windowSize) return null;
  const mean = segment.reduce((sum, value) => sum + value, 0) / segment.length;
  let cumulative = 0;
  const profile = segment.map(value => (cumulative += value - mean));
  let squaredResiduals = 0;
  let residualCount = 0;
  for (let start = 0; start <= profile.length - windowSize; start += 1) {
    const residual = quadraticResidualSum(profile.slice(start, start + windowSize));
    if (residual === null) return null;
    squaredResiduals += residual;
    residualCount += windowSize;
  }
  if (!residualCount) return null;
  const fluctuation = Math.sqrt(squaredResiduals / residualCount);
  return fluctuation > 0 && Number.isFinite(fluctuation) ? fluctuation : null;
}

export function calculateDDFAExponent(intervals, scale) {
  const segmentLength = DDFA_SEGMENT_FACTOR * scale;
  if (!Number.isInteger(scale) || scale < DDFA_MIN_SCALE || intervals.length < segmentLength) return null;
  const segment = intervals.slice(-segmentLength);
  const lowerF = ddfaFluctuation(segment, scale - 1);
  const centerF = ddfaFluctuation(segment, scale);
  const upperF = ddfaFluctuation(segment, scale + 1);
  if (![lowerF, centerF, upperF].every(Number.isFinite)) return null;

  const hMinus = Math.log(scale) - Math.log(scale - 1);
  const hPlus = Math.log(scale + 1) - Math.log(scale);
  const numerator = hMinus ** 2 * Math.log(upperF) +
    (hPlus ** 2 - hMinus ** 2) * Math.log(centerF) -
    hPlus ** 2 * Math.log(lowerF);
  const denominator = hMinus * hPlus * (hMinus + hPlus);
  const alpha = numerator / denominator;
  return Number.isFinite(alpha) ? alpha : null;
}

export function analyzeDDFA(readings) {
  const filtered = filterDDFAIntervals(extractDDFAIntervals(readings));
  const largestScale = Math.min(DDFA_MAX_SCALE, Math.floor(filtered.accepted.length / DDFA_SEGMENT_FACTOR));
  const profile = [];
  for (let scale = DDFA_MIN_SCALE; scale <= largestScale; scale += 1) {
    const alpha = calculateDDFAExponent(filtered.accepted, scale);
    if (Number.isFinite(alpha)) profile.push({ scale, alpha });
  }
  const alpha10 = profile.find(point => point.scale === DDFA_HEADLINE_SCALE)?.alpha ?? null;
  return {
    available: Number.isFinite(alpha10),
    variant: 'DDFA-2',
    headlineScale: DDFA_HEADLINE_SCALE,
    alpha10,
    profile,
    inputCount: filtered.inputCount,
    acceptedCount: filtered.accepted.length,
    removedCount: filtered.removedCount,
    reason: Number.isFinite(alpha10) ? null : `At least ${DDFA_SEGMENT_FACTOR * DDFA_HEADLINE_SCALE} clean RR intervals are required for DDFA alpha10.`
  };
}
