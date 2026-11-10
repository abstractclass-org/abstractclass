// The colour arithmetic (colour.ts) against values that the standards give: CSS Color 4's OKLab of sRGB's red, and
// WCAG's contrast of black on white. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { contrast, distance, hexToLinear, hexToOklab, linearToHex, mix, oklabToLinear } from "./colour.ts";

const near = (x: number[], y: number[], within: number, what: string) =>
  x.forEach((v, i) => assert.ok(Math.abs(v - y[i]) < within, `${what}: ${x} against ${y}`));

test("OKLab of sRGB's red, white and black, as CSS Color 4 gives them", () => {
  near(hexToOklab("#ff0000"), [0.62796, 0.22486, 0.12585], 1e-4, "red");
  near(hexToOklab("#ffffff"), [1, 0, 0], 1e-4, "white");
  near(hexToOklab("#000000"), [0, 0, 0], 1e-9, "black");
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

test("WCAG's contrast: 21:1 for black on white, 1:1 for a colour on itself, in either order", () => {
  const [black, white] = [hexToLinear("#000000"), hexToLinear("#ffffff")];
  assert.equal(contrast(black, white), 21);
  assert.equal(contrast(white, black), 21);
  assert.equal(contrast(white, white), 1);
});

test("the distance in OKLab, and a mix from one colour at 0 to the other at 1", () => {
  const [x, y] = [hexToOklab("#ff0000"), hexToOklab("#ffffff")];
  assert.equal(distance(x, x), 0);
  assert.equal(distance(x, y), distance(y, x));
  assert.deepEqual(mix(x, y, 0), y);
  near(mix(x, y, 1), x, 1e-15, "the mix at 1");
  near(mix(x, y, 0.5), x.map((v, i) => (v + y[i]) / 2), 1e-15, "the mix at a half");
});
