// An earlier engine's results, and an earlier network file's, removed when no stored game needs them (design 20). The
// browser keeps each result with the engine's search and the network file that found it
// (@abstractclass/analysis/cache.ts). The site's engine reads its own results only. An earlier engine's are read by the
// review snapshot of a game whose last review used it, and by nothing else.
import lock from "../../../engine.lock.json" with { type: "json" };
import { BUDGETS, MAP_PREFIX, READ_SHAPES, SWEEP_VISITS, earlierRemoval, isAnalysisKey, readAnalysisKey, readable, searchHolding,
         snapshotExcept, snapshotPositions } from "@abstractclass/analysis/cache.ts";
import { STORES, dbReadThenDelete } from "@abstractclass/storage/db.ts";
import { moduleOf, type Manifest } from "@abstractclass/engine/client.ts";
import { positionKeys, shippedModels } from "./reviewFile.ts";
import { parentKey } from "@abstractclass/analysis/tree.ts";
import { readGames, reviewAgainWhy, reviewMark, type KeptBranches, type ReviewMark, type StoredGame } from "./store.ts";

/** Removes the stored results that no game needs (unneededResults), in one transaction with the read of the games, their
 *  variations and the results' keys. The layout calls it at the site's start when the removal is due (cache.ts,
 *  earlierRemovalDue). `files` are the site's engine files (the build's ENGINE_FILES), which the browser's mark keeps
 *  after the removal. */
export const removeEarlierResults = (files: string) => earlierRemoval(files, () =>
  dbReadThenDelete(STORES.analysis, [STORES.games, STORES.branches], (keys, read) =>
    unneededResults(keys, keptGames(read[STORES.games], read[STORES.branches]), lock as unknown as Manifest)));

/** The stored games as the removal reads them. */
function keptGames(games: [string, unknown][], branches: [string, unknown][]): KeptGame[] {
  const branchesOf = new Map(branches);
  return readGames(games.map(([, game]) => game as StoredGame)).map(({ game, record }) =>
    ({ moves: record.moves, branches: (branchesOf.get(game.id) as KeptBranches | undefined) ?? null, mark: game.reviewed }));
}

/** A stored game as the removal reads it: its moves, its variations, and the mark of its last review. */
export interface KeptGame { moves: string[]; branches: KeptBranches | null; mark?: ReviewMark }

/** The stored results that nothing reads, among `keys` (in the store's order): of a shape that the readers read
 *  (readable), neither of the site's search with a network file it ships nor read by a stored game's review snapshot. A
 *  review snapshot reads the results of one search and network file, for the game's positions and those one move from them
 *  (the review file's, design 13), each at the deepest that it reads (readsAt). It reads the maps added to those
 *  positions too, whatever the depth of their results. For a threat that it reads, it reads the result of the position
 *  before the pass at the threat's visits (design 31). `engine` is the site's (engine.lock.json). None without its CPU
 *  module's search: every result of the site's own engine would then count as an earlier engine's. */
export function unneededResults(keys: string[], games: KeptGame[], engine: Manifest): string[] {
  const site = moduleOf(engine)?.search;
  if (!site) return [];
  // The site's own results, and the maps added to them (cache.ts, MAP_PREFIX)
  const own = [...shippedModels(engine)!].flatMap(model => READ_SHAPES.flatMap(shape =>
    [`${shape}|${site}|${model}|`, `${MAP_PREFIX}${shape}|${site}|${model}|`]));
  // The earlier results, each key read back here once (the site's own are known by their start), and by their
  // position's moves: each game's choice of a search reads the keys of its own positions alone.
  const earlier = keys.map(key => {
    if (own.some(start => key.startsWith(start)) || !isAnalysisKey(key)) return null;
    const k = readAnalysisKey(key);
    return readable(k.shape) ? k : null;
  });
  const atMoves = new Map<string, number[]>();
  earlier.forEach((k, i) => { if (k) (atMoves.get(k.moves) ?? atMoves.set(k.moves, []).get(k.moves)!).push(i); });
  // The positions that the review snapshots read, by the search and the network file of their results, each with the review
  // depths of the games that read it.
  const snapshotReads = new Map<string, Map<string, Set<number>>>();
  for (const { moves, branches, mark } of games) {
    if (!mark) continue;
    // A review snapshot opens where the site would review the game again (review/+page.svelte, openSnapshot).
    const why = reviewAgainWhy(mark, reviewMark(engine, mark.network, mark.visits));
    if (!why) continue;
    const line = snapshotPositions(moves);
    const ofLine = line.flatMap(m => atMoves.get(m.join(" ")) ?? []).sort((a, b) => a - b).map(i => keys[i]);
    const held = searchHolding(ofLine, mark.model, line, mark.visits, snapshotExcept(why, site), mark.search);
    if (held === undefined) continue;
    const at = `${held}|${mark.model}`, positions = snapshotReads.get(at) ?? new Map<string, Set<number>>();
    for (const p of positionKeys(moves, branches)) positions.set(p, (positions.get(p) ?? new Set()).add(mark.visits));
    snapshotReads.set(at, positions);
  }
  // The review depths that read a stored key's position (search, network file and moves): a review snapshot reads the
  // position, or the position before it.
  const depthsAt = ({ search, model, moves }: { search: string; model: string; moves: string }) => {
    const positions = snapshotReads.get(`${search}|${model}`);
    return positions ? [...(positions.get(moves) ?? []), ...((moves && positions.get(parentKey(moves))) || [])] : [];
  };
  // The results that a review snapshot reads, by their position and the review depths that read them, and the deepest visits
  // that each depth reads at each position. An added map is not one of them: it stays while a review snapshot reads its
  // position, whatever the depth of the results there (analysis.svelte.ts, freeze).
  const read = earlier.map(k => k && !k.map
    ? depthsAt(k).filter(d => readsAt(d, k.visits)).map(d => `${k.search}|${k.model}|${k.moves}|${d}`) : []);
  const deepest = new Map<string, number>();
  read.forEach((at, i) => at.forEach(p => deepest.set(p, Math.max(earlier[i]!.visits, deepest.get(p) ?? 0))));
  const kept = (i: number) => read[i].some(p => deepest.get(p) === earlier[i]!.visits);
  // A threat that a review snapshot reads, the result after a pass (design 31): its size compares it with the result of the
  // position before the pass at the same visits, which stays too, though the position has a deeper one.
  const sizes = new Set(earlier.flatMap((k, i) => k && k.moves.split(" ").at(-1) === "pass" && kept(i)
    ? [`${k.search}|${k.model}|${parentKey(k.moves)}|${k.visits}`] : []));
  return keys.filter((_, i) => {
    const k = earlier[i];
    return !!k && !(k.map ? depthsAt(k).length : kept(i) || sizes.has(`${k.search}|${k.model}|${k.moves}|${k.visits}`));
  });
}

/** Whether a review snapshot of a review at `depth` visits reads a result of `visits`
 *  (@abstractclass/analysis/analysis.svelte.ts, fromStore): at the review's depth or a budget, as cacheGetAtLeast reads
 *  the review's depth and each budget deeper, and the sweep's or a budget where those lack it. Of these, it shows the
 *  deepest: a result at another depth is never read. */
const readsAt = (depth: number, visits: number) =>
  visits === depth || visits === SWEEP_VISITS || BUDGETS.includes(visits);
