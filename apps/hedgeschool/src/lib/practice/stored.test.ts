// Checks the stored practice game (stored.ts) and the Function that keeps it (functions/api/practice-games.ts), on the
// schema of migrations/ in Node's own SQLite, behind the part of D1's binding that the Function
// uses. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { onRequestDelete, onRequestPost, type D1 } from "../../../functions/api/practice-games.ts";
import { recordEdges, storedProblem, type StoredPractice } from "./stored.ts";

const game = (over: Partial<StoredPractice> = {}): StoredPractice => ({
  version: 1, id: "0b6a2c1e-5f3d-4a8b-9c7d-1e2f3a4b5c6d", browser: null, ended: "2026-10-15", site: "01b29d8",
  bot: { network: "b10c128-s66625408-d13350730", visits: 64, variety: "low", form: "gpu", builds: ["85f1792"] },
  side: "blue", outcome: "won", result: "b+12.5",
  record: '[Event "Hedge School practice"]\n[Blue "You"]\n\n1. D10-G10 2. N9-Q10 O9-Q10x 3. G10-K9 pass b+12.5\n',
  brought: 0, takebacks: [{ at: 3, undone: ["N9-Q10"] }], ms: [3000, 800, 790, 2500, null], ...over,
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
const post = (body: unknown) => new Request("https://hedgeschool.example/api/practice-games", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

test("a game is valid as the browser sends it, and each field is checked", () => {
  assert.equal(storedProblem(game()), null);
  assert.equal(storedProblem(game({ browser: "c9d8e7f6-a5b4-4c3d-8e2f-1a0b9c8d7e6f" })), null);
  assert.equal(storedProblem(game({ outcome: "set_aside", result: "*" })), null); // left for a new start
  assert.equal(storedProblem(game({ id: "1" })), "id");
  assert.equal(storedProblem(game({ browser: "not a number" })), "browser");
  assert.equal(storedProblem(game({ outcome: "quit" as never })), "outcome");
  assert.equal(storedProblem(game({ takebacks: [{ at: 3, undone: ["X1-Y2; DROP TABLE"] }] })), "takebacks");
  assert.equal(storedProblem({ ...game(), bot: { ...game().bot, visits: 0 } }), "bot");
  assert.equal(storedProblem(null), "not an object");
});

test("a record's edges are its main line's, passes included, and no variation's", () => {
  assert.equal(recordEdges(game().record), 5);
  assert.equal(recordEdges('[Position "A10-D10 Q10-T10 b2 0/0 3"]\n\n3. D10-G10 G10-K9 (3. D10-F13 F13-G10) {a note: N9-Q10} 4. N9-Q10 *'), 3);
});

test("the Function keeps a game once, and deletes a browser's games", async () => {
  const { db, env } = database();
  const browser = "c9d8e7f6-a5b4-4c3d-8e2f-1a0b9c8d7e6f";
  assert.equal((await onRequestPost({ request: post(game({ browser })), env })).status, 201);
  assert.equal((await onRequestPost({ request: post(game({ browser })), env })).status, 200); // the same game again
  assert.equal((await onRequestPost({ request: post(game({ id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d" })), env })).status, 201);
  const rows = db.prepare("SELECT id, browser, network, visits, side, outcome, edges FROM practice_games ORDER BY id").all();
  assert.equal(rows.length, 2);
  assert.deepEqual({ ...rows[0] }, { id: "0b6a2c1e-5f3d-4a8b-9c7d-1e2f3a4b5c6d", browser, network: "b10c128-s66625408-d13350730", visits: 64,
                                     side: "blue", outcome: "won", edges: 5 });
  const stored = JSON.parse(String(db.prepare("SELECT game FROM practice_games WHERE id = ?").get("0b6a2c1e-5f3d-4a8b-9c7d-1e2f3a4b5c6d")!.game));
  assert.deepEqual(stored.takebacks, [{ at: 3, undone: ["N9-Q10"] }]);

  const del = await onRequestDelete({ request: new Request("https://hedgeschool.example/api/practice-games", { method: "DELETE", body: JSON.stringify({ browser }) }), env });
  assert.deepEqual(await del.json(), { deleted: 1 });
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM practice_games").get()!.n, 1); // the game sent with no number stays
});

test("a game that arrives after its number's games were deleted is not kept", async () => {
  // A game sent before the delete, from another tab or after a failed send, that reaches the site after it.
  const { db, env } = database();
  const browser = "c9d8e7f6-a5b4-4c3d-8e2f-1a0b9c8d7e6f";
  const del = (b: string) => onRequestDelete({ request: new Request("https://hedgeschool.example/api/practice-games", { method: "DELETE", body: JSON.stringify({ browser: b }) }), env });
  assert.equal((await onRequestPost({ request: post(game({ browser })), env })).status, 201);
  assert.deepEqual(await (await del(browser)).json(), { deleted: 1 });
  assert.equal((await onRequestPost({ request: post(game({ id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", browser })), env })).status, 200);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM practice_games WHERE browser = ?").get(browser)!.n, 0);
  assert.equal((await onRequestPost({ request: post(game({ id: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e" })), env })).status, 201); // no number: kept
  assert.deepEqual(await (await del(browser)).json(), { deleted: 0 }); // a second delete
});

test("the Function refuses what it does not keep", async () => {
  const { env } = database();
  assert.equal((await onRequestPost({ request: post("{not json"), env })).status, 400);
  assert.equal((await onRequestPost({ request: post(game({ side: "green" as never })), env })).status, 400);
  assert.equal((await onRequestPost({ request: post("x".repeat(70_000)), env })).status, 413);
  assert.equal((await onRequestPost({ request: post(game()), env: {} })).status, 503); // a deployment with no database
  const bad = await onRequestDelete({ request: new Request("https://h.example/api/practice-games", { method: "DELETE", body: JSON.stringify({ browser: "*" }) }), env });
  assert.equal(bad.status, 400);
});
