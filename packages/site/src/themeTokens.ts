// The colour tokens of style sheets in each theme, read in Node: for the checks that compare colours (Hedge School's
// symbolShades.test.ts, the hub's scripts/enclosure-board.mjs). A site's tokens are in two blocks of each of its style
// sheets, as in site.css: the light theme's and the dark theme's.
import { readFileSync } from "node:fs";

/** A site's theme blocks' openings: the light theme's and the dark theme's (site.css). */
export const THEME_BLOCKS = { light: ':root, [data-theme="light"] {', dark: ':root[data-theme="dark"] {' };

/** The block that starts with `open`, up to its closing brace at a line's start. */
export function block(css: string, open: string): string {
  const at = css.indexOf(open);
  if (at < 0) throw new Error(`no "${open}" block`);
  return css.slice(at, css.indexOf("\n}", at));
}

/** The tokens in a text: each `--name: value;`, by its name with its dashes. */
export const tokens = (css: string): Record<string, string> =>
  Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));

/** The tokens of each theme: a token that the dark theme does not set keeps the light theme's value. */
export function themes(light: string, dark: string): { light: Record<string, string>; dark: Record<string, string> } {
  const lit = tokens(light);
  return { light: lit, dark: { ...lit, ...tokens(dark) } };
}

/** The tokens of each theme in a site's style sheets, in the order that the site imports them: a later sheet's token
 *  takes the place of an earlier one's. */
export function siteThemes(...files: (string | URL)[]) {
  const sheets = files.map(file => readFileSync(file, "utf8"));
  const blocks = (open: string) => sheets.map(css => block(css, open)).join("\n");
  return themes(blocks(THEME_BLOCKS.light), blocks(THEME_BLOCKS.dark));
}
