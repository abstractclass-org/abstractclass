// The player's notes (notes.ts): the same note, drawn again, goes or changes colour. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BRUSH_KEYS, brushFor, drawnNote, ringed, ringPoints, sameNote, toggleNote, type BoardNote, type BrushKeys } from "./notes.ts";

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

test("Hedge School's keys, for each of the keys held, give chessground's brushes", () => {
  for (let k = 0; k < 16; k++) {
    const keys = { shiftKey: !!(k & 1), ctrlKey: !!(k & 2), altKey: !!(k & 4), metaKey: !!(k & 8) };
    const a = keys.shiftKey || keys.ctrlKey, b = keys.altKey || keys.metaKey;
    const brush = a && b ? "grey" : a ? "yellow" : b ? "green" : "purple";
    assert.equal(brushFor(keys), brush, JSON.stringify(keys));
    assert.equal(brushFor(keys, BRUSH_KEYS), brush);
  }
});

test("a site's own keys: Ctrl alone for yellow, and Shift chooses no colour", () => {
  const own: BrushKeys = [["purple", []], ["yellow", [["Ctrl"]]], ["green", [["Alt"]]], ["grey", [["Ctrl"], ["Alt"]]]];
  const keys = { shiftKey: false, ctrlKey: false, altKey: false, metaKey: false };
  assert.equal(brushFor({ ...keys, shiftKey: true }, own), "purple");
  assert.equal(brushFor({ ...keys, ctrlKey: true }, own), "yellow");
  assert.equal(brushFor({ ...keys, shiftKey: true, ctrlKey: true }, own), "yellow");
  assert.equal(brushFor({ ...keys, metaKey: true }, own), "green");
  assert.equal(brushFor({ ...keys, shiftKey: true, ctrlKey: true, altKey: true }, own), "grey");
});

test("a drag of rings: a ring at each point, or that colour's rings removed, and two-point notes kept", () => {
  assert.deepEqual(drawnNote([1, 2], [1, 2], "grey"), ring(1, 2, "grey"));
  assert.deepEqual(drawnNote([1, 2], [3, 4], "grey"), line([1, 2], [3, 4], "grey"));
  const notes = [ring(0, 0, "purple"), line([0, 0], [2, 0], "purple"), ring(1, 0, "yellow")];
  // Marks: a new ring, a ring of another colour changed, and a ring of the colour kept
  assert.deepEqual(ringPoints(notes, [[0, 0], [1, 0], [2, 0]], "purple", false),
                   [ring(0, 0, "purple"), notes[1], ring(1, 0, "purple"), ring(2, 0, "purple")]);
  // Clears: the colour's rings only
  assert.deepEqual(ringPoints(notes, [[0, 0], [1, 0], [2, 0]], "purple", true), [notes[1], notes[2]]);
  assert.equal(ringPoints(notes, [[5, 5]], "purple", true), notes); // nothing to clear: the same notes
  assert.equal(ringPoints(notes, [[0, 0]], "purple", false), notes);
  assert.ok(ringed(notes, [0, 0], "purple") && !ringed(notes, [0, 0], "yellow") && !ringed(notes, [2, 0], "purple"));
});
