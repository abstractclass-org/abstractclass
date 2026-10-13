// Checks the analysis file (analysisFile.ts, design 21): its kind is told from a review file's, and a reader refuses
// what it cannot use, with a reason. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ANALYSIS_FORMAT, fileKind, readAnalysisFile } from "./analysisFile.ts";

const BOARD = { version: 2, main: ["A10-D9"], nodes: [["A10-D9", -1, 1], ["D10-G9", 0]] };
const file = (extra: object = {}) => JSON.stringify({ format: ANALYSIS_FORMAT, version: 1, exported: "", site: "x", board: BOARD,
                                                       analyses: [["5|fdfe5ad|ab12|512|A10-D9", { blueWin: 0.5 }], ["junk", 1]], ...extra });

test("a file's kind: an analysis, a review, or neither", () => {
  assert.equal(fileKind(file()), "analysis");
  assert.equal(fileKind(JSON.stringify({ format: "hedge-school-review" })), "review");
  assert.equal(fileKind("not json"), null);
  assert.equal(fileKind(JSON.stringify({ format: "other" })), null);
});

test("an analysis file keeps its lines and its readable results", () => {
  const f = readAnalysisFile(file());
  assert.deepEqual(f.board, BOARD);
  assert.deepEqual(f.analyses.map(a => a[0]), ["5|fdfe5ad|ab12|512|A10-D9"]);
});

test("an analysis file that cannot be used says why", () => {
  assert.throws(() => readAnalysisFile("{"), /not JSON/);
  assert.throws(() => readAnalysisFile(file({ version: 2 })), /newer Hedge School/);
  assert.throws(() => readAnalysisFile(file({ board: { version: 2, main: "x", nodes: [] } })), /lines cannot be read/);
});
