// Analyses kept in the browser (storage/db.ts), so that a review opened again needs no search. The engine is
// reproducible (the same request and search give the same reply), so a stored result equals a fresh one. The key names
// the engine's search (request 17: the first build that searched as this one does, so that a release that keeps the
// search keeps the results), the network's SHA-256, the position (its moves) and the visits. Results stay in memory too, so the
// cache works when storage does not.
import { STORES, dbDeleteWhere, dbGetMany, dbKeys, dbPut } from "#lib/storage/db.ts";
import { readLocal, writeLocal } from "#lib/storage/local.ts";

const memory = new Map<string, unknown>(); // every result put or read in this visit
const absent = new Set<string>(); // the keys read and not found in this visit: read again only after a put

export async function cachePut(key: string, value: unknown): Promise<void> {
  memory.set(key, value);
  absent.delete(key);
  await dbPut(STORES.analysis, key, value);
}

// The stored shape's version. A change of what an analysis holds takes the next one, so that older results are not
// read as the new shape, and the site's next start removes them (removeOlderShapes). 2: a candidate's visits are
// KataGo's edgeVisits, no longer its child node's visits. 3: a candidate has its line (KataGo's pv). 4: and the visits
// through each edge of its line (pvEdgeVisits). 5: and the network's prior for it, for the position's complexity.
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
/** Whether a text has a stored analysis's key's form: a file's results are checked by it. */
export const isAnalysisKey = (key: string) => /^\d+\|[^|]*\|[0-9a-f]+\|\d+\|/.test(key);
/** Whether a stored key is a result that no reader reads: of an older shape, or of the form before the shape (the build,
 *  the network, the visits and the moves). A newer shape's result is not: a tab of a later release wrote it. */
export const isOlderShape = (key: string) => !isAnalysisKey(key) || readAnalysisKey(key).shape < SHAPE;
/** Whether the removal of older shapes is due: the browser's mark (the shape it last removed the older ones for) is
 *  older than SHAPE, absent, or not a number. */
export function removalDue(mark: string | null): boolean {
  const shape = Number(mark);
  return Number.isNaN(shape) || shape < SHAPE;
}
const REMOVED = "learn-enclosure:analysis-shape:1"; // the browser's mark

/** Removes the stored results of older shapes (isOlderShape), at the site's first start after a change of SHAPE: a
 *  start with the same shape reads the mark alone. The results of this shape stay, of every engine and network: a
 *  snapshot reads an earlier engine's (design 20). The mark follows the removal, so a removal that fails runs again at
 *  the next start. */
export async function removeOlderShapes(): Promise<void> {
  if (!removalDue(readLocal(REMOVED))) return;
  if (await dbDeleteWhere(STORES.analysis, isOlderShape)) writeLocal(REMOVED, String(SHAPE));
}

// The removal of an earlier engine's results, and of an earlier network file's, that no stored game needs any more
// (game/earlierResults.ts, design 20). The browser's mark keeps the site's engine files (the build's ENGINE_FILES)
// that the last removal ran for. A release that changes them, and a change of what the games need, make it due: a
// start with nothing changed reads the mark alone.
const EARLIER = "learn-enclosure:earlier-results:1";
const removing = (files: string) => `removing ${files}`;
/** Whether the removal of earlier results is due for `files`, the site's engine files. */
export const earlierRemovalDue = (files: string) => readLocal(EARLIER) !== files;
/** Runs a removal for `files`: `work` answers whether it removed them. The mark says that a removal runs until it ends,
 *  so a removal that a closed page stops stays due. Then it keeps the removal's mark, unless the removal failed or
 *  what the games need changed while it ran. */
export async function earlierRemoval(files: string, work: () => Promise<boolean>) {
  writeLocal(EARLIER, removing(files));
  if ((await work()) && readLocal(EARLIER) === removing(files)) writeLocal(EARLIER, files);
}
/** What the stored games need changed (a game's mark, a game deleted, a file loaded): the next start removes the
 *  results that they no longer need. */
export const makeEarlierRemovalDue = () => writeLocal(EARLIER, null);

/** The results of `models` (the networks' SHA-256), or every result when null: the site keeps only the results of the
 *  networks it ships, since its engine never asks for another's. */
export const ofModels = (entries: [string, unknown][], models: Set<string> | null) =>
  entries.filter(([key]) => !models || models.has(readAnalysisKey(key).model));

// The budgets the site's searches ask for (engineSettings.ts: the depths, the review's depths and the label pass), from
// shallow to deep.
const BUDGETS = [256, 512, 768, 1024, 1536, 2048, 3072, 4096, 8192, 16384];

/** The deepest stored result for a position at `visits` or deeper: a deeper search answers a shallower question, as the
 *  review takes a deeper result it holds. So a review opened again keeps what the player searched deeper where they
 *  looked (the position on screen, design 09), as it had it before the page closed, and a review imported from another
 *  browser, searched to another depth, opens without searching again (game/reviewFile.ts). */
export async function cacheGetAtLeast<T>(search: string, model: string, moves: string[], visits: number): Promise<T | undefined> {
  const keys = depthKeys(search, model, moves, visits);
  await readStored(keys);
  const key = [...keys].reverse().find(k => memory.has(k));
  return key === undefined ? undefined : (memory.get(key) as T);
}
/** The keys of a position's results at `visits` and every budget deeper. */
const depthKeys = (search: string, model: string, moves: string[], visits: number) =>
  [visits, ...BUDGETS.filter(v => v > visits)].map(v => analysisKey(search, model, moves, v));
/** Reads the keys not read yet in this visit into memory, in one transaction, and notes the ones not stored. */
async function readStored(keys: string[]) {
  const unread = keys.filter(k => !memory.has(k) && !absent.has(k));
  (await dbGetMany(STORES.analysis, unread)).forEach((value, i) => {
    if (value !== undefined) memory.set(unread[i], value);
    else absent.add(unread[i]);
  });
}

/** The engine search of an earlier review, for its snapshot (design 20): a search whose results with the network
 *  `model` hold each of `positions` (their moves) at `visits` or deeper. `except` is a search not to take: the site's
 *  own, when the snapshot is of an earlier engine. The stored keys are read while it comes (the rules worker's start).
 *  Undefined when no search holds them all. Reads the stored keys alone. */
export async function snapshotSearch(model: string, positions: string[][], visits: number,
                                     except?: Promise<string | undefined>): Promise<string | undefined> {
  const [keys, not] = await Promise.all([dbKeys(STORES.analysis), except]);
  return searchHolding(keys.map(String), model, positions, visits, not);
}

/** The search that a snapshot leaves out: the site's own (`site`) for an earlier engine's review ("engine"), and none
 *  for an earlier file of the network ("network"), whose search can be the site's. */
export const snapshotExcept = (why: "engine" | "network", site: string | null | undefined) =>
  (why === "engine" ? site ?? undefined : undefined);

/** The positions whose results a snapshot needs, by their moves: each one of the game's line after the start, which
 *  every game shares, up to the last before its last move. */
export const snapshotPositions = (moves: string[]) => Array.from({ length: Math.max(0, moves.length - 1) }, (_, i) => moves.slice(0, i + 1));

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
  await readStored(positions.flatMap(moves => depthKeys(search, model, moves, least)));
}

