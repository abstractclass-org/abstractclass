// Checks a game's moves with the engine's rules before the game is kept: the engine module in a worker, without a
// network (describe works before one loads). Finds which moves cut an opponent's edge, so that the record carries the
// cut mark (record.ts), and refuses a mark on a move that cuts nothing. Problems count edges from 1 as the record does.
import { EngineWorker, type Manifest } from "#lib/engine/client.ts";
import type { GameRecord } from "./record.ts";

export interface Checked {
  problem: string | null; // what is wrong, or null when the game is legal
  cuts: boolean[] | null; // by move: it cuts an opponent's edge (null when the site has no engine)
}

export async function checkMoves(record: GameRecord): Promise<Checked> {
  const { moves, marked } = record;
  const response = await fetch("/engine/manifest.json");
  if (!response.ok) return { problem: null, cuts: null }; // no engine on this site: the review will check
  const manifest: Manifest = await response.json();
  const module = manifest.artifacts.find(a => a.kind === "module");
  if (!module) return { problem: null, cuts: null };
  const engine = new EngineWorker();
  try {
    await engine.init(module.url);
    await engine.describe({ moves });
  } catch (e) {
    engine.terminate();
    const text = String(e).replace(/^Error: /, "");
    const m = /move (\d+)/.exec(text);
    if (!m) return { problem: `The engine refused the game: ${text}`, cuts: null };
    const i = Number(m[1]);
    return { problem: `Edge ${i + 1} (${moves[i]}) is not legal in its position. Check the record from there.`, cuts: null };
  }
  try {
    // A move cuts when an edge of the opponent's, there before it, is gone after it. The worker runs the calls back to
    // back, with no round trip between them.
    const positions = (await Promise.all(Array.from({ length: moves.length + 1 }, (_, i) =>
      engine.describe({ moves: moves.slice(0, i) })))).map(t => t.reply);
    const cuts = moves.map((_, i) => {
      const opponent = positions[i].mover === "b" ? "r" : "b";
      const after = new Set(positions[i + 1].edges[opponent]);
      return positions[i].edges[opponent].some(e => !after.has(e));
    });
    const wrong = marked.findIndex((m, i) => m && !cuts[i]);
    if (wrong >= 0)
      return { problem: `Edge ${wrong + 1} (${moves[wrong]}x) is marked as a cut, but it cuts nothing.`, cuts };
    return { problem: null, cuts };
  } finally {
    engine.terminate();
  }
}
