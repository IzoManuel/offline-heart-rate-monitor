function niceStep(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

export function calculateLinearAxis(values, targetTickCount = 5) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return { min: 0, max: 1, step: 0.25, ticks: [0, 0.25, 0.5, 0.75, 1] };

  const dataMin = Math.min(...finite);
  const dataMax = Math.max(...finite);
  const observedSpan = dataMax - dataMin;
  const span = observedSpan || Math.max(Math.abs(dataMax) * 0.1, 1);
  const paddedMin = dataMin - span * 0.5;
  const paddedMax = dataMax + span * 0.25;
  const step = niceStep((paddedMax - paddedMin) / Math.max(2, targetTickCount - 1));
  const min = dataMin >= 0 ? Math.max(0, Math.floor(paddedMin / step) * step) : Math.floor(paddedMin / step) * step;
  const max = Math.max(min + step, Math.ceil(paddedMax / step) * step);
  const ticks = [];
  for (let value = min; value <= max + step / 2; value += step) {
    ticks.push(Number(value.toPrecision(12)));
  }
  return { min, max, step, ticks };
}

export function formatAxisTick(value, step) {
  if (step >= 1) return Math.round(value).toString();
  const decimals = Math.min(2, Math.max(1, Math.ceil(-Math.log10(step))));
  return value.toFixed(decimals);
}
