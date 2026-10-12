// Analyses kept in the browser (storage/db.ts), so that a review opened again needs no search. The engine is
// reproducible (the same request and build give the same reply), so a stored result equals a fresh one. The key names
// the engine build, the network's SHA-256, the position (its moves) and the visits. Results stay in memory too, so the
// cache works when storage does not.
import { STORES, dbGetMany, dbPut } from "#lib/storage/db.ts";

const memory = new Map<string, unknown>(); // every result put or read in this visit

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

/** The deepest stored result for a position at `visits` or deeper: a deeper search answers a shallower question, as the
 *  review takes a deeper result it holds. So a review opened again keeps what the player searched deeper where they
 *  looked (the position on screen, design 09), as it had it before the page closed, and a review imported from another
 *  browser, searched to another depth, opens without searching again (game/reviewFile.ts). */
export async function cacheGetAtLeast<T>(build: string, model: string, moves: string[], visits: number): Promise<T | undefined> {
  const keys = [visits, ...BUDGETS.filter(v => v > visits)].map(v => analysisKey(build, model, moves, v));
  const unread = keys.filter(k => !memory.has(k));
  (await dbGetMany(STORES.analysis, unread)).forEach((value, i) => { if (value !== undefined) memory.set(unread[i], value); });
  const key = [...keys].reverse().find(k => memory.has(k));
  return key === undefined ? undefined : (memory.get(key) as T);
}
