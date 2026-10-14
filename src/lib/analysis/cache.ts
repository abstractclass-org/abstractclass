// Analyses kept in the browser (storage/db.ts), so that a review opened again needs no search. The engine is
// reproducible (the same request and search give the same reply), so a stored result equals a fresh one. The key names
// the engine's search (request 17: the first build that searched as this one does, so that a release that keeps the
// search keeps the results), the network's SHA-256, the position (its moves) and the visits. Results stay in memory too, so the
// cache works when storage does not.
import { STORES, dbGetMany, dbKeys, dbPut } from "#lib/storage/db.ts";

const memory = new Map<string, unknown>(); // every result put or read in this visit
const absent = new Set<string>(); // the keys read and not found in this visit: read again only after a put

export async function cachePut(key: string, value: unknown): Promise<void> {
  memory.set(key, value);
  absent.delete(key);
  await dbPut(STORES.analysis, key, value);
}

// The stored shape's version. A change of what an analysis holds takes the next one, so that older results are not
// read as the new shape. 2: a candidate's visits are KataGo's edgeVisits, no longer its child node's visits. 3: a
// candidate has its line (KataGo's pv). 4: and the visits through each edge of its line (pvEdgeVisits). 5: and the
// network's prior for it, for the position's complexity.
export const SHAPE = 5;

/** The moves part of a key for moves from `start`, a set-up position (design 21): the start first, as one word with `_`
 *  for its spaces after `@`, so that a key's position and its parent read as they do from the standard start. */
export const keyMoves = (start: string | null, moves: string[]) => (start ? [`@${start.replaceAll(" ", "_")}`, ...moves] : moves);
export const analysisKey = (search: string, model: string, moves: string[], visits: number) =>
  `${SHAPE}|${search}|${model}|${visits}|${moves.join(" ")}`;
/** A stored analysis's key read back: the shape, the search, the network's SHA-256, the visits and the position's
 *  moves. A result kept before request 17 names its build there: the first build of a search is the search's name. */
export function readAnalysisKey(key: string) {
  const [shape, search, model, visits, ...rest] = key.split("|");
  return { shape: Number(shape), search, model, visits: Number(visits), moves: rest.join("|") };
}

// The budgets the site's searches ask for (engineSettings.ts: the depths, the review's depths and the label pass), from
// shallow to deep.
const BUDGETS = [256, 512, 768, 1024, 1536, 2048, 3072, 4096, 8192, 16384];

/** The deepest stored result for a position at `visits` or deeper: a deeper search answers a shallower question, as the
 *  review takes a deeper result it holds. So a review opened again keeps what the player searched deeper where they
 *  looked (the position on screen, design 09), as it had it before the page closed, and a review imported from another
 *  browser, searched to another depth, opens without searching again (game/reviewFile.ts). */
export async function cacheGetAtLeast<T>(search: string, model: string, moves: string[], visits: number): Promise<T | undefined> {
  const keys = [visits, ...BUDGETS.filter(v => v > visits)].map(v => analysisKey(search, model, moves, v));
  const unread = keys.filter(k => !memory.has(k) && !absent.has(k));
  (await dbGetMany(STORES.analysis, unread)).forEach((value, i) => {
    if (value !== undefined) memory.set(unread[i], value);
    else absent.add(unread[i]);
  });
  const key = [...keys].reverse().find(k => memory.has(k));
  return key === undefined ? undefined : (memory.get(key) as T);
}

/** The engine search of an earlier review, for its snapshot (design 20): a search whose results with the network
 *  `model` hold each of `positions` (their moves) at `visits` or deeper. `except` is a search not to take: the site's
 *  own, when the snapshot is of an earlier engine. Undefined when no search holds them all. Reads the stored keys
 *  alone. */
export async function snapshotSearch(model: string, positions: string[][], visits: number, except?: string): Promise<string | undefined> {
  return searchHolding((await dbKeys(STORES.analysis)).map(String), model, positions, visits, except);
}

/** snapshotSearch's choice among `keys`. */
export function searchHolding(keys: string[], model: string, positions: string[][], visits: number, except?: string): string | undefined {
  const wanted = new Set(positions.map(m => m.join(" ")));
  const found = new Map<string, Set<string>>();
  for (const key of keys) {
    const k = readAnalysisKey(key);
    if (k.shape !== SHAPE || k.model !== model || k.search === except || k.visits < visits || !wanted.has(k.moves)) continue;
    found.set(k.search, (found.get(k.search) ?? new Set()).add(k.moves));
  }
  return wanted.size ? [...found].find(([, held]) => held.size === wanted.size)?.[0] : undefined;
}

/** Reads the stored results of these positions into memory, at `least` visits and every depth above, and notes the
 *  ones not stored. The review starts it with the engine, so that its reads after the rules find everything in memory,
 *  and its first frame waits for neither more than for the other. */
export async function warmCache(search: string, model: string, positions: string[][], least: number): Promise<void> {
  await Promise.all(positions.map(moves => cacheGetAtLeast(search, model, moves, least)));
}

