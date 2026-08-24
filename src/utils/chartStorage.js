export const CHART_POINT_LIMIT = 10000;
export const CHART_METRICS = ['heartRate', 'rmssd', 'sdnn', 'brpm'];

function metricWeight(point, metric) {
  return Number.isFinite(point[metric]) ? (point[`${metric}Count`] ?? 1) : 0;
}
const DATABASE_NAME = 'offline-hr-monitor-history';
const DATABASE_VERSION = 1;
const STORE_NAME = 'trend-points';

export function boundChartPoints(points, limit = CHART_POINT_LIMIT) {
  return points
    .filter(point => Number.isFinite(point?.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-limit);
}

export function findNearestPointIndex(points, timestamp) {
  if (!points.length || !Number.isFinite(timestamp)) return -1;

  let low = 0;
  let high = points.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].timestamp < timestamp) low = middle + 1;
    else high = middle;
  }

  if (low === 0) return 0;
  const before = points[low - 1];
  const after = points[low];
  return timestamp - before.timestamp <= after.timestamp - timestamp ? low - 1 : low;
}

export function aggregateChartPoints(points, bucketMs) {
  const ordered = boundChartPoints(points, Number.MAX_SAFE_INTEGER);
  if (Number.isFinite(bucketMs) && bucketMs <= 5000) return ordered;
  const calendarGranularity = ['week', 'month', 'year'].includes(bucketMs) ? bucketMs : null;
  if (!calendarGranularity && !Number.isFinite(bucketMs)) return ordered;

  const buckets = new Map();
  for (const point of ordered) {
    const bucketStart = calendarGranularity
      ? calendarBucketStart(point.timestamp, calendarGranularity)
      : Math.floor(point.timestamp / bucketMs) * bucketMs;
    const key = `${point.sessionStartedAt ?? 'unknown'}:${bucketStart}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        sessionStartedAt: point.sessionStartedAt,
        timestamp: bucketStart,
        sampleCount: 0,
        metricTotals: Object.fromEntries(CHART_METRICS.map(metric => [metric, 0])),
        metricCounts: Object.fromEntries(CHART_METRICS.map(metric => [metric, 0]))
      };
      buckets.set(key, bucket);
    }
    bucket.sampleCount += point.sampleCount ?? 1;
    for (const metric of CHART_METRICS) {
      if (Number.isFinite(point[metric])) {
        const weight = metricWeight(point, metric);
        bucket.metricTotals[metric] += point[metric] * weight;
        bucket.metricCounts[metric] += weight;
      }
    }
  }

  return [...buckets.values()].map(bucket => ({
    sessionStartedAt: bucket.sessionStartedAt,
    timestamp: bucket.timestamp,
    sampleCount: bucket.sampleCount,
    ...Object.fromEntries(CHART_METRICS.map(metric => [
      metric,
      bucket.metricCounts[metric]
        ? bucket.metricTotals[metric] / bucket.metricCounts[metric]
        : null
    ])),
    ...Object.fromEntries(CHART_METRICS.map(metric => [`${metric}Count`, bucket.metricCounts[metric]]))
  })).sort((a, b) => a.timestamp - b.timestamp);
}

export function calendarBucketStart(timestamp, granularity) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  if (granularity === 'week') {
    const daysSinceMonday = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - daysSinceMonday);
  } else if (granularity === 'month') {
    date.setDate(1);
  } else if (granularity === 'year') {
    date.setMonth(0, 1);
  }
  return date.getTime();
}

export function compactChartPoints(points) {
  const ordered = boundChartPoints(points, Number.MAX_SAFE_INTEGER);
  const compacted = [];
  for (let index = 0; index < ordered.length; index += 1) {
    const first = ordered[index];
    const second = ordered[index + 1];
    if (!second || first.sessionStartedAt !== second.sessionStartedAt) {
      compacted.push(first);
      continue;
    }
    compacted.push({
      sessionStartedAt: first.sessionStartedAt,
      timestamp: Math.round((first.timestamp + second.timestamp) / 2),
      sampleCount: (first.sampleCount ?? 1) + (second.sampleCount ?? 1),
      ...Object.fromEntries(CHART_METRICS.map(metric => {
        const firstWeight = metricWeight(first, metric);
        const secondWeight = metricWeight(second, metric);
        const totalWeight = firstWeight + secondWeight;
        return [metric, totalWeight
          ? ((first[metric] ?? 0) * firstWeight + (second[metric] ?? 0) * secondWeight) / totalWeight
          : null];
      })),
      ...Object.fromEntries(CHART_METRICS.map(metric => [
        `${metric}Count`,
        metricWeight(first, metric) + metricWeight(second, metric)
      ]))
    });
    index += 1;
  }
  return compacted;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'timestamp' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transact(mode, operation) {
  return openDatabase().then(database => new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    operation(store, resolve, reject);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  }));
}

export async function loadChartPoints() {
  try {
    return await transact('readonly', (store, resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(boundChartPoints(request.result));
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

export async function saveChartPoint(point) {
  try {
    await transact('readwrite', (store, resolve, reject) => {
      const putRequest = store.put(point);
      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => {
        const countRequest = store.count();
        countRequest.onerror = () => reject(countRequest.error);
        countRequest.onsuccess = () => {
          if (countRequest.result <= CHART_POINT_LIMIT) {
            resolve();
            return;
          }
          const allRequest = store.getAll();
          allRequest.onerror = () => reject(allRequest.error);
          allRequest.onsuccess = () => {
            let compacted = compactChartPoints(allRequest.result);
            while (compacted.length > CHART_POINT_LIMIT) compacted = compactChartPoints(compacted);
            const clearRequest = store.clear();
            clearRequest.onerror = () => reject(clearRequest.error);
            clearRequest.onsuccess = () => {
              compacted.forEach(compactedPoint => store.put(compactedPoint));
              resolve();
            };
          };
        };
      };
    });
    return true;
  } catch {
    return false;
  }
}

export async function clearChartPoints() {
  try {
    await transact('readwrite', (store, resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    return true;
  } catch {
    return false;
  }
}
