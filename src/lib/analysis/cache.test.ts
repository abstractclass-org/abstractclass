// Checks the choice of a snapshot's engine search (searchHolding, design 20): the search whose stored results hold the
// game's line at the review's depth. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { analysisKey, searchHolding } from "./cache.ts";

const line = [["a1"], ["a1", "b2"], ["a1", "b2", "c3"]];
const keys = (search: string, model: string, visits: number, positions = line) => positions.map(m => analysisKey(search, model, m, visits));

test("the search that holds every position of the line at the depth", () => {
  const stored = [...keys("old", "n1", 512), ...keys("new", "n1", 32)];
  assert.equal(searchHolding(stored, "n1", line, 512), "old");
  assert.equal(searchHolding(stored, "n1", line, 256), "old"); // a deeper result answers a shallower depth
});

test("no search when a position, the depth or the network is missing", () => {
  assert.equal(searchHolding(keys("old", "n1", 512, line.slice(0, 2)), "n1", line, 512), undefined);
  assert.equal(searchHolding(keys("old", "n1", 256), "n1", line, 512), undefined);
  assert.equal(searchHolding(keys("old", "n1", 512), "n2", line, 512), undefined);
  assert.equal(searchHolding(keys("old", "n1", 512), "n1", [], 512), undefined); // no line to hold
});

test("the site's own search is left out when the snapshot is of an earlier engine", () => {
  const stored = [...keys("new", "n1", 512), ...keys("old", "n1", 512)];
  assert.equal(searchHolding(stored, "n1", line, 512, "new"), "old");
  assert.equal(searchHolding(keys("new", "n1", 512), "n1", line, 512, "new"), undefined);
});

test("results of an older shape are not read", () => {
  const stored = keys("old", "n1", 512).map(k => k.replace(/^\d+\|/, "4|"));
  assert.equal(searchHolding(stored, "n1", line, 512), undefined);
});
