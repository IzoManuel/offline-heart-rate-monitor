export const CHART_POINT_LIMIT = 1440;
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

export async function loadChartPoints(sessionStartedAt) {
  try {
    return await transact('readonly', (store, resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(boundChartPoints(
        request.result.filter(point => point.sessionStartedAt === sessionStartedAt)
      ));
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
          let excess = countRequest.result - CHART_POINT_LIMIT;
          if (excess <= 0) {
            resolve();
            return;
          }
          const cursorRequest = store.openCursor();
          cursorRequest.onerror = () => reject(cursorRequest.error);
          cursorRequest.onsuccess = event => {
            const cursor = event.target.result;
            if (!cursor || excess <= 0) {
              resolve();
              return;
            }
            cursor.delete();
            excess -= 1;
            cursor.continue();
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
