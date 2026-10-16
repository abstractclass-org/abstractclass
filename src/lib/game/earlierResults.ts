// An earlier engine's results, and an earlier network file's, removed when no stored game needs them (design 20). The
// browser keeps each result with the engine's search and the network file that found it (analysis/cache.ts). The
// site's engine reads its own results only. An earlier engine's are read by the snapshot of a game whose last review
// used it, and by nothing else.
import lock from "../../../engine.lock.json" with { type: "json" };
import { SHAPE, earlierRemoval, isAnalysisKey, readAnalysisKey, searchHolding, snapshotExcept,
         snapshotPositions } from "#lib/analysis/cache.ts";
import { STORES, dbReadThenDelete } from "#lib/storage/db.ts";
import { moduleOf, type Manifest } from "#lib/engine/client.ts";
import { atPositions, positionKeys, shippedModels } from "./reviewFile.ts";
import { readGames, reviewAgainWhy, reviewMark, unlessUndo, type KeptBranches, type ReviewMark, type StoredGame } from "./store.ts";

/** Removes the stored results that no game needs (unneededResults), in one transaction with the read of the games, their
 *  branches and the results' keys. The layout calls it at the site's start when the removal is due (cache.ts,
 *  earlierRemovalDue). `files` are the site's engine files (the build's ENGINE_FILES), which the browser's mark keeps
 *  after the removal. While a deleted game can be undone, nothing is removed: a later start removes them. */
export const removeEarlierResults = (files: string) => unlessUndo(() => earlierRemoval(files, () =>
  dbReadThenDelete(STORES.analysis, [STORES.games, STORES.branches], (keys, read) =>
    unneededResults(keys, keptGames(read[STORES.games], read[STORES.branches]), lock as unknown as Manifest))));

/** The stored games as the removal reads them. */
function keptGames(games: [string, unknown][], branches: [string, unknown][]): KeptGame[] {
  const branchesOf = new Map(branches);
  return readGames(games.map(([, game]) => game as StoredGame)).map(({ game, record }) =>
    ({ moves: record.moves, branches: (branchesOf.get(game.id) as KeptBranches | undefined) ?? null, mark: game.reviewed }));
}

/** A stored game as the removal reads it: its moves, its branches, and the mark of its last review. */
export interface KeptGame { moves: string[]; branches: KeptBranches | null; mark?: ReviewMark }

/** The stored results that nothing reads, among `keys` (in the store's order): of the store's shape, neither of the
 *  site's search with a network file it ships nor read by a stored game's snapshot. A snapshot reads the results of
 *  one search and network file, for the game's positions and those one move from them (the review file's, design
 *  13), each at its deepest. `engine` is the site's (engine.lock.json). None without its CPU module's search: every
 *  result of the site's own engine would then count as an earlier engine's. */
export function unneededResults(keys: string[], games: KeptGame[], engine: Manifest): string[] {
  const site = moduleOf(engine)?.search;
  if (!site) return [];
  const own = [...shippedModels(engine)!].map(model => `${SHAPE}|${site}|${model}|`);
  // The earlier results, each key read back here once (the site's own are known by their start), and by their
  // position's moves: each game's choice of a search reads the keys of its own positions alone.
  const earlier = keys.map(key => {
    if (own.some(start => key.startsWith(start)) || !isAnalysisKey(key)) return null;
    const k = readAnalysisKey(key);
    return k.shape === SHAPE ? k : null;
  });
  const atMoves = new Map<string, number[]>();
  earlier.forEach((k, i) => { if (k) (atMoves.get(k.moves) ?? atMoves.set(k.moves, []).get(k.moves)!).push(i); });
  // The positions that the snapshots read, by the search and the network file of their results.
  const snapshotReads = new Map<string, Set<string>>();
  for (const { moves, branches, mark } of games) {
    if (!mark) continue;
    // A snapshot opens where the site would review the game again (review/+page.svelte, openSnapshot).
    const why = reviewAgainWhy(mark, reviewMark(engine, mark.network, mark.visits));
    if (!why) continue;
    const line = snapshotPositions(moves);
    const ofLine = line.flatMap(m => atMoves.get(m.join(" ")) ?? []).sort((a, b) => a - b).map(i => keys[i]);
    const held = searchHolding(ofLine, mark.model, line, mark.visits, snapshotExcept(why, site));
    if (held === undefined) continue;
    const at = `${held}|${mark.model}`, positions = snapshotReads.get(at) ?? new Set();
    for (const p of positionKeys(moves, branches)) positions.add(p);
    snapshotReads.set(at, positions);
  }
  // The results that a snapshot reads, by their position (search, network file and moves), and the deepest visits
  // stored for each position.
  const read = earlier.map(k => {
    const positions = k && snapshotReads.get(`${k.search}|${k.model}`);
    return positions && atPositions(k.moves, positions) ? `${k.search}|${k.model}|${k.moves}` : null;
  });
  const deepest = new Map<string, number>();
  read.forEach((p, i) => { if (p) deepest.set(p, Math.max(earlier[i]!.visits, deepest.get(p) ?? 0)); });
  return keys.filter((_, i) => !!earlier[i] && !(read[i] && earlier[i]!.visits === deepest.get(read[i]!)));
}
