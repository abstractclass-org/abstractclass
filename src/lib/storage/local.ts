// Small values kept in this browser's localStorage: settings, a choice, the last game reviewed. And values kept for
// this tab's session alone (sessionStorage): a mark for the next page, a dialog shown once. Storage can be blocked (a
// private window, blocked site data) or absent (the build's prerender): then a read gives null, and a write lasts for
// this page only.

type Kind = "localStorage" | "sessionStorage";

function read(kind: Kind, key: string): string | null {
  try {
    return globalThis[kind].getItem(key);
  } catch {
    return null;
  }
}

function write(kind: Kind, key: string, value: string | null) {
  try {
    if (value === null) globalThis[kind].removeItem(key);
    else globalThis[kind].setItem(key, value);
  } catch {
    // Blocked storage: the value lasts for this page only.
  }
}

/** The text kept under `key`, or null. */
export const readLocal = (key: string) => read("localStorage", key);

/** The value kept under `key` as JSON, or null, also when the text is not JSON. */
export function readLocalJson<T>(key: string): T | null {
  try {
    return JSON.parse(readLocal(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}

/** Keeps `value` under `key`, or forgets the key (null). */
export const writeLocal = (key: string, value: string | null) => write("localStorage", key, value);

/** The text kept under `key` for this tab's session, or null. */
export const readSession = (key: string) => read("sessionStorage", key);

/** Keeps `value` under `key` for this tab's session, or forgets the key (null). */
export const writeSession = (key: string, value: string | null) => write("sessionStorage", key, value);
