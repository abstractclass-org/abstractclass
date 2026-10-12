// One tab reviews a game at a time (design 11). Each tab keeps the game's branches in memory and stores them whole, so
// two tabs on one game would store over each other's branches, and both would run the engine on the same positions.
// A tab holds the game's lock (the Web Locks API) while its review runs. Another tab for the game waits with a "Review
// here" button, which takes the lock: the first tab then stops its review. A browser without the API (none of the
// current ones) reviews in every tab, as before. The browser frees a lock when its page closes.

const lockName = (id: string) => `learn-enclosure:review:${id}`;

/** Takes the game's lock for this tab: at once when no other tab holds it, or from the tab that holds it (`take`).
 *  Answers the function that frees it, or null when another tab holds it and `take` is false. `lost` runs when another
 *  tab takes the lock. */
export function holdReview(id: string, take: boolean, lost: () => void): Promise<(() => void) | null> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks) return Promise.resolve(() => {});
  return new Promise(resolve => {
    let free!: () => void;
    const held = new Promise<void>(r => (free = r));
    locks.request(lockName(id), take ? { steal: true } : { ifAvailable: true }, lock => {
      resolve(lock ? free : null);
      return lock ? held : undefined;
    }).catch((e: unknown) => {
      // Another tab took the lock: the request of the tab that held it fails with an AbortError.
      if (e instanceof DOMException && e.name === "AbortError") lost();
    });
  });
}
