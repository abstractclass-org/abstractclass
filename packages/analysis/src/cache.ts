// Analyses kept in the browser (@abstractclass/storage/db.ts), so that a review opened again needs no search. The
// engine is reproducible (the same request and search give the same reply), so a stored result equals a fresh one. The
// key names the engine's search (request 17: the first build that searched as this one does, so that a release that
// keeps the search keeps the results), the network's SHA-256, the position (its moves) and the visits. Results stay in
// memory too, so the cache works when storage does not.
import { STORES, dbDeleteWhere, dbGetMany, dbKeys, dbPut } from "@abstractclass/storage/db.ts";
import { readLocal, writeLocal } from "@abstractclass/storage/local.ts";

const memory = new Map<string, unknown>(); // every result put or read in this visit
const absent = new Set<string>(); // the keys read and not found in this visit: read again only after a put

export async function cachePut(key: string, value: unknown): Promise<void> {
  memory.set(key, value);
  absent.delete(key);
  await dbPut(STORES.analysis, key, value);
}

// The stored shape's version, which the site writes. A new shape only for a change of meaning, so that an older
// result is not misread, and the site's next start removes the ones that no reader reads (removeOlderShapes). Never
// for a field added: a reader checks whether an added field is there, as it must for the results stored before it.
// 2: a candidate's visits are KataGo's edgeVisits, no longer its child node's visits. 3: a candidate has its line
// (KataGo's pv). 4: and the visits through each edge of its line (pvEdgeVisits). 5: and the network's prior for it, for
// the position's complexity. A result of 5 can also have the ownership of each point, for the area map (Hedge School's
// design 30).
export const SHAPE = 5;
/** The shapes that the readers read, the oldest first: SHAPE, and 6, which development builds of the area map wrote
 *  before the rule above, for results of 5 with the ownership (Hedge School's design 30). A result of 6 is read as one
 *  of 5, kept, and never searched again or removed. A file holds it as one of 5 (atShape). */
export const READ_SHAPES = [SHAPE, 6];
/** Whether the readers read a result of this shape. */
export const readable = (shape: number) => READ_SHAPES.includes(shape);
/** Results as a file that this site writes holds them: each one that the readers read under its key of SHAPE, so that a
 *  reader of SHAPE alone, the site before the area map, reads them all (Hedge School's design 13 and 30). Of a result
 *  of 6 and one of 5 as deep, the one of 6, which has the ownership. */
export function atShape(entries: [string, unknown][]): [string, unknown][] {
  const out = new Map<string, unknown>();
  const ofShape = ([key]: [string, unknown]) => readAnalysisKey(key).shape === SHAPE;
  for (const [key, value] of [...entries.filter(ofShape), ...entries.filter(e => !ofShape(e))])
    out.set(key.replace(/^\d+\|/, `${SHAPE}|`), value);
  return [...out];
}

/** The moves part of a key for moves from `start`, a set-up position (design 21): the start first, as one word with `_`
 *  for its spaces after `@`, so that a key's position and its parent read as they do from the standard start. */
export const keyMoves = (start: string | null, moves: string[]) => (start ? [`@${start.replaceAll(" ", "_")}`, ...moves] : moves);
export const analysisKey = (search: string, model: string, moves: string[], visits: number, shape = SHAPE) =>
  `${shape}|${search}|${model}|${visits}|${moves.join(" ")}`;
/** A stored analysis's key read back: the shape, the search, the network's SHA-256, the visits and the position's
 *  moves, and whether it is an added map's (mapKey). A result kept before request 17 names its build there: the first
 *  build of a search is the search's name. */
export function readAnalysisKey(key: string) {
  const map = key.startsWith(MAP_PREFIX);
  const [shape, search, model, visits, ...rest] = (map ? key.slice(MAP_PREFIX.length) : key).split("|");
  return { shape: Number(shape), search, model, visits: Number(visits), moves: rest.join("|"), map };
}
/** Whether a text has the form of a stored analysis's key, a result's or an added map's: a file's results are checked
 *  by it. */
export const isAnalysisKey = (key: string) => /^(map\|)?\d+\|[^|]*\|[0-9a-f]+\|\d+\|/.test(key);
/** Whether a stored key is a result that no reader reads: of an older shape, or of the form before the shape (the
 *  build, the network, the visits and the moves). A newer shape's result is not: a tab of a later release wrote it, or
 *  the area map's first builds (READ_SHAPES). */
export const isOlderShape = (key: string) => !isAnalysisKey(key) || readAnalysisKey(key).shape < SHAPE;
/** Whether the removal of older shapes is due: the browser's mark (the shape it last removed the older ones for) is
 *  older than SHAPE, absent, or not a number. */
export function removalDue(mark: string | null): boolean {
  const shape = Number(mark);
  return Number.isNaN(shape) || shape < SHAPE;
}
const REMOVED = "learn-enclosure:analysis-shape:1"; // the browser's mark

/** Removes the stored results of older shapes (isOlderShape), at the site's first start after a change of SHAPE: a
 *  start with the same shape reads the mark alone. The results of the shapes that the readers read stay, of every
 *  engine and network: a snapshot reads an earlier engine's (design 20). The mark follows the removal, so a removal
 *  that fails runs again at the next start. */
export async function removeOlderShapes(): Promise<void> {
  if (!removalDue(readLocal(REMOVED))) return;
  if (await dbDeleteWhere(STORES.analysis, isOlderShape)) writeLocal(REMOVED, String(SHAPE));
}

// The removal of an earlier engine's results, and of an earlier network file's, that no stored game needs any more
// (Hedge School's src/lib/game/earlierResults.ts, design 20). The browser's mark keeps the site's engine files (the
// build's ENGINE_FILES) that the last removal ran for. A release that changes them, and a change of what the games
// need, make it due: a start with nothing changed reads the mark alone.
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

/** The sweep's budget: the review's first pass over every position, for the game's shape (analysis.svelte.ts). */
export const SWEEP_VISITS = 32;
export const LABEL_VISITS = 256; // the least visits that give an edge a label (the review's depths: settings.ts)
export const DEEP_VISITS = 1024; // the position on screen by default
// The budgets the site's searches ask for (settings.ts: the depths, the review's depths and the label pass), from
// shallow to deep. And twice each review depth, to 32,768: older reviews searched some positions that deep, and a
// review takes those results as it takes any deeper result (cacheGetAtLeast).
export const BUDGETS = [256, 512, 768, 1024, 1536, 2048, 3072, 4096, 8192, 16384, 32768];

/** The deepest stored result for a position at `visits` or deeper: a deeper search answers a shallower question, as the
 *  review takes a deeper result it holds. So a review opened again keeps what the player searched deeper where they
 *  looked (the position on screen, design 09), as it had it before the page closed, and a review imported from another
 *  browser, searched to another depth, opens without searching again (Hedge School's src/lib/game/reviewFile.ts). Of
 *  every shape that the readers read (READ_SHAPES): of two results as deep, the newer shape's. */
export function cacheGetAtLeast<T>(search: string, model: string, moves: string[], visits: number): Promise<T | undefined> {
  return lastStored<T>(depthKeys(search, model, moves, visits));
}
/** The stored result for a position at exactly `visits`, of the newer shape where both are stored: a comparison of two
 *  searches as deep reads it, where a deeper result would mix depths (the threat's size, Hedge School's design 31). */
export function cacheGetAt<T>(search: string, model: string, moves: string[], visits: number): Promise<T | undefined> {
  return lastStored<T>(shapeKeys(search, model, moves, visits));
}
/** The last of these keys that the store has, read into memory first. */
async function lastStored<T>(keys: string[]): Promise<T | undefined> {
  await readStored(keys);
  const key = [...keys].reverse().find(k => memory.has(k));
  return key === undefined ? undefined : (memory.get(key) as T);
}
/** The keys of a position's results at `visits`, in the shapes that the readers read, the oldest first. */
const shapeKeys = (search: string, model: string, moves: string[], visits: number) =>
  READ_SHAPES.map(s => analysisKey(search, model, moves, visits, s));
/** The keys of a position's results at `visits` and every budget deeper, each depth's in the shapes that the readers
 *  read, the oldest first. */
const depthKeys = (search: string, model: string, moves: string[], visits: number) =>
  [visits, ...BUDGETS.filter(v => v > visits)].flatMap(v => shapeKeys(search, model, moves, v));
/** Reads the keys not read yet in this visit into memory, in one transaction, and notes the ones not stored. */
async function readStored(keys: string[]) {
  const unread = keys.filter(k => !memory.has(k) && !absent.has(k));
  (await dbGetMany(STORES.analysis, unread)).forEach((value, i) => {
    if (value !== undefined) memory.set(unread[i], value);
    else absent.add(unread[i]);
  });
}

// The maps added to a stored review (Hedge School's design 30). When the site starts to use a kind of data that a
// stored result lacks, the result gets it added on demand, beside it: the result itself is never replaced, searched
// again or removed. A map is a position's ownership from a short search of the position alone (MAP_VISITS), for a
// result without one, or for the position after a candidate, as the candidate's map. It is kept in the
// analysis store under its position's result's key for that search, with MAP_PREFIX before it: so a review file takes
// it with the results of its positions, and the removals treat it as they treat the results of its search. A reader
// before the maps (the site before the area map) never takes it as a result: its key does not start with a shape, so
// that reader's isAnalysisKey refuses it, in a file and in the store. A snapshot never takes it as a search
// (searchHolding).
export const MAP_PREFIX = "map|";
/** The visits of a map's short search. A full search's candidate on the board rests on few visits (a median of 17 on
 *  the test fixture's game), and short searches of 16 to 128 visits of the position after it differ least from the
 *  full search's own map of the candidate, less than one of 512 visits does (decisions/product.md, "A candidate's map
 *  from a short search"). */
export const MAP_VISITS = 32;
/** The slices of the map pass's searches, in visits: the pool can stop a search only between two slices. */
export const MAP_SLICE = 8;
/** An added map: the ownership, in hundredths from Blue's side, and its source. */
export interface AddedMap { ownership: number[]; visits: number; source: "short search" }
/** The key of a position's added map. */
export const mapKey = (search: string, model: string, moves: string[]) => MAP_PREFIX + analysisKey(search, model, moves, MAP_VISITS);
/** Keeps a position's added map. */
export const mapPut = (search: string, model: string, moves: string[], map: AddedMap) => cachePut(mapKey(search, model, moves), map);
/** A position's added map. */
export async function mapGet(search: string, model: string, moves: string[]): Promise<AddedMap | undefined> {
  const key = mapKey(search, model, moves);
  await readStored([key]);
  return memory.get(key) as AddedMap | undefined;
}

/** The engine search of an earlier review, for its snapshot (design 20): a search whose results with the network
 *  `model` hold each of `positions` (their moves) at `visits` or deeper. `search` is the one that the review's mark
 *  names: the snapshot reads its results' keys alone, at `visits` and every budget deeper, into memory, where the
 *  review then finds them. An older mark names none (Hedge School's src/lib/game/store.ts, ReviewMark): the snapshot
 *  then reads every stored key, and takes a search that holds them all. `except` is a search not to take: the site's
 *  own, when the snapshot is of an earlier engine. The store is read while it comes (the rules worker's start).
 *  Undefined when no search holds them all. */
export async function snapshotSearch(search: string | undefined, model: string, positions: string[][], visits: number,
                                     except?: Promise<string | undefined>): Promise<string | undefined> {
  const stored = search === undefined ? dbKeys(STORES.analysis).then(k => k.map(String))
    : warmCache(search, model, positions, visits);
  const [keys, not] = await Promise.all([stored, except]);
  return searchHolding(keys, model, positions, visits, not, search);
}

/** The search that a snapshot leaves out: the site's own (`site`) for an earlier engine's review ("engine"), and none
 *  for an earlier file of the network ("network"), whose search can be the site's. */
export const snapshotExcept = (why: "engine" | "network", site: string | null | undefined) =>
  (why === "engine" ? site ?? undefined : undefined);

/** The positions whose results a snapshot needs, by their moves: each one of the game's line after the start, which
 *  every game shares, up to the last before its last move. */
export const snapshotPositions = (moves: string[]) => Array.from({ length: Math.max(0, moves.length - 1) }, (_, i) => moves.slice(0, i + 1));

/** snapshotSearch's choice among `keys`. `search`, when given, is the only search to take: the mark's. */
export function searchHolding(keys: string[], model: string, positions: string[][], visits: number, except?: string,
                              search?: string): string | undefined {
  const wanted = new Set(positions.map(m => m.join(" ")));
  const found = new Map<string, Set<string>>();
  for (const key of keys) {
    const k = readAnalysisKey(key);
    if (!readable(k.shape) || k.model !== model || k.search === except || (search !== undefined && k.search !== search) ||
        k.map || k.visits < visits || !wanted.has(k.moves)) continue;
    found.set(k.search, (found.get(k.search) ?? new Set()).add(k.moves));
  }
  return wanted.size ? [...found].find(([, held]) => held.size === wanted.size)?.[0] : undefined;
}

/** Reads the stored results of these positions into memory, at `least` visits and every depth above, and notes the
 *  ones not stored. Answers the keys of the results found. The review starts it with the engine, so that its reads
 *  after the rules find everything in memory, and its first frame waits for neither more than for the other. */
export async function warmCache(search: string, model: string, positions: string[][], least: number): Promise<string[]> {
  const keys = positions.flatMap(moves => depthKeys(search, model, moves, least));
  await readStored(keys);
  return keys.filter(k => memory.has(k));
}

