// Checks the board editor's position (position.ts): the turn structure from the edge count, and the notation's
// position written and read back. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { STANDARD_START } from "#lib/engine/notation.ts";
import { chooseMover, drawEdge, followBoard, moverOf, placeable, readPosition, ruleOf, toggleMark,
         writePosition } from "./position.ts";

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

test("a mark is invincible on the waiting player's edge and placed on the mover's", () => {
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

test("the edge count follows the board: the edges drawn, not the start edges", () => {
  let p = followBoard(drawEdge(readPosition(STANDARD_START), [3, 9, 3, 12], 0), null); // D10-D13
  assert.equal(writePosition(p), "A10-D10,D10-D13 Q10-T10 r2 0/0 1");
  p = followBoard(drawEdge(p, [15, 9, 15, 12], 1), null); // Q10-Q13
  assert.equal(p.count, 2);
  p = followBoard(drawEdge(p, [3, 9, 3, 12], 0), null); // D10-D13 again: removed
  assert.equal(p.count, 1);
  p = followBoard(drawEdge(p, [0, 9, 3, 9], 0), null); // Blue's start edge removed (a cut): the count stays
  assert.equal(writePosition(p), "- Q10-Q13,Q10-T10 r2 0/0 1");
});

test("a typed count stays as edges are drawn", () => {
  const p = followBoard(drawEdge(readPosition("A10-D10 Q10-T10 b1 3/0 30"), [3, 9, 3, 12], 0), "typed");
  assert.equal(writePosition(p), "A10-D10,D10-D13 Q10-T10 r1 3/0 30");
});

test("a mover chosen moves the count on to the next count with that mover", () => {
  // Three edges drawn: Blue to play, 2 left. Red: count 5, the first edge of Red's turn 4.
  const three = readPosition("A10-D10,D10-D13,D13-G13 Q10-T10,Q10-Q13 b2 0/0 3");
  let { pos, rule } = chooseMover(three, null, 1);
  assert.equal(rule, 1);
  assert.equal(pos.count, 5);
  pos = followBoard(drawEdge(pos, [15, 12, 18, 12], 1), rule); // four drawn: still count 5
  assert.equal(pos.count, 5);
  pos = followBoard(drawEdge(drawEdge(pos, [6, 12, 6, 15], 0), [18, 12, 18, 9], 1), rule); // six drawn: Red's second edge
  assert.equal(writePosition(pos).split(" ").slice(2).join(" "), "r1 0/0 6");
  // The mover of the count drawn is no move: the count stays.
  assert.equal(chooseMover(three, null, 0).pos.count, 3);
  // A typed count moves on from itself, and stays typed.
  ({ pos, rule } = chooseMover({ ...three, count: 10 }, "typed", 0));
  assert.deepEqual([pos.count, rule], [11, "typed"]);
  // Near the end: Blue's last turn (119) has no Red count after it, so Red takes the last before it.
  assert.equal(chooseMover({ ...three, count: 119 }, "typed", 1).pos.count, 118);
});

test("a position read follows the board when its count is the board's", () => {
  assert.equal(ruleOf(readPosition(STANDARD_START)), null);
  assert.equal(ruleOf(readPosition("A10-D10,D10-D13,D13-G13 Q10-T10,Q10-Q13 r2 0/0 5")), 1); // three drawn, Red's
  assert.equal(ruleOf(readPosition("A10-D10,D10-D13,D13-G13 Q10-T10,Q10-Q13 b1 0/0 4")), "typed"); // Blue's, not 3
  assert.equal(ruleOf(readPosition("A10-D10 Q10-T10 r1 0/0 30")), "typed");
});

test("a position that is not well formed says why", () => {
  assert.throws(() => readPosition("A10-D10 Q10-T10 b1 0/0"), /five fields/);
  assert.throws(() => readPosition("A10-I10 Q10-T10 b1 0/0 0"), /not an edge/);
  assert.throws(() => readPosition("A10-D10 Q10-T10 x1 0/0 0"), /mover/);
  assert.throws(() => readPosition("A10-D10 Q10-T10 b1 0 0"), /scores/);
  assert.throws(() => readPosition("A10-D10 Q10-T10 b1 0/0 121"), /edge count/);
});
