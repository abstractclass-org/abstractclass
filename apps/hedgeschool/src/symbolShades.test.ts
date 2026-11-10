// Checks the position symbols' shades in app.css (the book's table, design 32, item 3): in each theme, each shade has a
// contrast of at least 3:1 against the panel and panel-2 (WCAG 1.4.11, the contrast of a graphic), the stronger the
// position, the farther its shade from the text's colour (in OKLab) and the lower its contrast, and a side's three
// shades step evenly in lightness (CIELAB L*). The contrast is WCAG's, from the relative luminance (colour.ts). The
// text's and the panels' colours are the shared ones (site.css). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { siteThemes } from "@abstractclass/site/themeTokens.ts";
import * as colour from "./lib/colour.ts";

// The tokens as the site's style imports them: the shared ones, the view's, then Hedge School's
const THEMES = siteThemes(["@abstractclass/site/site.css", "@abstractclass/review/review.css", "./app.css"]
  .map(sheet => new URL(import.meta.resolve(sheet))));

/** A token's colour: "#rrggbb". */
function hexOf(theme: Record<string, string>, name: string): string {
  const value = theme[name] ?? "";
  assert.match(value, /^#[\da-f]{6}$/i, `the token ${name}`);
  return value;
}
/** WCAG's contrast of two colours "#rrggbb". */
const contrast = (a: string, b: string) => colour.contrast(colour.hexToLinear(a), colour.hexToLinear(b));
/** CIELAB's lightness L*, from the relative luminance (white's 1, with L* 100). */
const lightness = (hex: string) => {
  const y = colour.luminance(colour.hexToLinear(hex));
  return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y;
};
/** The distance between two colours "#rrggbb" in OKLab. */
const distance = (a: string, b: string) => colour.distance(colour.hexToOklab(a), colour.hexToOklab(b));

for (const [name, theme] of Object.entries(THEMES)) {
  test(`the symbols' shades in the ${name} theme: 3:1 on the panels, the stronger, the farther from the text`, () => {
    for (const side of ["blue", "red"]) {
      const shades = ["slightly-better", "better", "winning"].map(s => hexOf(theme, `--${side}-${s}`));
      const [a, b, c] = shades.map(lightness);
      assert.ok(Math.abs((b - a) - (c - b)) < 1, `${side}'s steps in L*: ${(b - a).toFixed(1)} and ${(c - b).toFixed(1)}`);
      const fromText = shades.map(s => distance(s, hexOf(theme, "--text")));
      assert.ok(fromText[0] < fromText[1] && fromText[1] < fromText[2],
        `${side}'s distances from --text: ${fromText.map(d => d.toFixed(3))}`);
      for (const back of ["--panel", "--panel-2"]) {
        const ratios = shades.map(s => contrast(s, hexOf(theme, back)));
        ratios.forEach((r, k) => assert.ok(r >= 3, `${side} shade ${k + 1} on ${back}: ${r.toFixed(2)}:1`));
        assert.ok(ratios[0] > ratios[1] && ratios[1] > ratios[2], `${side} on ${back}: ${ratios.map(r => r.toFixed(2))}`);
      }
    }
  });
}
