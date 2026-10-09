// Analyses kept in the browser (IndexedDB), so that a review opened again needs no search. The engine is reproducible
// (the same request and build give the same reply), so a stored result equals a fresh one. The key names the engine
// build, the network's SHA-256, the position (its moves) and the visits. Storage can fail (a private window, blocked
// site data): then the cache keeps results in memory only.

const DB = "learn-enclosure", STORE = "analysis", VERSION = 1;
const memory = new Map<string, unknown>();
let db: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  db ??= new Promise(resolve => {
    try {
      const req = indexedDB.open(DB, VERSION);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return db;
}

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  if (memory.has(key)) return memory.get(key) as T;
  const d = await open();
  if (!d) return undefined;
  return new Promise(resolve => {
    try {
      const req = d.transaction(STORE).objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export async function cachePut(key: string, value: unknown): Promise<void> {
  memory.set(key, value);
  const d = await open();
  if (!d) return;
  try {
    d.transaction(STORE, "readwrite").objectStore(STORE).put(value, key);
  } catch {
    // Storage is a convenience: the result is still in memory.
  }
}

export const analysisKey = (build: string, model: string, moves: string[], visits: number) =>
  `${build}|${model}|${visits}|${moves.join(" ")}`;
