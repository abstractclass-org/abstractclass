// Checks the position symbols' shades in site.css (Hedge School's book table, design 32, item 3): in each theme, each
// shade has a contrast of at least 3:1 against the panel and panel-2 (WCAG 1.4.11, the contrast of a graphic), the
// stronger the position, the farther its shade from the text's colour (in OKLab) and the lower its contrast, and a
// side's three shades step evenly in lightness (CIELAB L*). The contrast is WCAG's, from the relative luminance. Run:
// npm test.
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

/** A token's colour: "#rrggbb". */
function colour(theme: Map<string, string>, name: string): string {
  const value = theme.get(name) ?? "";
  assert.match(value, /^#[\da-f]{6}$/i, `the token ${name}`);
  return value;
}
/** The colour's linear sRGB channels. */
const linear = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
const luminance = (hex: string) => {
  const [r, g, b] = linear(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** CIELAB's lightness L*, from the relative luminance (white's 1, with L* 100). */
const lightness = (hex: string) => {
  const y = luminance(hex);
  return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y;
};
/** OKLab (Björn Ottosson's), from linear sRGB. */
const oklab = (hex: string) => {
  const [r, g, b] = linear(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
/** The distance between two colours in OKLab. */
const distance = (a: string, b: string) => {
  const to = oklab(b);
  return Math.hypot(...oklab(a).map((v, i) => v - to[i]));
};

for (const [name, theme] of Object.entries(THEMES)) {
  test(`the symbols' shades in the ${name} theme: 3:1 on the panels, the stronger, the farther from the text`, () => {
    for (const side of ["blue", "red"]) {
      const shades = ["slightly-better", "better", "winning"].map(s => colour(theme, `--${side}-${s}`));
      const [a, b, c] = shades.map(lightness);
      assert.ok(Math.abs((b - a) - (c - b)) < 1, `${side}'s steps in L*: ${(b - a).toFixed(1)} and ${(c - b).toFixed(1)}`);
      const fromText = shades.map(s => distance(s, colour(theme, "--text")));
      assert.ok(fromText[0] < fromText[1] && fromText[1] < fromText[2],
        `${side}'s distances from --text: ${fromText.map(d => d.toFixed(3))}`);
      for (const back of ["--panel", "--panel-2"]) {
        const ratios = shades.map(s => contrast(s, colour(theme, back)));
        ratios.forEach((r, k) => assert.ok(r >= 3, `${side} shade ${k + 1} on ${back}: ${r.toFixed(2)}:1`));
        assert.ok(ratios[0] > ratios[1] && ratios[1] > ratios[2], `${side} on ${back}: ${ratios.map(r => r.toFixed(2))}`);
      }
    }
  });
}
