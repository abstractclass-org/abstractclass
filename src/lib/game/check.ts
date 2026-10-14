// Checks a game's moves with the engine's rules before the game is kept: the engine module in a worker, without a
// network (describe works before one loads). Finds which moves cut an opponent's edge, so that the record carries the
// cut mark (record.ts), and refuses a mark on a move that cuts nothing. Problems count edges from 1 as the record does.
import { EngineError, EngineWorker, loadManifest, moduleOf } from "#lib/engine/client.ts";
import { setUpStart } from "#lib/engine/notation.ts";
import { errorText } from "#lib/errors.ts";
import { positionQuery, type DescribeReply, type GamePosition } from "#lib/engine/protocol.ts";
import type { GameRecord } from "./record.ts";

export interface Checked {
  problem: string | null; // what is wrong, or null when the game is legal
  cuts: boolean[] | null; // by move: it cuts an opponent's edge (null when the site has no engine)
}

export async function checkMoves(record: GameRecord): Promise<Checked> {
  const { moves, marked } = record;
  const start = setUpStart(record.tags.Position) ?? null; // a set-up start, on the Analysis board only (import.ts)
  const manifest = await loadManifest();
  const module = manifest && moduleOf(manifest);
  if (!module) return { problem: null, cuts: null }; // no engine on this site: the review will check
  const engine = new EngineWorker();
  let positions: GamePosition[];
  try {
    await engine.init(manifest);
    if (start) {
      const problem = positionProblem((await engine.describe({ position: start, moves: [] })).reply);
      if (problem) return { problem, cuts: null };
    }
    positions = (await engine.describeGame(positionQuery(start, moves))).reply.positions;
  } catch (e) {
    // The engine names an illegal move in the moves field: "move 12: why".
    const m = e instanceof EngineError && e.field === "moves" ? /^move (\d+)/.exec(e.error) : null;
    if (!m) return { problem: `The engine refused the game: ${errorText(e)}`, cuts: null };
    const i = Number(m[1]);
    return { problem: `Edge ${i + 1} (${moves[i]}) is not legal in its position. Check the record from there.`, cuts: null };
  } finally {
    engine.terminate();
  }
  const cuts = positions.slice(1).map(p => p.cuts !== null);
  const wrong = marked.findIndex((m, i) => m && !cuts[i]);
  if (wrong >= 0)
    return { problem: `Edge ${wrong + 1} (${moves[wrong]}x) is marked as a cut, but it cuts nothing.`, cuts };
  return { problem: null, cuts };
}

/** Why a position could not occur in a game, in the engine's words (protocol 0.5's check), or null when it could. */
function positionProblem(d: DescribeReply): string | null {
  if (!d.check || d.check.possible) return null;
  return `This position cannot occur in a game: ${d.check.reasons.map(r => r.text.replace(/\.$/, "")).join("; ")}.`;
}

/** Whether a set-up position could occur in a game (protocol 0.5's check, design 21): what is wrong, or null. A
 *  position whose form the engine refuses gets that refusal. Null when the site has no engine. */
export async function checkPosition(position: string): Promise<string | null> {
  const manifest = await loadManifest();
  if (!manifest || !moduleOf(manifest)) return null;
  const engine = new EngineWorker();
  try {
    await engine.init(manifest);
    return positionProblem((await engine.describe({ position, moves: [] })).reply);
  } catch (e) {
    return `The position cannot be read: ${errorText(e)}`;
  } finally {
    engine.terminate();
  }
}
