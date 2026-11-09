// The weak walls (weakWalls.ts, design 30, "The weak walls"): the marks from the engine's field, by lattice point, the
// rings' colours, and a point's reading under the pointer. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { WeakWalls } from "@abstractclass/engine/protocol.ts";
import { WALL_MIN, chanceText, wallMarks, wallMix, wallReading } from "./weakWalls.ts";

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
