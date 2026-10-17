// The site's theme: the system's (the default), light or dark. The choice is kept in this browser. The page's
// `data-theme` is always "light" or "dark", and the colour tokens in app.css follow it. A small script in app.html
// sets it before the page draws, with the same key, so that a page never shows the other theme first. Here the menu
// changes it, and the system's theme is followed while the choice is "system".
import { readLocal, writeLocal } from "#lib/storage/local.ts";

export type ThemeChoice = "system" | "light" | "dark";
export const THEME_CHOICES: [ThemeChoice, string][] = [["system", "System"], ["light", "Light"], ["dark", "Dark"]];

const KEY = "hedge-school:theme:1"; // also in src/app.html
const DARK = "(prefers-color-scheme: dark)";

function stored(): ThemeChoice {
  const v = readLocal(KEY);
  return v === "light" || v === "dark" ? v : "system";
}

export const theme = $state({ choice: "system" as ThemeChoice });

function apply() {
  const dark = theme.choice === "dark" || (theme.choice === "system" && matchMedia(DARK).matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

/** Reads the kept choice, and follows the system's theme while the choice is "system". Once, in the browser. */
export function startTheme() {
  theme.choice = stored();
  apply();
  matchMedia(DARK).addEventListener("change", () => { if (theme.choice === "system") apply(); });
}

/** Keeps a new choice, and applies it at once. "system" forgets the key. */
export function setTheme(choice: ThemeChoice) {
  theme.choice = choice;
  writeLocal(KEY, choice === "system" ? null : choice);
  apply();
}
