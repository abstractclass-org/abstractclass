// The weak walls (weakWalls.ts, design 30, "The weak walls"): the marks from the engine's field, by lattice point, the
// rings' colours, and a point's reading under the pointer. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { WeakWalls } from "@abstractclass/engine/protocol.ts";
import { siteThemes } from "@abstractclass/site/themeTokens.ts";
import { WALL_MIN, chanceText, wallInk, wallMarks, wallMix, wallReading } from "./weakWalls.ts";

const N = 19;
/** The engine's field with these chances, by player and point, and null elsewhere. */
function field(at: { b?: [number, number, number][]; r?: [number, number, number][] }): WeakWalls {
  const side = (points: [number, number, number][] = []) => {
    const out = new Array<number | null>(N * N).fill(null);
    for (const [x, y, v] of points) out[y * N + x] = v;
    return out;
  };
  return { b: side(at.b), r: side(at.r) };
}

test("a mark at each point of either player's edges whose chance is at least the smallest marked", () => {
  const walls = field({ b: [[3, 4, 0.62], [4, 4, 0.05], [5, 4, WALL_MIN]], r: [[10, 0, 0.9]] });
  assert.deepEqual(wallMarks(walls), [
    { x: 5, y: 4, chance: WALL_MIN },
    { x: 3, y: 4, chance: 0.62 },
    { x: 10, y: 0, chance: 0.9 },
  ]); // weakest first, so that the strongest marks draw on top
});

test("the index of a point is y * 19 + x, row 1 first, as the ownership's", () => {
  const walls = field({ r: [[0, 18, 0.5]] });
  assert.equal(walls.r[18 * N], 0.5);
  assert.deepEqual(wallMarks(walls), [{ x: 0, y: 18, chance: 0.5 }]);
});

test("no marks without edges", () => {
  assert.deepEqual(wallMarks(field({})), []);
});

test("a point on both players' maps, which the engine never gives, has one mark: Blue's", () => {
  // The engine repository's design 04: an edge that crosses or touches the other player's edge removes it, or is
  // illegal, so a point is on one player's edges only. Should a field hold both, one mark shows, not two over each other.
  const walls = field({ b: [[7, 7, 0.2]], r: [[7, 7, 0.7]] });
  assert.deepEqual(wallMarks(walls), [{ x: 7, y: 7, chance: 0.2 }]);
  assert.equal(wallReading([7, 7], walls), "H8 · Blue · cut chance 20%");
});

test("a chance out of the range, or not a number, gets no mark", () => {
  const walls = field({ b: [[1, 1, Number.NaN], [2, 2, 1.2], [3, 3, -0.1]] });
  assert.deepEqual(wallMarks(walls), []);
});

test("a ring's colour: the ramp goes from its faint end at the smallest value marked to its bold end at 1", () => {
  assert.equal(wallMix(WALL_MIN), 0);
  assert.equal(wallMix(1), 100);
  assert.equal(wallMix(0.55), 50);
  assert.equal(wallMix(0), 0); // under the smallest value, as at it
});

test("a ring's colour: a ramp of three tokens, through the middle one at the ramp's half", () => {
  assert.equal(wallInk(WALL_MIN), "color-mix(in oklab, var(--wall-mid) 0%, var(--wall-low))");
  assert.equal(wallInk(0.325), "color-mix(in oklab, var(--wall-mid) 50%, var(--wall-low))");
  assert.equal(wallInk(0.55), "color-mix(in oklab, var(--wall-mid) 100%, var(--wall-low))");
  assert.equal(wallInk(0.775), "color-mix(in oklab, var(--wall-high) 50%, var(--wall-mid))");
  assert.equal(wallInk(1), "color-mix(in oklab, var(--wall-high) 100%, var(--wall-mid))");
});

// The tokens as the site's style imports them, by board: the shared ones, the view's, then Hedge School's
const THEMES = siteThemes(["@abstractclass/site/site.css", "@abstractclass/review/review.css", "../../app.css"]
  .map(sheet => new URL(import.meta.resolve(sheet))));
const linear = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
/** OKLab (Björn Ottosson's), from a colour "#rrggbb". */
function oklab(hex: string): number[] {
  assert.match(hex ?? "", /^#[\da-f]{6}$/i);
  const [r, g, b] = linear(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
/** WCAG's relative luminance of an OKLab colour, cut to sRGB's range. */
function luminance([L, a, b]: number[]): number {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const [r, g, bl] = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
    .map(c => Math.min(1, Math.max(0, c)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}
const contrast = (x: number[], y: number[]) => {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};
const distance = (x: number[], y: number[]) => Math.hypot(...x.map((v, i) => v - y[i]));
/** OKLCH's hue, in degrees. */
const hue = ([, a, b]: number[]) => (Math.atan2(b, a) * 180) / Math.PI;

for (const [board, theme] of Object.entries(THEMES)) {
  /** A ring's colour on this board, in OKLab: its color-mix of two tokens, mixed in OKLab as the browser mixes it. */
  const ink = (chance: number) => {
    const [, hi, p, lo] = wallInk(chance).match(/^color-mix\(in oklab, var\((--[\w-]+)\) (\d+)%, var\((--[\w-]+)\)\)$/)!;
    const [x, y] = [oklab(theme[hi]), oklab(theme[lo])];
    return y.map((v, i) => v + (x[i] - v) * (Number(p) / 100));
  };

  test(`the rings on the ${board} board: the tokens at 10%, 55% and 1, the bolder, the likelier the cut`, () => {
    for (const [chance, token] of [[WALL_MIN, "--wall-low"], [0.55, "--wall-mid"], [1, "--wall-high"]] as const) {
      assert.ok(distance(ink(chance), oklab(theme[token])) < 1e-9, `${chance}: ${token}`);
    }
    const back = oklab(theme["--board-bg"]);
    const contrasts = [WALL_MIN, 0.2, 0.35, 0.55, 0.7, 0.85, 1].map(c => contrast(ink(c), back));
    for (let i = 1; i < contrasts.length; i++) {
      assert.ok(contrasts[i] > contrasts[i - 1], `contrasts against the board: ${contrasts.map(c => c.toFixed(2))}`);
    }
    assert.ok(contrasts[0] >= 2, `the faintest ring: ${contrasts[0].toFixed(2)}:1`);
  });

  const hues = board === "light" ? "yellow, orange, brown" : "brown, orange, yellow";
  test(`the rings on the ${board} board: three hues from the faint end, ${hues}`, () => {
    const [faint, middle, bold] = [WALL_MIN, 0.55, 1].map(c => hue(ink(c)));
    const [yellow, brown] = board === "light" ? [faint, bold] : [bold, faint];
    assert.ok(yellow > middle + 15 && middle > brown + 10, `hues: ${[faint, middle, bold].map(h => h.toFixed(0))}`);
  });

  test(`the rings on the ${board} board: 70% and 85% read apart`, () => {
    // The ramp of one hue that D replaced: 0.055 on the light board, 0.047 on the dark
    const d = distance(ink(0.7), ink(0.85));
    assert.ok(d > 0.06, `70% to 85%: ${d.toFixed(3)} in OKLab`);
  });
}

test("a point's reading: whose wall, and the chance that an edge there is cut, never an edge's chance", () => {
  const walls = field({ b: [[4, 4, 0.623]], r: [[10, 0, 0.004]] });
  assert.equal(wallReading([4, 4], walls), "E5 · Blue · cut chance 62%");
  assert.equal(wallReading([10, 0], walls), "L1 · Red · cut chance under 1%");
  assert.equal(wallReading([0, 0], walls), null); // no edge passes there (the columns skip I: x 10 is L)
});

test("the chances as the readings write them: whole percentages, and the ends named", () => {
  assert.equal(chanceText(0.5), "50%");
  assert.equal(chanceText(0.004), "under 1%");
  assert.equal(chanceText(0.996), "over 99%");
  assert.equal(chanceText(0), "0%");
  assert.equal(chanceText(1), "100%");
});
