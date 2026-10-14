// Checks the board editor's position (position.ts): the turn structure from the edge count, and the notation's
// position written and read back. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { drawEdge, moverOf, placeable, readPosition, STANDARD_START, toggleMark, writePosition } from "./position.ts";

test("the edge count fixes the mover and the edges left", () => {
  // The notation page's examples: the start, then after Blue's first turn, Red's first edge, and Blue's first edge of
  // turn 3.
  assert.deepEqual(moverOf(0), { player: 0, left: 1 });
  assert.deepEqual(moverOf(1), { player: 1, left: 2 });
  assert.deepEqual(moverOf(2), { player: 1, left: 1 });
  assert.deepEqual(moverOf(3), { player: 0, left: 2 });
  assert.deepEqual(moverOf(4), { player: 0, left: 1 });
  assert.deepEqual(moverOf(118), { player: 1, left: 1 });
  assert.deepEqual(moverOf(119), { player: 0, left: 1 }); // Blue's last turn has one edge
  assert.deepEqual(moverOf(120), { player: 1, left: 0 }); // a finished game
});

test("a position is written as the notation writes it, and read back", () => {
  assert.equal(writePosition(readPosition(STANDARD_START)), STANDARD_START);
  // The notation page's last example: the marks follow the mover, the edges sort, a score keeps its fraction.
  const p = "A10-D10,D10-E11,D10-F13+ Q10-T10,Q10-T13*,T10-T13* b1 0/4.5 4";
  assert.equal(writePosition(readPosition(p)), p);
  assert.equal(writePosition({ edges: [], count: 7, scores: [2, 0] }), "- - b2 2/0 7"); // turn 5, Blue's
});

test("an edge's spelling and its place in the list do not depend on how it was drawn", () => {
  const p = readPosition("- - b1 0/0 0");
  const drawn = drawEdge(drawEdge(p, [3, 9, 0, 9], 0), [0, 9, 0, 12], 0); // D10-A10, then A10-A13
  assert.equal(writePosition(drawn), "A10-A13,A10-D10 - b1 0/0 0");
});

test("drawing an edge again removes it, and the other player's tool takes it over", () => {
  const p = readPosition("A10-D10 Q10-T10 b1 0/0 0");
  assert.equal(writePosition(drawEdge(p, [0, 9, 3, 9], 0)), "- Q10-T10 b1 0/0 0");
  assert.equal(writePosition(drawEdge(p, [3, 9, 0, 9], 1)), "- A10-D10,Q10-T10 b1 0/0 0");
});

test("a mark is protected on the waiting player's edge and placed on the mover's", () => {
  const p = readPosition("A10-D10 Q10-T10 r1 0/0 2"); // Red to play
  assert.equal(toggleMark(p, [15, 9, 17, 9]), null); // no edge Q10-S10
  const m = toggleMark(toggleMark(p, [0, 9, 3, 9])!, [15, 9, 18, 9])!;
  assert.equal(writePosition(m), "A10-D10* Q10-T10+ r1 0/0 2");
});

test("the editor places edges at most 3 apart in each direction", () => {
  assert.ok(placeable(0, 0, 3, 3));
  assert.ok(placeable(5, 5, 4, 2));
  assert.ok(!placeable(0, 0, 4, 0));
  assert.ok(!placeable(2, 2, 2, 2));
});

test("a position that is not well formed says why", () => {
  assert.throws(() => readPosition("A10-D10 Q10-T10 b1 0/0"), /five fields/);
  assert.throws(() => readPosition("A10-I10 Q10-T10 b1 0/0 0"), /not an edge/);
  assert.throws(() => readPosition("A10-D10 Q10-T10 x1 0/0 0"), /mover/);
  assert.throws(() => readPosition("A10-D10 Q10-T10 b1 0 0"), /scores/);
  assert.throws(() => readPosition("A10-D10 Q10-T10 b1 0/0 121"), /edge count/);
});
