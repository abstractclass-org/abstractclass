// Checks the analysis file (analysisFile.ts, design 21): its kind is told from a review file's, and a reader refuses
// what it cannot use, with a reason. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHAPE } from "@abstractclass/analysis/cache.ts";
import { ANALYSIS_FORMAT, fileKind, openAnalysisFile, readAnalysisFile } from "./analysisFile.ts";
import { readBoardLink } from "./board.ts";

const BOARD = { version: 2, main: ["A10-D9"], nodes: [["A10-D9", -1, 1], ["D10-G9", 0]] };
const KEY = `${SHAPE}|fdfe5ad|ab12|512|A10-D9`; // a result of this shape: a reader reads it
const file = (extra: object = {}) => JSON.stringify({ format: ANALYSIS_FORMAT, version: 1, exported: "", site: "x", board: BOARD,
                                                       analyses: [[KEY, { blueWin: 0.5 }], ["junk", 1]], ...extra });

test("a file's kind: an analysis, a review, or neither", () => {
  assert.equal(fileKind(file()), "analysis");
  assert.equal(fileKind(JSON.stringify({ format: "hedge-school-review" })), "review");
  assert.equal(fileKind("not json"), null);
  assert.equal(fileKind(JSON.stringify({ format: "other" })), null);
});

test("an analysis file keeps its lines and its readable results", () => {
  const f = readAnalysisFile(file());
  assert.deepEqual(f.board, BOARD);
  assert.deepEqual(f.analyses.map(a => a[0]), [KEY]);
  // A result that the area map's first builds stored as shape 6: a reader reads it too (design 30)
  const early = `6|fdfe5ad|ab12|16384|A10-D9`;
  assert.deepEqual(readAnalysisFile(file({ analyses: [[early, { blueWin: 0.5 }]] })).analyses.map(a => a[0]), [early]);
});

test("an analysis file that cannot be used says why", () => {
  assert.throws(() => readAnalysisFile("{"), /not JSON/);
  assert.throws(() => readAnalysisFile(file({ version: 2 })), /newer Hedge School/);
  assert.throws(() => readAnalysisFile(file({ board: { version: 2, main: "x", nodes: [] } })), /cannot read the analysis file's lines/);
});

test("an analysis file at a komi opens the board at it, and a komi that is not one says so (design 24)", async () => {
  const atKomi = { ...BOARD, komi: -300 };
  assert.equal(readAnalysisFile(file({ board: atKomi })).board.komi, -300);
  const address = new URLSearchParams((await openAnalysisFile(file({ board: atKomi, analyses: [] }), null)).split("#")[1]);
  assert.equal(readBoardLink(address.get("packed")!, address.get("at")).board.komi, -300);
  assert.throws(() => readAnalysisFile(file({ board: { ...BOARD, komi: "-300" } })), /cannot read the analysis file's lines/);
});
