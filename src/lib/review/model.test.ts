// Checks how much of the engine's line the review trusts, on visits that the engine gave in the sample game's positions
// (docs/decisions/product.md, "The engine's line: where it stops"). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Edge } from "#lib/engine/notation.ts";
import { trustedLine, type Candidate } from "./model.ts";

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
