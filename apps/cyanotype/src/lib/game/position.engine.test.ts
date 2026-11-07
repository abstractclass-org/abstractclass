// Checks a position's notation (position.ts) against the engine's rules: each position of Stamp Duty's own games (the
// lab's games, board/fixtures.json, and the review's test game, review/fixtures/stamp-duty.txt, Stamp Duty against
// itself), written in the notation and given to the engine in its own form (enginePosition), is the same position: the
// same cells, hands, scores, moves played and mover, and every legal move the same. A game goes on from a set-up start
// as from its moves. The Notation page's example position is the engine's, and the engine refuses a hand that the rules
// do not allow. Every move list comes from the engine. The engine runs on the CPU in Node from the site's
// static/engine: without its files, this is skipped.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hasEngine, nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import { sitePosition, type DescribeReply, type GamePosition } from "../board/described.ts";
import { FIXTURE_DATA } from "../board/fixtures.ts";
import { parseRecord } from "./record.ts";
import { enginePosition, readPosition, STANDARD_START, writePosition } from "./position.ts";

const app = join(import.meta.dirname, "..", "..", "..");
const skip = hasEngine(app) ? false : "no engine in static/engine (npm run engine)";
const game = parseRecord(readFileSync(join(import.meta.dirname, "..", "review", "fixtures", "stamp-duty.txt"), "utf8")).moves;

/** The engine's call, with an error reply thrown, as the worker answers (channel.ts). */
async function engine() {
  const { call } = await nodeEngine(app);
  return <T>(request: Record<string, unknown>): T => {
    const reply = call({ id: "p", ...request });
    if (reply.error) throw new Error(`${reply.error} (${reply.field})`);
    return reply as T;
  };
}

/** What a position is for the rules, from describe's reply: the board, the hands, the scores, the moves played, the
 *  mover and its moves left, and the legal moves. The notation's text holds the first four. */
const rulesOf = (d: DescribeReply) =>
  ({ notation: writePosition(sitePosition(d)), mover: d.mover, movesLeft: d.movesLeft, legal: d.legal });

test("each position of Stamp Duty's games is the same position from its notation", { skip }, async () => {
  const call = await engine();
  const lines = [...FIXTURE_DATA.fixtures.map(f => f.moves), ...Array.from({ length: game.length + 1 }, (_, i) => game.slice(0, i))];
  let checked = 0;
  for (const moves of lines) {
    const played = call<DescribeReply>({ action: "describe", moves });
    const text = writePosition(sitePosition(played));
    assert.equal(writePosition(readPosition(text)), text);
    if (!moves.length) assert.equal(text, STANDARD_START);
    if (played.outcome) continue; // the game's end: no legal move to compare
    const set = call<DescribeReply>({ action: "describe", position: enginePosition(text), moves: [] });
    assert.deepEqual(rulesOf(set), rulesOf(played), `after ${moves.length} moves`);
    checked++;
  }
  assert.ok(checked > 120, `${checked} positions checked`);
});

test("a game goes on from a set-up start as from its moves", { skip }, async () => {
  const call = await engine();
  for (const k of [9, 40, 77]) {
    const at = call<DescribeReply>({ action: "describe", moves: game.slice(0, k) });
    const from = (r: { positions: GamePosition[] }) => r.positions.map(p => writePosition(sitePosition(p)));
    const played = from(call({ action: "describe_game", moves: game, from: k }));
    const set = from(call({ action: "describe_game", position: enginePosition(writePosition(sitePosition(at))), moves: game.slice(k) }));
    assert.deepEqual(set, played, `from move ${k}`);
  }
});

test("the Notation page's position is the engine's, after its example game's fifth move", { skip }, async () => {
  const call = await engine();
  const page = readFileSync(join(app, "src", "routes", "notation", "+page.svelte"), "utf8");
  const at = page.indexOf("const AFTER_FIVE ="), statement = page.slice(at, page.indexOf('";', at) + 1); // its literals
  const shown = statement.match(/"[^"]*"/g)!.map(s => s.slice(1, -1)).join("");
  const moves = ["1@-2,2", "2@3,1", "3:0,0>3:1,-1", "1@1,-3", "1@0,3"]; // the page's game record
  assert.equal(shown, writePosition(sitePosition(call<DescribeReply>({ action: "describe", moves }))));
});

test("the engine refuses a hand that the rules do not allow, and says why", { skip }, async () => {
  const call = await engine();
  // Blue's blueprint 1 without one of its cells: the hand holds 20 cells, not 21.
  const short = STANDARD_START.replace(" 0,0;1,0;-1,1;0,1s;1,1;-1,2;0,2|0,0w", " 1,0;-1,1;0,1s;1,1;-1,2;0,2|0,0w");
  assert.throws(() => readPosition(short), /not in its frame/);
  const twenty = STANDARD_START.replace(" 0,0;1,0;-1,1;0,1s;1,1;-1,2;0,2|0,0w", " 0,0;1,0;-1,1;0,1s;1,1;-1,2|0,0w");
  assert.throws(() => call({ action: "describe", position: enginePosition(twenty), moves: [] }), /hold 20 cells, not 21/);
  // A blueprint in two pieces
  const apart = STANDARD_START.replace(" 0,0;1,0;-1,1;0,1s;1,1;-1,2;0,2|0,0w", " 0,0;1,0;-1,1;0,1s;1,1;-1,2;3,2|0,0w");
  assert.throws(() => call({ action: "describe", position: enginePosition(apart), moves: [] }), /not connected/);
});
