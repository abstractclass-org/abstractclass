// Checks a record's way into the player's games (import.ts): the list keeps no game that the review refuses (a set-up
// start, a record that the engine's rules refuse), keeps the others with their capture marks, and keeps a shared
// review's game at its komi, with the sender's variations and the sender's network and depth (Hedge School's designs
// 09 and 13). The engine's check is the test's own: recordCheck.engine.test.ts checks the engine's. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";
import { STORES, dbGet } from "@abstractclass/storage/db.ts";
import type { KeptBranches } from "@abstractclass/analysis/kept.ts";
import type { Checked } from "./check.ts";
import { importRecord, importShare } from "./import.ts";
import { parseRecord } from "./record.ts";
import type { SharedReview } from "./share.ts";
import { gameId, loadGame, listGames } from "./store.ts";
import { STANDARD_START } from "./position.ts";

const db = memoryDb(); // the browser's store of games

/** A check that accepts every record: the second move captures and scores 12, the others capture nothing. */
const accepts = async (r: { moves: string[] }): Promise<Checked> =>
  ({ problem: null, captures: r.moves.map((_, i) => (i === 1 ? { points: 12 } : null)) });
let checked = 0;
const counted = (check: typeof accepts) => (r: { moves: string[] }) => (checked++, check(r));

const MOVES = ["2@-6,-2", "1@0,0", "pass"];
const RECORD = '[Blue "Ann"]\n[Red "Ben"]\n\n1. 2@-6,-2 2. 1@0,0 pass *\n';

test("a record that the engine's rules accept is kept with its capture marks, and imported again is one game", async () => {
  db.rows(STORES.games).clear();
  const id = await importRecord(RECORD, parseRecord(RECORD), accepts);
  assert.equal(id, gameId(MOVES));
  const stored = await loadGame(id);
  assert.match(stored!.game.record, /2\. 1@0,0x\+12 pass/);
  assert.deepEqual(stored!.record.moves, MOVES);
  assert.equal(await importRecord(RECORD, parseRecord(RECORD), accepts), id);
  assert.equal((await listGames()).length, 1);
});

test("the list keeps no game that the review refuses, and says why", async () => {
  db.rows(STORES.games).clear();
  checked = 0;
  // The engine's rules refuse a move, or a capture mark
  const refuses = async (): Promise<Checked> => ({ problem: "Move 2 (1@0,0x) has the mark x, but the move captures no opponent cells.", captures: [] });
  await assert.rejects(importRecord(RECORD, parseRecord(RECORD), counted(refuses)),
                       { message: "Cyanotype cannot review this game: Move 2 (1@0,0x) has the mark x, but the move captures no opponent cells." });
  const engine = async (): Promise<Checked> => ({ problem: "illegal move 1@0,0", captures: [] });
  await assert.rejects(importRecord(RECORD, parseRecord(RECORD), engine),
                       { message: "Cyanotype cannot review this game: illegal move 1@0,0." });
  // A game from a set-up start: the review takes games from the standard start only, before the engine's check
  const start = STANDARD_START.replace(/ b1 0\/0 0$/, " r1 0/0 22"); // the standard start's board, at move 23
  const setUp = `[Position "${start}"]\n\n12... 2@5,-2 *\n`;
  await assert.rejects(importRecord(setUp, parseRecord(setUp), counted(accepts)), /starts from another position.*Analysis board/);
  assert.equal(checked, 1);
  assert.equal((await listGames()).length, 0);
});

test("a shared review is kept at its komi, with the sender's variations, and with the sender's network and depth", async () => {
  db.rows(STORES.games).clear();
  const shared = (tags: Record<string, string>, branches: SharedReview["branches"] = []): SharedReview =>
    ({ module: "0123abcd", model: "89ef4567", visits: 1024, tags: { Blue: "Ann", Red: "Ben", ...tags }, moves: MOVES, branches });
  const atKomi = await importShare(shared({ Komi: "-300" }, [["2@-6,-2 1@4,4", 0]]), "b6c96-s1-d1", accepts);
  assert.equal(atKomi, gameId(MOVES, -300));
  assert.deepEqual((await loadGame(atKomi))?.game.settings, { network: "b6c96-s1-d1", visits: 1024 });
  assert.deepEqual(await dbGet<KeptBranches>(STORES.branches, atKomi), { version: 2, nodes: [["2@-6,-2 1@4,4", 0]] });
  // A network that this site does not ship: the game reviews with the recipient's settings
  const plain = await importShare(shared({}), null, accepts);
  assert.equal(plain, gameId(MOVES));
  assert.equal((await loadGame(plain))?.game.settings, undefined);
});
