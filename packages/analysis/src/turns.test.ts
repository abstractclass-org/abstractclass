// Checks the turns of one move, then two a turn (turns.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { countWithMover, moverOf, turnFromCount } from "./turns.ts";

test("the turns: one move, then two a turn, and the last turn of 120 moves one", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(turnFromCount), [
    { turn: 1, first: true }, { turn: 2, first: true }, { turn: 2, first: false }, { turn: 3, first: true }, { turn: 3, first: false },
  ]);
  assert.deepEqual(turnFromCount(119), { turn: 61, first: true });
});

test("the move count fixes the mover and the moves left in the turn", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(moverOf), [
    { player: 0, left: 1 }, { player: 1, left: 2 }, { player: 1, left: 1 }, { player: 0, left: 2 }, { player: 0, left: 1 },
  ]);
  assert.deepEqual(moverOf(119), { player: 0, left: 1 }); // the first player's last turn has one move
  assert.deepEqual(moverOf(120), { player: 1, left: 0 }); // a finished game
});

test("a choice of the mover moves the count on to that player's next move", () => {
  assert.equal(countWithMover(0, 0), 0);
  assert.equal(countWithMover(0, 1), 1);
  assert.equal(countWithMover(2, 0), 3);
  assert.equal(countWithMover(119, 1), 118); // no later move of the second player: the last one before
  assert.equal(countWithMover(120, 0), 119);
});
