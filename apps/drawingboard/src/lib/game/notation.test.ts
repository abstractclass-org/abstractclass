// Checks Blueprints' moves and capture marks (notation.ts) on hand-made moves. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { captureText, moveName, moves, moveText, parseMove, readMove, sameMove, turnFromCount } from "./notation.ts";

test("a placement, an edit and a pass, read and written in their one spelling", () => {
  assert.deepEqual(parseMove("2@-3,1"), { kind: "place", blueprint: 2, q: -3, r: 1 });
  assert.deepEqual(parseMove("1:0,0>3:1,-1"),
                   { kind: "edit", from: { blueprint: 1, q: 0, r: 0 }, to: { blueprint: 3, q: 1, r: -1 } });
  for (const name of ["2@-3,1", "3@0,0", "1@-12,7", "1:0,0>3:1,-1", "2:0,0>2:1,2", "2:2,0>2:-1,0", "3:1,0>1:0,0"])
    assert.equal(moveName(parseMove(name)), name);
  assert.equal(moveName(null), "pass");
  // Another way to write the numbers gives the same move, in its one spelling.
  assert.equal(moveName(parseMove("2@-0,01")), "2@0,1");
});

test("a move's name has no space, is not pass, and does not start with @ (the game interface's rule)", () => {
  for (const name of ["2@-3,1", "1:0,0>3:1,-1"]) {
    const name2 = moves.moveName(moves.parseMove(name));
    assert.ok(!/\s/.test(name2) && name2 !== "pass" && !name2.startsWith("@"), name2);
  }
  assert.ok(moves.equal(parseMove("2@-0,1"), parseMove("2@0,1")));
  assert.ok(!sameMove(parseMove("2@0,1"), parseMove("1@0,1")));
  assert.ok(!sameMove(parseMove("1:0,0>3:1,-1"), parseMove("1:0,0>3:-1,1")));
});

test("a malformed move is refused, with what is wrong", () => {
  const bad: [string, RegExp][] = [
    ["4@0,0", /blueprint's number is 1, 2 or 3/], ["0:0,0>1:0,0", /blueprint's number is 1, 2 or 3/],
    ["2:-1,0>2:0,0", /cannot take a cell before the first cell/], ["2:0,-1>2:0,0", /cannot take a cell before the first cell/],
    ["2@1", /not a move/], ["2@1,2,3", /not a move/], ["@1,2", /not a move/], ["2 @1,2", /not a move/], ["pass", /not a move/],
    ["2@99999999999999999999,0", /too large/],
  ];
  for (const [name, why] of bad) assert.throws(() => parseMove(name), why, name);
});

test("the capture marks: x, and x+N when the placement scores, never +0", () => {
  assert.deepEqual(readMove("2@-3,1x+24"), { name: "2@-3,1", mark: { points: 24 }, markAt: 6 });
  assert.deepEqual(readMove("2@-3,1X"), { name: "2@-3,1", mark: { points: 0 }, markAt: 6 });
  assert.deepEqual(readMove("2@-3,1"), { name: "2@-3,1", mark: null, markAt: 6 });
  assert.deepEqual(readMove("1:0,0>3:1,-1"), { name: "1:0,0>3:1,-1", mark: null, markAt: 12 });
  assert.match(readMove("2@-3,1x+0") as string, /has the mark x, not x\+0/);
  assert.match(readMove("1:0,0>3:1,-1x") as string, /only a placement has a capture mark/);
  assert.match(readMove("2@-3,1x+") as string, /not a move/);
  assert.equal(captureText(null), "");
  assert.equal(captureText({ points: 0 }), "x");
  assert.equal(moveText("2@-3,1", { points: 24 }), "2@-3,1x+24");
});

test("the turns: Blue's first turn has one move, then two a turn, 120 moves in 61 turns", () => {
  assert.deepEqual([0, 1, 2, 3].map(n => turnFromCount(n).turn), [1, 2, 2, 3]);
  assert.deepEqual(turnFromCount(119), { turn: 61, first: true });
});
