// Request 18's check: on the meaf.us archive's games, describe_game (protocol 0.6.1) gives each position with the
// fields that describe gives for the same moves, and each move's cut edge as the site found it before (an edge of the
// opponent's that is there before the move and gone after it). Also from a later move (`from`), from a set-up start
// (a position as a string, as the Analysis board sends it), and the error for a `from` out of range. It times both
// ways too, in Node. It reads the engine from static/engine (`npm run engine` first), and prints counts only: the
// archive holds other players' games.
//
//   node scripts/measure/describe-game-check.mjs ../../../engines/runs/archive/games.jsonl [games]
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { isDeepStrictEqual } from "node:util";
import { meafRecord } from "../../src/lib/game/meaf.ts";
import { parseRecord } from "../../src/lib/game/record.ts";
import { variantProblem } from "../../src/lib/game/import.ts";
import { positionQuery } from "../../src/lib/engine/protocol.ts";
import { nodeEngine } from "../node-engine.mjs";

const [file, limitArg] = process.argv.slice(2);
if (!file) throw new Error("usage: node scripts/measure/describe-game-check.mjs GAMES.jsonl [games]");
const limit = limitArg ? Number(limitArg) : Infinity;

const { module, call } = await nodeEngine(".");
const version = call({ id: "v", action: "query_version" });
console.log(`module ${module.id}: protocol ${version.protocol}, build ${version.build}, search ${version.search}`);

// The fields that describe and describe_game share (protocol.ts, PositionFields).
const FIELDS = ["position", "edges", "protected", "placed", "regions", "areas", "scores", "mover", "movesLeft", "moveCount", "outcome"];
const oldCut = (before, after) => {
  const opponent = before.mover === "b" ? "r" : "b", left = new Set(after.edges[opponent]);
  return before.edges[opponent].find(e => !left.has(e)) ?? null;
};

const counts = { games: 0, skipped: 0, positions: 0, fieldDiffs: 0, cutDiffs: 0, fromChecks: 0, fromDiffs: 0, startChecks: 0, startDiffs: 0, errors: 0 };
const byField = {};
const time = { game: 0, describe: 0 }, sizes = { game: 0, describe: 0 };
const seen = new Set();

/** Every position of `moves` from `from`, by describe_game, and by describe: one request each, as the site asked
 *  before request 18. */
function both(start, moves, from) {
  let t = performance.now();
  const game = call({ id: "g", action: "describe_game", ...positionQuery(start, moves), from });
  const gameMs = performance.now() - t;
  t = performance.now();
  const each = [];
  for (let k = from; k <= moves.length; k++) each.push(call({ id: "d", action: "describe", ...positionQuery(start, moves.slice(0, k)) }));
  return { game, each, gameMs, eachMs: performance.now() - t };
}

/** Whether describe_game's positions from `from` equal describe's, field by field, with each move's cut as the edges
 *  show it. Counts the fields that differ. */
function same(game, each, from) {
  if (game.error || each.some(d => d.error) || game.positions.length !== each.length) return false;
  let ok = from > 0 || game.positions[0].cuts === null; // the position before the moves has no cut
  game.positions.forEach((p, k) => {
    for (const f of FIELDS.filter(f => !isDeepStrictEqual(p[f], each[k][f]))) { byField[f] = (byField[f] ?? 0) + 1; ok = false; }
    if (k > 0 && p.cuts !== oldCut(each[k - 1], each[k])) { counts.cutDiffs += 1; ok = false; }
  });
  return ok;
}

for await (const line of createInterface({ input: createReadStream(file) })) {
  if (counts.games >= limit) break;
  if (!line) continue;
  const g = JSON.parse(line);
  if (seen.has(g.gameID)) continue; // the archive has some games more than once
  seen.add(g.gameID);
  let moves;
  try {
    const record = parseRecord(meafRecord(g));
    moves = variantProblem(record) ? [] : record.moves;
  } catch {
    moves = [];
  }
  if (!moves.length) { counts.skipped += 1; continue; }
  counts.games += 1;

  // The whole game, from the standard start: the review's start.
  const r = both(null, moves, 0);
  time.game += r.gameMs;
  time.describe += r.eachMs;
  sizes.game += JSON.stringify(r.game).length;
  sizes.describe += r.each.reduce((n, d) => n + JSON.stringify(d).length, 0);
  counts.positions += r.each.length;
  if (!same(r.game, r.each, 0)) counts.fieldDiffs += 1;

  // From a later move, as a branch's line asks (GameAnalysis.addLine, lineSteps), on every tenth game.
  if (counts.games % 10 === 0 && moves.length > 2) {
    counts.fromChecks += 1;
    const from = Math.floor(moves.length / 2), f = both(null, moves, from);
    if (!same(f.game, f.each, from)) counts.fromDiffs += 1;
  }
  // From a set-up start given as a string, as the Analysis board asks, on every tenth game.
  if (counts.games % 10 === 5 && moves.length > 4) {
    counts.startChecks += 1;
    const half = Math.floor(moves.length / 2), s = both(r.each[half].position, moves.slice(half), 0);
    if (!same(s.game, s.each, 0)) counts.startDiffs += 1;
  }
}

// A `from` out of range is refused by name.
for (const from of [-1, 1.5, 999]) {
  const reply = call({ id: "g", action: "describe_game", moves: ["D10-G10"], from });
  if (reply.error && reply.field === "from") counts.errors += 1;
}

console.log(JSON.stringify(counts));
console.log("fields that differ, by position:", JSON.stringify(byField));
console.log(`time a game: describe_game ${(time.game / counts.games).toFixed(1)} ms, describe for each position ${(time.describe / counts.games).toFixed(1)} ms`);
console.log(`reply a game: describe_game ${(sizes.game / counts.games / 1000).toFixed(0)} KB, describe for each position ${(sizes.describe / counts.games / 1000).toFixed(0)} KB`);
