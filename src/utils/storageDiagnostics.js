export function formatStorageBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unavailable';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) { value /= 1024; unit = units[index]; }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${unit}`;
}

export function storageHealth(usage, quota) {
  if (!Number.isFinite(usage) || !Number.isFinite(quota) || quota <= 0) return { ratio: null, label: 'Unavailable', tone: 'neutral' };
  const ratio = Math.max(0, usage / quota);
  if (ratio >= 0.8) return { ratio, label: 'High Usage', tone: 'danger' };
  if (ratio >= 0.5) return { ratio, label: 'Monitor Usage', tone: 'warning' };
  return { ratio, label: 'Within Normal Range', tone: 'good' };
}

export async function readStorageDiagnostics({ environment = globalThis, loadPoints, countPoints } = {}) {
  const estimate = await environment.navigator?.storage?.estimate?.() || {};
  const pointCount = countPoints ? await countPoints() : (loadPoints ? (await loadPoints()).length : 0);
  return { usage: estimate.usage ?? null, quota: estimate.quota ?? null, pointCount, health: storageHealth(estimate.usage, estimate.quota) };
}
