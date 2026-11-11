// Checks Cyanotype's removal of earlier results (earlierResults.ts, Hedge School's design 20) on its own engine
// (engine.lock.json) and the keys of a real review: the stored review of the browser tests
// (apps/hedgeschool/tests/cyanotype-fixture.ts). A result is earlier when the site's engine cannot read it, not when its
// release is older. Its key names the search and the network's file (@abstractclass/analysis/cache.ts), and the site
// reads its own search's results with each network file that its lock ships. So a release that keeps the search and
// the file removes nothing, and nor does one that adds a network beside it. A release with a new search, or one whose
// lock drops the file, removes the old results that no stored game's review snapshot reads. Cyanotype's lock ships one
// network, and does not keep the earlier ones yet (design 33, "The networks", abscls-8tl1.54): a review snapshot needs
// its network. An analysis file's board keeps its own network (Hedge School's design 21), and the removal takes none
// of the results that the board reads, also when it runs between the file's load and the board's start (the last two
// tests: the browser's cases are in apps/hedgeschool/tests/analysis-file-network.spec.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";
import { STORES } from "@abstractclass/storage/db.ts";
import { analysisKey, engineFiles, lineKeyMoves, readAnalysisKey, searchHolding, snapshotPositions } from "@abstractclass/analysis/cache.ts";
import { BOARD_ID, boardOfLine, type KeptBranches } from "@abstractclass/analysis/kept.ts";
import { ANALYSIS_FILE_VERSION, addressNetwork, type NetworkQuestion } from "@abstractclass/analysis/files.ts";
import { removeUnneeded } from "@abstractclass/analysis/earlierResults.ts";
import { moduleOf, modelOf, searchModules, type Manifest } from "@abstractclass/engine/client.ts";
import lock from "../../../engine.lock.json" with { type: "json" };
import { readStored, testRecord } from "../../../../hedgeschool/tests/cyanotype-fixture.ts";
import { parseRecord } from "./record.ts";
import { gameId, readGames, reviewAgainWhy, reviewCovers, reviewMark, type ReviewMark } from "./store.ts";
import { removeEarlierResults, unneededResults } from "./earlierResults.ts";
import { ANALYSIS_FORMAT, openAnalysisFile } from "./analysisFile.ts";

const db = memoryDb(); // the browser's store

const SITE = lock as unknown as Manifest, MODULE = moduleOf(SITE)!;
const STORED = readStored(), KEYS = STORED.analyses.map(([key]) => key);
const RECORD = testRecord(), MOVES = parseRecord(RECORD).moves;
/** engine-91ab0b7d's CPU module: the release before the lock's engine-887be290, with the same search. */
const ENGINE_91AB0B7D = "28775af7ce301e0a7d1423fc7d39b8c972f29d1db3e63ea3f219ccb071210803";

/** A later release of Cyanotype's engine: a new build of the CPU module that searches as `search`, with the file
 *  `model` of the lock's network in place of its own, and the networks `added` beside it (each id with its file). A
 *  build of the lock's search names the lock's modules of its search as its own (`sameSearchAs`). */
function release({ search = MODULE.search!, model = STORED.model, added = [] as [string, string][] } = {}): Manifest {
  const network = SITE.artifacts.find(a => a.kind === "model")!;
  return { ...SITE, artifacts: [...SITE.artifacts.map(({ sameSearchAs: _, ...a }) => a.kind === "module"
    ? { ...a, sha256: "a later build", search, ...(search === MODULE.search ? { sameSearchAs: searchModules(SITE) } : {}) }
    : a.kind === "model" ? { ...a, sha256: model } : a),
    ...added.map(([id, sha256]) => ({ ...network, id, sha256 }))] };
}
/** The mark of the test game's review, at the stored review's depth, by the module `module` and the network's file
 *  `model`. */
const mark = (module: string, model = STORED.model, search?: string): ReviewMark =>
  ({ module, model, network: STORED.network, visits: STORED.visits, at: "2026-11-09T00:00:00Z", ...(search ? { search } : {}) });
const reviewed = (m: ReviewMark) => ({ moves: MOVES, branches: null, mark: m });
/** The stored review's keys with the network's file `model` in place of its own. */
const withFile = (model: string) => KEYS.map(k => k.replace(`|${STORED.model}|`, `|${model}|`));
/** Keys with another search in place of the stored review's. */
const searchedBy = (search: string, keys = KEYS) => keys.map(k => k.replace(`|${STORED.search}|`, `|${search}|`));

/** The stored results that a review snapshot of the test game at the stored review's depth shows: each position of
 *  the game's line at that depth. The sweep's under them, and the Analysis board's position off the line, it does not. */
const LINE = new Set(lineKeyMoves(MOVES).map(m => m.join(" ")));
const shown = (keys: string[]) => keys.filter(k => readAnalysisKey(k).visits === STORED.visits && LINE.has(readAnalysisKey(k).moves));

test("the stored review is of the lock's search and network, with the sweep's results and the review's on the game's line", () => {
  const rerun = "write the stored review again (apps/hedgeschool/tests/cyanotype-fixture.ts)";
  assert.equal(STORED.search, MODULE.search, rerun);
  assert.equal(SITE.artifacts.some(a => a.kind === "model" && a.sha256 === STORED.model), true, rerun);
  assert.equal(shown(KEYS).length, LINE.size);
  assert.equal(KEYS.filter(k => readAnalysisKey(k).visits === 32 && LINE.has(readAnalysisKey(k).moves)).length, LINE.size);
});

test("a release with the same search and network removes nothing: engine-887be290 reads engine-91ab0b7d's results", () => {
  // The results of engine-91ab0b7d's review, its own mark, and the lock's engine-887be290, which keeps its search
  assert.notEqual(MODULE.sha256, ENGINE_91AB0B7D);
  assert.deepEqual(unneededResults(KEYS, [], SITE), []);
  assert.deepEqual(unneededResults(KEYS, [reviewed(mark(ENGINE_91AB0B7D, STORED.model, STORED.search))], SITE), []);
  // A later release that keeps the search and the network keeps them all too
  assert.deepEqual(unneededResults(KEYS, [], release()), []);
  assert.deepEqual(unneededResults(KEYS, [reviewed(mark(MODULE.sha256))], release()), []);
});

test("a game that engine-91ab0b7d reviewed counts as reviewed by the site's engine: the lock names its CPU module", () => {
  // The real mark of such a game: the stored review's, before it was written again with engine-887be290
  // (apps/hedgeschool/tests/fixtures/cyanotype-review.json at 8462111a)
  const real: ReviewMark = { module: ENGINE_91AB0B7D, model: STORED.model, network: STORED.network, visits: 512,
                             search: "91ab0b7d", at: "2026-11-08T21:23:22.669Z" };
  const want = reviewMark(SITE, real.network, real.visits);
  assert.equal(reviewAgainWhy(real, want), null);
  assert.equal(reviewCovers(real, want), true);
});

test("a release that adds a network, with the lock's network still in it, removes nothing", () => {
  // A lock that keeps the earlier network beside the new one, as Hedge School's does (its design 09): the site reads
  // its search's results with each of them
  const next = release({ added: [["a later network", "e".repeat(64)]] }), added = withFile("e".repeat(64));
  assert.deepEqual(unneededResults([...KEYS, ...added], [], next), []);
  assert.deepEqual(unneededResults([...KEYS, ...added], [reviewed(mark(MODULE.sha256, STORED.model, STORED.search))], next), []);
});

test("a release whose lock drops the network's file removes its results that no review snapshot reads", () => {
  // A new file of the same network in the place of the lock's
  const next = release({ model: "f".repeat(64) });
  assert.deepEqual(unneededResults(KEYS, [], next), KEYS);
  // A game reviewed with the dropped file opens as a review snapshot (design 20): it keeps the results that it shows
  const game = reviewed(mark(MODULE.sha256, STORED.model, STORED.search));
  const gone = new Set(unneededResults(KEYS, [game], next)), kept = KEYS.filter(k => !gone.has(k));
  assert.deepEqual(kept, shown(KEYS));
  const opens = (keys: string[]) => searchHolding(keys, STORED.model, snapshotPositions(MOVES), STORED.visits);
  assert.equal(opens(kept), STORED.search);
  // Another network in the place of the lock's: the site ships no network of the game's mark, so no review snapshot
  // opens, and its results go too
  const other = { ...next, artifacts: next.artifacts.map(a => (a.kind === "model" ? { ...a, id: "a later network" } : a)) };
  assert.deepEqual(unneededResults(KEYS, [game], other), KEYS);
});

test("a release with a new search removes the old search's results that no review snapshot reads, and keeps its own", () => {
  const next = release({ search: "0c0ffee0" }), own = searchedBy("0c0ffee0");
  assert.deepEqual(unneededResults([...KEYS, ...own], [], next), KEYS);
  // A game reviewed by the lock's engine, now an earlier engine, opens as a review snapshot of the old search
  const game = reviewed(mark(MODULE.sha256, STORED.model, STORED.search));
  const gone = new Set(unneededResults([...KEYS, ...own], [game], next));
  assert.deepEqual([...KEYS, ...own].filter(k => !gone.has(k)), [...shown(KEYS), ...own]);
});

test("the removal in the browser's store: earlier results go, the site's own results, the games and their variations stay", async () => {
  // The test game, kept before the list of games (no id, no version: its key is its id), reviewed by an earlier engine
  // whose search was "e1", with a variation of two moves from its second position. The variation's second position is
  // read only through the game's variations, which are under its key.
  const id = gameId(MOVES), variation = [[...MOVES.slice(0, 2), "2@9,9"], [...MOVES.slice(0, 2), "2@9,9", "1@-9,9"]];
  const branches: KeptBranches = { version: 2, nodes: variation.map(m => [m.join(" "), 0]) };
  const game = { record: RECORD, added: "2026-11-01T00:00:00Z", reviewed: mark("an earlier build", STORED.model, "e1") };
  db.rows(STORES.games).set(id, game);
  db.rows(STORES.branches).set(id, branches);
  const read = searchedBy("e1"), atVariation = variation.map(m => analysisKey("e1", STORED.model, m, STORED.visits));
  const unread = searchedBy("e0");
  for (const key of [...KEYS, ...read, ...atVariation, ...unread]) db.rows(STORES.analysis).set(key, { visits: readAnalysisKey(key).visits });
  await removeEarlierResults("the site's engine files");
  assert.deepEqual([...db.rows(STORES.analysis).keys()].sort(), [...KEYS, ...shown(read), ...atVariation].sort());
  assert.deepEqual([...db.rows(STORES.games)], [[id, game]]);
  assert.deepEqual([...db.rows(STORES.branches)], [[id, branches]]);
});

/** An analysis file of the test game's line with the stored review's results, as another browser's board writes it
 *  (files.ts, fileEngine): of the network `network`, named `name`, whose file's SHA-256 `model` its results' keys name. */
const analysisFileText = (network: string, name: string, model: string) => JSON.stringify({
  format: ANALYSIS_FORMAT, version: ANALYSIS_FILE_VERSION, exported: "", site: "x",
  engine: { network, networkName: name, model, search: STORED.search }, board: boardOfLine(MOVES),
  analyses: STORED.analyses.map(([k, v]) => [k.replace(`|${STORED.model}|`, `|${model}|`), v]) });
/** Empties the browser's store of the tests before. */
const emptyStore = () => { for (const s of [STORES.analysis, STORES.games, STORES.branches]) db.rows(s).clear(); };

test("a removal between an analysis file's load and the board's start takes none of the results of the board's own network", async () => {
  emptyStore();
  // A release that adds a later network beside Stamp Duty 0.2, the browser's setting, and a file of the later network:
  // the board takes the file's network as its own, and the load asks nothing
  const later = "e".repeat(64), two = release({ added: [["a later network", later]] });
  const address = await openAnalysisFile(analysisFileText("a later network", "Stamp Duty 0.3", later), two,
                                         async () => assert.fail("the load asked the player"));
  const ships = (id: string) => !!modelOf(two, id);
  assert.equal(addressNetwork(new URLSearchParams(address!.split("#")[1]), ships), "a later network");
  const file = withFile(later).sort();
  assert.deepEqual([...db.rows(STORES.analysis).keys()].sort(), file);
  // An earlier engine's results that no game reads, then the removal, as another tab runs it before the board starts
  for (const key of searchedBy("e0")) db.rows(STORES.analysis).set(key, {});
  await removeUnneeded(engineFiles(two), two, readGames);
  // The board reads the file's results with its own network: they all stay, and the earlier engine's go
  assert.deepEqual([...db.rows(STORES.analysis).keys()].sort(), file);
});

test("an analysis file of a network that the lock dropped asks first: a cancel keeps the board, and the removal takes nothing of the board's", async () => {
  emptyStore();
  // The board kept here, with the site's own results of its positions
  const board = boardOfLine(MOVES);
  db.rows(STORES.branches).set(BOARD_ID, board);
  for (const [key, value] of STORED.analyses) db.rows(STORES.analysis).set(key, value);
  let asked: NetworkQuestion | undefined;
  const gone = "ab".repeat(32);
  const address = await openAnalysisFile(analysisFileText("b0c0-s0-d0", "Stamp Duty 0.0", gone), SITE,
                                         async q => { asked = q; return null; });
  assert.equal(address, null);
  assert.equal(asked?.title, "The file's network is not available");
  await removeEarlierResults(engineFiles(SITE));
  assert.deepEqual([...db.rows(STORES.analysis).keys()].sort(), [...KEYS].sort());
  assert.deepEqual(db.rows(STORES.branches).get(BOARD_ID), board);
});
