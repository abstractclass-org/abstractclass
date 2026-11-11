// The tree of a game's analysis as the browser keeps it (analysis.svelte.ts): a game's variations under the game's id,
// and the Analysis board's tree under BOARD_ID, both in the `branches` store (@abstractclass/storage/db.ts). A site's
// store of games re-exports these (Hedge School's src/lib/game/store.ts).
import { komiLimitProblem } from "@abstractclass/record/record.ts";
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
  // The board's own network, by its id: an analysis file's, then the one chosen in the engine settings (Hedge School's
  // design 21). None: the browser's. A board brought another way (New, the Import, a link) has none.
  network?: string;
}
export const BOARD_ID = "board";
/** A board of one line, its moves by the tree's names: a node for each of its positions, as a link packs every node
 *  with its parent, from the start or from a set-up start (design 21), at a komi. */
export const boardOfLine = (main: string[], start?: string, komi = 0): KeptBoard =>
  ({ version: 2, main, nodes: prefixKeys(main).slice(1).map((k): KeptNode => [k, 0]), ...(start ? { start } : {}),
     ...(komi ? { komi } : {}) });
/** A board's lines, without its own network: what an analysis file holds (files.ts), which names the network apart. */
export const boardLines = ({ network: _, ...lines }: KeptBoard): Omit<KeptBoard, "network"> => lines;
/** The board kept here as it opens: its own network gives way to the browser's once the site no longer ships it
 *  (`ships`), as a game's own settings do (settings.ts, ownSettingsOf). */
export const keptShipped = (board: KeptBoard | null, ships: (network: string) => boolean): KeptBoard | null =>
  (board?.network && !ships(board.network) ? boardLines(board) : board);

/** Why the board kept here cannot open at its komi, or null: a komi beyond the game's limit `maxKomi`, either way (its
 *  record's `MAX_RECORD_KOMI`, its engine's cap). Each game's analysis module searches beyond the cap with no error,
 *  but its numbers there mean nothing (Hedge School's design 24). A link kept a board before the link's check of the
 *  limit (boardLink.ts, readBoardLink). The record's words name the komi as the board's: "its komi must be from -5,052
 *  to 5,052 points: 6000". */
export const keptKomiProblem = (board: KeptBoard | null, maxKomi: number): string | null =>
  board?.komi ? komiLimitProblem(board.komi, maxKomi, board.komi, "its komi") : null;

/** The Analysis board's notice of the board kept here that cannot open, from its `problem` (keptKomiProblem, or a
 *  site's own check), ended by one period. A new board opens in its place, and the notice says so. Where a board
 *  brought replaces it (`replaced`: a link, an analysis file, New or the Import), that board is on screen, and the
 *  notice does not name a new board. */
export const keptBoardNotice = (problem: string, replaced: boolean): string =>
  `The Analysis board cannot open your own analysis: ${problem.replace(/\.?$/, ".")}` +
  (replaced ? "" : " A new board is here instead.");

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
