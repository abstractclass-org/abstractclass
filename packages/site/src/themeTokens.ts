// The colour tokens of style sheets in each theme, read in Node: for the checks that compare colours (Hedge School's
// symbolShades.test.ts, the hub's scripts/enclosure-board.mjs) and for the pictures drawn from a site's colours
// (Cyanotype's link preview picture, src/lib/brand/card.ts). A site's tokens are in the blocks of each theme of its
// style sheets, as in site.css: the light theme's and the dark theme's.
import { readFileSync } from "node:fs";

/** A site's theme blocks' openings: the light theme's and the dark theme's (site.css). */
const THEME_BLOCKS = { light: ':root, [data-theme="light"] {', dark: ':root[data-theme="dark"] {' };

/** The blocks that start with `open` at a line's start, each up to its closing brace at a line's start, as one text.
 *  A style sheet can give a theme's tokens in two blocks: Cyanotype's src/app.css gives its accent's, then its board's.
 *  A block nested in another one (indented) is not one of them. */
export function block(css: string, open: string): string {
  const blocks: string[] = [];
  for (let at = css.indexOf(open); at >= 0; at = css.indexOf(open, at + open.length))
    if (at === 0 || css[at - 1] === "\n") blocks.push(css.slice(at, css.indexOf("\n}", at)));
  if (!blocks.length) throw new Error(`no "${open}" block`);
  return blocks.join("\n");
}

/** The tokens in a text: each `--name: value;`, by its name with its dashes. */
const tokens = (css: string): Record<string, string> =>
  Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));

/** The tokens of each theme: a token that the dark theme does not set keeps the light theme's value. */
export function themes(light: string, dark: string): { light: Record<string, string>; dark: Record<string, string> } {
  const lit = tokens(light);
  return { light: lit, dark: { ...lit, ...tokens(dark) } };
}

/** The tokens of each theme in a site's style sheets, in the order that the site imports them: a later sheet's token
 *  takes the place of an earlier one's. */
export function siteThemes(files: (string | URL)[]) {
  const sheets = files.map(file => readFileSync(file, "utf8"));
  const blocks = (open: string) => sheets.map(css => block(css, open)).join("\n");
  return themes(blocks(THEME_BLOCKS.light), blocks(THEME_BLOCKS.dark));
}
