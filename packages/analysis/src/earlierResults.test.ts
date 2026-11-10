// Checks the removal of earlier results (earlierResults.ts, Hedge School's design 20) on a site of words: a record is
// its moves as words, and one that holds "!" does not read. The store in memory stands in for IndexedDB, and local
// storage is the test's own, as the browser's. Each site's tests check the rule on its own game and engine: Hedge
// School's src/lib/game/earlierResults.test.ts and Cyanotype's. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";
import { STORES } from "@abstractclass/storage/db.ts";
import type { Manifest } from "@abstractclass/engine/client.ts";
import { analysisKey, earlierRemovalDue, engineFiles } from "./cache.ts";
import { gameStore } from "./games.ts";
import type { KeptBranches } from "./kept.ts";
import { removeUnneeded } from "./earlierResults.ts";

const db = memoryDb(); // before the first read or write: db.ts opens the store once
const local = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem: (k: string) => local.get(k) ?? null, setItem: (k: string, v: string) => void local.set(k, v),
  removeItem: (k: string) => void local.delete(k) } });

const { readGames } = gameStore<{ moves: string[] }>({
  parse: text => { if (text.includes("!")) throw new Error("not a record"); return { moves: text.split(" ") }; },
  id: record => `w-${record.moves.join("")}`, lastReviewKey: "words:last-review:1",
});

// The site's engine: its CPU module "m2" searches as "s2", and it ships the network "net" as the file "b2"
const artifact = { interface: null, url: "", bytes: 0, download: 0, released: true };
const ENGINE: Manifest = { artifacts: [
  { ...artifact, id: "engine-2", kind: "module", sha256: "m2", search: "s2" },
  { ...artifact, id: "engine-2-gpu", kind: "gpu-module", sha256: "g2", search: "s2" },
  { ...artifact, id: "net", kind: "model", sha256: "b2" },
  { ...artifact, id: "net-graph", kind: "graph", sha256: "x2", graphOf: "net" },
  { ...artifact, id: "big", kind: "model", sha256: "b3" },
] };
const results = (search: string, positions: string[][]) => positions.map(m => analysisKey(search, "b2", m, 512));
const LINE = [[], ["a"], ["a", "b"], ["a", "b", "c"]], VARIATION = ["a", "x"];

test("the engine files are the CPU module and the networks, which the stored results' keys name", () => {
  assert.equal(engineFiles(ENGINE), "m2 b2 b3");
});

test("the removal takes the results that no game needs, and keeps the site's own, those a review snapshot reads, and the games", async () => {
  // A game reviewed by an earlier engine, whose search was "s1", with a variation: kept before the list of games, so
  // its key is its id. And a game whose record does not read, which cannot open.
  const mark = { module: "m1", model: "b2", network: "net", visits: 512, at: "2026-11-01T00:00:00Z", search: "s1" };
  const game = { record: "a b c", added: "2026-11-01T00:00:00Z", reviewed: mark };
  const branches: KeptBranches = { version: 2, nodes: [[VARIATION.join(" "), 0]] };
  db.rows(STORES.games).set("w-abc", game);
  db.rows(STORES.branches).set("w-abc", branches);
  const unread = { version: 1, id: "w-ab!", record: "a b !", added: "2026-11-01T00:00:00Z", reviewed: { ...mark, search: "s0" } };
  db.rows(STORES.games).set("w-ab!", unread);
  const own = results("s2", LINE), read = results("s1", [...LINE, VARIATION]), earlier = results("s0", LINE);
  for (const key of [...own, ...read, ...earlier]) db.rows(STORES.analysis).set(key, {});
  await removeUnneeded("m2 b2 b3", ENGINE, readGames);
  assert.deepEqual([...db.rows(STORES.analysis).keys()].sort(), [...own, ...read].sort());
  assert.deepEqual([...db.rows(STORES.games)], [["w-abc", game], ["w-ab!", unread]]);
  assert.deepEqual([...db.rows(STORES.branches)], [["w-abc", branches]]);
  // The browser's mark keeps the engine files that the removal ran for: a start with them removes nothing
  assert.equal(earlierRemovalDue("m2 b2 b3"), false);
  assert.equal(earlierRemovalDue("m3 b2 b3"), true);
});
