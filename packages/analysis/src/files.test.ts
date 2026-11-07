// Checks a site's files of saved work (files.ts) at a komi (Hedge School's design 24): which results belong in a file,
// and the analysis file's board, out and back in. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHAPE } from "./cache.ts";
import { ANALYSIS_FILE_VERSION, belongs, exportAnalysis, readAnalysisFile } from "./files.ts";
import type { KeptBoard } from "./kept.ts";
import { STORES, dbPut } from "@abstractclass/storage/db.ts";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";

memoryDb(); // the export's store

const key = (moves: string) => `${SHAPE}|fdfe5ad|ab12|512|${moves}`;

test("a komi's start does not belong to a game at komi 0", () => {
  const even = new Set(["", "a"]), atKomi = new Set(["komi=300", "komi=300 a"]);
  // A start at a komi, or after a set-up start, is no move from the standard start at komi 0.
  for (const start of ["komi=300", "komi=-300", "@s", "@s komi=300"]) assert.equal(belongs(key(start), even, null), false, start);
  // A move from a game's position belongs to it, at its own komi only.
  assert.equal(belongs(key("a b"), even, null), true);
  assert.equal(belongs(key("komi=300 a b"), atKomi, null), true);
  assert.equal(belongs(key("komi=300 a b"), even, null), false);
  assert.equal(belongs(key("a b"), atKomi, null), false);
  assert.equal(belongs(key(""), atKomi, null), false);
});

const FORMAT = "test-analysis";
const file = (board: object) => JSON.stringify({ format: FORMAT, version: ANALYSIS_FILE_VERSION, exported: "", site: "x", board, analyses: [] });

test("an analysis file keeps its board's komi, and its results at that komi", async () => {
  const board: KeptBoard = { version: 2, main: ["a"], nodes: [["a", 0]], komi: -300 };
  for (const [moves, value] of [["", 1], ["a", 2], ["komi=-300", 3], ["komi=-300 a", 4], ["komi=-300 a b", 5]] as const)
    await dbPut(STORES.analysis, key(moves), { value });
  const out = await exportAnalysis(FORMAT, board, "x", null);
  assert.deepEqual(out.analyses.map(a => (a[1] as { value: number }).value).sort(), [3, 4, 5]);
  const back = readAnalysisFile(JSON.stringify(out), "Test", FORMAT);
  assert.equal(back.board.komi, -300);
  // A board at komi 0 takes its own results, and none at the komi.
  const even = await exportAnalysis(FORMAT, { ...board, komi: undefined }, "x", null);
  assert.deepEqual(even.analyses.map(a => (a[1] as { value: number }).value).sort(), [1, 2]);
});

test("an analysis file whose komi is not one says so", () => {
  const board = { version: 2, main: [], nodes: [] };
  assert.equal(readAnalysisFile(file({ ...board, komi: 7.5 }), "Test", FORMAT).board.komi, 7.5);
  for (const komi of [2.25, "300", null, 1e6])
    assert.throws(() => readAnalysisFile(file({ ...board, komi }), "Test", FORMAT), /cannot read the analysis file's lines/, String(komi));
});
