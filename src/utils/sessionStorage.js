export const SESSION_STORAGE_KEY = 'offline-hr-monitor.latest-session';
export const SESSION_SNAPSHOT_VERSION = 1;

export function createSessionSnapshot({
  sessionStartedAt,
  currentHR,
  stats,
  readingsCount,
  analysisResults,
  rmssdExtrema,
  brpmExtrema,
  savedAt = Date.now()
}) {
  return {
    version: SESSION_SNAPSHOT_VERSION,
    sessionStartedAt,
    savedAt,
    currentHR,
    stats,
    readingsCount,
    analysisResults,
    rmssdExtrema,
    brpmExtrema
  };
}

export function parseSessionSnapshot(serialized) {
  if (!serialized) return null;

  try {
    const snapshot = JSON.parse(serialized);
    const hasValidShape = snapshot?.version === SESSION_SNAPSHOT_VERSION &&
      Number.isFinite(snapshot.savedAt) &&
      Number.isFinite(snapshot.sessionStartedAt) &&
      Number.isFinite(snapshot.currentHR) &&
      Number.isFinite(snapshot.readingsCount) &&
      snapshot.stats &&
      Number.isFinite(snapshot.stats.average) &&
      Number.isFinite(snapshot.stats.min) &&
      Number.isFinite(snapshot.stats.max);

    return hasValidShape ? snapshot : null;
  } catch {
    return null;
  }
}

export function loadSessionSnapshot(storage = globalThis.localStorage) {
  try {
    return parseSessionSnapshot(storage?.getItem(SESSION_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveSessionSnapshot(snapshot, storage = globalThis.localStorage) {
  try {
    if (!parseSessionSnapshot(JSON.stringify(snapshot))) return false;
    storage?.setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function clearSessionSnapshot(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(SESSION_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
