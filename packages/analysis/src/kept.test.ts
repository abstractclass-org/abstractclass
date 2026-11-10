// The tree of a game's analysis as the browser keeps it (kept.ts): the keys of the positions whose results belong to
// a game or a board. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { boardOfLine, keptBoardNotice, keptKomiProblem, positionKeys, type KeptBranches } from "./kept.ts";

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

test("a kept board's komi beyond the game's limit, either way, is a problem in the record's words; within it, none", () => {
  // Hedge School's design 24: a board kept from a link before the limit's check
  assert.equal(keptKomiProblem(boardOfLine(["ab"], undefined, 6000), 5052), "its komi must be from -5,052 to 5,052 points: 6000");
  assert.equal(keptKomiProblem(boardOfLine([], undefined, -5052.5), 5052), "its komi must be from -5,052 to 5,052 points: -5052.5");
  assert.equal(keptKomiProblem(boardOfLine(["ab"], undefined, 5052), 5052), null);
  assert.equal(keptKomiProblem(boardOfLine(["ab"]), 5052), null);
  assert.equal(keptKomiProblem(null, 5052), null);
});

test("the notice of a kept board that cannot open names the new board, unless a board brought is on screen", () => {
  const problem = "its komi must be from -5,052 to 5,052 points: 6000";
  // The kept board alone: a new board opens in its place, and the notice says so
  assert.equal(keptBoardNotice(problem, false), "The Analysis board cannot open your own analysis: its komi must be " +
    "from -5,052 to 5,052 points: 6000. A new board is here instead.");
  // A link, an analysis file, New or the Import brings a board that replaces it: no new board is on screen
  assert.equal(keptBoardNotice(problem, true), "The Analysis board cannot open your own analysis: its komi must be " +
    "from -5,052 to 5,052 points: 6000.");
  // A problem that ends with its own period keeps one
  assert.equal(keptBoardNotice("it has a komi. The board can analyze only at komi 0.", true),
    "The Analysis board cannot open your own analysis: it has a komi. The board can analyze only at komi 0.");
});
