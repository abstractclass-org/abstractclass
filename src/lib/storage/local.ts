// Small values kept in this browser's localStorage: settings, a choice, the last game reviewed. Storage can be blocked
// (a private window, blocked site data) or absent (the build's prerender): then a read gives null, and a write lasts for
// this page only.

/** The text kept under `key`, or null. */
export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** The value kept under `key` as JSON, or null, also when the text is not JSON. */
export function readLocalJson<T>(key: string): T | null {
  try {
    return JSON.parse(readLocal(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}

/** Keeps `value` under `key`, or forgets the key (null). */
export function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Blocked storage: the value lasts for this page only.
  }
}
