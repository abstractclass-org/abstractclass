// The site's theme: the system's (the default), light or dark. The choice is kept in this browser, under the site's
// own key. The page's `data-theme` is always "light" or "dark", and the colour tokens in site.css follow it. A small
// script in the site's app.html sets it before the page draws, with the same key, so that a page never shows the other
// theme first. Here the menu changes it, and the system's theme is followed while the choice is "system".
import { readLocal, writeLocal } from "@abstractclass/storage/local.ts";

export type ThemeChoice = "system" | "light" | "dark";
export const THEME_CHOICES: [ThemeChoice, string][] = [["system", "System"], ["light", "Light"], ["dark", "Dark"]];

let key = ""; // the site's (startTheme, from SiteFrame's `themeKey`), also in its src/app.html
const DARK = "(prefers-color-scheme: dark)";

function stored(): ThemeChoice {
  const v = readLocal(key);
  return v === "light" || v === "dark" ? v : "system";
}

export const theme = $state({ choice: "system" as ThemeChoice });

function apply() {
  const dark = theme.choice === "dark" || (theme.choice === "system" && matchMedia(DARK).matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

/** Reads the choice kept under the site's key, and follows the system's theme while the choice is "system". Once, in
 *  the browser. */
export function startTheme(storageKey: string) {
  key = storageKey;
  theme.choice = stored();
  apply();
  matchMedia(DARK).addEventListener("change", () => { if (theme.choice === "system") apply(); });
}

/** Keeps a new choice, and applies it at once. "system" forgets the key. */
export function setTheme(choice: ThemeChoice) {
  theme.choice = choice;
  writeLocal(key, choice === "system" ? null : choice);
  apply();
}
