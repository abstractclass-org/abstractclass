// A store in memory in IndexedDB's place, for the unit tests of the code that reads and writes the site's store
// (db.ts): Node has no IndexedDB. It answers the requests of db.ts's reads, writes and removals of values by their keys
// and of a store's keys and values (get, put, delete, getAllKeys, getAll, openKeyCursor), in transactions that complete
// after their requests: in a timer, or in `later` (a microtask, for a test that mocks the timers). It counts the reads
// of a store's keys, so that a test can tell a read of some keys from a read of every key, and it lists the keys
// written. A test can hold the writes: their transactions complete, or fail and keep nothing, when it releases them.
// Call it before the first read or write: db.ts opens the store once. A cursor's steps answer in microtasks: a test of
// dbEntriesWhere takes the default timer, so that its transaction completes after them.

export function memoryDb(later: (step: () => void) => void = step => setTimeout(step)) {
  const stores = new Map<string, Map<IDBValidKey, unknown>>(), written = new Map<string, IDBValidKey[]>();
  const held: ((ok: boolean) => void)[] = [];
  let scans = 0, holding = false;
  /** A request that answers its `onsuccess` in a microtask, when the caller sets one. */
  const answered = <R extends object>(req: R): R & { onsuccess?: () => void } => {
    const out: R & { onsuccess?: () => void } = req;
    queueMicrotask(() => out.onsuccess?.());
    return out;
  };
  const rows = (name: string) => stores.get(name) ?? stores.set(name, new Map()).get(name)!;
  const puts = (name: string) => written.get(name) ?? written.set(name, []).get(name)!;
  const transaction = (_names: string[], mode: IDBTransactionMode = "readonly") => {
    const undo: (() => void)[] = []; // its writes, undone when it fails
    const objectStore = (name: string) => {
      const r = rows(name);
      return {
        get: (key: IDBValidKey) => answered({ result: structuredClone(r.get(key)) }),
        getAllKeys: () => (scans++, answered({ result: [...r.keys()].sort() })),
        // Every value, in the order of their keys, as getAllKeys gives the keys (dbEntries). Both answer in the order
        // they were made, as dbReadThenDelete needs.
        getAll: () => answered({ result: [...r.keys()].sort().map(k => structuredClone(r.get(k))) }),
        delete: (key: IDBValidKey) => {
          const had = r.has(key), old = r.get(key);
          undo.push(() => { if (had) r.set(key, old); });
          r.delete(key);
          return { result: undefined };
        },
        // A cursor over the keys in order (dbEntriesWhere): each step answers in a microtask, before the transaction
        // completes in its timer. It counts as a read of every key.
        openKeyCursor: () => {
          scans++;
          const keys = [...r.keys()].sort();
          let i = 0;
          const req: { result: { key: IDBValidKey; continue(): void } | null; onsuccess?: () => void } = { result: null };
          const step = () => {
            req.result = i < keys.length ? { key: keys[i], continue: () => { i++; queueMicrotask(step); } } : null;
            req.onsuccess?.();
          };
          queueMicrotask(step);
          return req;
        },
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
