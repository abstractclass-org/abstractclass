// Checks the analysis file (analysisFile.ts): it holds the board's lines and the results that belong to them, and it
// loads back into another browser as the same lines at the board's address, with its results in that browser's store.
// A file that cannot be used says why. The board that opens the file takes the file's network (Hedge School's design
// 21), and a file of several networks or of one that the site no longer ships asks the player first. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { keyMoves, SHAPE } from "@abstractclass/analysis/cache.ts";
import type { KeptBoard } from "@abstractclass/analysis/kept.ts";
import type { Manifest } from "@abstractclass/engine/client.ts";
import { STORES, dbPutMany } from "@abstractclass/storage/db.ts";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";
import { ANALYSIS_FORMAT, analysisFileName, exportAnalysis, openAnalysisFile, readAnalysisFile } from "./analysisFile.ts";
import { fileEngine, type NetworkQuestion } from "@abstractclass/analysis/files.ts";
import { NETWORKS } from "../analysis/engineSettings.ts";
import { readBoardLink } from "./board.ts";
import { STANDARD_START } from "./position.ts";

const db = memoryDb(); // this browser's store

const BOARD: KeptBoard = { version: 2, main: ["2@-6,-2", "1@0,0"],
  nodes: [["2@-6,-2", -1], ["2@-6,-2 1@0,0", -1, 1], ["2@-6,-2 3@1,1", 2]] };
const key = (moves: string, model = "ab12", search = "s1") => `${SHAPE}|${search}|${model}|512|${moves}`;
const MANIFEST = { artifacts: [{ kind: "module", sha256: "m1", search: "s1" }, { kind: "model", sha256: "ab12", id: "net" },
                                { kind: "model", sha256: "ef56", id: "other", displayName: "Other" }] } as Manifest;
/** The player's answer to a question that the load must not ask. */
const noQuestion = async (): Promise<string | null> => assert.fail("the load asked the player");
/** The board's address of a load that opens. */
const opened = async (text: string, choose: (q: NetworkQuestion) => Promise<string | null> = noQuestion) => {
  const link = await openAnalysisFile(text, MANIFEST, choose);
  assert.ok(link);
  return link;
};

test("an analysis file loads back as the same lines, at the start, with its results", async () => {
  await dbPutMany(STORES.analysis, [
    [key(""), { blueWin: 0.5 }], [key("2@-6,-2 1@0,0"), { blueWin: 0.6 }],
    [key("2@-6,-2 1@0,0 2@1,1"), { blueWin: 0.7 }], // one move from the board's lines: a Great's confirmation
    [key("1@9,9 1@0,0"), { blueWin: 0.1 }], // two moves from them: another board's
    [key("2@-6,-2", "cd34"), { blueWin: 0.2 }], // a network that the site does not ship
  ]);
  const file = await exportAnalysis(BOARD, "abc1234", new Set(["ab12"]), null, new Date(2026, 10, 7, 9, 5));
  assert.equal(file.format, ANALYSIS_FORMAT);
  assert.equal(file.site, "abc1234");
  assert.deepEqual(file.analyses.map(a => a[0]).sort(), [key(""), key("2@-6,-2 1@0,0"), key("2@-6,-2 1@0,0 2@1,1")].sort());
  assert.equal(analysisFileName(new Date(2026, 10, 7, 9, 5)), "cyanotype-analysis-20261107-0905.json");

  // Another browser: an empty store.
  db.rows(STORES.analysis).clear();
  const link = await opened(JSON.stringify(file)), hash = new URLSearchParams(link.split("#")[1]);
  assert.ok(link.startsWith("/analysis#"));
  assert.equal(hash.get("via"), "analysis_file");
  assert.equal(hash.get("network"), "net"); // the one network of its results
  const back = readBoardLink(hash.get("packed")!, hash.get("at"));
  assert.equal(back.at, 0);
  assert.deepEqual(new Set(back.board.nodes.map(n => `${n[0]}|${n[2] ?? 0}`)), new Set(BOARD.nodes.map(n => `${n[0]}|${n[2] ?? 0}`)));
  assert.deepEqual([...db.rows(STORES.analysis).keys()].sort(), file.analyses.map(a => a[0]).sort());
});

test("a load keeps only the results of the site's search", async () => {
  db.rows(STORES.analysis).clear();
  const file = { format: ANALYSIS_FORMAT, version: 1, exported: "", site: "x", board: BOARD,
                 analyses: [[key(""), { blueWin: 0.5 }], [key("", "ab12", "s0"), { blueWin: 0.4 }]] };
  await opened(JSON.stringify(file));
  assert.deepEqual([...db.rows(STORES.analysis).keys()], [key("")]);
});

test("an analysis file that cannot be used says why", () => {
  const file = (extra: object = {}) => JSON.stringify({ format: ANALYSIS_FORMAT, version: 1, exported: "", site: "x", board: BOARD,
                                                         analyses: [], ...extra });
  assert.throws(() => readAnalysisFile("{"), /not a Cyanotype analysis file: it is not JSON/);
  assert.throws(() => readAnalysisFile(file({ format: "hedge-school-analysis" })), /not a Cyanotype analysis file/);
  assert.throws(() => readAnalysisFile(file({ version: 2 })), /newer Cyanotype/);
  assert.throws(() => readAnalysisFile(file({ board: { version: 2, main: "x", nodes: [] } })), /Cyanotype cannot read the analysis file's lines/);
});

test("an analysis file from a set-up start opens from it, with the results of its positions", async () => {
  db.rows(STORES.analysis).clear();
  const start = STANDARD_START.replace(/ b1 0\/0 0$/, " r1 0/0 22"); // the start's cells, at Red's move of turn 12
  const board: KeptBoard = { ...BOARD, start };
  const keyed = keyMoves(start, ["2@-6,-2"]).join(" ");
  await dbPutMany(STORES.analysis, [[key(keyed), { blueWin: 0.3 }], [key("2@-6,-2"), { blueWin: 0.9 }]]); // the second: the standard start's
  const file = await exportAnalysis(board, "abc1234", new Set(["ab12"]));
  assert.deepEqual(file.analyses.map(a => a[0]), [key(keyed)]);
  db.rows(STORES.analysis).clear();
  const link = await opened(JSON.stringify(file)), hash = new URLSearchParams(link.split("#")[1]);
  assert.equal(readBoardLink(hash.get("packed")!, null).board.start, start);
  assert.deepEqual([...db.rows(STORES.analysis).keys()], [key(keyed)]);
});

test("an analysis file at a komi opens the board at it, with its results (Hedge School's design 24)", async () => {
  db.rows(STORES.analysis).clear();
  const file = { format: ANALYSIS_FORMAT, version: 1, exported: "", site: "x", board: { ...BOARD, komi: -300 },
                 analyses: [[key("komi=-300"), { blueWin: 0.9 }]] };
  const hash = new URLSearchParams((await opened(JSON.stringify(file))).split("#")[1]);
  assert.equal(readBoardLink(hash.get("packed")!, null).board.komi, -300);
  assert.deepEqual([...db.rows(STORES.analysis).keys()], [key("komi=-300")]);
});

test("an analysis file beyond the komi that a record can give does not open, and keeps none of its results", async () => {
  db.rows(STORES.analysis).clear();
  const file = { format: ANALYSIS_FORMAT, version: 1, exported: "", site: "x", board: { ...BOARD, komi: 90_981 },
                 analyses: [[key("komi=90981"), { blueWin: 0.9 }]] };
  await assert.rejects(openAnalysisFile(JSON.stringify(file), MANIFEST, noQuestion),
    (e: Error) => e.message === "the analysis file's komi must be from -90,980 to 90,980 points: 90981");
  assert.deepEqual([...db.rows(STORES.analysis).keys()], []);
});

test("an analysis file names the board's network, and the board that opens it takes that network", async () => {
  db.rows(STORES.analysis).clear();
  await dbPutMany(STORES.analysis, [[key(""), { blueWin: 0.5 }], [key("", "ef56"), { blueWin: 0.4 }]]);
  const file = await exportAnalysis(BOARD, "abc1234", new Set(["ab12", "ef56"]), fileEngine(MANIFEST, "other"));
  assert.deepEqual(file.engine, { network: "other", networkName: "Other", model: "ef56", search: "s1" });
  // Results of two networks, and the file's own named: no question
  const hash = new URLSearchParams((await opened(JSON.stringify(file))).split("#")[1]);
  assert.equal(hash.get("network"), "other");
});

test("an analysis file of several networks asks which one the board uses, and a cancel keeps none of its results", async () => {
  db.rows(STORES.analysis).clear();
  const file = { format: ANALYSIS_FORMAT, version: 1, exported: "", site: "x", board: BOARD,
                 analyses: [[key(""), { blueWin: 0.5 }], [key("", "ef56"), { blueWin: 0.4 }], [key("2@-6,-2", "ef56"), { blueWin: 0.4 }]] };
  const asked: NetworkQuestion[] = [];
  const choose = (answer: string | null) => async (q: NetworkQuestion) => { asked.push(q); return answer; };
  assert.equal(await openAnalysisFile(JSON.stringify(file), MANIFEST, choose(null)), null);
  assert.deepEqual([...db.rows(STORES.analysis).keys()], []);
  // The most results first, each by its name in the engine lock: the test's networks have none there
  assert.deepEqual(asked[0].choices, [{ network: "other", name: "other" }, { network: "net", name: "net" }]);
  assert.match(asked[0].text, /results from 2 networks: other \(2 results\) and net \(1 result\)/);
  const hash = new URLSearchParams((await opened(JSON.stringify(file), choose("net"))).split("#")[1]);
  assert.equal(hash.get("network"), "net");
  assert.equal(db.rows(STORES.analysis).size, 3);
});

test("an analysis file of a network that the site no longer ships asks before the board searches with another", async () => {
  db.rows(STORES.analysis).clear();
  const file = { format: ANALYSIS_FORMAT, version: 1, exported: "", site: "x", board: BOARD,
                 engine: { network: "gone", networkName: "Gone 0.1", model: "0dd", search: "s1" }, analyses: [[key("", "0dd"), { blueWin: 0.5 }]] };
  let asked: NetworkQuestion | null = null;
  assert.equal(await openAnalysisFile(JSON.stringify(file), MANIFEST, async q => { asked = q; return null; }), null);
  assert.match(asked!.text, /from Gone 0\.1, a network that Cyanotype does not have now/);
  assert.deepEqual(asked!.choices.map(c => c.network), NETWORKS.map(n => n.id)); // the networks that the settings offer
});
