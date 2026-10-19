// Checks the storage as the site's code sees it in Node, where the browser's stores are absent: the store in memory
// (memoryDb.ts) in IndexedDB's place, and local storage that answers as blocked storage does. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { STORES, dbGet, dbGetMany, dbKeys, dbPut } from "./db.ts";
import { memoryDb } from "./memoryDb.ts";
import { readLocal, readLocalJson, writeLocal } from "./local.ts";

memoryDb(); // before the first read or write: db.ts opens the store once

test("a value put in the store reads back, alone or with others", async () => {
  assert.equal(await dbPut(STORES.games, "a", { moves: ["x"] }), true);
  await dbPut(STORES.games, "b", 2);
  assert.deepEqual(await dbGet(STORES.games, "a"), { moves: ["x"] });
  assert.deepEqual(await dbGetMany(STORES.games, ["b", "none", "a"]), [2, undefined, { moves: ["x"] }]);
  assert.deepEqual(await dbKeys(STORES.games), ["a", "b"]);
  assert.equal(await dbGet(STORES.analysis, "a"), undefined); // another store
});

test("local storage that is absent reads as empty, and a write does not throw", () => {
  writeLocal("key", "value");
  assert.equal(readLocal("key"), null);
  assert.equal(readLocalJson("key"), null);
});
