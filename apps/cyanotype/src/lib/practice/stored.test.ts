// Checks the stored practice game against Stamp Duty (stored.ts) and the Function that keeps it
// (functions/api/practice-games.ts), as Hedge School's stored.test.ts checks its own: on the schema of migrations/ in
// Node's own SQLite, behind the part of D1's binding that the Function uses. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { onRequestDelete, onRequestPost, type D1 } from "../../../functions/api/practice-games.ts";
import { MAX_KOMI, recordBlueprintsMoves, storedProblem, type StoredPractice } from "./stored.ts";
import { MAX_KOMI as CARD_MAX_KOMI } from "@abstractclass/practice/practice.ts";
import { parseRecord } from "../game/record.ts";

const RECORD = '[Event "Cyanotype practice"]\n[Blue "You"]\n\n1. 2@-6,-2 2. 1:0,0>3:1,-1 2@5,-2x+24 3. 1@1,2 pass b+12\n';

const game = (over: Partial<StoredPractice> = {}): StoredPractice => ({
  version: 1, id: "0b6a2c1e-5f3d-4a8b-9c7d-1e2f3a4b5c6d", browser: null, ended: "2026-11-13", site: "5183d8a",
  bot: { network: "b6c96-s22323968-d845223", visits: 64, variety: "low", form: "cpu", builds: ["887be290"] },
  side: "blue", outcome: "won", result: "b+12", record: RECORD,
  brought: 0, takebacks: [{ at: 3, undone: ["2@5,-2", "1:0,0>3:1,-1"] }], ms: [3000, 800, 790, 2500, null], ...over,
});

/** A database with the schema (each migration, in order), and the binding as the Function sees it. */
function database() {
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync("migrations").filter(f => f.endsWith(".sql")).sort()) db.exec(readFileSync(`migrations/${file}`, "utf8"));
  const binding: D1 = {
    prepare(sql) {
      let values: unknown[] = [];
      const statement = {
        bind(...v: unknown[]) { values = v; return statement; },
        async run() { return { meta: { changes: Number(db.prepare(sql).run(...(values as never[])).changes) } }; },
      };
      return statement;
    },
  };
  return { db, env: { GAMES: binding } };
}
const URL_ = "https://cyanotype.example/api/practice-games";
const post = (body: unknown) => new Request(URL_, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });
const del = (browser: string) => new Request(URL_, { method: "DELETE", body: JSON.stringify({ browser }) });

test("a game is valid as the browser sends it, and each field is checked", () => {
  assert.equal(storedProblem(game()), null);
  assert.equal(storedProblem(game({ browser: "c9d8e7f6-a5b4-4c3d-8e2f-1a0b9c8d7e6f" })), null);
  assert.equal(storedProblem(game({ outcome: "set_aside", result: "*" })), null); // left for a new start
  assert.equal(storedProblem(game({ takebacks: [{ at: 1, undone: ["pass"] }] })), null);
  assert.equal(storedProblem(game({ id: "1" })), "id");
  assert.equal(storedProblem(game({ outcome: "quit" as never })), "outcome");
  // A takeback holds moves' names: Blueprints' placements and edits, with no mark, and nothing else
  for (const undone of [["D10-G10"], ["2@5,-2x+24"], ["4@0,0"], ["1:0,0>3:1,-1; DROP TABLE"]])
    assert.equal(storedProblem(game({ takebacks: [{ at: 3, undone }] })), "takebacks", undone[0]);
  assert.equal(storedProblem({ ...game(), bot: { ...game().bot, form: "wasm" } }), "bot");
  assert.equal(storedProblem(null), "not an object");
  // A game with a komi (Hedge School's design 24): a whole number of points within the card's range, and none at 0
  assert.equal(storedProblem(game({ komi: -300 })), null);
  for (const komi of [0, 0.5, 3001]) assert.equal(storedProblem(game({ komi })), "komi", String(komi));
  assert.equal(MAX_KOMI, CARD_MAX_KOMI, "the server takes every komi that the card gives");
});

test("a record's moves are its main line's, passes and capture marks included, and no variation's", () => {
  assert.equal(recordBlueprintsMoves(RECORD), 5);
  assert.equal(recordBlueprintsMoves(RECORD), parseRecord(RECORD).moves.length, "the record's reader counts the same");
  const setUp = '[Position "x"]\n\n51... 1@3,-2 (51... 2@1,1 {a note: 3@0,0}) 52. 1:0,0>2:1,0 3@-11,10x *';
  assert.equal(recordBlueprintsMoves(setUp), 3);
});

test("the Function keeps a game once, with its moves, and deletes a browser's games", async () => {
  const { db, env } = database();
  const browser = "c9d8e7f6-a5b4-4c3d-8e2f-1a0b9c8d7e6f";
  assert.equal((await onRequestPost({ request: post(game({ browser })), env })).status, 201);
  assert.equal((await onRequestPost({ request: post(game({ browser })), env })).status, 200); // the same game again
  assert.equal((await onRequestPost({ request: post(game({ id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d" })), env })).status, 201);
  const rows = db.prepare("SELECT id, browser, network, visits, form, side, outcome, moves FROM practice_games ORDER BY id").all();
  assert.equal(rows.length, 2);
  assert.deepEqual({ ...rows[0] }, { id: "0b6a2c1e-5f3d-4a8b-9c7d-1e2f3a4b5c6d", browser, network: "b6c96-s22323968-d845223",
                                     visits: 64, form: "cpu", side: "blue", outcome: "won", moves: 5 });
  assert.deepEqual((await (await onRequestDelete({ request: del(browser), env })).json()), { deleted: 1 });
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM practice_games").get()!.n, 1); // the game sent with no number stays
  // A game with the deleted number that arrives later is not kept
  assert.equal((await onRequestPost({ request: post(game({ id: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e", browser })), env })).status, 200);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM practice_games WHERE browser = ?").get(browser)!.n, 0);
});

test("the Function refuses what it does not keep, and answers 503 without its database", async () => {
  const { env } = database();
  assert.equal((await onRequestPost({ request: post("{not json"), env })).status, 400);
  assert.equal((await onRequestPost({ request: post(game({ side: "green" as never })), env })).status, 400);
  assert.equal((await onRequestPost({ request: post("x".repeat(70_000)), env })).status, 413);
  assert.equal((await onRequestPost({ request: post(game()), env: {} })).status, 503); // a deployment with no database
  assert.equal((await onRequestDelete({ request: del("*"), env })).status, 400);
  assert.equal((await onRequestDelete({ request: del("c9d8e7f6-a5b4-4c3d-8e2f-1a0b9c8d7e6f"), env: {} })).status, 503);
});
