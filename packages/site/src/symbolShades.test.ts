// Checks the position symbols' shades in site.css (Hedge School's book table, design 32, item 3): in each theme, each
// shade has a contrast of at least 3:1 against the panel and panel-2 (WCAG 1.4.11, the contrast of a graphic), and the
// stronger the position, the higher its contrast. The contrast is WCAG's, from the relative luminance. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./site.css", import.meta.url), "utf8");
/** The tokens of the rule whose selector is `selector`: the light theme's, or the dark theme's over the light's. */
function tokens(selector: string): Map<string, string> {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at >= 0, `site.css has the rule ${selector}`);
  const body = css.slice(at, css.indexOf("}", at));
  return new Map([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
}
const light = tokens(':root, [data-theme="light"]');
const THEMES = { light, dark: new Map([...light, ...tokens(':root[data-theme="dark"]')]) };

/** A token's colour, through var(): "#rrggbb". */
function colour(theme: Map<string, string>, name: string): string {
  const value = theme.get(name);
  assert.ok(value, `the token ${name}`);
  const ref = /^var\((--[\w-]+)\)$/.exec(value);
  return ref ? colour(theme, ref[1]) : value;
}
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

for (const [name, theme] of Object.entries(THEMES)) {
  test(`the symbols' shades in the ${name} theme: 3:1 against the panel, and the stronger, the higher`, () => {
    for (const side of ["blue", "red"]) {
      const shades = ["slightly-better", "better", "winning"].map(s => colour(theme, `--${side}-${s}`));
      for (const back of ["--panel", "--panel-2"]) {
        const ratios = shades.map(s => contrast(s, colour(theme, back)));
        ratios.forEach((r, k) => assert.ok(r >= 3, `${side} shade ${k + 1} on ${back}: ${r.toFixed(2)}:1`));
        assert.ok(ratios[0] < ratios[1] && ratios[1] < ratios[2], `${side} on ${back}: ${ratios.map(r => r.toFixed(2))}`);
      }
    }
  });
}
