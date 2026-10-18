// A store in memory in IndexedDB's place, for the unit tests of the code that reads and writes the site's store (db.ts):
// Node has no IndexedDB. It answers the requests that db.ts sends, in transactions that complete after their requests,
// and counts the requests by kind, so that a test can tell a read of some keys from a read of every key. Call it before
// the first read or write: db.ts opens the store once.

export function memoryDb() {
  const stores = new Map<string, Map<IDBValidKey, unknown>>();
  const counts: Record<string, number> = {};
  const rows = (name: string) => stores.get(name) ?? stores.set(name, new Map()).get(name)!;
  const request = (kind: string, result: () => unknown) => {
    counts[kind] = (counts[kind] ?? 0) + 1;
    return { result: result() };
  };
  const objectStore = (name: string) => {
    const r = rows(name);
    return {
      get: (key: IDBValidKey) => request("get", () => structuredClone(r.get(key))),
      getAll: () => request("getAll", () => [...r.values()].map(v => structuredClone(v))),
      getAllKeys: () => request("getAllKeys", () => [...r.keys()].sort()),
      put: (value: unknown, key: IDBValidKey) => request("put", () => (r.set(key, structuredClone(value)), key)),
      delete: (key: IDBValidKey) => request("delete", () => void r.delete(key)),
    };
  };
  const database = {
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    createObjectStore: rows,
    transaction: () => {
      const tx: { objectStore: typeof objectStore; oncomplete?: () => void } = { objectStore };
      setTimeout(() => tx.oncomplete?.());
      return tx;
    },
  };
  globalThis.indexedDB = {
    open: () => {
      const req: { result: typeof database; onupgradeneeded?: () => void; onsuccess?: () => void } = { result: database };
      setTimeout(() => { req.onupgradeneeded?.(); req.onsuccess?.(); });
      return req;
    },
  } as unknown as IDBFactory;
  return { rows, counts };
}
