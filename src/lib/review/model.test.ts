// Checks how much of the engine's line the review trusts (on visits that the engine gave in the sample game's positions:
// docs/decisions/product.md, "The engine's line: where it stops"), and how a branch's edge is judged. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Edge } from "#lib/engine/notation.ts";
import { judgeBranchEdge, trustedLine, valuesAfter, type Analysis, type Candidate, type Position } from "./model.ts";

const edges = (n: number): Edge[] => Array.from({ length: n }, (_, k): Edge => [k, 0, k, 1]);
const candidate = (lineVisits?: number[], n = lineVisits?.length ?? 6): Candidate =>
  ({ edge: edges(1)[0], visits: lineVisits?.[0] ?? 0, blueWin: 0.5, line: edges(n), lineVisits });

test("a line stops before its first edge with fewer than 25 visits", () => {
  assert.equal(trustedLine(candidate([182, 104, 103, 25, 19, 11])).length, 4); // 25 is enough
  assert.equal(trustedLine(candidate([253, 66, 9, 7, 6, 5])).length, 2);
  assert.equal(trustedLine(candidate([32, 7, 6, 2, 1])).length, 1); // the candidate alone
  assert.equal(trustedLine(candidate([589, 318, 154, 94, 93, 90])).length, 6);
});

test("visits that grow along a line do not bring back the edges after a thin one", () => {
  assert.equal(trustedLine(candidate([120, 20, 40, 40])).length, 1);
});

test("a line without its visits is kept whole", () => {
  assert.equal(trustedLine(candidate(undefined, 5)).length, 5);
});

test("a branch edge is judged as the game's: Best or Great when it is the first choice, and by its loss otherwise", () => {
  const best = edges(2)[0], other = edges(2)[1];
  const before: Analysis = { blueWin: 0.6, visits: 256, lead: 20, candidates: [
    { edge: best, visits: 200, blueWin: 0.6, lead: 20 }, { edge: other, visits: 40, blueWin: 0.45, lead: -10 }] };
  // Blue played the first choice, and the second looks 0.15 worse in that search. Great only when a search of the
  // position after the second, as deep, confirms the gap: until then Best.
  const after = { blueWin: 0.6, blueScore: 20 };
  assert.equal(judgeBranchEdge(before, after, 0, best, "lead", 256), "best");
  const second = (blueWin: number, visits = 256): Analysis => ({ blueWin, visits, candidates: [] });
  assert.equal(judgeBranchEdge(before, after, 0, best, "lead", 256, second(0.45)), "great");
  assert.equal(judgeBranchEdge(before, after, 0, best, "lead", 256, second(0.55)), "best"); // only 0.05 worse
  assert.equal(judgeBranchEdge(before, after, 0, best, "lead", 256, second(0.45, 32)), "best"); // too shallow
  // Blue played the other edge: 0.15 of win chance and 30 points lost.
  assert.equal(judgeBranchEdge(before, { blueWin: 0.45, blueScore: -10 }, 0, other, "lead", 256), "mistake");
  // Not judged until the position before has the label budget, and the position after has values.
  assert.equal(judgeBranchEdge({ ...before, visits: 32 }, { blueWin: 0.6, blueScore: 20 }, 0, best, "lead", 256), null);
  assert.equal(judgeBranchEdge(before, undefined, 0, best, "lead", 256), null);
});

test("the values after a position: the result where the game ends, else its analysis with enough visits", () => {
  const p = { scores: [100, 90], over: true } as unknown as Position;
  assert.deepEqual(valuesAfter(p, undefined), { blueWin: 1, blueScore: 10 });
  const q = { scores: [0, 0], over: false } as unknown as Position;
  assert.equal(valuesAfter(q, { blueWin: 0.5, visits: 32, candidates: [] }, "lead", 256), undefined);
});
