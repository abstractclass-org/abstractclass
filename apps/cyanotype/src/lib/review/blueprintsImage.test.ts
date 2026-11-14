// The image of a line, Blueprints' part (blueprintsImage.ts): the caption's text, and the saved file's name. Run: npm
// test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { imageCaption, imageName } from "./blueprintsImage.ts";

const at = (scores: [number, number], stars: [number, number]) => ({ scores, stars });

test("the caption: the turn and who plays at the line's start, then the scores and stars there and after the line", () => {
  assert.deepEqual(imageCaption({ turn: 12, first: true, player: 0, movesLeft: 2, over: false, ...at([34, 30], [3, 1]) }, at([40.4, 30], [4, 0]), 6), [
    "Turn 12. Blue plays two moves.",
    "Before move 1: Blue has a score of 34 and 3 stars on the board. Red has a score of 30 and 1 star on the board.",
    "After move 6: Blue has a score of 40 and 4 stars on the board. Red has a score of 30 and 0 stars on the board.",
  ]);
  assert.deepEqual(imageCaption({ turn: 12, first: false, player: 1, movesLeft: 1, over: false, ...at([1200, 980], [2, 2]) }, at([1210, 980], [2, 2]), 1), [
    "Turn 12. Red plays the second move of the turn.",
    "Before move 1: Blue has a score of 1,200 and 2 stars on the board. Red has a score of 980 and 2 stars on the board.",
    "After move 1: Blue has a score of 1,210 and 2 stars on the board. Red has a score of 980 and 2 stars on the board.",
  ]);
});

test("the caption of a position with no line: its turn and its numbers", () => {
  assert.deepEqual(imageCaption({ turn: 1, first: true, player: 0, movesLeft: 1, over: false, ...at([0, 0], [0, 0]) }, null, 0), [
    "Turn 1. Blue plays one move.",
    "Blue has a score of 0 and 0 stars on the board. Red has a score of 0 and 0 stars on the board.",
  ]);
  assert.deepEqual(imageCaption({ turn: 31, first: true, player: 1, movesLeft: 2, over: true, ...at([31, 29], [5, 4]) }, null, 0), [
    "The game is over.",
    "Blue has a score of 31 and 5 stars on the board. Red has a score of 29 and 4 stars on the board.",
  ]);
});

test("the file's name gives the position where the line starts and the moves that the image numbers", () => {
  assert.equal(imageName(["1@0,0"], 2), "cyanotype-after-move-1-line-2.png");
  assert.equal(imageName([], 1), "cyanotype-start-line-1.png");
  assert.equal(imageName(["1@0,0", "2@3,-1"], 0), "cyanotype-after-move-2.png");
});

test("the animated image's name has -animated before .gif", () => {
  assert.equal(imageName(["1@0,0"], 2, true), "cyanotype-after-move-1-line-2-animated.gif");
  assert.equal(imageName([], 1, true), "cyanotype-start-line-1-animated.gif");
});
