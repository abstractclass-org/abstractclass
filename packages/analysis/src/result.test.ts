// A game's result by the scores (result.ts, the one rule for a draw), and the value at the game's end, which takes that
// rule (model.ts, resultWin). The result that a game gives beside it (resultAt). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { withKomi, type PositionInfo } from "./game.ts";
import { resultAt, resultOfRecord, resultOfScores, type GameResult } from "./result.ts";
import { resultWin, review, valuesAfter, type Analysis } from "./model.ts";
import { words } from "./testing/game.ts";

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

// The results of a game whose rules end it by more than the scores (Tak: Mistak's design 34, "Draws").
const ROAD: GameResult = { winner: 1, words: "White won by a road" }, DRAWN: GameResult = { winner: null, words: "A draw: 50 plies" };
const ended = (scores: [number, number], result?: GameResult): PositionInfo =>
  ({ player: 0, over: true, scores, ...(result ? { result } : {}) });

test("a position's result is the game's own where it gives one, else the result by the scores", () => {
  assert.deepEqual(resultAt(ended([9, 4], ROAD)), ROAD); // the scores favour the loser
  assert.deepEqual(resultAt(ended([9, 4], DRAWN)), DRAWN);
  assert.deepEqual(resultAt(ended([9, 4])), { winner: 0, margin: 5 });
  assert.deepEqual(resultAt(ended([9, 9])), { winner: null, margin: 0 });
});

test("a komi changes a result by the scores, not the game's own", () => {
  assert.deepEqual(resultAt(withKomi(ended([9, 8]), 2)), { winner: 1, margin: 1 });
  assert.deepEqual(resultAt(withKomi(ended([9, 8], { winner: 0, words: "Blue won by a road" }), 2)), { winner: 0, words: "Blue won by a road" });
});

test("the values after a move that ends the game: a result with no margin gives the win chance and no score", () => {
  assert.deepEqual(valuesAfter(ended([9, 4], ROAD), undefined), { blueWin: 0, blueScore: undefined });
  assert.deepEqual(valuesAfter(ended([9, 4], DRAWN), undefined), { blueWin: 0.5, blueScore: undefined });
  assert.deepEqual(valuesAfter(ended([9, 4]), undefined), { blueWin: 1, blueScore: 5 });
});

test("the review's last value is the game's own result, and the last move loses no score", () => {
  const search: Analysis<string> = { blueWin: 0.9, visits: 500, lead: 5, candidates: [] };
  const at = (last: PositionInfo) => review(words, {
    players: { blue: "", red: "" }, result: { blue: last.scores[0], red: last.scores[1] },
    moves: [{ player: 1, edge: "a" }], positions: [{ player: 1, over: false, scores: [0, 0], count: 1 }, last], analysis: [search, undefined],
  });
  const road = at(ended([9, 4], ROAD));
  assert.deepEqual(road.blueWin, [0.9, 0]);
  assert.deepEqual(road.blueScore, [5, undefined]);
  assert.equal(road.edges[0].pointsLost, undefined);
  assert.equal(road.edges[0].loss, 0); // Red's road: no win chance lost
  assert.deepEqual(at(ended([9, 4], DRAWN)).blueWin, [0.9, 0.5]);
  const flats = at(ended([9, 4])); // by the scores, as Enclosure and Blueprints
  assert.deepEqual([flats.blueWin, flats.blueScore], [[0.9, 1], [5, 5]]);
});

test("a record that ends before the rules end the game (a resignation, time) keeps the search's value at its end", () => {
  const search: Analysis<string> = { blueWin: 0.3, visits: 500, lead: 2, candidates: [] };
  const r = review(words, {
    players: { blue: "", red: "" }, result: { blue: 3, red: 2 }, ending: { result: "1-0", own: { winner: 0, words: "White resigned" } },
    moves: [{ player: 0, edge: "a" }], positions: [{ player: 0, over: false, scores: [0, 0], count: 0 }, { player: 1, over: false, scores: [3, 2], count: 1 }],
    analysis: [search, search],
  });
  assert.deepEqual(r.blueWin, [0.3, 0.3]);
  assert.equal(r.endedByRules, false);
});
