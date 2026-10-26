export function updateExtrema(extrema, value, occurredAt) {
  if (!Number.isFinite(value)) return extrema;

  const point = { value, occurredAt };
  if (!extrema) return { min: point, max: point, average: value, count: 1, total: value };

  const count = (extrema.count ?? 1) + 1;
  const total = (extrema.total ?? extrema.average ?? extrema.min.value) + value;

  return {
    min: value < extrema.min.value ? point : extrema.min,
    max: value > extrema.max.value ? point : extrema.max,
    average: total / count,
    count,
    total
  };
}

export function calculateHeartRateStats(readings) {
  const validReadings = readings.filter(reading => reading.value > 0);
  if (validReadings.length === 0) {
    return { average: 0, max: 0, min: 0, maxAt: null, minAt: null };
  }

  const total = validReadings.reduce((sum, reading) => sum + reading.value, 0);
  const extrema = validReadings.reduce(
    (current, reading) => updateExtrema(current, reading.value, reading.receivedAt),
    null
  );

  return {
    average: Math.round(total / validReadings.length),
    max: extrema.max.value,
    min: extrema.min.value,
    maxAt: extrema.max.occurredAt,
    minAt: extrema.min.occurredAt
  };
}

// Keep the live BPM summary bounded. Storing every notification in React state
// causes an ever-growing array and clones that array on every sensor update.
export const EMPTY_HEART_RATE_STATS = Object.freeze({
  average: 0,
  max: 0,
  min: 0,
  maxAt: null,
  minAt: null,
  count: 0,
  total: 0
});

export function updateHeartRateStats(stats, value, occurredAt) {
  if (!Number.isFinite(value) || value <= 0) return stats;

  const previous = stats?.count ? stats : EMPTY_HEART_RATE_STATS;
  const count = previous.count + 1;
  const total = previous.total + value;
  const minPoint = previous.count === 0 || value < previous.min
    ? { value, occurredAt }
    : { value: previous.min, occurredAt: previous.minAt };
  const maxPoint = previous.count === 0 || value > previous.max
    ? { value, occurredAt }
    : { value: previous.max, occurredAt: previous.maxAt };

  return {
    average: Math.round(total / count),
    max: maxPoint.value,
    min: minPoint.value,
    maxAt: maxPoint.occurredAt,
    minAt: minPoint.occurredAt,
    count,
    total
  };
}
