// The site's store in the browser (IndexedDB): analyses (analysis/cache.ts), the player's games (game/store.ts), and
// the branches a player adds to a game's review (analysis/game.svelte.ts).
// A player's data lives here until a server exists (docs/design/04-product-shape.md). Storage can fail (a private
// window, blocked site data): then every call answers as if the store were empty, and the site still works.
//
// Versions: 1 had the analyses. 2 adds the games. 3 adds the branches. An upgrade only adds stores, so data is never
// lost.

const NAME = "learn-enclosure", VERSION = 3;
export const STORES = { analysis: "analysis", games: "games", branches: "branches" } as const;
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
/** The keys and values of a store whose key `wanted` takes, in key order: the other values are not read. None when
 *  storage fails. */
export async function dbEntriesWhere<T>(store: string, wanted: (key: string) => boolean): Promise<[string, T][]> {
  const d = await openDb();
  if (!d) return [];
  return new Promise(resolve => {
    const out: [string, T][] = [];
    try {
      const tx = d.transaction(store, "readonly"), s = tx.objectStore(store);
      const req = s.openKeyCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return;
        const key = String(c.key);
        if (wanted(key)) { const get = s.get(c.key); get.onsuccess = () => out.push([key, get.result as T]); }
        c.continue();
      };
      tx.oncomplete = () => resolve(out.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)));
      tx.onerror = tx.onabort = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}
/** Several values of a store, read in one transaction: undefined where a key has none, and for every key when storage
 *  fails. */
export async function dbGetMany<T>(store: string, keys: string[]): Promise<(T | undefined)[]> {
  const none = () => keys.map(() => undefined);
  const d = keys.length ? await openDb() : null;
  if (!d) return none();
  return new Promise(resolve => {
    try {
      const tx = d.transaction(store, "readonly"), s = tx.objectStore(store);
      const reqs = keys.map(k => s.get(k));
      tx.oncomplete = () => resolve(reqs.map(r => r.result as T | undefined));
      tx.onerror = tx.onabort = () => resolve(none());
    } catch {
      resolve(none());
    }
  });
}
/** Answers whether the browser kept the value. */
export const dbPut = async (store: string, key: string, value: unknown) =>
  (await run<IDBValidKey | false>(store, "readwrite", s => s.put(value, key), false)) !== false;
/** Removes a key's value. Answers whether the browser removed it. */
export const dbDelete = async (store: string, key: string) =>
  (await run<undefined | false>(store, "readwrite", s => s.delete(key), false)) !== false;
/** Puts several values in one transaction. Answers how many the browser kept: all, or none when storage fails. */
export async function dbPutMany(store: string, entries: [string, unknown][]): Promise<number> {
  const d = entries.length ? await openDb() : null;
  if (!d) return 0;
  return new Promise(resolve => {
    try {
      const tx = d.transaction(store, "readwrite"), s = tx.objectStore(store);
      for (const [key, value] of entries) s.put(value, key);
      tx.oncomplete = () => resolve(entries.length);
      tx.onerror = tx.onabort = () => resolve(0);
    } catch {
      resolve(0);
    }
  });
}
