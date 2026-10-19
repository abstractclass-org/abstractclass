// A store in memory in IndexedDB's place, for the unit tests of the code that reads and writes the site's store (db.ts):
// Node has no IndexedDB. It answers the requests of db.ts's reads and writes of values by their keys and of a store's
// keys (get, put, getAllKeys), in transactions that complete after their requests: in a timer, or in `later` (a
// microtask, for a test that mocks the timers). It counts the reads of a store's keys, so that a test can tell a read of
// some keys from a read of every key, and it lists the keys written. A test can hold the writes: their transactions
// complete, or fail and keep nothing, when it releases them. Call it before the first read or write: db.ts opens the
// store once.

export function memoryDb(later: (step: () => void) => void = step => setTimeout(step)) {
  const stores = new Map<string, Map<IDBValidKey, unknown>>(), written = new Map<string, IDBValidKey[]>();
  const held: ((ok: boolean) => void)[] = [];
  let scans = 0, holding = false;
  const rows = (name: string) => stores.get(name) ?? stores.set(name, new Map()).get(name)!;
  const puts = (name: string) => written.get(name) ?? written.set(name, []).get(name)!;
  const transaction = (_names: string[], mode: IDBTransactionMode = "readonly") => {
    const undo: (() => void)[] = []; // its writes, undone when it fails
    const objectStore = (name: string) => {
      const r = rows(name);
      return {
        get: (key: IDBValidKey) => ({ result: structuredClone(r.get(key)) }),
        getAllKeys: () => (scans++, { result: [...r.keys()].sort() }),
        put: (value: unknown, key: IDBValidKey) => {
          const had = r.has(key), old = r.get(key);
          undo.push(() => (had ? r.set(key, old) : r.delete(key)));
          r.set(key, structuredClone(value));
          puts(name).push(key);
          return { result: key };
        },
      };
    };
    const tx: { objectStore: typeof objectStore; oncomplete?: () => void; onerror?: () => void } = { objectStore };
    const end = (ok: boolean) => later(() => {
      if (!ok) undo.reverse().forEach(u => u());
      (ok ? tx.oncomplete : tx.onerror)?.();
    });
    if (holding && mode === "readwrite") held.push(end); else end(true);
    return tx;
  };
  globalThis.indexedDB = {
    open: () => {
      const req: { result: { transaction: typeof transaction }; onsuccess?: () => void } = { result: { transaction } };
      later(() => req.onsuccess?.());
      return req;
    },
  } as unknown as IDBFactory;
  return {
    rows, scans: () => scans,
    /** The keys written to the store `name`, in order: each write, also one that failed. */
    puts,
    /** Holds the writes from now on: their transactions wait for release(). */
    hold() { holding = true; },
    /** Completes the held writes, or fails them (`ok` false), and completes the later ones at once. */
    release(ok = true) { holding = false; for (const end of held.splice(0)) end(ok); },
  };
}
