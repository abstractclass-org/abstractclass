// The colour arithmetic (colour.ts) against values that the standards give: OKLab's white and black (CSS Color 4,
// `oklab(1 0 0)` and `oklab(0 0 0)`), sRGB's red as the CSS Color test suite gives it (web-platform-tests,
// css/css-color/parsing/color-computed-color-mix-function.html: `color-mix(in oklch shorter hue, red, transparent)` is
// `oklch(0.627955 0.257683 29.2339 / 0.5)`, red's colour at half its alpha), and WCAG 2.2's contrast of black on white
// (21:1, the top of its range). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { contrast, distance, hexToLinear, hexToOklab, linearToHex, mix, oklabContrast, oklabToLinear, tokenMix }
  from "./colour.ts";

const near = (x: number[], y: number[], within: number, what: string) =>
  x.forEach((v, i) => assert.ok(Math.abs(v - y[i]) < within, `${what}: ${x} against ${y}`));

test("OKLab of sRGB's white, black and red, as CSS Color 4 and its test suite give them", () => {
  near(hexToOklab("#ffffff"), [1, 0, 0], 1e-6, "white");
  near(hexToOklab("#000000"), [0, 0, 0], 1e-9, "black");
  // The suite gives red in OKLCh, to six digits: OKLab's a is C cos h, and b is C sin h
  const [L, C, h] = [0.627955, 0.257683, (29.2339 * Math.PI) / 180];
  near(hexToOklab("#ff0000"), [L, C * Math.cos(h), C * Math.sin(h)], 1e-5, "red");
});

test("a colour comes back from OKLab and from linear sRGB as it was", () => {
  for (const hex of ["#000000", "#ffffff", "#c97a1e", "#1d4ed8", "#7f7f7f"]) {
    near(oklabToLinear(hexToOklab(hex)), hexToLinear(hex), 1e-6, hex);
    assert.equal(linearToHex(hexToLinear(hex)), hex);
  }
});

test("a colour out of sRGB's range is kept in it", () => {
  for (const c of oklabToLinear([0.7, 0.4, 0.4])) assert.ok(c >= 0 && c <= 1, `${c}`);
});

test("a colour that is not \"#rrggbb\" stops the caller", () => {
  for (const text of ["#fff", "var(--red)", "rgb(255 0 0)", "#12345g", undefined as unknown as string]) {
    assert.throws(() => hexToLinear(text), /not a colour "#rrggbb"/, `${text}`);
  }
});

test("WCAG's contrast: 21:1 for black on white, 1:1 for a colour on itself, in either order, also from OKLab", () => {
  const [black, white] = [hexToLinear("#000000"), hexToLinear("#ffffff")];
  assert.equal(contrast(black, white), 21);
  assert.equal(contrast(white, black), 21);
  assert.equal(contrast(white, white), 1);
  const [x, y] = [hexToOklab("#1d4ed8"), hexToOklab("#c97a1e")];
  assert.equal(oklabContrast(x, y), contrast(oklabToLinear(x), oklabToLinear(y)));
  assert.ok(Math.abs(oklabContrast(hexToOklab("#000000"), hexToOklab("#ffffff")) - 21) < 1e-6);
});

test("a color-mix of two tokens in OKLab: the mix of their colours, and no other form of text", () => {
  const colours: Record<string, string> = { "--a": "#ff0000", "--b": "#ffffff" };
  const [a, b] = [hexToOklab("#ff0000"), hexToOklab("#ffffff")];
  assert.deepEqual(tokenMix("color-mix(in oklab, var(--a) 40%, var(--b))", name => colours[name]), mix(a, b, 0.4));
  assert.deepEqual(tokenMix("color-mix(in oklab, var(--b) 100%, var(--a))", name => colours[name]), mix(b, a, 1));
  for (const text of ["color-mix(in srgb, var(--a) 40%, var(--b))",
                      "stroke: color-mix(in oklab, var(--a) 40%, var(--b))",
                      "color-mix(in oklab, var(--a), var(--b))", "#ff0000"]) {
    assert.throws(() => tokenMix(text, name => colours[name]), /not a color-mix of two tokens in OKLab/, text);
  }
  assert.throws(() => tokenMix("color-mix(in oklab, var(--a) 40%, var(--c))", name => colours[name]), /"#rrggbb"/);
});

test("the distance in OKLab, and a mix from one colour at 0 to the other at 1", () => {
  const [x, y] = [hexToOklab("#ff0000"), hexToOklab("#ffffff")];
  assert.equal(distance(x, x), 0);
  assert.equal(distance(x, y), distance(y, x));
  assert.deepEqual(mix(x, y, 0), y);
  near(mix(x, y, 1), x, 1e-15, "the mix at 1");
  near(mix(x, y, 0.5), x.map((v, i) => (v + y[i]) / 2), 1e-15, "the mix at a half");
});
