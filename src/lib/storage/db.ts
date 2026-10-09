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

export async function dbGet<T>(store: string, key: string): Promise<T | undefined> {
  const d = await openDb();
  if (!d) return undefined;
  return new Promise(resolve => {
    try {
      const req = d.transaction(store).objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export async function dbPut(store: string, key: string, value: unknown): Promise<boolean> {
  const d = await openDb();
  if (!d) return false;
  return new Promise(resolve => {
    try {
      const tx = d.transaction(store, "readwrite");
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function dbAll<T>(store: string): Promise<T[]> {
  const d = await openDb();
  if (!d) return [];
  return new Promise(resolve => {
    try {
      const req = d.transaction(store).objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}
