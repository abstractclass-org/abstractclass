// The image of a line (lineImage.ts): the line that each kind of move draws, and the caption's text. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { imageCaption, imageLine, imageName } from "./lineImage.ts";

// The game A1 A2 A3 A4, with the branches A1 B1 B2 B3 and A1 B1 C1 C2 (design 07, item 13).
const MAIN = ["A1", "A2", "A3", "A4"];

test("a branch's move draws its line from where it leaves the game, as its preview numbers it", () => {
  assert.deepEqual(imageLine(["A1", "B1", "B2", "B3"], [], MAIN),
                   { start: ["A1"], paths: [["A1", "B1"], ["A1", "B1", "B2"], ["A1", "B1", "B2", "B3"]] });
  // A row that forks from another branch: the edges the two share are numbered too.
  assert.deepEqual(imageLine(["A1", "B1", "C1", "C2"], ["A1", "A2", "A3"], MAIN),
                   { start: ["A1"], paths: [["A1", "B1"], ["A1", "B1", "C1"], ["A1", "B1", "C1", "C2"]] });
  // Whatever the position on screen: the line is the branch's.
  assert.deepEqual(imageLine(["A1", "B1"], ["A1", "B1", "C1"], MAIN), { start: ["A1"], paths: [["A1", "B1"]] });
  // A branch from the start.
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
  assert.deepEqual(imageLine(["A1", "A2"], ["A1", "B1"], MAIN), { start: ["A1", "A2"], paths: [] }); // from a branch
});

const at = (scores: [number, number], areas?: [number, number]) => ({ scores, areas });

test("the caption: the turn and who plays at the line's start, then the scores there and after the line", () => {
  assert.deepEqual(imageCaption({ turn: 12, first: true, player: 0, movesLeft: 2, ...at([34, 30], [12, 8]) }, at([40.4, 30], [20, 8]), 6), [
    "Turn 12. Blue plays two edges.",
    "Before edge 1: Blue 34 points, 12 area. Red 30 points, 8 area.",
    "After edge 6: Blue 40 points, 20 area. Red 30 points, 8 area.",
  ]);
  assert.deepEqual(imageCaption({ turn: 12, first: false, player: 1, movesLeft: 1, ...at([1200, 980]) }, at([1210, 980]), 1), [
    "Turn 12. Red plays the second edge of the turn.",
    "Before edge 1: Blue 1,200 points. Red 980 points.",
    "After edge 1: Blue 1,210 points. Red 980 points.",
  ]);
});

test("the caption of a position with no line: its turn and its scores", () => {
  assert.deepEqual(imageCaption({ turn: 1, first: true, player: 0, movesLeft: 1, ...at([0, 0], [0, 0]) }, null, 0), [
    "Turn 1. Blue plays one edge.",
    "Blue 0 points, 0 area. Red 0 points, 0 area.",
  ]);
  assert.deepEqual(imageCaption({ turn: 61, first: true, player: 1, movesLeft: 2, over: true, ...at([310, 295]) }, null, 0), [
    "The game is over.",
    "Blue 310 points. Red 295 points.",
  ]);
});

test("the file's name gives the position where the line starts and its length", () => {
  assert.equal(imageName({ start: ["A1"], paths: [["A1", "B1"], ["A1", "B1", "B2"]] }), "hedge-school-after-edge-1-line-2.png");
  assert.equal(imageName({ start: [], paths: [["A1"]] }), "hedge-school-start-line-1.png");
  assert.equal(imageName({ start: ["A1", "A2"], paths: [] }), "hedge-school-after-edge-2.png");
});
