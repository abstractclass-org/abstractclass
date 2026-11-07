// The tree of a game's analysis as the browser keeps it (analysis.svelte.ts): a game's variations under the game's id,
// and the Analysis board's tree under BOARD_ID, both in the `branches` store (@abstractclass/storage/db.ts). A site's
// store of games re-exports these (Hedge School's src/lib/game/store.ts).
import { keyMoves } from "./cache.ts";
import { pathKey, prefixKeys } from "./tree.ts";

/** A game's variations as kept in the browser (analysis.svelte.ts): each node's path key (its moves, as the review's
 *  tree names them), its order, and 1 when its move was evaluated. Version 1 kept the lines. */
export type KeptBranches = { version: 1; lines: string[][] } | { version: 2; nodes: KeptNode[] };
export type KeptNode = [string, number] | [string, number, 1];
/** A kept node: its path key, its order among its parent's variations, and the mark of a move evaluated on request. */
export const keptNode = (key: string, order: number, judged?: unknown): KeptNode => (judged ? [key, order, 1] : [key, order]);
/** The Analysis board as kept in the browser (design 21): every node of its tree, the main line's too, and the main
 *  line. One board in each browser, under BOARD_ID in the `branches` store. */
export interface KeptBoard {
  version: 2;
  nodes: KeptNode[];
  main: string[];
  start?: string; // a set-up position (design 21)
  komi?: number; // the komi, Red's starting score, of a record brought with one (Hedge School's design 24); none: 0
}
export const BOARD_ID = "board";
/** A board of one line, its moves by the tree's names: a node for each of its positions, as a link packs every node
 *  with its parent, from the start or from a set-up start (design 21), at a komi. */
export const boardOfLine = (main: string[], start?: string, komi = 0): KeptBoard =>
  ({ version: 2, main, nodes: prefixKeys(main).slice(1).map((k): KeptNode => [k, 0]), ...(start ? { start } : {}),
     ...(komi ? { komi } : {}) });

/** The kept variations as version 2's nodes: a version 1 line is the node at its end, in the lines' order. */
export const branchNodes = (b: KeptBranches | null): KeptNode[] =>
  !b ? [] : b.version === 2 ? b.nodes : b.lines.map((l, i): KeptNode => [pathKey(l), i]);

/** The moves part of the keys (cache.ts, keyMoves) of every position of a game and its variations, or of a board: the
 *  positions on the line of `moves`, and each kept node, by its path key. A key names the set-up `start` and the
 *  `komi` (Hedge School's design 24) before the moves, where there are. Version 1 kept a variation as its line: each
 *  node of it. */
export function positionKeys(moves: string[], branches: KeptBranches | null, komi = 0,
                             start: string | null = null): Set<string> {
  const paths = new Set(prefixKeys(moves));
  if (branches?.version === 1) for (const line of branches.lines) for (const k of prefixKeys(line)) paths.add(k);
  else for (const [key] of branchNodes(branches)) paths.add(key);
  // The start's word and the komi's (keyMoves), made once: none from the standard start at komi 0.
  const before = keyMoves(start, [], komi).join(" ");
  return before ? new Set([...paths].map(k => (k ? `${before} ${k}` : before))) : paths;
}

/** The variations kept for a game after an import (a review file, a shared review): the kept ones first, in their
 *  order, then the added ones that are new, after them in their own order. */
export function mergeBranches(kept: KeptBranches | null, added: KeptBranches | null): KeptBranches | null {
  const mine = branchNodes(kept), theirs = branchNodes(added);
  if (!mine.length && !theirs.length) return kept ?? added;
  const have = new Set(mine.map(n => n[0]));
  const next = Math.max(-1, ...mine.map(n => n[1])) + 1;
  const fresh = theirs.filter(n => !have.has(n[0])).sort((a, b) => a[1] - b[1])
    .map((n, i) => keptNode(n[0], next + i, n[2]));
  return { version: 2, nodes: [...mine, ...fresh] };
}
