// Checks the choice of a snapshot's engine search (searchHolding, design 20): the search whose stored results hold the
// game's line at the review's depth. And the removal of older shapes: which keys it takes, and when it runs.
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHAPE, analysisKey, isOlderShape, removalDue, searchHolding } from "./cache.ts";

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

test("the removal takes the results of older shapes, and keeps every engine's and network's of this shape", () => {
  // Real keys' parts: the search's name, and a network's SHA-256 (shortened here: any hex).
  assert.equal(isOlderShape(`${SHAPE}|fdfe5ad|800f0bbf|512|D10-G10 N11-Q10`), false);
  assert.equal(isOlderShape(`${SHAPE}|85c2adb|6e25445b|32|`), false); // an earlier engine's, which a snapshot reads (design 20)
  assert.equal(isOlderShape(`${SHAPE}|fdfe5ad|800f0bbf|512|@A1_B2 D10-G10`), false); // from a set-up start
  assert.equal(isOlderShape(`${SHAPE + 1}|fdfe5ad|800f0bbf|512|D10-G10`), false); // a tab of a later release wrote it
  assert.equal(isOlderShape(`${SHAPE - 1}|fdfe5ad|800f0bbf|512|D10-G10`), true);
  assert.equal(isOlderShape("2|85c2adb|800f0bbf|32|"), true);
  // Before shape 2, a key had no shape: the build, the network, the visits and the moves.
  assert.equal(isOlderShape("85c2adb|800f0bbf|512|D10-G10"), true);
  assert.equal(isOlderShape("1234567|800f0bbf|512|"), true); // a build of digits alone
});

test("the removal runs once after a change of the shape: when the browser's mark is older or absent", () => {
  assert.equal(removalDue(null), true); // a first visit, or a browser from before the removal
  assert.equal(removalDue(String(SHAPE - 1)), true);
  assert.equal(removalDue("x"), true);
  assert.equal(removalDue(String(SHAPE)), false); // done for this shape: the start reads the mark alone
  assert.equal(removalDue(String(SHAPE + 1)), false); // done by a tab of a later release: this older tab removes nothing
});
