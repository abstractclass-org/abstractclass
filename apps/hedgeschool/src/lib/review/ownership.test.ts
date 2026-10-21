// The area map (ownership.ts, design 30): the engine's ownership of each point, or the change from the board now to it.
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { areaMap, occupancy, pointReading, shade } from "./ownership.ts";
import type { Edge, Position } from "./enclosure.ts";

const N = 19;
/** A board of 361 points with these values, by point, and 0 elsewhere. */
const values = (at: [number, number, number][]) => {
  const out = new Array<number>(N * N).fill(0);
  for (const [x, y, v] of at) out[y * N + x] = v;
  return out;
};
/** A square's four edges and its region, from (x, y) with side `s`. */
function square(x: number, y: number, s: number): { edges: Edge[]; ring: [number, number][] } {
  return {
    edges: [[x, y, x + s, y], [x + s, y, x + s, y + s], [x, y + s, x + s, y + s], [x, y, x, y + s]],
    ring: [[x, y], [x + s, y], [x + s, y + s], [x, y + s]],
  };
}
/** A position with Blue's square from (1, 1) of side 3 and Red's from (10, 10) of side 2. */
const blue = square(1, 1, 3), red = square(10, 10, 2);
const board = { edges: [blue.edges, red.edges], regions: [[{ area: 9, rings: [blue.ring] }], [{ area: 4, rings: [red.ring] }]] } as
  Pick<Position, "edges" | "regions">;

test("the ownership style shades each point for the side that the engine expects to hold it, as KaTrain does", () => {
  const map = areaMap("ownership", values([[7, 7, 100], [8, 7, -50], [9, 7, 20], [2, 2, 90]]), board, 0);
  assert.deepEqual(map[7 * N + 7], { kind: "hold", side: 0, strength: 1 });
  const half = map[7 * N + 8];
  assert.equal(half?.side, 1);
  assert.equal(half?.kind === "hold" && half.strength.toFixed(3), "0.594"); // KaTrain's gamma
  assert.equal(map[7 * N + 9]?.side, 0); // from 0, every value the engine gives shows
  assert.equal(map[2 * N + 2]?.side, 0); // the state: a region's own points too
  assert.equal(map[0], null); // a value of 0
});

test("the smallest value marked leaves out the points under it, in both styles", () => {
  const forecast = values([[7, 7, 100], [8, 7, -50], [9, 7, 20]]);
  assert.deepEqual(areaMap("ownership", forecast, board, 50).map(m => m?.side ?? null).filter(s => s !== null), [0, 1]);
  assert.equal(areaMap("ownership", forecast, board, 51)[7 * N + 8], null);
  assert.equal(areaMap("change", forecast, board, 30)[7 * N + 9], null);
  assert.deepEqual(areaMap("change", forecast, board, 0)[7 * N + 9], { kind: "close", side: 0 }); // the raw data
});

test("the change style: open area that a side will probably close, in that side's colour", () => {
  const map = areaMap("change", values([[7, 7, 80], [8, 7, -75], [9, 7, 30]]), board, 50);
  assert.deepEqual(map[7 * N + 7], { kind: "close", side: 0 });
  assert.deepEqual(map[7 * N + 8], { kind: "close", side: 1 });
  assert.equal(map[7 * N + 9], null); // a change too small to point at
});

test("the change style: closed area that its owner will probably lose, in the colour of the side that gains", () => {
  // (2, 2) is inside Blue's square: Blue holds it now, and the forecast is Red's
  const map = areaMap("change", values([[2, 2, -40], [3, 3, 90], [11, 11, 60], [2, 3, 70]]), board, 50);
  assert.deepEqual(map[2 * N + 2], { kind: "lose", side: 1 });
  assert.equal(map[3 * N + 3], null); // a region that stays its owner's gets nothing
  assert.deepEqual(map[11 * N + 11], { kind: "lose", side: 0 }); // Red's point, with Blue's forecast
  assert.equal(map[3 * N + 2], null); // 0.7 in Blue's own region: the change is −0.3, too small
});

test("a point on a wall is not inside its region: the engine counts the points strictly inside", () => {
  // (1, 2) is on Blue's left edge, so it is open now, and the forecast's 0.9 is a close
  const map = areaMap("change", values([[1, 2, 90], [4, 4, 90]]), board, 50);
  assert.deepEqual(map[2 * N + 1], { kind: "close", side: 0 });
  assert.deepEqual(map[4 * N + 4], { kind: "close", side: 0 });
  assert.deepEqual([occupancy(board)[2 * N + 2], occupancy(board)[11 * N + 11], occupancy(board)[2 * N + 1]], [1, -1, 0]);
});

test("a point's reading: its ownership, its state now, and the change", () => {
  assert.equal(pointReading(62, 0), "Blue 0.62 · now open · change 0.62 to Blue");
  assert.equal(pointReading(-40, 1), "Red 0.40 · now Blue's region · change 1.40 to Red");
  assert.equal(pointReading(100, 1), "Blue 1.00 · now Blue's region · no change");
  assert.equal(pointReading(0, -1), "even · now Red's region · change 1.00 to Blue");
});

test("KaTrain's shade: |v| ^ (1 / 1.33), capped at 1", () => {
  assert.deepEqual([shade(0), shade(100), shade(-100), shade(180)], [0, 1, 1, 1]);
});
