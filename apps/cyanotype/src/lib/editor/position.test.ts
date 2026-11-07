// Checks the board editor's position (position.ts): a cell placed, removed or changed on the board, the hexes of a drag
// with Shift, a hand's cell moved with the blueprints back in their frames, the moves played and the mover, and the
// scores, as the notation writes them. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readPosition, STANDARD_START, writePosition } from "../game/position.ts";
import { moveHandCell, paintCell, placeCell, removeAllCells, withCount, withMover, withScore } from "./position.ts";

const start = readPosition(STANDARD_START);
const fields = (p: Parameters<typeof writePosition>[0]) => writePosition(p).split(" ");

test("a click on the board places a cell, the same cell again removes it, and another cell changes there", () => {
  const empty = readPosition("- - -|-|- -|-|- b1 0/0 0");
  const one = placeCell(empty, [2, -1], 0, "star");
  assert.equal(writePosition(one), "2,-1s - -|-|- -|-|- b1 0/0 0");
  assert.equal(writePosition(placeCell(one, [2, -1], 0, "star")), "- - -|-|- -|-|- b1 0/0 0");
  assert.equal(writePosition(placeCell(one, [2, -1], 0, "wall")), "2,-1w - -|-|- -|-|- b1 0/0 0");
  assert.equal(writePosition(placeCell(one, [2, -1], 1, "star")), "- 2,-1s -|-|- -|-|- b1 0/0 0");
  assert.equal(writePosition(placeCell(one, [-3, 0], 1, "plain")), "2,-1s -3,0 -|-|- -|-|- b1 0/0 0");
  assert.deepEqual(removeAllCells(start).cells, {});
  assert.deepEqual(removeAllCells(start).blueprints, start.blueprints);
});

test("a drag with Shift puts the cell on each hex that it passes, or removes that cell, and leaves the others", () => {
  const p = readPosition("2,-1s;3,-1 4,-1w -|-|- -|-|- b1 0/0 0");
  // A put: an empty hex gets it, another cell changes to it, and the same cell stays as it is (the same object)
  assert.equal(writePosition(paintCell(p, [0, 0], 0, "star", false)), "2,-1s;3,-1;0,0s 4,-1w -|-|- -|-|- b1 0/0 0");
  assert.equal(writePosition(paintCell(p, [4, -1], 0, "star", false)), "2,-1s;3,-1;4,-1s - -|-|- -|-|- b1 0/0 0");
  assert.equal(paintCell(p, [2, -1], 0, "star", false), p);
  // A removal: only the player's cell of the kind goes
  assert.equal(writePosition(paintCell(p, [2, -1], 0, "star", true)), "3,-1 4,-1w -|-|- -|-|- b1 0/0 0");
  assert.equal(paintCell(p, [3, -1], 0, "star", true), p); // Blue's Normal cell stays
  assert.equal(paintCell(p, [4, -1], 0, "wall", true), p); // Red's wall stays
  assert.equal(paintCell(p, [0, 0], 0, "star", true), p);
});

test("a hand's cell moves, and the blueprints go back to their frames", () => {
  // Blue's blueprint 1, a star with its ring: its anchor cell 0,0 goes below the ring, so the anchor is now 1,0.
  const moved = moveHandCell(start, 0, { blueprint: 1, hex: [0, 0] }, { blueprint: 1, hex: [0, 3] })!;
  assert.equal(fields(moved)[2].split("|")[0], "0,0;-2,1;-1,1s;0,1;-2,2;-1,2;-1,3");
  // To another blueprint: Blue's blueprint 3 gives a cell to blueprint 2, beside its anchor cell
  const given = moveHandCell(start, 0, { blueprint: 3, hex: [1, 0] }, { blueprint: 2, hex: [-1, 0] })!;
  const [, two, three] = fields(given)[2].split("|");
  assert.equal(two, "0,0;1,0w;2,0s;0,1s;1,1s;2,1w;0,2w;1,2s");
  assert.equal(three, "0,0;-1,1;0,1s;1,1;-1,2;0,2");
  assert.equal(fields(given)[3], fields(start)[3]); // Red's hand stays
  // No cell at the first hex, or a cell at the second: nothing moves
  assert.equal(moveHandCell(start, 0, { blueprint: 1, hex: [5, 5] }, { blueprint: 1, hex: [0, 3] }), null);
  assert.equal(moveHandCell(start, 0, { blueprint: 1, hex: [0, 0] }, { blueprint: 1, hex: [1, 0] }), null);
});

test("the moves played fix the mover, and a choice of the mover moves them on", () => {
  assert.equal(fields(withCount(start, 22))[4], "r1");
  assert.equal(fields(withCount(start, 200))[6], "120");
  assert.equal(fields(withCount(start, -3))[6], "0");
  assert.equal(fields(withMover(start, 1)).slice(4).join(" "), "r2 0/0 1");
  assert.equal(fields(withMover(withCount(start, 22), 0)).slice(4).join(" "), "b2 0/0 23");
});

test("a score is a whole number, 0 or more", () => {
  assert.equal(fields(withScore(withScore(start, 0, 24), 1, 7.6))[5], "24/8");
  assert.equal(fields(withScore(start, 0, -5))[5], "0/0");
});
