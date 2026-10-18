// The review file (reviewFile.ts): which results belong to a game, the file read back, branches merged, and the mark
// that a load keeps. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHAPE } from "#lib/analysis/cache.ts";
import { buildReviewFile, gameAnalyses, importReview, mergeBranches, positionKeys, readReviewFile, reviewFileName } from "./reviewFile.ts";
import { loadGame, reviewCovers, reviewMark, type KeptBranches, type ReviewMark } from "./store.ts";
import { memoryDb } from "#lib/storage/memoryDb.ts";

memoryDb(); // the import's store

const RECORD = '[Blue "Ann"]\n[Red "Ben O\'Hara"]\n\n1. D10-G10 2. N11-Q10 L10-N11 *';
const MOVES = ["D10-G10", "N11-Q10", "L10-N11"];
const BRANCHES: KeptBranches = { version: 2, nodes: [["D10-G10 N11-Q11", 0], ["D10-G10 N11-Q11 L10-N11", 1, 1]] };
const key = (moves: string, shape = SHAPE, model = "ab12") => `${shape}|85c2adb|${model}|512|${moves}`;

test("a game's positions: each step of its line, and each branch node", () => {
  const p = positionKeys(MOVES, BRANCHES);
  assert.deepEqual([...p], ["", "D10-G10", "D10-G10 N11-Q10", "D10-G10 N11-Q10 L10-N11", "D10-G10 N11-Q11", "D10-G10 N11-Q11 L10-N11"]);
  // Version 1 kept a branch as its line: each node of it
  const v1 = positionKeys(MOVES, { version: 1, lines: [["D10-G10", "N11-Q11", "L10-N11", "Q11-T11"]] });
  assert.deepEqual([...v1].slice(4), ["D10-G10 N11-Q11", "D10-G10 N11-Q11 L10-N11", "D10-G10 N11-Q11 L10-N11 Q11-T11"]);
});

test("a game's results: its positions' and the ones a move from them (the Greats' confirmations), in the store's current shape", () => {
  const entries: [string, unknown][] = [
    [key(""), { a: 1 }], [key("D10-G10 N11-Q10"), { a: 2 }], [key("D10-G10 N11-Q11"), { a: 3 }],
    [key("D10-G10 O11-R10"), { a: 7 }], // a move from the game: a Great's confirmation
    [key("A10-D10 N11-Q10"), { a: 4 }], // two moves from it: another game
    [key("D10-G10", SHAPE - 1), { a: 5 }], // an older shape
  ];
  assert.deepEqual(gameAnalyses(entries, positionKeys(MOVES, BRANCHES)).map(e => e[1]), [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 7 }]);
  // Only the networks the site ships, when they are named
  const other: [string, unknown] = [key("D10-G10", SHAPE, "cd34"), { a: 6 }];
  assert.deepEqual(gameAnalyses([...entries, other], positionKeys(MOVES, BRANCHES), new Set(["cd34"])).map(e => e[1]), [{ a: 6 }]);
});

test("a review file reads back, and a wrong file says why", () => {
  const done: ReviewMark = { module: "m1", model: "ab12", network: "b10c128-s66625408-d13350730", visits: 512, at: "2026-10-12T00:00:00Z" };
  const file = buildReviewFile(RECORD, BRANCHES, [[key("D10-G10"), { blueWin: 0.5 }]], "abc1234", null, done, new Date("2026-10-12T00:00:00Z"));
  const back = readReviewFile(JSON.stringify(file));
  assert.equal(back.record, RECORD);
  // The review it holds, with the network's name from engine.lock.json
  assert.deepEqual(back.review, { ...done, networkName: "HedgeFund 0.1 Lite" });
  assert.equal(readReviewFile(JSON.stringify({ ...file, review: { visits: "x" } })).review, null);
  assert.deepEqual(back.branches, BRANCHES);
  assert.deepEqual(back.analyses, [[key("D10-G10"), { blueWin: 0.5 }]]);
  assert.throws(() => readReviewFile("not json"), /not JSON/);
  assert.throws(() => readReviewFile('{"format":"other"}'), /not a Hedge School review file/);
  assert.throws(() => readReviewFile(JSON.stringify({ ...file, version: 99 })), /version 99: a newer Hedge School/);
  assert.throws(() => readReviewFile(JSON.stringify({ ...file, version: 0 })), /no longer reads/);
  // A field this site does not know is ignored: a new field keeps the version.
  assert.equal(readReviewFile(JSON.stringify({ ...file, later: { x: 1 } })).record, RECORD);
  assert.throws(() => readReviewFile(JSON.stringify({ ...file, record: "1. Z99-Z98" })));
  // Entries that are not results are dropped, not fatal.
  assert.equal(readReviewFile(JSON.stringify({ ...file, analyses: [["junk", {}], 5] })).analyses.length, 0);
  // A file of an earlier site keeps the results of this shape only: the others no reader reads (design 13).
  const older = { ...file, analyses: [[key("D10-G10", SHAPE - 1), { blueWin: 0.4 }], [key(""), { blueWin: 0.5 }]] };
  assert.deepEqual(readReviewFile(JSON.stringify(older)).analyses, [[key(""), { blueWin: 0.5 }]]);
});

test("branches merge: the kept ones keep their order, the file's new ones follow", () => {
  const kept: KeptBranches = { version: 2, nodes: [["D10-G10 N11-Q11", 3]] };
  const added: KeptBranches = { version: 2, nodes: [["D10-G10 N11-Q11", 0], ["D10-G10 N11-Q12", 1], ["D10-G10 N11-Q13", 0, 1]] };
  assert.deepEqual(mergeBranches(kept, added), { version: 2, nodes: [["D10-G10 N11-Q11", 3], ["D10-G10 N11-Q13", 4, 1], ["D10-G10 N11-Q12", 5]] });
  assert.deepEqual(mergeBranches(null, null), null);
  assert.deepEqual(mergeBranches(null, { version: 1, lines: [["D10-G10", "N11-Q11"]] }), { version: 2, nodes: [["D10-G10 N11-Q11", 0]] });
});

test("the file's name: the players, made safe, and the game's id", () => {
  assert.equal(reviewFileName(RECORD, "6657b93234c7"), "hedge-school-Ann-vs-Ben-O-Hara-6657b93234c7.json");
});

test("a finished review covers the same search and network at its depth or less", () => {
  const manifest = { artifacts: [
    { id: "engine-1", kind: "module" as const, interface: null, url: "", sha256: "m1", bytes: 0, download: 0, released: true,
      search: "s1", sameSearchAs: ["m0"] },
    { id: "net-a", kind: "model" as const, interface: null, url: "", sha256: "ab12", bytes: 0, download: 0, released: true },
  ] };
  const want = reviewMark(manifest, "net-a", 512);
  // The mark names the module's search, whose keys a snapshot reads (design 20).
  assert.deepEqual(want, { module: "m1", model: "ab12", network: "net-a", visits: 512, search: "s1", modules: ["m1", "m0"] });
  assert.equal(reviewMark(manifest, "net-b", 512), null);
  const mark: ReviewMark = { ...want!, visits: 1024, at: "" };
  assert.equal(reviewCovers(mark, want), true); // deeper covers shallower
  assert.equal(reviewCovers({ ...mark, visits: 256 }, want), false);
  assert.equal(reviewCovers({ ...mark, module: "m0" }, want), true); // an earlier module of the same search
  assert.equal(reviewCovers({ ...mark, module: "m2" }, want), false); // another search
  assert.equal(reviewCovers({ ...mark, model: "cd34" }, want), false); // another network
  assert.equal(reviewCovers(undefined, want), false);
});

test("a review file's mark names its search, and the load keeps it: a file written before names none", async () => {
  const done: ReviewMark = { module: "m0", model: "ab12", network: "lite", visits: 512, at: "2026-10-12T00:00:00Z" };
  const load = async (record: string, review: ReviewMark) => {
    const text = JSON.stringify(buildReviewFile(record, null, [], "abc1234", null, review));
    return (await loadGame((await importReview(readReviewFile(text), null, ["m1"])).id))?.game.reviewed;
  };
  assert.equal((await load(RECORD, { ...done, search: "s0" }))?.search, "s0"); // an earlier engine's: a snapshot
  const before = await load("1. D10-G10 2. N11-Q10 *", done);
  assert.equal(before?.model, "ab12");
  assert.equal(before?.search, undefined);
  const wrong = await load("1. D10-G10 2. N11-Q11 *", { ...done, search: 5 } as unknown as ReviewMark);
  assert.equal(wrong?.model, "ab12");
  assert.equal(wrong?.search, undefined); // not a search's name
});
