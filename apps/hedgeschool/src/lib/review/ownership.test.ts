// The area maps (ownership.ts, design 30): the area that a move lost, and its caption. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { areaCaption, lostArea, shade, shownLost } from "./ownership.ts";

/** A board of 361 points with these values, by index (y * 19 + x), and 0 elsewhere. */
const board = (values: Record<number, number>) => Array.from({ length: 361 }, (_, i) => values[i] ?? 0);

test("the area lost is where the mover's ownership fell, from the mover's side: KaTrain's loss grid", () => {
  const before = board({ 0: 80, 1: 10, 2: -30, 3: 50 }), after = board({ 0: -60, 1: 40, 2: -70, 3: 50 });
  // Blue moved: point 0 fell by 140, point 2 by 40. Point 1 rose, and point 3 kept its value.
  const blue = lostArea(before, after, 0);
  assert.deepEqual(blue.drop.slice(0, 4), [140, 0, 40, 0]);
  assert.equal(blue.drop.slice(4).every(v => v === 0), true);
  // Red moved: the same change is Red's gain at points 0 and 2, and its loss at point 1.
  assert.deepEqual(lostArea(before, after, 1).drop.slice(0, 4), [0, 30, 0, 0]);
});

test("the area lost says who held it, from the mover's side, before and after, weighted by the fall", () => {
  const lost = lostArea(board({ 0: 80, 2: -30 }), board({ 0: -60, 2: -70 }), 0);
  // Weights 140 and 40: before (80 · 140 − 30 · 40) / 180, after (−60 · 140 − 70 · 40) / 180.
  assert.equal(Math.round(lost.before), 56);
  assert.equal(Math.round(lost.after), -62);
  assert.equal(lost.size, 1.8); // the falls in points of the board: 1.4 + 0.4
  // Red's side: the same numbers with the signs turned.
  const red = lostArea(board({ 5: -90 }), board({ 5: 20 }), 1);
  assert.deepEqual([red.before, red.after, red.size], [90, -20, 1.1]);
});

test("nothing lost: no area, and both sides at 0", () => {
  const lost = lostArea(board({ 0: 50 }), board({ 0: 60 }), 0);
  assert.deepEqual([lost.size, lost.before, lost.after], [0, 0, 0]);
});

test("the area lost shows when a fifth of the fall or more is in points that fall by 0.30 or more", () => {
  // A fall of 0.40 at one point and 0.05 at 32 others: 40 of 200 is in a clear point, a fifth.
  const spread = Object.fromEntries(Array.from({ length: 32 }, (_, k) => [k + 1, 5]));
  const before = board({ 0: 40, ...spread });
  assert.equal(shownLost(lostArea(before, board({}), 0)), true);
  // The same fall spread thin over every point: no point falls by 0.30, so the map is a haze.
  assert.equal(shownLost(lostArea(board(spread), board({}), 0)), false);
  assert.equal(shownLost(lostArea(board({ 0: 29 }), board({}), 0)), false);
  assert.equal(shownLost(lostArea(board({}), board({}), 0)), false); // nothing lost
});

test("a point's shading follows KaTrain's gamma, whatever its side, and stops at a full point", () => {
  assert.deepEqual([shade(0), shade(100), shade(-100), shade(180)], [0, 1, 1, 1]);
  assert.equal(shade(-50).toFixed(3), "0.594"); // 0.5 ^ (1 / 1.33): a point held half the time shows at 59%
});

test("the caption says who holds the area with the best move and after the move played", () => {
  const caption = (before: number, after: number, mover: 0 | 1 = 0, unit: "turn" | "edge" = "turn") =>
    areaCaption({ drop: [], size: 1, before, after }, mover, unit);
  assert.equal(caption(80, -60),
               "The area lost, shaded after the turn: with the best turn, Blue holds it for half the turns left or more. " +
               "After the turn played, Red holds it for half the turns left or more.");
  assert.equal(caption(30, -5, 1, "edge"),
               "The area lost, shaded after the edge: with the best edge, Red holds it for some of the turns left. " +
               "After the edge played, it stays open.");
  assert.equal(caption(-20, -49), "The area lost, shaded after the turn: with the best turn, Red holds it for some of the " +
               "turns left. After the turn played, Red holds it for more of the turns left.");
  // Both in the same band: the second sentence says which way it went, also where it stays open.
  assert.equal(caption(90, 55).split(". ")[1], "After the turn played, Blue holds it for fewer of the turns left.");
  assert.equal(caption(10, -10).split(". ")[1], "After the turn played, it stays open, but moves toward Red.");
});
