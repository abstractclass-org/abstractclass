// Every position of a game from the engine's rules (describe, which works before a network loads), and the edge each
// move cuts: an edge of the opponent's that is there before the move and gone after it.
import type { EngineWorker } from "./client.ts";
import type { DescribeReply } from "./protocol.ts";

export async function describeGame(engine: EngineWorker, moves: string[]): Promise<{ positions: DescribeReply[]; cuts: (string | null)[] }> {
  // All at once: the worker runs them back to back, with no round trip between them.
  const positions = (await Promise.all(Array.from({ length: moves.length + 1 }, (_, i) =>
    engine.describe({ moves: moves.slice(0, i) })))).map(t => t.reply);
  const cuts = moves.map((_, i) => {
    const opponent = positions[i].mover === "b" ? "r" : "b";
    const after = new Set(positions[i + 1].edges[opponent]);
    return positions[i].edges[opponent].find(e => !after.has(e)) ?? null;
  });
  return { positions, cuts };
}
