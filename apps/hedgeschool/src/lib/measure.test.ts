// Checks the ranges that the site's measurements send (measure.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CORE_RANGES, EDGE_RANGES, GAME_RANGES, MINUTE_RANGES, range } from "./measure.ts";

test("a count goes as its range, and the last range is open", () => {
  assert.equal(range(3, EDGE_RANGES), "1-29");
  assert.equal(range(30, EDGE_RANGES), "30-59");
  assert.equal(range(119, EDGE_RANGES), "90-119");
  assert.equal(range(120, EDGE_RANGES), "120+");
  assert.equal(range(8, CORE_RANGES), "5-8");
  assert.equal(range(32, CORE_RANGES), "17+");
  assert.equal(range(0.4, MINUTE_RANGES), "0");
  assert.equal(range(2.5, MINUTE_RANGES), "1-2");
  assert.equal(range(1, GAME_RANGES), "1"); // a range of one number says the number
  assert.equal(range(0, GAME_RANGES), "0");
  assert.equal(range(-1, EDGE_RANGES), "1-29"); // below the first start: the first range
});

test("a review's minutes have ranges past an hour, for the deepest custom depth", () => {
  assert.equal(range(90, MINUTE_RANGES), "60-119");
  assert.equal(range(216, MINUTE_RANGES), "120-239");
  assert.equal(range(600, MINUTE_RANGES), "240+");
});
