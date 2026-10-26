// The site's store in the browser (IndexedDB): analyses (@abstractclass/analysis/cache.ts), the player's games (Hedge
// School's src/lib/game/store.ts), and the variations a player adds to a game's review
// (@abstractclass/analysis/analysis.svelte.ts). A player's data lives here until a server exists
// (docs/design/04-product-shape.md). Storage can fail (a private window, blocked site data): then every call answers as
// if the store were empty, and the site still works.
//
// Versions: 1 had the analyses. 2 adds the games. 3 adds the variations. An upgrade only adds stores, so data is never
// lost.

const NAME = "learn-enclosure", VERSION = 3;
export const STORES = { analysis: "analysis", games: "games", branches: "branches" } as const;
let db: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
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

/** Runs requests in one transaction, on `store` and the stores `also`: `body` sends them, and the getter it gives reads
 *  their results once the transaction completes. Answers `fallback` when storage fails. A value that the browser cannot
 *  copy (a Svelte state proxy: give $state.raw or $state.snapshot) also answers `fallback`, and the console shows the
 *  error: the fault is in the code, not in the storage. */
async function run<T>(store: string, mode: IDBTransactionMode, body: (s: IDBObjectStore, tx: IDBTransaction) => () => T, fallback: T,
                      also: string[] = []): Promise<T> {
  const d = await openDb();
  if (!d) return fallback;
  return new Promise(resolve => {
    try {
      const tx = d.transaction([store, ...also], mode);
      const result = body(tx.objectStore(store), tx);
      tx.oncomplete = () => resolve(result());
      tx.onerror = tx.onabort = () => resolve(fallback);
    } catch (e) {
      if (e instanceof DOMException && e.name === "DataCloneError")
        console.error("storage: a value the browser cannot copy", e);
      resolve(fallback);
    }
  });
}
/** A body of one request, whose result is the answer. */
const one = <T>(request: (s: IDBObjectStore) => IDBRequest) => (s: IDBObjectStore) => {
  const req = request(s);
  return () => req.result as T;
};

export const dbGet = <T>(store: string, key: string) => run<T | undefined>(store, "readonly", one(s => s.get(key)), undefined);
export const dbAll = <T>(store: string) => run<T[]>(store, "readonly", one(s => s.getAll()), []);
/** A store's keys, without its values. None when storage fails. */
export const dbKeys = (store: string) => run<IDBValidKey[]>(store, "readonly", one(s => s.getAllKeys()), []);
/** The keys and values of a store whose key `wanted` takes, in key order: the other values are not read. None when
 *  storage fails. */
export const dbEntriesWhere = <T>(store: string, wanted: (key: string) => boolean) =>
  run<[string, T][]>(store, "readonly", s => {
    const out: [string, T][] = [];
    const req = s.openKeyCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return;
      const key = String(c.key);
      if (wanted(key)) { const get = s.get(c.key); get.onsuccess = () => out.push([key, get.result as T]); }
      c.continue();
    };
    return () => out.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  }, []);
/** Several values of a store, read in one transaction: undefined where a key has none, and for every key when storage
 *  fails. */
export async function dbGetMany<T>(store: string, keys: string[]): Promise<(T | undefined)[]> {
  if (!keys.length) return [];
  return run(store, "readonly", s => {
    const reqs = keys.map(k => s.get(k));
    return () => reqs.map(r => r.result as T | undefined);
  }, keys.map(() => undefined));
}
/** Answers whether the browser kept the value. */
export const dbPut = async (store: string, key: string, value: unknown) =>
  (await run<IDBValidKey | false>(store, "readwrite", one(s => s.put(value, key)), false)) !== false;
/** Removes a key's value. Answers whether the browser removed it. */
export const dbDelete = async (store: string, key: string) =>
  (await run<undefined | false>(store, "readwrite", one(s => s.delete(key)), false)) !== false;
/** Removes the values of a store whose key `wanted` takes, in one transaction that reads the keys and removes them.
 *  Answers whether the browser removed them: false when storage fails, and when the read of the keys fails. */
export const dbDeleteWhere = (store: string, wanted: (key: string) => boolean) =>
  dbReadThenDelete(store, [], keys => keys.filter(wanted));
/** Reads every entry of the stores `read` (by store, in key order) and the keys of `store`, then removes the keys of
 *  `store` that `choose` takes from them. One transaction reads and removes, so that no write comes between. Answers
 *  whether the browser removed them: false when storage fails, and when `choose` throws. */
export const dbReadThenDelete = (store: string, read: string[],
                                 choose: (keys: string[], entries: Record<string, [string, unknown][]>) => Iterable<string>) =>
  run<boolean>(store, "readwrite", (s, tx) => {
    const entries: Record<string, [string, unknown][]> = {};
    for (const name of read) {
      const r = tx.objectStore(name), keys = r.getAllKeys(), values = r.getAll();
      values.onsuccess = () => { entries[name] = keys.result.map((k, i) => [String(k), values.result[i]]); };
    }
    // The requests of a transaction end in the order they were made: the keys come after the entries.
    const req = s.getAllKeys();
    req.onsuccess = () => { for (const key of choose(req.result.map(String), entries)) s.delete(key); };
    return () => true;
  }, false, read);
/** Puts several values in one transaction. Answers how many the browser kept: all, or none when storage fails. */
export async function dbPutMany(store: string, entries: [string, unknown][]): Promise<number> {
  if (!entries.length) return 0;
  return run(store, "readwrite", s => {
    for (const [key, value] of entries) s.put(value, key);
    return () => entries.length;
  }, 0);
}
