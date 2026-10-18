// A store in memory in IndexedDB's place, for the unit tests of the code that reads and writes the site's store (db.ts):
// Node has no IndexedDB. It answers the requests of db.ts's reads and writes of values by their keys and of a store's
// keys (get, put, getAllKeys), in transactions that complete after their requests. It counts the reads of a store's
// keys, so that a test can tell a read of some keys from a read of every key. Call it before the first read or write:
// db.ts opens the store once.

export function memoryDb() {
  const stores = new Map<string, Map<IDBValidKey, unknown>>();
  let scans = 0;
  const rows = (name: string) => stores.get(name) ?? stores.set(name, new Map()).get(name)!;
  const objectStore = (name: string) => {
    const r = rows(name);
    return {
      get: (key: IDBValidKey) => ({ result: structuredClone(r.get(key)) }),
      getAllKeys: () => (scans++, { result: [...r.keys()].sort() }),
      put: (value: unknown, key: IDBValidKey) => (r.set(key, structuredClone(value)), { result: key }),
    };
  };
  const transaction = () => {
    const tx: { objectStore: typeof objectStore; oncomplete?: () => void } = { objectStore };
    setTimeout(() => tx.oncomplete?.());
    return tx;
  };
  globalThis.indexedDB = {
    open: () => {
      const req: { result: { transaction: typeof transaction }; onsuccess?: () => void } = { result: { transaction } };
      setTimeout(() => req.onsuccess?.());
      return req;
    },
  } as unknown as IDBFactory;
  return { rows, scans: () => scans };
}
