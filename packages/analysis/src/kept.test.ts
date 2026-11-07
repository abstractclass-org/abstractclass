// The tree of a game's analysis as the browser keeps it (kept.ts): the keys of the positions whose results belong to
// a game or a board. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { positionKeys, type KeptBranches } from "./kept.ts";

const MOVES = ["ab", "cd", "ef"];
const BRANCHES: KeptBranches = { version: 2, nodes: [["ab gh", 0], ["ab gh ef", 1, 1]] };

test("a game's positions: each step of its line, and each variation node", () => {
  assert.deepEqual([...positionKeys(MOVES, BRANCHES)], ["", "ab", "ab cd", "ab cd ef", "ab gh", "ab gh ef"]);
  assert.deepEqual([...positionKeys(MOVES, null)], ["", "ab", "ab cd", "ab cd ef"]);
  // Version 1 kept a variation as its line: each node of it
  const v1 = positionKeys(MOVES, { version: 1, lines: [["ab", "gh", "ef", "ij"]] });
  assert.deepEqual([...v1].slice(4), ["ab gh", "ab gh ef", "ab gh ef ij"]);
});

test("at a komi and from a set-up start, the keys name them before the moves (cache.ts, keyMoves)", () => {
  // Hedge School's design 24: none of a game at komi 0 belongs to a game at a komi
  assert.deepEqual([...positionKeys(MOVES, BRANCHES, -300)].slice(0, 2), ["komi=-300", "komi=-300 ab"]);
  assert.deepEqual([...positionKeys(["ab"], null, 0, "a set-up start")], ["@a_set-up_start", "@a_set-up_start ab"]);
  assert.deepEqual([...positionKeys(["ab"], null, 120.5, "s")], ["@s komi=120.5", "@s komi=120.5 ab"]);
});
