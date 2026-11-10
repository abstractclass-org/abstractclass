// Checks a site's files of saved work (files.ts) at a komi (Hedge School's design 24): which results belong in a file,
// and the analysis file's board, out and back in. And the analysis file's network (Hedge School's design 21): the
// file names it, and the board that opens the file takes it, or asks the player. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { analysisKey } from "./cache.ts";
import { ANALYSIS_FILE_VERSION, belongs, boardNetwork, exportAnalysis, fileEngine, fileNetwork, readAnalysisFile, withNetwork,
         type AnalysisFile } from "./files.ts";
import type { Manifest } from "@abstractclass/engine/client.ts";
import type { KeptBoard } from "./kept.ts";
import { STORES, dbPut } from "@abstractclass/storage/db.ts";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";

memoryDb(); // the export's store

const key = (moves: string) => analysisKey("fdfe5ad", "ab12", [moves], 512);

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
/** A komi limit that the tests do not reach. */
const NO_LIMIT = Infinity;
const file = (board: object) => JSON.stringify({ format: FORMAT, version: ANALYSIS_FILE_VERSION, exported: "", site: "x", board, analyses: [] });

test("an analysis file keeps its board's komi, and its results at that komi", async () => {
  const board: KeptBoard = { version: 2, main: ["a"], nodes: [["a", 0]], komi: -300 };
  for (const [moves, value] of [["", 1], ["a", 2], ["komi=-300", 3], ["komi=-300 a", 4], ["komi=-300 a b", 5]] as const)
    await dbPut(STORES.analysis, key(moves), { value });
  /** The values of a file's results, in order. */
  const values = (f: AnalysisFile) => f.analyses.map(a => (a[1] as { value: number }).value).sort();
  const out = await exportAnalysis(FORMAT, board, "x", null);
  assert.deepEqual(values(out), [3, 4, 5]);
  const back = readAnalysisFile(JSON.stringify(out), "Test", FORMAT, NO_LIMIT);
  assert.equal(back.board.komi, -300);
  // A board at komi 0 takes its own results, and none at the komi.
  assert.deepEqual(values(await exportAnalysis(FORMAT, { ...board, komi: undefined }, "x", null)), [1, 2]);
});

test("an analysis file whose komi is not one says so", () => {
  const board = { version: 2, main: [], nodes: [] };
  assert.equal(readAnalysisFile(file({ ...board, komi: 7.5 }), "Test", FORMAT, NO_LIMIT).board.komi, 7.5);
  for (const komi of [2.25, "300", null, 1e6])
    assert.throws(() => readAnalysisFile(file({ ...board, komi }), "Test", FORMAT, NO_LIMIT), /cannot read the analysis file's lines/, String(komi));
});

test("an analysis file whose komi is beyond the game's limit says so (Hedge School's design 24)", () => {
  const board = { version: 2, main: [], nodes: [] };
  assert.equal(readAnalysisFile(file({ ...board, komi: -5000 }), "Test", FORMAT, 5000).board.komi, -5000);
  assert.throws(() => readAnalysisFile(file({ ...board, komi: 5000.5 }), "Test", FORMAT, 5000),
    (e: Error) => e.message === "the analysis file's komi must be from -5,000 to 5,000 points: 5000.5");
});

const MANIFEST = { artifacts: [{ kind: "module", sha256: "m1", search: "s1" },
                               { kind: "model", sha256: "aa", id: "net-a", displayName: "Net A" },
                               { kind: "model", sha256: "bb", id: "net-b", displayName: "Net B" }] } as Manifest;
/** A file's results: one for each of `models`, in that order, of the search `search`. */
const results = (models: string[], search = "s1") => models.map((m, i): [string, unknown] => [analysisKey(search, m, [`m${i}`], 512), {}]);

test("an analysis file's network: the one it names, else the one network of its results that the site ships", () => {
  const named = { engine: { network: "net-b", networkName: "Net B", model: "bb" }, analyses: results(["aa", "aa"]) };
  assert.deepEqual(fileNetwork(named, MANIFEST), { kind: "one", network: "net-b" });
  assert.deepEqual(fileNetwork({ analyses: results(["bb", "bb"]) }, MANIFEST), { kind: "one", network: "net-b" });
  // A network that the site no longer ships beside a shipped one: its results are of no use here
  assert.deepEqual(fileNetwork({ analyses: results(["bb", "0dd"]) }, MANIFEST), { kind: "one", network: "net-b" });
  // Several: the most results first
  assert.deepEqual(fileNetwork({ analyses: results(["aa", "bb", "bb"]) }, MANIFEST),
                   { kind: "several", networks: [{ network: "net-b", results: 2 }, { network: "net-a", results: 1 }] });
  // A network that has gone: by the name the file gives, else none
  assert.deepEqual(fileNetwork({ ...named, engine: { ...named.engine, model: "0dd", networkName: "Old" } }, MANIFEST),
                   { kind: "gone", name: "Old" });
  assert.deepEqual(fileNetwork({ analyses: results(["0dd"]) }, MANIFEST), { kind: "gone", name: null });
  // No result that the site's search reads, or no manifest: the browser's network
  assert.deepEqual(fileNetwork({ analyses: results(["aa"], "s0") }, MANIFEST), { kind: "none" });
  assert.deepEqual(fileNetwork({ analyses: [] }, MANIFEST), { kind: "none" });
  assert.deepEqual(fileNetwork({ analyses: results(["aa"]) }, null), { kind: "none" });
});

test("the board's network of an analysis file: the file's, the player's choice, or none after a cancel", async () => {
  const read = (extra: object) => readAnalysisFile(JSON.stringify({ ...JSON.parse(file({ version: 2, main: [], nodes: [] })), ...extra }),
                                                   "Test", FORMAT, NO_LIMIT);
  const name = (id: string) => id.toUpperCase(), offered = ["net-a"];
  const never = async (): Promise<string | null> => assert.fail("asked");
  assert.equal(await boardNetwork(read({ analyses: results(["aa"]) }), MANIFEST, "Test", name, offered, never), "net-a");
  assert.equal(await boardNetwork(read({}), MANIFEST, "Test", name, offered, never), null);
  const several = read({ analyses: results(["aa", "bb"]) });
  assert.equal(await boardNetwork(several, MANIFEST, "Test", name, offered, async q => q.choices[1].network), "net-b");
  assert.equal(await boardNetwork(several, MANIFEST, "Test", name, offered, async () => null), undefined);
  const gone = read({ analyses: results(["0dd"]) });
  assert.equal(await boardNetwork(gone, MANIFEST, "Test", name, offered, async q => {
    assert.deepEqual(q.choices, [{ network: "net-a", name: "NET-A" }]); // the networks that the settings offer
    return q.choices[0].network;
  }), "net-a");
  assert.equal(withNetwork("/analysis#packed=x", "net-a"), "/analysis#packed=x&network=net-a");
  assert.equal(withNetwork("/analysis#packed=x", null), "/analysis#packed=x");
});

test("an analysis file names the board's network, out and back in, and not the board's own in its lines", async () => {
  const engine = fileEngine(MANIFEST, "net-a");
  assert.deepEqual(engine, { network: "net-a", networkName: "Net A", model: "aa", search: "s1" });
  assert.equal(fileEngine(MANIFEST, "net-c"), null);
  const out = await exportAnalysis(FORMAT, { version: 2, main: [], nodes: [], network: "net-b" }, "x", null, engine);
  assert.equal(out.board.network, undefined);
  const back = readAnalysisFile(JSON.stringify(out), "Test", FORMAT, NO_LIMIT);
  assert.deepEqual(back.engine, engine);
  // An engine that the reader cannot use is as none
  for (const bad of [null, "net-a", { network: "net-a" }, { network: 1, model: "aa" }])
    assert.equal(readAnalysisFile(JSON.stringify({ ...out, engine: bad }), "Test", FORMAT, NO_LIMIT).engine, undefined, JSON.stringify(bad));
  // An older file has none
  assert.equal(readAnalysisFile(file({ version: 2, main: [], nodes: [] }), "Test", FORMAT, NO_LIMIT).engine, undefined);
});
