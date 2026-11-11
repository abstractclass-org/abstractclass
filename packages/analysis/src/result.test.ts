// A game's result by the scores (result.ts, the one rule for a draw), and the value at the game's end, which takes that
// rule (model.ts, resultWin). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resultOfRecord, resultOfScores } from "./result.ts";
import { resultWin } from "./model.ts";

test("a result by the scores: the winner and the margin as a record writes it, and a draw on equal scores", () => {
  assert.deepEqual(resultOfScores([40, 12.5]), { winner: 0, margin: 27.5 });
  assert.deepEqual(resultOfScores([3, 6]), { winner: 1, margin: 3 });
  assert.deepEqual(resultOfScores([20, 20]), { winner: null, margin: 0 });
  // A sum of areas can miss equality by a floating-point error: still a draw.
  assert.deepEqual(resultOfScores([0.1 + 0.2, 0.3]), { winner: null, margin: 0 });
  // A margin can be any number (docs/design/24-practice.md, "Whole points"): a win by 0.03 is a win. One under the
  // record's six decimals is a draw, as the record writes it: `0`.
  assert.deepEqual(resultOfScores([10, 10.03]), { winner: 1, margin: 0.03 });
  assert.deepEqual(resultOfScores([10.0000004, 10]), { winner: null, margin: 0 });
  assert.deepEqual(resultOfScores([1183.2292748917748, 1024.404761904762]), { winner: 0, margin: 158.824513 });
});

test("a record's result by the scores takes the same rule: a resignation, a forfeit or no result is not one", () => {
  assert.deepEqual(resultOfRecord("b+28.5"), { winner: 0, margin: 28.5 });
  assert.deepEqual(resultOfRecord("r+3"), { winner: 1, margin: 3 });
  assert.deepEqual(resultOfRecord("r+0.03"), { winner: 1, margin: 0.03 });
  assert.deepEqual(resultOfRecord("0"), { winner: null, margin: 0 });
  assert.deepEqual(resultOfRecord("b+0"), { winner: null, margin: 0 });
  assert.deepEqual(resultOfRecord("b+0.0000004"), { winner: null, margin: 0 });
  for (const other of ["b+R", "r+F", "*", ""]) assert.equal(resultOfRecord(other), null);
});

test("the value at the game's end takes the same rule: a draw within the record's rounding is 0.5", () => {
  assert.deepEqual([resultWin([40, 12.5]), resultWin([3, 6]), resultWin([20, 20])], [1, 0, 0.5]);
  // Scores of 10.0000004 and 10: the line says "A draw", and the win bar shows 50%, not Blue at 100%.
  assert.deepEqual([resultWin([10.0000004, 10]), resultWin([10, 10.0000004]), resultWin([0.1 + 0.2, 0.3])], [0.5, 0.5, 0.5]);
  assert.deepEqual([resultWin([10.03, 10]), resultWin([10, 10.03])], [1, 0]); // a win by 0.03 is a win
});
