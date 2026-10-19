// Persistent storage for the player's games and analyses (the Storage API's `persist`). Without it, the browser keeps
// the site's data as best-effort storage: it may delete it when the disk is almost full, and Safari deletes it after
// seven days of use without a visit. The site asks once a page: when the player keeps something (a game imported or
// loaded, the board's analysis), and in the Review tab when the browser holds games. Chrome and Edge answer without a
// question, from how the visitor uses the site. Firefox asks the visitor. A browser without the API keeps the data as
// before.

let asked: Promise<boolean> | null = null;

/** Asks the browser to keep the site's data, once a page. True when the data is persistent. */
export function keepStorage(): Promise<boolean> {
  asked ??= (async () => {
    try {
      if (!navigator.storage?.persist) return false;
      return (await navigator.storage.persisted()) || (await navigator.storage.persist());
    } catch {
      return false;
    }
  })();
  return asked;
}

/** Whether the browser keeps the site's data for good: null when the browser cannot say. */
export async function storageKept(): Promise<boolean | null> {
  try {
    return navigator.storage?.persisted ? await navigator.storage.persisted() : null;
  } catch {
    return null;
  }
}
