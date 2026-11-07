// Checks the store of the player's games (games.ts) on a site of words: a record is its moves as words, one that holds
// "!" does not read, and a game's id is its moves joined. The store in memory stands in for IndexedDB, and local storage
// is the test's own, as the browser's. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";
import { STORES, dbGet, dbPut } from "@abstractclass/storage/db.ts";
import { gameStore, markReviewed, setGameSettings, type StoredGame } from "./games.ts";

const db = memoryDb(); // before the first read or write: db.ts opens the store once
const local = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem: (k: string) => local.get(k) ?? null, setItem: (k: string, v: string) => void local.set(k, v),
  removeItem: (k: string) => void local.delete(k) } });
// The browser's answer to the request to keep the site's data (@abstractclass/storage/persist.ts): counted.
let persistAsked = 0;
Object.defineProperty(globalThis.navigator, "storage", { configurable: true, value: {
  persisted: async () => false, persist: async () => (persistAsked++, true) } });

type Words = { moves: string[] };
const LAST = "words:last-review:1";
const store = gameStore<Words>({
  parse: text => { if (text.includes("!")) throw new Error("not a record"); return { moves: text.split(" ") }; },
  id: record => `w-${record.moves.join("")}`, lastReviewKey: LAST,
});

test("a game kept once is one game, kept with its record and when it came, and asks the browser to keep the site's data", async () => {
  const first = await store.saveGame("a b c", { moves: ["a", "b", "c"] });
  assert.deepEqual(first, { id: "w-abc", kept: true });
  const again = await store.saveGame("a b c", { moves: ["a", "b", "c"] });
  assert.deepEqual(again, first);
  const stored = await dbGet<StoredGame>(STORES.games, "w-abc");
  assert.equal(stored?.record, "a b c");
  assert.equal(stored?.version, 1);
  assert.ok(stored && !Number.isNaN(Date.parse(stored.added)));
  assert.equal(persistAsked, 1); // once a page
  assert.deepEqual((await store.loadGame("w-abc"))?.record, { moves: ["a", "b", "c"] });
  assert.equal(await store.loadGame("w-none"), undefined);
});

test("the list: newest first, without a game whose record does not read, and with a game kept before the list", async () => {
  db.rows(STORES.games).clear();
  const game = (id: string, record: string, added: string): StoredGame => ({ version: 1, id, record, added });
  db.rows(STORES.games).set("w-ab", game("w-ab", "a b", "2026-11-01T10:00:00.000Z"));
  db.rows(STORES.games).set("w-cd", game("w-cd", "c d", "2026-11-03T10:00:00.000Z"));
  db.rows(STORES.games).set("w-bad", game("w-bad", "a !", "2026-11-04T10:00:00.000Z"));
  // A game that a site kept before it had a list (Cyanotype's review): its record and when it came, under its id
  db.rows(STORES.games).set("w-old", { record: "e f", added: "2026-11-02T10:00:00.000Z" });
  const listed = await store.listGames();
  assert.deepEqual(listed.map(g => g.game.id), ["w-cd", "w-old", "w-ab"]);
  assert.deepEqual(listed[1], { game: { version: 1, id: "w-old", record: "e f", added: "2026-11-02T10:00:00.000Z" },
                                record: { moves: ["e", "f"] } });
  assert.equal((await store.loadGame("w-old"))?.game.id, "w-old");
  // A mark or settings on such a game keep its record
  await setGameSettings("w-old", { network: "n1", visits: 1024 });
  assert.deepEqual((await store.loadGame("w-old"))?.game.settings, { network: "n1", visits: 1024 });
  assert.equal((await store.loadGame("w-old"))?.game.record, "e f");
});

test("a delete removes the game, its variations and the last review's pointer to it, and leaves the others", async () => {
  db.rows(STORES.games).clear();
  await store.saveGame("a b", { moves: ["a", "b"] });
  await store.saveGame("c d", { moves: ["c", "d"] });
  await dbPut(STORES.branches, "w-ab", { version: 2, nodes: [["a b x", 0]] });
  store.rememberReview("w-ab");
  assert.equal(store.lastReview(), "w-ab");
  await store.deleteGame("w-ab");
  assert.equal(await store.loadGame("w-ab"), undefined);
  assert.equal(await dbGet(STORES.branches, "w-ab"), undefined);
  assert.equal(store.lastReview(), null);
  assert.deepEqual((await store.listGames()).map(g => g.game.id), ["w-cd"]);
  // The delete of another game leaves the last review's pointer
  store.rememberReview("w-cd");
  await store.saveGame("e f", { moves: ["e", "f"] });
  await store.deleteGame("w-ef");
  assert.equal(store.lastReview(), "w-cd");
});

test("a finished review's mark stays on its game, and a mark of a game no longer kept is not written", async () => {
  db.rows(STORES.games).clear();
  await store.saveGame("a b", { moves: ["a", "b"] });
  const done = { module: "m1", model: "n1", network: "lite", visits: 512, search: "s1", modules: ["m1"] };
  await markReviewed("w-ab", done);
  const { modules: _, ...mark } = done;
  assert.deepEqual({ ...(await store.loadGame("w-ab"))?.game.reviewed, at: undefined }, { ...mark, at: undefined });
  await markReviewed("w-gone", done);
  assert.equal(await dbGet(STORES.games, "w-gone"), undefined);
});
