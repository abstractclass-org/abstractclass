// The site's store in the browser (IndexedDB): analyses (analysis/cache.ts) and the player's games (game/store.ts).
// A player's data lives here until a server exists (docs/design/04-product-shape.md). Storage can fail (a private
// window, blocked site data): then every call answers as if the store were empty, and the site still works.
//
// Versions: 1 had the analyses. 2 adds the games. An upgrade only adds stores, so data is never lost.

const NAME = "learn-enclosure", VERSION = 2;
export const STORES = { analysis: "analysis", games: "games" } as const;
let db: Promise<IDBDatabase | null> | null = null;

export function openDb(): Promise<IDBDatabase | null> {
  db ??= new Promise(resolve => {
    try {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        for (const store of Object.values(STORES))
          if (!req.result.objectStoreNames.contains(store)) req.result.createObjectStore(store);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return db;
}

/** Runs one request in its own transaction, and answers its result once the transaction completes, or `fallback` when
 *  storage fails. */
async function run<T>(store: string, mode: IDBTransactionMode, request: (s: IDBObjectStore) => IDBRequest, fallback: T): Promise<T> {
  const d = await openDb();
  if (!d) return fallback;
  return new Promise(resolve => {
    try {
      const tx = d.transaction(store, mode);
      const req = request(tx.objectStore(store));
      tx.oncomplete = () => resolve(req.result as T);
      tx.onerror = tx.onabort = () => resolve(fallback);
    } catch {
      resolve(fallback);
    }
  });
}

export const dbGet = <T>(store: string, key: string) => run<T | undefined>(store, "readonly", s => s.get(key), undefined);
export const dbAll = <T>(store: string) => run<T[]>(store, "readonly", s => s.getAll(), []);
/** Answers whether the browser kept the value. */
export const dbPut = async (store: string, key: string, value: unknown) =>
  (await run<IDBValidKey | false>(store, "readwrite", s => s.put(value, key), false)) !== false;
