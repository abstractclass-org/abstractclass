// The area map (ownership.ts, design 30): the change from the board now to the engine's forecast. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { changeMap } from "./ownership.ts";
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

test("open area that a side will probably close: marked in that side's colour", () => {
  const map = changeMap(values([[7, 7, 80], [8, 7, -75], [9, 7, 30]]), board);
  assert.deepEqual(map[7 * N + 7], { kind: "close", side: 0 });
  assert.deepEqual(map[7 * N + 8], { kind: "close", side: 1 });
  assert.equal(map[7 * N + 9], null); // a change too small to point at
});

test("closed area that its owner will probably lose: marked in the colour of the side that gains", () => {
  // (2, 2) is inside Blue's square: Blue holds it now, and the forecast is Red's
  const map = changeMap(values([[2, 2, -40], [3, 3, 90], [11, 11, 60], [2, 3, 70]]), board);
  assert.deepEqual(map[2 * N + 2], { kind: "lose", side: 1 });
  assert.equal(map[3 * N + 3], null); // a region that stays its owner's gets nothing
  assert.deepEqual(map[11 * N + 11], { kind: "lose", side: 0 }); // Red's point, with Blue's forecast
  assert.equal(map[3 * N + 2], null); // 0.7 in Blue's own region: the change is −0.3, too small
});

test("a point on a wall is not inside its region: the engine counts the points strictly inside", () => {
  // (1, 2) is on Blue's left edge, so it is open now, and the forecast's 0.9 is a close
  const map = changeMap(values([[1, 2, 90], [4, 4, 90]]), board);
  assert.deepEqual(map[2 * N + 1], { kind: "close", side: 0 });
  assert.deepEqual(map[4 * N + 4], { kind: "close", side: 0 });
});
