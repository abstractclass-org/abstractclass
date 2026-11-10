// How the lists write a note's moves in glyphs (game.ts, inGlyphs): a middle dot between two moves side by side. A
// game's result by the scores, and its words (resultOfScores, resultOfRecord, resultText). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GLYPH_SEPARATOR, inGlyphs, resultOfRecord, resultOfScores, resultText, type NotePart, type ViewTypes } from "./game.ts";

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

test("a result by the scores: the winner and the margin, and a draw on equal scores", () => {
  assert.deepEqual(resultOfScores([40, 12.5]), { winner: 0, margin: 27.5 });
  assert.deepEqual(resultOfScores([3, 6]), { winner: 1, margin: 3 });
  assert.deepEqual(resultOfScores([20, 20]), { winner: null, margin: 0 });
  // A sum of areas can miss equality by a floating-point error: still a draw.
  assert.deepEqual(resultOfScores([0.1 + 0.2, 0.3]), { winner: null, margin: 0 });
});

test("a record's result by the scores takes the same rule; a resignation, a forfeit and no result are not by the scores", () => {
  assert.deepEqual(resultOfRecord("b+28.5"), { winner: 0, margin: 28.5 });
  assert.deepEqual(resultOfRecord("r+3"), { winner: 1, margin: 3 });
  assert.deepEqual(resultOfRecord("0"), { winner: null, margin: 0 });
  assert.deepEqual(resultOfRecord("b+0"), { winner: null, margin: 0 });
  for (const other of ["b+R", "r+F", "*", ""]) assert.equal(resultOfRecord(other), null);
});

test("a result in words: a draw on a tie, else the winner and the margin in the game's format, with no unit", () => {
  const halves = (m: number) => m.toFixed(1), whole = (m: number) => String(Math.round(m));
  assert.equal(resultText(resultOfScores([20, 20]), halves), "A draw");
  assert.equal(resultText(resultOfScores([40, 12.5]), halves), "Blue won by 27.5");
  assert.equal(resultText(resultOfScores([3, 27]), whole), "Red won by 24");
});
