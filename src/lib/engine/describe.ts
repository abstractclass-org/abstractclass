// Every position of a game from the engine's rules (describe, which works before a network loads), and the edge each
// move cuts: an edge of the opponent's that is there before the move and gone after it.
import type { EngineWorker } from "./client.ts";
import type { DescribeReply } from "./protocol.ts";

/** The positions from move `from` on (the position before `moves[from]` first), and the edge each of those moves cuts.
 *  `start` is the position the moves start from, in the notation: the standard start when null. */
export async function describeGame(engine: EngineWorker, moves: string[], from = 0, start: string | null = null): Promise<{ positions: DescribeReply[]; cuts: (string | null)[] }> {
  // All at once: the worker runs them back to back, with no round trip between them.
  const positions = (await Promise.all(Array.from({ length: moves.length - from + 1 }, (_, k) =>
    engine.describe({ ...(start ? { position: start } : {}), moves: moves.slice(0, from + k) })))).map(t => t.reply);
  const cuts = positions.slice(0, -1).map((before, k) => {
    const opponent = before.mover === "b" ? "r" : "b";
    const after = new Set(positions[k + 1].edges[opponent]);
    return before.edges[opponent].find(e => !after.has(e)) ?? null;
  });
  return { positions, cuts };
}
