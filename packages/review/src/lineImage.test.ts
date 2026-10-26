// The image of a line (lineImage.ts): the line that each kind of move draws, and the animation's frames. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { imageLine, lineFrames } from "./lineImage.ts";

// The game A1 A2 A3 A4, with the variations A1 B1 B2 B3 and A1 B1 C1 C2 (design 07, item 13).
const MAIN = ["A1", "A2", "A3", "A4"];

test("a variation's move draws its line from where it leaves the game, as its preview numbers it", () => {
  assert.deepEqual(imageLine(["A1", "B1", "B2", "B3"], [], MAIN),
                   { start: ["A1"], paths: [["A1", "B1"], ["A1", "B1", "B2"], ["A1", "B1", "B2", "B3"]] });
  // A row that forks from another branch: the edges the two share are numbered too.
  assert.deepEqual(imageLine(["A1", "B1", "C1", "C2"], ["A1", "A2", "A3"], MAIN),
                   { start: ["A1"], paths: [["A1", "B1"], ["A1", "B1", "C1"], ["A1", "B1", "C1", "C2"]] });
  // Whatever the position on screen: the line is the variation's.
  assert.deepEqual(imageLine(["A1", "B1"], ["A1", "B1", "C1"], MAIN), { start: ["A1"], paths: [["A1", "B1"]] });
  // A variation from the start.
  assert.deepEqual(imageLine(["D1"], ["A1"], MAIN), { start: [], paths: [["D1"]] });
});

test("a main line move ahead of the position on screen draws the line from there to it", () => {
  assert.deepEqual(imageLine(["A1", "A2", "A3"], ["A1"], MAIN),
                   { start: ["A1"], paths: [["A1", "A2"], ["A1", "A2", "A3"]] });
  assert.deepEqual(imageLine(["A1"], [], MAIN), { start: [], paths: [["A1"]] });
});

test("a main line move not ahead of the position on screen draws the position after it", () => {
  assert.deepEqual(imageLine(["A1", "A2"], ["A1", "A2", "A3"], MAIN), { start: ["A1", "A2"], paths: [] }); // behind
  assert.deepEqual(imageLine(["A1", "A2"], ["A1", "A2"], MAIN), { start: ["A1", "A2"], paths: [] }); // on screen
  assert.deepEqual(imageLine(["A1", "A2"], ["A1", "B1"], MAIN), { start: ["A1", "A2"], paths: [] }); // from a variation
});

test("the animation: the whole line for 2 seconds, the start with no edge for 1 second, each edge for half a second", () => {
  assert.deepEqual(lineFrames(3), [{ edges: 3, ms: 2000 }, { edges: 0, ms: 1000 }, { edges: 1, ms: 500 }, { edges: 2, ms: 500 },
                                   { edges: 3, ms: 500 }]);
  assert.deepEqual(lineFrames(1), [{ edges: 1, ms: 2000 }, { edges: 0, ms: 1000 }, { edges: 1, ms: 500 }]);
  assert.deepEqual(lineFrames(0), []); // no line: nothing to play
});
