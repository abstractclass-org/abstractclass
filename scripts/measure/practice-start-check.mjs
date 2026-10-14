// Request 20's check: the practice bot (interface 0.1.1) from set-up starts. For starts taken from the meaf.us archive's
// games (the position after a number of edges, at a turn's first edge and at its second) and from the board editor's
// kind of position (edges set out with no game behind them), it checks that:
//   - the bot takes a start exactly when the analysis module's position check finds that a game reaches it, and
//     refuses the others with `? ...`;
//   - each move that the bot plays from the start, for both sides, is legal by the analysis module's describe;
//   - `undo` goes back to the start and stops there, and the bot plays from the start again after it;
//   - at a finished game's end, the bot takes the start and refuses genmove.
// It reads the engine from static/engine (`npm run engine` first), runs the one-thread bot, and prints counts only:
// the archive holds other players' games.
//
//   node scripts/measure/practice-start-check.mjs ../enclosure/runs/archive/games.jsonl [games] [edges]
import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { meafRecord } from "../../src/lib/game/meaf.ts";
import { parseRecord } from "../../src/lib/game/record.ts";
import { variantProblem } from "../../src/lib/game/import.ts";
import { positionQuery } from "../../src/lib/engine/protocol.ts";
import { nodeEngine } from "../node-engine.mjs";

const [file, limitArg, edgesArg] = process.argv.slice(2);
if (!file) throw new Error("usage: node scripts/measure/practice-start-check.mjs GAMES.jsonl [games] [edges]");
const limit = Number(limitArg ?? 40), EDGES = Number(edgesArg ?? 8), VISITS = 16;

const { manifest, call } = await nodeEngine(".");
const kind = k => manifest.artifacts.find(a => a.kind === k);
const network = manifest.artifacts.find(a => a.kind === "model" && a.id.startsWith("b10c128"));
const lib = await import(pathToFileURL(join("static", kind("practice-library").url)).href);
const bot = await lib.createPracticeBot(await WebAssembly.compile(readFileSync(join("static", kind("practice-module").url))));
bot.setModel(readFileSync(join("static", network.url)));
const send = line => bot.command(line).trim();
const ok = line => {
  const r = send(line);
  if (!r.startsWith("=")) throw new Error(`${line.slice(0, 40)}: ${r}`);
  return r.slice(1).trim();
};
ok("enclosure-start 1");
const info = JSON.parse(ok("enclosure-bot-info"));
console.log(`practice module ${kind("practice-module").id}: interface ${info.interface ?? "?"}, build ${info.build}`);
ok(`kata-set-param maxVisits ${VISITS}`);

const describe = (start, moves) => call({ id: "d", action: "describe", ...positionQuery(start, moves) });
const counts = { starts: 0, secondEdge: 0, editor: 0, taken: 0, refused: 0, verdictDiffs: 0, refusalNotGtp: 0, moves: 0, illegal: 0,
                 undos: 0, undoPastStart: 0, againIllegal: 0, finished: 0, finishedGenmoveRefused: 0 };
const problems = [];

/** One start: the bot's verdict against the check's, then a short game from it, its undos, and a move again. */
function tryStart(start, label) {
  counts.starts += 1;
  const d = describe(start, []);
  const reachable = !d.error && d.check?.possible !== false;
  const reply = send(`enclosure-set-position ${start}`);
  const taken = reply.startsWith("=");
  if (taken !== reachable) { counts.verdictDiffs += 1; problems.push(`${label}: bot ${taken ? "took" : "refused"} a start the check finds ${reachable ? "reachable" : "unreachable"}`); }
  if (!taken) {
    counts.refused += 1;
    if (!reply.startsWith("?")) counts.refusalNotGtp += 1;
    return;
  }
  counts.taken += 1;
  if (d.outcome !== null) {
    counts.finished += 1;
    if (send(`genmove ${d.mover === "b" ? "b" : "w"}`).startsWith("?")) counts.finishedGenmoveRefused += 1;
    return;
  }
  const moves = [];
  for (let p = d; moves.length < EDGES && p.outcome === null; ) {
    const move = ok(`genmove ${p.mover === "b" ? "b" : "w"}`);
    moves.push(move);
    counts.moves += 1;
    p = describe(start, moves);
    if (p.error) { counts.illegal += 1; problems.push(`${label}: move ${moves.length} (${move}) is illegal: ${p.error}`); return; }
  }
  for (let k = 0; k < moves.length; k++) { ok("undo"); counts.undos += 1; }
  if (send("undo").startsWith("=")) { counts.undoPastStart += 1; problems.push(`${label}: undo went past the start`); }
  const again = ok(`genmove ${d.mover === "b" ? "b" : "w"}`);
  if (describe(start, [again]).error) { counts.againIllegal += 1; problems.push(`${label}: the move after the undos (${again}) is illegal from the start`); }
}

let games = 0;
const seen = new Set();
for await (const line of createInterface({ input: createReadStream(file) })) {
  if (games >= limit) break;
  if (!line) continue;
  const g = JSON.parse(line);
  if (seen.has(g.gameID)) continue;
  seen.add(g.gameID);
  let moves;
  try {
    const record = parseRecord(meafRecord(g));
    moves = variantProblem(record) ? [] : record.moves;
  } catch { moves = []; }
  if (moves.length < 20) continue;
  games += 1;
  // A start at a turn's first edge (an odd edge count) and one at its second (an even count), at a place that moves
  // through the game from game to game.
  const at = 1 + 2 * ((games * 7) % Math.floor((moves.length - 2) / 2));
  for (const k of [at, at + 1]) {
    const p = describe(null, moves.slice(0, k));
    if (p.error) continue;
    const [, , mover, , count] = p.position.split(" "); // the position's own fields: the mover with its edges left
    if (/^[br]1$/.test(mover) && Number(count) % 2 === 0) counts.secondEdge += 1;
    tryStart(p.position, `game ${games}, after ${k} edges`);
  }
  // The board editor's kind: the same edges with no game behind them, at the first turn's count, which no game reaches
  // with this many edges, and the finished game's end.
  const mid = describe(null, moves.slice(0, at)), fields = mid.position.split(" ");
  counts.editor += 1;
  tryStart([...fields.slice(0, 2), "b1", "0/0", "0"].join(" "), `game ${games}, its edges at edge count 0`);
  if (games % 5 === 0) tryStart(describe(null, moves).position, `game ${games}, its end`);
}

console.log(`${games} games: ${JSON.stringify(counts)}`);
for (const p of problems.slice(0, 20)) console.log(`  ${p}`);
process.exit(problems.length ? 1 : 0);
