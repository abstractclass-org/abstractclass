import "@abstractclass/analysis/testing/svelteModules.ts";
import { test } from "node:test";
import assert from "node:assert/strict";

// The browser's parts that the theme uses: localStorage, the system's theme (matchMedia) and the page's data-theme.
const kept = new Map<string, string>();
let systemDark = false;
const root = { dataset: {} as Record<string, string> };
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => kept.get(k) ?? null,
    setItem: (k: string, v: string) => void kept.set(k, v),
    removeItem: (k: string) => void kept.delete(k),
  },
  matchMedia: () => ({ matches: systemDark, addEventListener() {} }),
  document: { documentElement: root },
});
const { setTheme, startTheme, theme } = await import("./theme.svelte.ts");

const KEY = "test-site:theme:1";

test("the theme starts from the choice kept under the site's key", () => {
  kept.set(KEY, "dark");
  startTheme(KEY);
  assert.equal(theme.choice, "dark");
  assert.equal(root.dataset.theme, "dark");
});

test("a choice is kept under the site's key, and the system's forgets it", () => {
  startTheme(KEY);
  setTheme("light");
  assert.equal(kept.get(KEY), "light");
  assert.equal(root.dataset.theme, "light");
  systemDark = true;
  setTheme("system");
  assert.equal(kept.has(KEY), false);
  assert.equal(root.dataset.theme, "dark");
});
