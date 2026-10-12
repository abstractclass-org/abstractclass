// Checks a game's moves with the engine's rules before the game is kept: the engine module in a worker, without a
// network (describe works before one loads). Finds which moves cut an opponent's edge, so that the record carries the
// cut mark (record.ts), and refuses a mark on a move that cuts nothing. Problems count edges from 1 as the record does.
import { EngineError, EngineWorker, loadManifest, moduleOf } from "#lib/engine/client.ts";
import { describeGame } from "#lib/engine/describe.ts";
import { errorText } from "#lib/errors.ts";
import type { GameRecord } from "./record.ts";

export interface Checked {
  problem: string | null; // what is wrong, or null when the game is legal
  cuts: boolean[] | null; // by move: it cuts an opponent's edge (null when the site has no engine)
}

export async function checkMoves(record: GameRecord): Promise<Checked> {
  const { moves, marked } = record;
  const manifest = await loadManifest();
  const module = manifest && moduleOf(manifest);
  if (!module) return { problem: null, cuts: null }; // no engine on this site: the review will check
  const engine = new EngineWorker();
  try {
    await engine.init(manifest);
    await engine.describe({ moves });
  } catch (e) {
    engine.terminate();
    // The engine names an illegal move in the moves field: "move 12: why".
    const m = e instanceof EngineError && e.field === "moves" ? /^move (\d+)/.exec(e.error) : null;
    if (!m) return { problem: `The engine refused the game: ${errorText(e)}`, cuts: null };
    const i = Number(m[1]);
    return { problem: `Edge ${i + 1} (${moves[i]}) is not legal in its position. Check the record from there.`, cuts: null };
  }
  try {
    const cuts = (await describeGame(engine, moves)).cuts.map(c => c !== null);
    const wrong = marked.findIndex((m, i) => m && !cuts[i]);
    if (wrong >= 0)
      return { problem: `Edge ${wrong + 1} (${moves[wrong]}x) is marked as a cut, but it cuts nothing.`, cuts };
    return { problem: null, cuts };
  } finally {
    engine.terminate();
  }
}
