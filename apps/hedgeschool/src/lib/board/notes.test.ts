// The player's notes (notes.ts): the same note, drawn again, goes or changes colour. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { brushFor, sameNote, toggleNote, type BoardNote } from "./notes.ts";

const ring = (x: number, y: number, brush: BoardNote["brush"] = "green"): BoardNote => ({ at: [x, y], brush });
const line = (a: [number, number], b: [number, number], brush: BoardNote["brush"] = "green"): BoardNote => ({ at: a, to: b, brush });

test("a ring or a line drawn again goes; in another colour it changes colour", () => {
  let notes = toggleNote([], ring(10, 11));
  notes = toggleNote(notes, line([12, 13], [15, 10]));
  assert.equal(notes.length, 2);
  assert.ok(sameNote(line([15, 10], [12, 13]), notes[1])); // a line either way is one line
  assert.ok(!sameNote(ring(12, 13), notes[1])); // a ring is not a line from its point
  assert.deepEqual(toggleNote(notes, ring(10, 11)), [notes[1]]);
  assert.deepEqual(toggleNote(notes, line([15, 10], [12, 13])), [notes[0]]);
  assert.deepEqual(toggleNote(notes, ring(10, 11, "yellow")), [ring(10, 11, "yellow"), notes[1]]);
});

test("the keys pick the colour, as chessground's brushes", () => {
  const keys = { shiftKey: false, ctrlKey: false, altKey: false, metaKey: false };
  assert.equal(brushFor(keys), "purple");
  assert.equal(brushFor({ ...keys, shiftKey: true }), "yellow");
  assert.equal(brushFor({ ...keys, altKey: true }), "green");
  assert.equal(brushFor({ ...keys, ctrlKey: true, altKey: true }), "grey");
});
