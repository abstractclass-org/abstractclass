// One tab reviews a game at a time (design 11). Each tab keeps the game's branches in memory and stores them whole, so
// two tabs on one game would store over each other's branches, and both would run the engine on the same positions.
// A tab holds the game's lock (the Web Locks API) while its review runs. Another tab for the game waits with a "Review
// here" button, which takes the lock: the first tab then stops its review. A browser without the API (none of the
// current ones) reviews in every tab, as before. The browser frees a lock when its page closes. holdLock and whenFree
// serve the site's other lock too: the Undo of a deleted game (store.ts).

const lockName = (id: string) => `learn-enclosure:review:${id}`;
const locks = () => (typeof navigator !== "undefined" ? navigator.locks : undefined);

/** Takes the game's lock for this tab: at once when no other tab holds it, or from the tab that holds it (`take`).
 *  Answers the function that frees it, or null when another tab holds it and `take` is false. `lost` runs when another
 *  tab takes the lock. */
export const holdReview = (id: string, take: boolean, lost: () => void) =>
  holdLock(lockName(id), take ? { steal: true } : { ifAvailable: true }, lost);

/** Requests the lock `name`. Answers the function that frees it once it is held, or null when `ifAvailable` finds it
 *  held. Without the API, or when the request fails, it answers a function that does nothing. `lost` runs when another
 *  tab takes the lock. */
export function holdLock(name: string, options: LockOptions, lost = () => {}): Promise<(() => void) | null> {
  const l = locks();
  if (!l) return Promise.resolve(() => {});
  return new Promise(resolve => {
    let free!: () => void;
    const held = new Promise<void>(r => (free = r));
    l.request(name, options, lock => {
      resolve(lock ? free : null);
      return lock ? held : undefined;
    }).catch((e: unknown) => {
      // Another tab took the lock: the request of the tab that held it fails with an AbortError.
      if (e instanceof DOMException && e.name === "AbortError") lost();
      else resolve(() => {});
    });
  });
}

/** Runs `work` with the lock `name` alone, when no tab holds it. False, with nothing done, when one does. Without the
 *  API, it runs `work`. */
export async function whenFree<T>(name: string, work: () => Promise<T>): Promise<T | false> {
  const l = locks();
  if (!l) return work();
  return l.request(name, { ifAvailable: true }, lock => (lock ? work() : false));
}
