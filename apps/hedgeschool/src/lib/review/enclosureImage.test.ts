// The image of a line, Enclosure's part (enclosureImage.ts): the caption's text, and the saved file's name. Run: npm
// test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { imageCaption, imageName } from "./enclosureImage.ts";

const at = (scores: [number, number], areas?: [number, number]) => ({ scores, areas });

test("the caption: the turn and who plays at the line's start, then the scores there and after the line", () => {
  assert.deepEqual(imageCaption({ turn: 12, first: true, player: 0, movesLeft: 2, ...at([34, 30], [12, 8]) }, at([40.4, 30], [20, 8]), 6), [
    "Turn 12. Blue plays two edges.",
    "Before edge 1: Blue has a score of 34 and an area of 12. Red has a score of 30 and an area of 8.",
    "After edge 6: Blue has a score of 40 and an area of 20. Red has a score of 30 and an area of 8.",
  ]);
  assert.deepEqual(imageCaption({ turn: 12, first: false, player: 1, movesLeft: 1, ...at([1200, 980]) }, at([1210, 980]), 1), [
    "Turn 12. Red plays the second edge of the turn.",
    "Before edge 1: Blue has a score of 1,200. Red has a score of 980.",
    "After edge 1: Blue has a score of 1,210. Red has a score of 980.",
  ]);
});

test("the caption of a position with no line: its turn and its scores", () => {
  assert.deepEqual(imageCaption({ turn: 1, first: true, player: 0, movesLeft: 1, ...at([0, 0], [0, 0]) }, null, 0), [
    "Turn 1. Blue plays one edge.",
    "Blue has a score of 0 and an area of 0. Red has a score of 0 and an area of 0.",
  ]);
  assert.deepEqual(imageCaption({ turn: 61, first: true, player: 1, movesLeft: 2, over: true, ...at([310, 295]) }, null, 0), [
    "The game is over.",
    "Blue has a score of 310. Red has a score of 295.",
  ]);
});

test("the file's name gives the position where the line starts and the edges that the image numbers", () => {
  assert.equal(imageName(["A1"], 2), "hedge-school-after-edge-1-line-2.png");
  assert.equal(imageName([], 1), "hedge-school-start-line-1.png");
  assert.equal(imageName(["A1", "A2"], 0), "hedge-school-after-edge-2.png"); // a position, or a line that starts with a pass
});

test("the animated image's name has -animated before .gif", () => {
  assert.equal(imageName(["A1"], 2, true), "hedge-school-after-edge-1-line-2-animated.gif");
  assert.equal(imageName([], 1, true), "hedge-school-start-line-1-animated.gif");
});

