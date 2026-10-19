// Checks which stored results the removal of earlier results takes (earlierResults.ts, design 20): an earlier engine's
// and an earlier network file's, unless a stored game's snapshot reads them. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHAPE, analysisKey, searchHolding, snapshotPositions } from "@abstractclass/analysis/cache.ts";
import { unneededResults } from "./earlierResults.ts";
import type { KeptBranches, ReviewMark } from "./store.ts";

// The site's engine: its CPU module "m2" searches as "s2" (as the earlier build "m1" did), and it ships the network
// "lite" as the file "b2".
const artifact = { interface: null, url: "", bytes: 0, download: 0, released: true };
const ENGINE = { artifacts: [
  { ...artifact, id: "engine-2", kind: "module" as const, sha256: "m2", search: "s2", sameSearchAs: ["m1"] },
  { ...artifact, id: "lite", kind: "model" as const, sha256: "b2" },
] };
const MOVES = ["D10-G10", "N11-Q10", "L10-N11"];
const line = (moves: string[]) => Array.from({ length: moves.length + 1 }, (_, i) => moves.slice(0, i));
const results = (search: string, model: string, visits: number, positions: string[][]) =>
  positions.map(m => analysisKey(search, model, m, visits));

const mark = (module: string, model = "b2", network = "lite", visits = 512): ReviewMark =>
  ({ module, model, network, visits, at: "2026-10-12T00:00:00Z" });
const BRANCHES: KeptBranches = { version: 2, nodes: [["D10-G10 N11-Q11", 0]] };

test("the site's own results stay, and another engine's go when no game reads them", () => {
  const own = results("s2", "b2", 512, line(MOVES)), earlier = results("s1", "b2", 512, line(MOVES));
  assert.deepEqual(unneededResults([...own, ...earlier], [], ENGINE), earlier);
});

test("a game reviewed by an earlier engine keeps what its snapshot reads: its positions, and those one move from them", () => {
  const read = [...results("s1", "b2", 512, line(MOVES)),
                ...results("s1", "b2", 512, [["D10-G10", "N11-Q11"]]), // a branch
                ...results("s1", "b2", 32, [["D10-G10", "O11-R10"]])]; // a move from the line: a Great's confirmation
  // The sweep's, under a deeper result: the snapshot shows each position at its deepest. And two moves from the game:
  // another game's.
  const other = [...results("s1", "b2", 32, line(MOVES)),
                 ...results("s1", "b2", 512, [["A10-D10", "N11-Q10"], ["D10-G10", "N11-Q10", "L10-N11", "Q10-T10", "N11-Q11"]])];
  const game = { moves: MOVES, branches: BRANCHES, mark: mark("m0") };
  assert.deepEqual(unneededResults([...read, ...other], [game], ENGINE), other);
});

test("after Review again, a game's earlier results go, but for the positions another game's snapshot reads", () => {
  const again = [...MOVES, "Q10-T10", "N11-Q11"], still = ["D10-G10", "N11-Q10", "Q10-T10"];
  const earlier = [...new Set([...results("s1", "b2", 512, line(again)), ...results("s1", "b2", 512, line(still))])];
  const stored = [...earlier, ...results("s2", "b2", 512, line(again))];
  const games = [{ moves: again, branches: null, mark: mark("m2") }, { moves: still, branches: null, mark: mark("m0") }];
  // The two games share the start and two positions. The third of `again` is one move from a position of `still`.
  assert.deepEqual(unneededResults(stored, games, ENGINE), results("s1", "b2", 512, line(again).slice(4)));
  // Without the other game, all of the earlier engine's go.
  assert.deepEqual(unneededResults(stored, games.slice(0, 1), ENGINE), earlier);
});

test("after the removal, each snapshot still opens, on the same search and the same deepest results", () => {
  const s1 = [...results("s1", "b2", 512, line(MOVES)), ...results("s1", "b2", 1024, line(MOVES)), ...results("s1", "b2", 32, line(MOVES))];
  const games = [{ moves: MOVES, branches: null, mark: mark("m0") }, { moves: MOVES, branches: null, mark: mark("m0", "b2", "lite", 1024) }];
  const left = (stored: string[]) => {
    const gone = new Set(unneededResults(stored, games, ENGINE)), kept = stored.filter(k => !gone.has(k));
    for (const { mark: m } of games) {
      const choice = (keys: string[]) => searchHolding(keys, m.model, snapshotPositions(MOVES), m.visits, "s2");
      assert.equal(choice(kept), choice(stored));
    }
    return kept;
  };
  // Both snapshots read s1 at 1024 visits.
  assert.deepEqual(left(s1), results("s1", "b2", 1024, line(MOVES)));
  // s0 comes first in the store's order, so both snapshots read it, and s1's results go.
  assert.deepEqual(left([...results("s0", "b2", 1024, line(MOVES)), ...s1]), results("s0", "b2", 1024, line(MOVES)));
});

test("a mark that names its search keeps that search's results, which its snapshot reads, before another's", () => {
  const s0 = results("s0", "b2", 512, line(MOVES)), s1 = results("s1", "b2", 512, line(MOVES));
  const game = { moves: MOVES, branches: null, mark: { ...mark("m0"), search: "s1" } };
  assert.deepEqual(unneededResults([...s0, ...s1], [game], ENGINE), s0);
  // Without its results, the snapshot opens none, and they all go.
  assert.deepEqual(unneededResults(s0, [game], ENGINE), s0);
  // An earlier engine's mark that names the site's search reads none of the site's results.
  assert.deepEqual(unneededResults(s0, [{ ...game, mark: { ...game.mark, search: "s2" } }], ENGINE), s0);
});

test("a custom depth's results stay under a deeper result at a depth that the snapshot does not read", () => {
  // Reviewed at 3,000 visits, its key moment at 6,000 and the player's Depth at 5,000: the snapshot reads 3,000 and
  // each budget deeper (4,096), not 5,000 or 6,000. Another game's snapshot, at Lite's 512 visits, reads 4,096.
  const at = (visits: number, i: number) => results("s1", "b2", visits, [line(MOVES)[i]]);
  const review = results("s1", "b2", 3000, line(MOVES)), unread = [...at(6000, 1), ...at(5000, 2)];
  const game = { moves: MOVES, branches: null, mark: { ...mark("m0", "b2", "lite", 3000), search: "s1" } };
  assert.deepEqual(unneededResults([...review, ...unread], [game], ENGINE), unread);
  const deeper = at(4096, 2), lite = { ...game, mark: { ...game.mark, visits: 512 } };
  assert.deepEqual(unneededResults([...review, ...unread, ...deeper], [game, lite], ENGINE),
                   [...review.slice(2, 3), ...unread]);
});

test("an earlier network file's results stay while a game's snapshot reads them", () => {
  const file1 = results("s2", "b1", 512, line(MOVES)); // the site's search, with an earlier file of "lite"
  const game = { moves: MOVES, branches: null, mark: mark("m1", "b1") }; // an earlier build of the site's search
  assert.deepEqual(unneededResults(file1, [game], ENGINE), []);
  assert.deepEqual(unneededResults(file1, [], ENGINE), file1);
});

test("an earlier engine's snapshot reads no result of the site's search, so those of an earlier file go", () => {
  const site = results("s2", "b1", 512, line(MOVES)), earlier = results("s1", "b1", 512, line(MOVES));
  const game = { moves: MOVES, branches: null, mark: mark("m0", "b1") };
  assert.deepEqual(unneededResults([...site, ...earlier], [game], ENGINE), site);
});

test("a game whose review opens no snapshot needs none: no mark, a network the site no longer ships, results missing", () => {
  const earlier = results("s1", "b2", 512, line(MOVES));
  const games = [
    { moves: MOVES, branches: null }, // never reviewed to its end
    { moves: MOVES, branches: null, mark: mark("m0", "b2", "retired") }, // the site ships no network "retired"
    { moves: MOVES, branches: null, mark: mark("m0", "b2", "lite", 1024) }, // its depth is not stored: reviewed again
  ];
  assert.deepEqual(unneededResults(earlier, games, ENGINE), earlier);
  // The snapshot holds every position but the start: every game shares it.
  assert.deepEqual(unneededResults(earlier.slice(1), [{ moves: MOVES, branches: null, mark: mark("m0") }], ENGINE), []);
  assert.deepEqual(unneededResults(earlier.slice(0, -2), [{ moves: MOVES, branches: null, mark: mark("m0") }], ENGINE),
                   earlier.slice(0, -2));
});

test("without the site's CPU module, the removal takes nothing: it cannot tell the site's own results", () => {
  const stored = [...results("s2", "b2", 512, line(MOVES)), ...results("s1", "b2", 512, line(MOVES))];
  const networks = { artifacts: ENGINE.artifacts.filter(a => a.kind !== "module") };
  assert.deepEqual(unneededResults(stored, [], networks), []);
  assert.deepEqual(unneededResults(stored, [{ moves: MOVES, branches: null, mark: mark("m0") }], networks), []);
});

test("the results of another shape are not this removal's", () => {
  const older = results("s1", "b2", 512, line(MOVES)).map(k => k.replace(/^\d+\|/, `${SHAPE - 1}|`));
  const newer = older.map(k => k.replace(/^\d+\|/, `${SHAPE + 1}|`));
  assert.deepEqual(unneededResults([...older, ...newer, "85c2adb|b2|512|D10-G10"], [], ENGINE), []);
});
