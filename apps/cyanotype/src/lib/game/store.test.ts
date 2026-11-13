// Checks Cyanotype's part of the player's games (store.ts): a game's id, as the review kept it before the list, covers
// its komi (Hedge School's design 24) and its set-up start, and a game that the review kept before the list is in the
// list. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";
import { STORES } from "@abstractclass/storage/db.ts";
import { gameId, listGames, loadGame } from "./store.ts";

const db = memoryDb(); // the browser's store of games

const MOVES = ["2@-6,-2", "1@0,0", "pass"];

test("a game's id: its moves alone at komi 0, as before, and its komi with them", () => {
  assert.equal(gameId(MOVES), "review-3-b8d5ec7d"); // the id before the komi
  assert.equal(gameId(MOVES, 0), gameId(MOVES));
  assert.notEqual(gameId(MOVES, 300), gameId(MOVES));
  assert.notEqual(gameId(MOVES, 300), gameId(MOVES, -300));
});

test("a game's id covers its set-up start (a practice game from the Analysis board's position), and none keeps the id", () => {
  assert.equal(gameId(MOVES, 0, undefined), "review-3-b8d5ec7d");
  assert.notEqual(gameId(MOVES, 0, "a start"), gameId(MOVES));
  assert.notEqual(gameId(MOVES, 0, "a start"), gameId(MOVES, 0, "another start"));
  assert.notEqual(gameId(MOVES, 300, "a start"), gameId(MOVES, 0, "a start"));
});

test("a game that the review kept before the list (its record and when it came) opens and is in the list", async () => {
  const id = gameId(MOVES), record = '[Blue "Ann"]\n[Red "Ben"]\n\n1. 2@-6,-2 2. 1@0,0 pass *\n';
  db.rows(STORES.games).set(id, { record, added: "2026-11-06T10:00:00.000Z" });
  const listed = await listGames();
  assert.deepEqual(listed.map(g => g.game.id), [id]);
  assert.deepEqual(listed[0].record.moves, MOVES);
  assert.equal((await loadGame(id))?.game.id, id);
});
