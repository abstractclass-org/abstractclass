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

// The stored shape's version. A change of what an analysis holds takes the next one, so that older results are not
// read as the new shape. 2: a candidate's visits are KataGo's edgeVisits, no longer its child node's visits. 3: a
// candidate has its line (KataGo's pv). 4: and the visits through each edge of its line (pvEdgeVisits). 5: and the
// network's prior for it, for the position's complexity.
export const SHAPE = 5;

export const analysisKey = (build: string, model: string, moves: string[], visits: number) =>
  `${SHAPE}|${build}|${model}|${visits}|${moves.join(" ")}`;
/** A stored analysis's key read back: the shape, the build, the network's SHA-256, the visits and the position's moves. */
export function readAnalysisKey(key: string) {
  const [shape, build, model, visits, ...rest] = key.split("|");
  return { shape: Number(shape), build, model, visits: Number(visits), moves: rest.join("|") };
}

// The budgets the site's searches ask for (engineSettings.ts: the depths, the review's depths and the label pass), from
// shallow to deep.
const BUDGETS = [256, 512, 768, 1024, 1536, 2048, 3072, 4096, 8192, 16384];

/** A stored result for a position at `visits`, or else the least deeper one stored: a deeper search answers a shallower
 *  question, as the review takes a deeper result it holds. So a review imported from another browser, searched to
 *  another depth, opens without searching again (game/reviewFile.ts). */
export async function cacheGetAtLeast<T>(build: string, model: string, moves: string[], visits: number): Promise<T | undefined> {
  const exact = await cacheGet<T>(analysisKey(build, model, moves, visits));
  if (exact) return exact;
  for (const v of BUDGETS) {
    if (v <= visits) continue;
    const deeper = await cacheGet<T>(analysisKey(build, model, moves, v));
    if (deeper) return deeper;
  }
  return undefined;
}
