// The strategyjam.org games of the tests (src/lib/game/strategyjam.test.ts), in src/lib/mock/strategyjam-games.json.
// Synthetic games, not players' games: strategyjam.org's own rules module (/g/enclosure/model-*.js, as the engine
// repository's game watch saves it) plays both seats, and the engine repository's platforms/strategyjam/
// synthetic_games.mjs chooses each move (variedRecord: a prime step through the legal list). The game with passes
// plays a timeout pass at two plies, with the same rule for the other moves. Each game keeps its moves, and the scores
// and the result that the rules module gives after the last move.
//
//   node scripts/strategyjam-games.mjs [the engine repository: ../../../engines]
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const engines = resolve(process.argv[2] ?? "../../../engines");
const from = (path) => import(pathToFileURL(resolve(engines, path)).href);
const { variedRecord } = await from("platforms/strategyjam/synthetic_games.mjs");
const { newRecord, rebuild, toMove } = await from("platforms/strategyjam/framework.mjs");
const { loadGame } = await from("platforms/strategyjam/loader.mjs");
const { game, file } = await loadGame("enclosure", { root: resolve(engines, "runs/strategyjam") });

/** variedRecord's game, with a timeout pass at each ply of `passes`. */
function withPasses(passes) {
  const record = newRecord(game);
  for (let i = 0, state = record.initial, turn; !(turn = toMove(game, state)).result; i++) {
    const { moves } = turn;
    record.moves.push(passes.includes(i) ? "pass" : moves[(i * 7919) % moves.length]);
    state = game.play(state, record.moves.at(-1));
  }
  return record;
}

/** The record's moves, and the scores and the result after them. */
function outcome(record) {
  const end = game.observe(rebuild(game, record), 0);
  return { history: record.moves, scores: end.scores, result: end.result };
}

// Ply 6 is Second's second edge in its second turn: the pass ends that turn. Ply 7 opens First's turn: the pass ends
// the turn, and forfeits both its edges.
const games = { rules: { id: game.id, version: game.version, module: file.replace(/^.*[\\/]g[\\/]/, "/g/").replaceAll("\\", "/") },
                whole: outcome(variedRecord(game, 120)), passes: { at: [6, 7], ...outcome(withPasses([6, 7])) } };
writeFileSync(new URL("../src/lib/mock/strategyjam-games.json", import.meta.url), JSON.stringify(games) + "\n");
console.log(`${games.rules.module}: ${games.whole.history.length} and ${games.passes.history.length} moves`);
