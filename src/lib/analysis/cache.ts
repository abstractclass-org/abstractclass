// Analyses kept in the browser (storage/db.ts), so that a review opened again needs no search. The engine is
// reproducible (the same request and build give the same reply), so a stored result equals a fresh one. The key names
// the engine build, the network's SHA-256, the position (its moves) and the visits. Results stay in memory too, so the
// cache works when storage does not.
import { STORES, dbGet, dbPut } from "#lib/storage/db.ts";

const memory = new Map<string, unknown>();

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  if (memory.has(key)) return memory.get(key) as T;
  return dbGet<T>(STORES.analysis, key);
}

export async function cachePut(key: string, value: unknown): Promise<void> {
  memory.set(key, value);
  await dbPut(STORES.analysis, key, value);
}

export const analysisKey = (build: string, model: string, moves: string[], visits: number) =>
  `${build}|${model}|${visits}|${moves.join(" ")}`;
