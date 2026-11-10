// How the lists write a note's moves in glyphs (game.ts, inGlyphs): a middle dot between two moves side by side. A
// game's result by the scores, and its words (resultOfScores, resultOfRecord, resultText, smallMargin, endingWords).
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { endingWords, GLYPH_SEPARATOR, inGlyphs, resultOfRecord, resultOfScores, resultText, smallMargin, type NotePart,
         type ViewTypes } from "./game.ts";

/** A move as a note names it: an object, as each game's played move is. */
const move = (name: string) => ({ player: 0, edge: name }) as unknown as NotePart<ViewTypes>;

test("in glyphs, a turn's two moves in a note have a middle dot between them; the note keeps its space", () => {
  const note: NotePart<ViewTypes>[] = ["Mistake. ", move("a"), " ", move("b"), " was best."];
  assert.deepEqual(inGlyphs(note), ["Mistake. ", note[1], GLYPH_SEPARATOR, note[3], " was best."]);
  assert.equal(GLYPH_SEPARATOR, " · ");
  assert.deepEqual(note, ["Mistake. ", note[1], " ", note[3], " was best."]); // the note's own parts are unchanged
});

test("a note of one move, a note of text, and the text round the moves keep their spaces", () => {
  const one: NotePart<ViewTypes>[] = ["Mistake. ", move("a"), " was best."];
  assert.deepEqual(inGlyphs(one), one);
  assert.deepEqual(inGlyphs(["Best."]), ["Best."]);
  const words: NotePart<ViewTypes>[] = [move("a"), " or ", move("b")]; // not a space alone: the note's own words
  assert.deepEqual(inGlyphs(words), words);
});

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

test("a result in words: a draw on a tie, else the winner and the margin in the game's format, with no unit", () => {
  const halves = (m: number) => m.toFixed(1), whole = (m: number) => String(Math.round(m));
  assert.equal(resultText(resultOfScores([20, 20]), halves), "A draw");
  assert.equal(resultText(resultOfScores([40, 12.5]), halves), "Blue won by 27.5");
  assert.equal(resultText(resultOfScores([3, 27]), whole), "Red won by 24");
});

test("a margin that one decimal writes as 0.0 takes the decimals that it needs, up to six: never \"0.0\"", () => {
  assert.deepEqual([0.03, 0.0349, 0.0004, 0.000001].map(smallMargin), ["0.03", "0.03", "0.0004", "0.000001"]);
  for (const m of [0.05, 0.1, 27.5]) assert.equal(smallMargin(m), undefined, `${m}`); // one decimal writes these
});

test("a game's outcome in words: by the scores when the rules ended it, else as its record says", () => {
  type Data = Parameters<typeof endingWords>[0];
  const data = (blue: number, red: number, result: string | null) =>
    ({ moves: [{}, {}], result: { blue, red }, ending: { result } }) as Data;
  const ending = (over: boolean, d: Data) => endingWords(d, over, "move", m => m.toFixed(1));
  assert.equal(ending(true, data(40, 12.5, "b+27.5")), "Blue won by 27.5");
  assert.equal(ending(true, data(20, 20, "0")), "A draw");
  assert.equal(ending(false, data(3, 9, "r+12")), "Red won by 12.0"); // the record's result, not the scores
  assert.equal(ending(false, data(3, 9, "0")), "A draw");
  assert.equal(ending(false, data(3, 9, "b+R")), "Blue won: Red resigned after move 2");
  assert.equal(ending(false, data(3, 9, "r+F")), "Red won: Blue left the game after move 2");
  assert.equal(ending(false, data(3, 9, "*")), "Unfinished after move 2");
  assert.equal(ending(false, data(3, 9, null)), "Unfinished after move 2");
});
