// Checks the game in review as this browser keeps it (keptGame.ts): a game's id covers its komi (Hedge School's design
// 24), from a record and from a shared review. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";
import type { SharedReview } from "../game/share.ts";
import { gameId, keepShared } from "./keptGame.ts";

memoryDb(); // the browser's store of games

const MOVES = ["2@-6,-2", "1@0,0", "pass"];
const shared = (tags: Record<string, string>): SharedReview =>
  ({ module: "0123abcd", model: "89ef4567", visits: 512, tags: { Blue: "Ann", Red: "Ben", ...tags }, moves: MOVES, branches: [] });

test("a game's id: its moves alone at komi 0, as before, and its komi with them", () => {
  assert.equal(gameId(MOVES), "review-3-b8d5ec7d"); // the id before the komi
  assert.equal(gameId(MOVES, 0), gameId(MOVES));
  assert.notEqual(gameId(MOVES, 300), gameId(MOVES));
  assert.notEqual(gameId(MOVES, 300), gameId(MOVES, -300));
});

test("a shared review with a komi is kept as the game at its komi, through its record (keepGame)", async () => {
  assert.equal(await keepShared(shared({ Komi: "-300" })), gameId(MOVES, -300));
  assert.equal(await keepShared(shared({})), gameId(MOVES));
});
