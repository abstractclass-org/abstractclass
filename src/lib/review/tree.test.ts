// Checks the review's game tree: places on the game's line, the branches' rows in the move list, and the lines kept for
// a game. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { branchChildren, branchRows, keepLine, mainIndex, pathKey, sharedLength } from "./tree.ts";

const main = ["a", "b", "c", "d"];

test("a path on the game's line has its index, a path off it has none", () => {
  assert.equal(mainIndex([], main), 0);
  assert.equal(mainIndex(["a", "b"], main), 2);
  assert.equal(mainIndex(["a", "x"], main), null);
  assert.equal(mainIndex([...main, "e"], main), null);
  assert.equal(sharedLength(["a", "x", "y"], main), 1);
});

test("a branch's rows: one row to a fork, then each line from the fork one step further in", () => {
  // From the game after "a": x, then y z, with w v as another line from x.
  const nodes = [["a", "x"], ["a", "x", "y"], ["a", "x", "y", "z"], ["a", "x", "w"], ["a", "x", "w", "v"]];
  const kids = branchChildren(nodes);
  const rows = branchRows(["a", "x"], p => kids.get(pathKey(p)) ?? []);
  assert.deepEqual(rows.map(r => [r.depth, r.paths.map(p => p.at(-1)).join("")]), [
    [1, "x"], // the branch to the fork
    [2, "yz"], // the first line from the fork, indented
    [2, "wv"], // the other line, beside it
  ]);
});

test("a branch with no forks is one row", () => {
  const nodes = [["x"], ["x", "y"], ["x", "y", "z"]];
  const kids = branchChildren(nodes);
  assert.deepEqual(branchRows(["x"], p => kids.get(pathKey(p)) ?? []).map(r => r.paths.length), [3]);
});

test("the lines kept for a game drop the ones a new line extends", () => {
  let lines: string[][] = [];
  lines = keepLine(lines, ["a", "x"]);
  lines = keepLine(lines, ["a", "x", "y"]); // extends the first
  lines = keepLine(lines, ["a", "x"]); // already held
  lines = keepLine(lines, ["a", "w"]);
  assert.deepEqual(lines, [["a", "x", "y"], ["a", "w"]]);
});
