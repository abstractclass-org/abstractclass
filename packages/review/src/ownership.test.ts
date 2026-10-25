// The area map (ownership.ts, design 30): its three styles (the engine's ownership of each point, the change from the
// board now to it, and the difference between two forecasts), the numbers of a point, and a line's steps. A board of
// 19 × 19 points, as Enclosure's, whose state now is given by point. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { askOrder, changeMap, differenceMap, differenceReading, mapStep, ownershipMap, shade } from "./ownership.ts";
import type { AreaMark } from "./ownership.ts";

const N = 19;
/** A board of 361 points with these values, by point, and 0 elsewhere. */
const values = (at: [number, number, number][]) => {
  const out = new Array<number>(N * N).fill(0);
  for (const [x, y, v] of at) out[y * N + x] = v;
  return out;
};
/** The side of a mark, or null. */
const sideOf = (m: AreaMark | null | undefined) => (m && "side" in m ? m.side : null);
/** The board now: Blue holds the points from (2, 2) to (3, 3), and Red the point (11, 11). */
const now = values([[2, 2, 1], [3, 2, 1], [2, 3, 1], [3, 3, 1], [11, 11, -1]]);

test("the ownership style shades each point for the side that the engine expects to hold it, as KaTrain does", () => {
  const map = ownershipMap(values([[7, 7, 100], [8, 7, -50], [9, 7, 20], [2, 2, 90]]), 0);
  assert.deepEqual(map[7 * N + 7], { kind: "hold", side: 0, strength: 1 });
  const half = map[7 * N + 8];
  assert.equal(sideOf(half), 1);
  assert.equal(half?.kind === "hold" && half.strength.toFixed(3), "0.594"); // KaTrain's gamma
  assert.equal(sideOf(map[7 * N + 9]), 0); // from 0, every value the engine gives shows
  assert.equal(sideOf(map[2 * N + 2]), 0); // the state: a region's own points too
  assert.equal(map[0], null); // a value of 0
});

test("the smallest value marked leaves out the points under it, in both styles", () => {
  const forecast = values([[7, 7, 100], [8, 7, -50], [9, 7, 20]]);
  assert.deepEqual(ownershipMap(forecast, 50).map(sideOf).filter(s => s !== null), [0, 1]);
  assert.equal(ownershipMap(forecast, 51)[7 * N + 8], null);
  assert.equal(changeMap(forecast, now, 30)[7 * N + 9], null);
  assert.deepEqual(changeMap(forecast, now, 0)[7 * N + 9], { kind: "close", side: 0 }); // the raw data
});

test("the change style: open area that a side will probably close, in that side's colour", () => {
  const map = changeMap(values([[7, 7, 80], [8, 7, -75], [9, 7, 30]]), now, 50);
  assert.deepEqual(map[7 * N + 7], { kind: "close", side: 0 });
  assert.deepEqual(map[7 * N + 8], { kind: "close", side: 1 });
  assert.equal(map[7 * N + 9], null); // a change too small to point at
});

test("the change style: closed area that its owner will probably lose, in the colour of the side that gains", () => {
  // (2, 2) is inside Blue's square: Blue holds it now, and the forecast is Red's
  const map = changeMap(values([[2, 2, -40], [3, 3, 90], [11, 11, 60], [2, 3, 70]]), now, 50);
  assert.deepEqual(map[2 * N + 2], { kind: "lose", side: 1 });
  assert.equal(map[3 * N + 3], null); // a region that stays its owner's gets nothing
  assert.deepEqual(map[11 * N + 11], { kind: "lose", side: 0 }); // Red's point, with Blue's forecast
  assert.equal(map[3 * N + 2], null); // 0.7 in Blue's own region: the change is −0.3, too small
});

test("KaTrain's shade: |v| ^ (1 / 1.33), capped at 1", () => {
  assert.deepEqual([shade(0), shade(100), shade(-100), shade(180)], [0, 1, 1, 1]);
});

test("the map shown after k drawn edges: step k's, or while it is searched the latest step before it that has one", () => {
  const a = [1], b = [2];
  assert.equal(mapStep([a, undefined, b], 2), 2);
  assert.equal(mapStep([a, b, undefined], 2), 1);
  assert.equal(mapStep([a, undefined, undefined], 2), 0);
  assert.equal(mapStep([undefined, undefined], 1), null);
});

test("a line asks for its steps' maps in the order of drawing: the step drawn now, the ones after it, then its start", () => {
  // The steps already drawn are not asked again: a search of one that still waits in the queue ends at once
  assert.deepEqual(askOrder(2, 4), [2, 3, 4, 0]);
  assert.deepEqual(askOrder(0, 0), [0]);
  assert.deepEqual(askOrder(3, 3), [3, 0]);
});

test("the difference: where the forecast fell and where it rose, from the mover's side, as strong as KaTrain shades", () => {
  const before = values([[1, 0, 80], [2, 0, 10], [3, 0, -30], [4, 0, 50], [5, 0, 20]]);
  const after = values([[1, 0, -60], [2, 0, 40], [3, 0, -70], [4, 0, 50], [5, 0, 15]]);
  const blue = differenceMap(before, after, 0, 0);
  // Each mark in the colour of the side that the point moved toward: a fall for Blue toward Red, a rise toward Blue
  assert.deepEqual(blue[1], { kind: "fall", side: 1, strength: 1 }); // 1.40 fell for Blue: capped at 1
  assert.deepEqual([blue[2]?.kind, sideOf(blue[2])], ["rise", 0]); // 0.30 rose for Blue
  assert.equal(blue[3]?.kind, "fall");
  assert.equal(blue[4], null); // no change
  assert.equal(blue[5]?.kind, "fall"); // from 0 on, every change shows
  // From Red's side, Blue's fall is Red's rise
  const red = differenceMap(before, after, 1, 0).slice(1, 4);
  assert.deepEqual(red.map(m => m?.kind), ["rise", "fall", "rise"]);
  assert.deepEqual(red.map(sideOf), [1, 0, 1]);
  // The smallest value marked applies to both
  assert.deepEqual(differenceMap(before, after, 0, 35).slice(1, 6).map(m => m?.kind ?? null), ["fall", null, "fall", null, null]);
});

test("a point's numbers in the difference: before, after, and the change for the mover, with its sign", () => {
  assert.equal(differenceReading(80, -60, 0), "before Blue 0.80 · after Red 0.60 · fell 1.40 for Blue");
  assert.equal(differenceReading(10, 40, 1), "before Blue 0.10 · after Blue 0.40 · fell 0.30 for Red");
  assert.equal(differenceReading(0, 0, 1), "before even · after even · no change");
  assert.equal(differenceReading(-20, -50, 1), "before Red 0.20 · after Red 0.50 · rose 0.30 for Red");
});
