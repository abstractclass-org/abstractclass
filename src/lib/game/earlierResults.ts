// An earlier engine's results, and an earlier network file's, removed when no stored game needs them (design 20). The
// browser keeps each result with the engine's search and the network file that found it (analysis/cache.ts). The
// site's engine reads its own results only. An earlier engine's are read by the snapshot of a game whose last review
// used it, and by nothing else.
import lock from "../../../engine.lock.json" with { type: "json" };
import { SHAPE, beginEarlierRemoval, endEarlierRemoval, isAnalysisKey, readAnalysisKey, searchHolding,
         snapshotPositions } from "#lib/analysis/cache.ts";
import { STORES, dbReadThenDelete } from "#lib/storage/db.ts";
import { moduleOf, type Manifest } from "#lib/engine/client.ts";
import { parseRecord } from "./record.ts";
import { atPositions, positionKeys, shippedModels } from "./reviewFile.ts";
import { reviewAgainWhy, reviewMark, unlessUndo, type KeptBranches, type ReviewMark, type StoredGame } from "./store.ts";

/** Removes the stored results that no game needs (unneededResults), in one transaction with the read of the games, their
 *  branches and the results' keys. The layout calls it at the site's start when the removal is due (cache.ts,
 *  earlierRemovalDue). `files` are the site's engine files (the build's ENGINE_FILES), which the browser's mark keeps
 *  after the removal. While a page shows a deleted game's Undo, nothing is removed: a later start removes them. */
export async function removeEarlierResults(files: string): Promise<void> {
  const done = await unlessUndo(() => {
    beginEarlierRemoval(files);
    return dbReadThenDelete(STORES.analysis, [STORES.games, STORES.branches], (keys, read) =>
      unneededResults(keys, keptGames(read[STORES.games], read[STORES.branches]), lock as unknown as Manifest));
  });
  if (done) endEarlierRemoval(files);
}

/** The stored games as the removal reads them. A game whose record does not read is left out: it cannot open
 *  (listGames). */
function keptGames(games: [string, unknown][] = [], branches: [string, unknown][] = []): KeptGame[] {
  const branchesOf = new Map(branches);
  return games.flatMap(([id, value]) => {
    const game = value as StoredGame;
    try {
      return [{ moves: parseRecord(game.record).moves, branches: (branchesOf.get(id) as KeptBranches | undefined) ?? null, mark: game.reviewed }];
    } catch {
      return [];
    }
  });
}

/** A stored game as the removal reads it: its moves, its branches, and the mark of its last review. */
export interface KeptGame { moves: string[]; branches: KeptBranches | null; mark?: ReviewMark }

/** The stored results that nothing reads, among `keys` (in the store's order): of the store's shape, neither of the
 *  site's search with a network file it ships nor read by a stored game's snapshot. A snapshot reads the results of
 *  one search and network file, for the game's positions and those one move from them (the review file's, design
 *  13), each at its deepest. `engine` is the site's (engine.lock.json). */
export function unneededResults(keys: string[], games: KeptGame[], engine: Manifest): string[] {
  const site = moduleOf(engine)?.search, models = shippedModels(engine)!;
  // The earlier results, each key read back once, and by their position's moves: each game's choice of a search reads
  // the keys of its own positions alone.
  const earlier = keys.map(key => {
    if (!isAnalysisKey(key)) return null;
    const k = readAnalysisKey(key);
    return k.shape === SHAPE && !(k.search === site && models.has(k.model)) ? k : null;
  });
  const atMoves = new Map<string, number[]>();
  earlier.forEach((k, i) => {
    if (!k) return;
    const at = atMoves.get(k.moves);
    if (at) at.push(i);
    else atMoves.set(k.moves, [i]);
  });
  // The positions that the snapshots read, by the search and the network file of their results.
  const snapshotReads = new Map<string, Set<string>>();
  for (const { moves, branches, mark } of games) {
    // A snapshot opens where the site would review the game again (review/+page.svelte, openSnapshot).
    const why = mark ? reviewAgainWhy(mark, reviewMark(engine, mark.network, mark.visits)) : null;
    if (!mark || !why) continue;
    const line = snapshotPositions(moves);
    const own = line.flatMap(m => atMoves.get(m.join(" ")) ?? []).sort((a, b) => a - b).map(i => keys[i]);
    const held = searchHolding(own, mark.model, line, mark.visits, why === "engine" ? site : undefined);
    if (held === undefined) continue;
    const at = `${held}|${mark.model}`, positions = snapshotReads.get(at) ?? new Set();
    for (const p of positionKeys(moves, branches)) positions.add(p);
    snapshotReads.set(at, positions);
  }
  // The results that a snapshot reads, and the deepest visits of each of their positions.
  const position = (k: { search: string; model: string; moves: string }) => `${k.search}|${k.model}|${k.moves}`;
  const read = earlier.map(k => (k && atPositions(k.moves, snapshotReads.get(`${k.search}|${k.model}`) ?? new Set()) ? k : null));
  const deepest = new Map<string, number>();
  for (const k of read) if (k) deepest.set(position(k), Math.max(k.visits, deepest.get(position(k)) ?? 0));
  return keys.filter((_, i) => {
    const k = read[i];
    return !!earlier[i] && !(k && k.visits === deepest.get(position(k)));
  });
}
