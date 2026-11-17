// The colour tokens of style sheets in each theme, read in Node: for the checks that compare colours (Hedge School's
// symbolShades.test.ts, the hub's scripts/enclosure-board.mjs) and for the pictures drawn from a site's colours
// (the link preview pictures: Cyanotype's src/lib/brand/card.ts, Hedge School's scripts/social-card.mjs). A site's
// tokens are in the blocks of each theme of its style sheets, as in site.css: the light theme's and the dark theme's.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

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

/** A style sheet's text after the texts of the sheets that it imports, as the browser reads them: each `@import` of a
 *  .css file at a line's start, in their order, as Node resolves it from the sheet's place, with what that sheet
 *  imports. Tailwind's import ("tailwindcss") names no .css file, and holds no site's tokens. */
function withImports(sheet: string | URL): string {
  const css = readFileSync(sheet, "utf8"), require = createRequire(sheet);
  const imported = [...css.matchAll(/^@import\s+["']([^"']+\.css)["']/gm)].map(m => withImports(require.resolve(m[1])));
  return [...imported, css].join("\n");
}

/** The tokens of each theme in a site's style sheets: the sheets that its own sheet `app` (its src/app.css) imports,
 *  then the own sheet. A later sheet's token takes the place of an earlier one's, as in the browser. A sheet with no
 *  theme's block (packages/practice's practice.css, a font's sheet) gives no tokens. */
export function siteThemes(app: string | URL) {
  const css = withImports(app);
  return themes(block(css, THEME_BLOCKS.light), block(css, THEME_BLOCKS.dark));
}

/** A site's tokens in one theme (siteThemes), as a lookup for a picture drawn from the site's colours: a token that
 *  the sheets do not hold stops the drawing. */
export function siteTokens(app: string | URL, theme: "light" | "dark"): (name: string) => string {
  const tokens = siteThemes(app)[theme];
  return name => {
    if (!tokens[name]) throw new Error(`the site's style sheets give no ${name} in the ${theme} theme`);
    return tokens[name];
  };
}
