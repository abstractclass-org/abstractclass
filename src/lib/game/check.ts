// Checks a game's moves with the engine's rules before the game is kept: the engine module in a worker, without a
// network (describe works before one loads). Returns null when every move is legal, else what is wrong, counting edges
// from 1 as the record does.
import { EngineWorker, type Manifest } from "#lib/engine/client.ts";

export async function checkMoves(moves: string[]): Promise<string | null> {
  const response = await fetch("/engine/manifest.json");
  if (!response.ok) return null; // no engine on this site: the review will check
  const manifest: Manifest = await response.json();
  const module = manifest.artifacts.find(a => a.kind === "module");
  if (!module) return null;
  const engine = new EngineWorker();
  try {
    await engine.init(module.url);
    await engine.describe({ moves });
    return null;
  } catch (e) {
    const text = String(e).replace(/^Error: /, "");
    const m = /move (\d+)/.exec(text);
    if (!m) return `The engine refused the game: ${text}`;
    const i = Number(m[1]);
    return `Edge ${i + 1} (${moves[i]}) is not legal in its position. Check the record from there.`;
  } finally {
    engine.terminate();
  }
}
