// How the lists write a note's moves in glyphs (game.ts, inGlyphs): a middle dot between two moves side by side.
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GLYPH_SEPARATOR, inGlyphs, type NotePart, type ViewTypes } from "./game.ts";

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
