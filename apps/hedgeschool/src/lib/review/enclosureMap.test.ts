// The area map, Enclosure's part (enclosureMap.ts, design 30): each point's state on the board now, from the regions
// and the edges, a point's numbers in the forecast styles, and the board as drawn after a line's edges. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { changeMap } from "@abstractclass/review/ownership.ts";
import { drawnBoard, occupancy, pointReading } from "./enclosureMap.ts";
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
const now = occupancy(board);

test("the board now: 1 strictly inside Blue's regions, -1 strictly inside Red's, 0 elsewhere", () => {
  const inside = [[2, 2], [3, 2], [2, 3], [3, 3]].map(([x, y]) => y * N + x);
  assert.deepEqual(now.flatMap((v, i) => (v ? [[i, v]] : [])), [...inside.map(i => [i, 1]), [11 * N + 11, -1]]);
});

test("a point on a wall is not inside its region: the engine counts the points strictly inside", () => {
  // (1, 2) is on Blue's left edge, so it is open now, and the forecast's 0.9 is a close
  const map = changeMap(values([[1, 2, 90], [4, 4, 90]]), now, 50);
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

test("the board as drawn after a line's edges: its edges less the ones cut, the line's own, the regions after the last", () => {
  const red: Position["regions"] = [[], [{ area: 1, rings: [[[10, 10], [11, 10], [11, 11], [10, 11]]] }]];
  const drawn = drawnBoard(board, [{ edge: [5, 5, 6, 5], player: 0 }, { edge: [1, 1, 4, 1], player: 1, cut: [1, 1, 4, 1], regions: red }]);
  assert.deepEqual(drawn.edges[0].length, blue.edges.length); // Blue's first edge of the square is cut, the line's added
  assert.ok(drawn.edges[0].some(e => e.join() === "5,5,6,5") && !drawn.edges[0].some(e => e.join() === "1,1,4,1"));
  assert.ok(drawn.edges[1].some(e => e.join() === "1,1,4,1"));
  assert.equal(drawn.regions, red);
  assert.equal(drawnBoard(board, []), board); // no line: the board itself
  assert.equal(drawnBoard(board, [{ edge: [5, 5, 6, 5], player: 0 }]).regions, board.regions); // no step yet: as it was
});

