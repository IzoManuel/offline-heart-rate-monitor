export function updateExtrema(extrema, value, occurredAt) {
  if (!Number.isFinite(value)) return extrema;

  const point = { value, occurredAt };
  if (!extrema) return { min: point, max: point };

  return {
    min: value < extrema.min.value ? point : extrema.min,
    max: value > extrema.max.value ? point : extrema.max
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
