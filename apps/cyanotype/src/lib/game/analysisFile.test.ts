// Checks the analysis file (analysisFile.ts): it holds the board's lines and the results that belong to them, and it
// loads back into another browser as the same lines at the board's address, with its results in that browser's store.
// A file that cannot be used says why. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHAPE } from "@abstractclass/analysis/cache.ts";
import type { KeptBoard } from "@abstractclass/analysis/kept.ts";
import type { Manifest } from "@abstractclass/engine/client.ts";
import { STORES, dbPutMany } from "@abstractclass/storage/db.ts";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";
import { ANALYSIS_FORMAT, analysisFileName, exportAnalysis, openAnalysisFile, readAnalysisFile } from "./analysisFile.ts";
import { readBoardLink } from "./board.ts";

const db = memoryDb(); // this browser's store

const BOARD: KeptBoard = { version: 2, main: ["2@-6,-2", "1@0,0"],
  nodes: [["2@-6,-2", -1], ["2@-6,-2 1@0,0", -1, 1], ["2@-6,-2 3@1,1", 2]] };
const key = (moves: string, model = "ab12", search = "s1") => `${SHAPE}|${search}|${model}|512|${moves}`;
const MANIFEST = { artifacts: [{ kind: "module", sha256: "m1", search: "s1" }, { kind: "model", sha256: "ab12", id: "net" }] } as Manifest;

test("an analysis file loads back as the same lines, at the start, with its results", async () => {
  await dbPutMany(STORES.analysis, [
    [key(""), { blueWin: 0.5 }], [key("2@-6,-2 1@0,0"), { blueWin: 0.6 }],
    [key("2@-6,-2 1@0,0 2@1,1"), { blueWin: 0.7 }], // one move from the board's lines: a Great's confirmation
    [key("1@9,9 1@0,0"), { blueWin: 0.1 }], // two moves from them: another board's
    [key("2@-6,-2", "cd34"), { blueWin: 0.2 }], // a network that the site does not ship
  ]);
  const file = await exportAnalysis(BOARD, "abc1234", new Set(["ab12"]), new Date(2026, 10, 7, 9, 5));
  assert.equal(file.format, ANALYSIS_FORMAT);
  assert.equal(file.site, "abc1234");
  assert.deepEqual(file.analyses.map(a => a[0]).sort(), [key(""), key("2@-6,-2 1@0,0"), key("2@-6,-2 1@0,0 2@1,1")].sort());
  assert.equal(analysisFileName(new Date(2026, 10, 7, 9, 5)), "cyanotype-analysis-20261107-0905.json");

  // Another browser: an empty store.
  db.rows(STORES.analysis).clear();
  const link = await openAnalysisFile(JSON.stringify(file), MANIFEST), hash = new URLSearchParams(link.split("#")[1]);
  assert.ok(link.startsWith("/analysis#"));
  assert.equal(hash.get("via"), "analysis_file");
  const back = readBoardLink(hash.get("packed")!, hash.get("at"));
  assert.equal(back.at, 0);
  assert.deepEqual(new Set(back.board.nodes.map(n => `${n[0]}|${n[2] ?? 0}`)), new Set(BOARD.nodes.map(n => `${n[0]}|${n[2] ?? 0}`)));
  assert.deepEqual([...db.rows(STORES.analysis).keys()].sort(), file.analyses.map(a => a[0]).sort());
});

test("a load keeps only the results of the site's search", async () => {
  db.rows(STORES.analysis).clear();
  const file = { format: ANALYSIS_FORMAT, version: 1, exported: "", site: "x", board: BOARD,
                 analyses: [[key(""), { blueWin: 0.5 }], [key("", "ab12", "s0"), { blueWin: 0.4 }]] };
  await openAnalysisFile(JSON.stringify(file), MANIFEST);
  assert.deepEqual([...db.rows(STORES.analysis).keys()], [key("")]);
});

test("an analysis file that cannot be used says why", () => {
  const file = (extra: object = {}) => JSON.stringify({ format: ANALYSIS_FORMAT, version: 1, exported: "", site: "x", board: BOARD,
                                                         analyses: [], ...extra });
  assert.throws(() => readAnalysisFile("{"), /not a Cyanotype analysis file: it is not JSON/);
  assert.throws(() => readAnalysisFile(file({ format: "hedge-school-analysis" })), /not a Cyanotype analysis file/);
  assert.throws(() => readAnalysisFile(file({ version: 2 })), /newer Cyanotype/);
  assert.throws(() => readAnalysisFile(file({ board: { version: 2, main: "x", nodes: [] } })), /Cyanotype cannot read the analysis file's lines/);
  return assert.rejects(openAnalysisFile(file({ board: { ...BOARD, start: "x" } }), MANIFEST), /set-up position/);
});

test("an analysis file whose board has a komi says that the board cannot open it, and keeps none of its results", async () => {
  // Hedge School's design 24: the board searches at komi 0, so a komi's results are of no use to it.
  db.rows(STORES.analysis).clear();
  const file = { format: ANALYSIS_FORMAT, version: 1, exported: "", site: "x", board: { ...BOARD, komi: -300 },
                 analyses: [[key("komi=-300"), { blueWin: 0.9 }]] };
  await assert.rejects(openAnalysisFile(JSON.stringify(file), MANIFEST), /komi/);
  assert.deepEqual([...db.rows(STORES.analysis).keys()], []);
});
