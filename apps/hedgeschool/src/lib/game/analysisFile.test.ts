// Checks the analysis file (analysisFile.ts, design 21): its kind is told from a review file's, and a reader refuses
// what it cannot use, with a reason. The board that opens a file takes the file's network, and a file of several
// networks asks the player first. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHAPE } from "@abstractclass/analysis/cache.ts";
import { ANALYSIS_FORMAT, fileKind, openAnalysisFile, readAnalysisFile } from "./analysisFile.ts";
import { readBoardLink } from "./board.ts";
import { NETWORKS, networkName } from "../analysis/engineSettings.ts";
import type { Manifest } from "@abstractclass/engine/client.ts";
import type { NetworkQuestion } from "@abstractclass/analysis/files.ts";
import { STORES } from "@abstractclass/storage/db.ts";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";

const db = memoryDb(); // this browser's store
/** The player's answer to a question that the load must not ask. */
const noQuestion = async (): Promise<string | null> => assert.fail("the load asked the player");

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
  const address = new URLSearchParams((await openAnalysisFile(file({ board: atKomi, analyses: [] }), null, noQuestion))!.split("#")[1]);
  assert.equal(readBoardLink(address.get("packed")!, address.get("at")).board.komi, -300);
  assert.throws(() => readAnalysisFile(file({ board: { ...BOARD, komi: "-300" } })), /cannot read the analysis file's lines/);
});

test("an analysis file beyond the komi that a record can give does not open, before its results go to the store", async () => {
  // keepAnalyses would reach the store (IndexedDB, which Node lacks): the refusal comes first
  await assert.rejects(openAnalysisFile(file({ board: { ...BOARD, komi: 6000 } }), null, noQuestion),
    (e: Error) => e.message === "the analysis file's komi must be from -5,052 to 5,052 points: 6000");
  assert.equal(readAnalysisFile(file({ board: { ...BOARD, komi: 5052 } })).board.komi, 5052);
});

// The site's two networks, as the manifest ships them: the first of HedgeFund 0.2 Lite's results is the file's.
const [LITE, FULL] = NETWORKS.map(n => n.id);
const MANIFEST = { artifacts: [{ kind: "module", sha256: "m1", search: "fdfe5ad" }, { kind: "model", sha256: "ab12", id: LITE },
                                { kind: "model", sha256: "cd34", id: FULL }] } as Manifest;
const result = (model: string, moves: string) => [`${SHAPE}|fdfe5ad|${model}|512|${moves}`, { blueWin: 0.5 }];

test("an analysis file of one network opens the board with that network, whatever the browser's (design 21)", async () => {
  db.rows(STORES.analysis).clear();
  // A file written before the file named its network: its results give it
  const text = file({ analyses: [result("cd34", "A10-D9"), result("cd34", "")] });
  const address = new URLSearchParams((await openAnalysisFile(text, MANIFEST, noQuestion))!.split("#")[1]);
  assert.equal(address.get("network"), FULL);
  assert.equal(db.rows(STORES.analysis).size, 2);
  // A file that names its network: that one, even with results of another
  const named = file({ engine: { network: LITE, networkName: networkName(LITE), model: "ab12", search: "fdfe5ad" },
                       analyses: [result("cd34", "A10-D9"), result("ab12", "")] });
  assert.equal(new URLSearchParams((await openAnalysisFile(named, MANIFEST, noQuestion))!.split("#")[1]).get("network"), LITE);
});

test("an analysis file of several networks asks the player which one, and says why", async () => {
  db.rows(STORES.analysis).clear();
  const text = file({ analyses: [result("ab12", ""), result("cd34", "A10-D9"), result("cd34", "")] });
  let asked: NetworkQuestion | null = null;
  const address = await openAnalysisFile(text, MANIFEST, async q => { asked = q; return LITE; });
  assert.equal(new URLSearchParams(address!.split("#")[1]).get("network"), LITE);
  assert.equal(asked!.title, "Choose a network for this analysis");
  assert.equal(asked!.text, `This analysis file has results from 2 networks: ${networkName(FULL)} (2 results) and ` +
    `${networkName(LITE)} (1 result). The board uses one network at a time. It shows the results of that network, and it ` +
    "searches with that network.");
  // A cancel: the board stays as it was, and nothing is kept
  db.rows(STORES.analysis).clear();
  assert.equal(await openAnalysisFile(text, MANIFEST, async () => null), null);
  assert.equal(db.rows(STORES.analysis).size, 0);
});

test("an analysis file of a network that the site no longer ships asks first, and names it", async () => {
  const text = file({ analyses: [result("0dd", "")] }); // a network that the manifest does not ship, and no name
  let asked: NetworkQuestion | null = null;
  assert.equal(await openAnalysisFile(text, MANIFEST, async q => { asked = q; return null; }), null);
  assert.equal(asked!.text, "The results in this analysis file are from a network that Hedge School does not have now. " +
    "The board cannot show these results. Choose a network to search the file's positions again, or cancel to keep your board.");
  assert.deepEqual(asked!.choices.map(c => c.network), [LITE, FULL]);
});
