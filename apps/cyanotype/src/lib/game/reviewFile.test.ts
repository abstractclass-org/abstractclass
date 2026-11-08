// Checks Cyanotype's review file (reviewFile.ts, on the shared @abstractclass/analysis/reviewFile.ts): it reads back,
// a wrong file says why, a load keeps no game that the review refuses, and keeps the others with their capture marks,
// their variations, their review's mark and settings, and their results, and a game's export from the store holds its
// own results. The engine's check is the test's own, as in import.test.ts. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";
import { STORES, dbGet, dbPut } from "@abstractclass/storage/db.ts";
import { analysisKey } from "@abstractclass/analysis/cache.ts";
import type { KeptBranches } from "@abstractclass/analysis/kept.ts";
import type { Checked } from "./check.ts";
import { REVIEW_FORMAT, buildReviewFile, cyanotypeFiles, exportReview, readReviewFile, reviewFileName } from "./reviewFile.ts";
import { gameId, loadGame, listGames, type ReviewMark } from "./store.ts";

const db = memoryDb(); // the browser's store

/** A check that accepts every record: the second move captures and scores 12, the others capture nothing. */
const accepts = async (r: { moves: string[] }): Promise<Checked> =>
  ({ problem: null, captures: r.moves.map((_, i) => (i === 1 ? { points: 12 } : null)) });
const files = cyanotypeFiles(accepts);

const MOVES = ["2@-6,-2", "1@0,0", "pass"];
const RECORD = '[Blue "Ann"]\n[Red "Ben O\'Hara"]\n\n1. 2@-6,-2 2. 1@0,0 pass *\n';
const BRANCHES: KeptBranches = { version: 2, nodes: [["2@-6,-2 1@1,1", 0]] };
const MODEL = "64c94b22", NETWORK = "b6c96-s47076224-d3087660";
const key = (moves: string[], model = MODEL) => analysisKey("91ab0b7d", model, moves, 512);
const DONE: ReviewMark = { module: "m1", model: MODEL, network: NETWORK, visits: 512, search: "91ab0b7d", at: "2026-11-08T00:00:00.000Z" };
const ENTRIES: [string, unknown][] = [
  [key([]), { blueWin: 0.5 }], [key(["2@-6,-2"]), { blueWin: 0.4 }], [key(["2@-6,-2", "1@1,1"]), { blueWin: 0.3 }],
  [key(["1@5,5", "1@6,6"]), { blueWin: 0.9 }], // two moves from the game: another game's
];

test("a review file reads back in Cyanotype's format, and a wrong file says why", () => {
  const file = buildReviewFile(RECORD, BRANCHES, ENTRIES, "abc1234", null, DONE, new Date("2026-11-08T00:00:00Z"));
  assert.equal(file.format, REVIEW_FORMAT);
  assert.deepEqual(file.review, { ...DONE, networkName: "Stamp Duty 0.2" }); // the name from engine.lock.json
  assert.deepEqual(file.analyses.map(e => e[1]), [{ blueWin: 0.5 }, { blueWin: 0.4 }, { blueWin: 0.3 }]);
  const back = readReviewFile(JSON.stringify(file));
  assert.equal(back.record, RECORD);
  assert.deepEqual(back.branches, BRANCHES);
  assert.deepEqual(back.analyses, file.analyses);
  assert.throws(() => readReviewFile("not json"), /not a Cyanotype review file: it is not JSON/);
  assert.throws(() => readReviewFile(JSON.stringify({ ...file, format: "hedge-school-review" })), /^Error: This is not a Cyanotype review file\.$/);
  assert.throws(() => readReviewFile(JSON.stringify({ ...file, version: 9 })), /a newer Cyanotype wrote it/);
  assert.throws(() => readReviewFile(JSON.stringify({ ...file, branches: { version: 2, nodes: [[1]] } })),
                /Cyanotype cannot read the review file's variations/);
  assert.throws(() => readReviewFile(JSON.stringify({ ...file, record: "1. zz" }))); // the record's own problem
});

test("a loaded review file keeps its game with its capture marks, variations, mark, settings and results", async () => {
  db.rows(STORES.games).clear();
  const file = buildReviewFile(RECORD, BRANCHES, ENTRIES, "abc1234", null, DONE);
  const { id, kept, other } = await files.importReview(readReviewFile(JSON.stringify(file)), new Set([MODEL]), ["m1"]);
  assert.equal(id, gameId(MOVES));
  assert.deepEqual([kept, other], [3, 0]);
  const stored = await loadGame(id);
  assert.match(stored!.game.record, /2\. 1@0,0x\+12 pass/); // the marks that the engine's rules give
  assert.equal(stored!.game.reviewed?.module, "m1"); // done with this site's engine
  assert.equal(stored!.game.reviewed?.search, "91ab0b7d");
  assert.deepEqual(stored!.game.settings, { network: NETWORK, visits: 512 });
  assert.deepEqual(await dbGet(STORES.branches, id), BRANCHES);
  assert.deepEqual(await dbGet(STORES.analysis, key(["2@-6,-2"])), { blueWin: 0.4 });
  // The game's export from the store: its own results, and the mark, as the file had them
  await dbPut(STORES.analysis, key(["1@5,5", "1@6,6"]), { blueWin: 0.9 });
  const out = await exportReview(id, "def5678", new Set([MODEL]));
  assert.equal(out.site, "def5678");
  assert.equal(out.record, stored!.game.record);
  assert.deepEqual(out.analyses.map(e => e[1]), [{ blueWin: 0.5 }, { blueWin: 0.4 }, { blueWin: 0.3 }]);
  assert.deepEqual({ ...out.review }, { ...stored!.game.reviewed, networkName: "Stamp Duty 0.2" });
});

test("a review file whose game the review refuses keeps nothing, and says why", async () => {
  db.rows(STORES.games).clear();
  db.rows(STORES.analysis).clear();
  const refuses = async (): Promise<Checked> => ({ problem: "illegal move 1@0,0", captures: [] });
  const file = readReviewFile(JSON.stringify(buildReviewFile(RECORD, BRANCHES, ENTRIES, "abc1234", null, DONE)));
  await assert.rejects(cyanotypeFiles(refuses).importReview(file, null, ["m1"]),
                       { message: "Cyanotype cannot review this game: illegal move 1@0,0." });
  assert.equal((await listGames()).length, 0);
  assert.equal(await dbGet(STORES.analysis, key([])), undefined);
});

test("a review file of an earlier engine keeps its mark as that engine's: its review opens as a review snapshot", async () => {
  db.rows(STORES.games).clear();
  const file = readReviewFile(JSON.stringify(buildReviewFile(RECORD, null, [], "abc1234", null, { ...DONE, module: "m0", search: "earlier" })));
  const { id } = await files.importReview(file, new Set([MODEL]), ["m1"]);
  const mark = (await loadGame(id))?.game.reviewed;
  assert.equal(mark?.module, "m0");
  assert.equal(mark?.search, "earlier");
  // A network that the site does not ship: no mark, and no settings of its own
  db.rows(STORES.games).clear();
  const { id: other } = await files.importReview(file, new Set(["cd34"]), ["m1"]);
  assert.equal((await loadGame(other))?.game.reviewed, undefined);
  assert.equal((await loadGame(other))?.game.settings, undefined);
});

test("the file's name: the site, the players, made safe, and the game's id", () => {
  assert.equal(reviewFileName(RECORD, "review-3-0a1b2c3d"), "cyanotype-Ann-vs-Ben-O-Hara-review-3-0a1b2c3d.json");
});
