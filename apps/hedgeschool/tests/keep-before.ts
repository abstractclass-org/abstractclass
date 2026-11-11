import type { Page } from "@playwright/test";

/** Keeps `value` in the browser's storage at `key` before the page's code runs, on each load from now on, as from an
 *  earlier visit. A write after page.goto can come before the first load's code reads the storage (abscls-z0jz):
 *  docs/working-notes.md, "A page's code runs after page.goto returns". Use it in a case whose page loads once: the
 *  script writes the value again at each later load. */
export const keepBefore = (page: Page, key: string, value: object) => page.addInitScript(([k, v]) => {
  try { localStorage.setItem(k, v); } catch { /* about:blank has no storage */ }
}, [key, JSON.stringify(value)]);
