// The weak walls (weakWalls.ts, design 30, "The weak walls"): the marks from the engine's field, by lattice point, the
// rings' colours, and a point's reading under the pointer. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { WeakWalls } from "@abstractclass/engine/protocol.ts";
import { siteThemes } from "@abstractclass/site/themeTokens.ts";
import * as colour from "../colour.ts";
import { WALL_MIN, chanceText, wallInk, wallMarks, wallReading } from "./weakWalls.ts";

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

test("a ring's colour: a ramp of three tokens from the smallest value marked to 1, the middle one at its half", () => {
  assert.equal(wallInk(WALL_MIN), "color-mix(in oklab, var(--wall-mid) 0%, var(--wall-low))");
  assert.equal(wallInk(0.325), "color-mix(in oklab, var(--wall-mid) 50%, var(--wall-low))");
  assert.equal(wallInk(0.55), "color-mix(in oklab, var(--wall-mid) 100%, var(--wall-low))");
  assert.equal(wallInk(0.775), "color-mix(in oklab, var(--wall-high) 50%, var(--wall-mid))");
  assert.equal(wallInk(1), "color-mix(in oklab, var(--wall-high) 100%, var(--wall-mid))");
  assert.equal(wallInk(0), wallInk(WALL_MIN)); // under the smallest value, as at it
});

// The tokens as the site's style imports them, by board: the shared ones, the view's, then Hedge School's
const THEMES = siteThemes(["@abstractclass/site/site.css", "@abstractclass/review/review.css", "../../app.css"]
  .map(sheet => new URL(import.meta.resolve(sheet))));
/** A token's colour on a board, through the tokens that it names (`var(--name)`). */
const colourOf = (theme: Record<string, string>, name: string): string => {
  const named = theme[name]?.match(/^var\((--[\w-]+)\)$/);
  return named ? colourOf(theme, named[1]) : theme[name];
};
/** OKLCH's hue, in degrees. */
const hue = ([, a, b]: number[]) => (Math.atan2(b, a) * 180) / Math.PI;

for (const [board, theme] of Object.entries(THEMES)) {
  /** A ring's colour on this board, in OKLab: its color-mix of two tokens, mixed in OKLab as the browser mixes it.
   *  A token that is not a colour "#rrggbb" stops the test (colour.ts). */
  const ink = (chance: number) => colour.tokenMix(wallInk(chance), name => theme[name]);

  test(`the rings on the ${board} board: the tokens at 10%, 55% and 1, the bolder, the likelier the cut`, () => {
    for (const [chance, token] of [[WALL_MIN, "--wall-low"], [0.55, "--wall-mid"], [1, "--wall-high"]] as const) {
      assert.ok(colour.distance(ink(chance), colour.hexToOklab(theme[token])) < 1e-9, `${chance}: ${token}`);
    }
    const back = colour.hexToOklab(theme["--board-bg"]);
    const contrasts = [WALL_MIN, 0.2, 0.35, 0.55, 0.7, 0.85, 1].map(c => colour.oklabContrast(ink(c), back));
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
    // The ramp of one hue before it: 0.055 on the light board, 0.047 on the dark
    const d = colour.distance(ink(0.7), ink(0.85));
    assert.ok(d > 0.06, `70% to 85%: ${d.toFixed(3)} in OKLab`);
  });

  test(`the rings on the ${board} board: apart from the players' red and the signs' green at every chance`, () => {
    /** The least distance in OKLab from a ring at a whole percentage, from 10% to 100%, to the token `name`. */
    const nearest = (name: string) => Math.min(...Array.from({ length: 91 },
      (_, i) => colour.distance(ink(WALL_MIN + i / 100), colour.hexToOklab(colourOf(theme, name)))));
    assert.ok(nearest("--red") >= 0.1, `to the players' red: ${nearest("--red").toFixed(3)}`);
    assert.ok(nearest("--sign-green") >= 0.14, `to the signs' green: ${nearest("--sign-green").toFixed(3)}`);
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
