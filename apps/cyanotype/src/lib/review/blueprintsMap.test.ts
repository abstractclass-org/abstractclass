import { test } from "node:test";
import assert from "node:assert/strict";
import { alignMap, boardState, hexOfIndex, indexOfHex, mapIndex, mapWithView, placeOf, viewHexes } from "./blueprintsMap.ts";

const SIDE = 67, N = SIDE * SIDE;
/** A map of the ownership `value(i)` by index, over the view with its middle at (q, r). */
const mapAt = (q: number, r: number, value: (i: number) => number, orientation = 0) =>
  mapWithView(Array.from({ length: N }, (_, i) => value(i)), { q, r, orientation, radius: 33 });

test("a map keeps its view's place after its values", () => {
  const map = mapAt(5, -7, () => 0);
  assert.equal(map.length, N + 3);
  assert.deepEqual(placeOf(map), { q: 5, r: -7, orientation: 0, side: SIDE });
  assert.equal(placeOf(Array(N).fill(0)), null); // an ownership with no view
});

test("the view's hex (x, y) is the middle plus (x - 33, y - 33) in orientation 0", () => {
  const p = placeOf(mapAt(5, -7, () => 0))!;
  assert.deepEqual(hexOfIndex(p, 0), [5 - 33, -7 - 33]);
  assert.deepEqual(hexOfIndex(p, 33 * SIDE + 33), [5, -7]);
  assert.deepEqual(hexOfIndex(p, 2 * SIDE + 40), [5 + 7, -7 - 31]);
  assert.equal(indexOfHex(p, [5 + 34, -7]), -1); // one hex past the rhombus's side
});

test("every orientation's index and hex are each other's inverse", () => {
  for (let o = 0; o < 6; o++) {
    const p = placeOf(mapAt(-3, 11, () => 0, o))!;
    for (const i of [0, 1, 66, 67, 2244, 4488, 1234]) assert.equal(indexOfHex(p, hexOfIndex(p, i)), i, `orientation ${o}, index ${i}`);
  }
});

test("a hex outside the map's view has no index", () => {
  const map = mapAt(0, 0, () => 0);
  assert.equal(mapIndex([40, 0], map), -1);
  assert.equal(mapIndex([33, -33], map), 66); // the rhombus's top-right corner: x 66, y 0
  assert.equal(mapIndex([0, 0], [1, 2, 3]), -1); // a map without a place
});

test("a map aligned to another's view keeps each hex's value, and NaN where its view ends", () => {
  // The value of each hex is its q * 1000 + r, so that the aligned map can be checked hex by hex.
  const origin = placeOf(mapAt(0, 0, () => 0))!;
  const from = mapAt(0, 0, i => { const [q, r] = hexOfIndex(origin, i); return q * 1000 + r; }), to = mapAt(10, 5, () => 0);
  const aligned = alignMap(from, to), place = placeOf(to)!;
  assert.deepEqual(aligned.slice(N), to.slice(N)); // the place of `to`
  for (let i = 0; i < N; i += 97) {
    const [q, r] = hexOfIndex(place, i);
    const inFrom = Math.abs(q) <= 33 && Math.abs(r) <= 33;
    if (inFrom) assert.equal(aligned[i], q * 1000 + r);
    else assert.ok(Number.isNaN(aligned[i]));
  }
});

test("the board's state in a map's view: the cells, then a line's placements and captures", () => {
  const map = mapAt(0, 0, () => 0);
  const cells = { "0,0": [0, "plain"], "1,0": [1, "star"], "50,0": [0, "plain"] } as const;
  const state = boardState({ cells }, [{ player: 1, footprint: ["2,0"], captured: { "0,0": [0, "plain"] } }], map);
  assert.equal(state.length, map.length);
  assert.equal(state[mapIndex([0, 0], map)], 0); // captured by the line
  assert.equal(state[mapIndex([1, 0], map)], -1);
  assert.equal(state[mapIndex([2, 0], map)], -1); // placed by the line
  assert.equal(state[mapIndex([3, 0], map)], 0);
  assert.equal(viewHexes(map).length, N);
});
