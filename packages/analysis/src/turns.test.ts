// Checks the turns of one move, then two a turn (turns.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { turnFromCount } from "./turns.ts";

test("the turns: one move, then two a turn, and the last turn of 120 moves one", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(turnFromCount), [
    { turn: 1, first: true }, { turn: 2, first: true }, { turn: 2, first: false }, { turn: 3, first: true }, { turn: 3, first: false },
  ]);
  assert.deepEqual(turnFromCount(119), { turn: 61, first: true });
});
