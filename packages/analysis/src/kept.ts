// The tree of a game's analysis as the browser keeps it (analysis.svelte.ts): a game's branches under the game's id,
// and the Analysis board's tree under BOARD_ID, both in the branches' store (@abstractclass/storage/db.ts). A site's
// store of games re-exports these (Hedge School's src/lib/game/store.ts).
import { pathKey } from "./tree.ts";

/** A game's branches as kept in the browser (analysis.svelte.ts): each node's path key (its moves, as the review's
 *  tree names them), its order, and 1 when its move was evaluated. Version 1 kept the lines. */
export type KeptBranches = { version: 1; lines: string[][] } | { version: 2; nodes: KeptNode[] };
export type KeptNode = [string, number] | [string, number, 1];
/** A kept node: its path key, its order among its parent's branches, and the mark of a move evaluated on request. */
export const keptNode = (key: string, order: number, judged?: unknown): KeptNode => (judged ? [key, order, 1] : [key, order]);
/** The Analysis board as kept in the browser (design 21): every node of its tree, the main line's too, and the main
 *  line. One board in each browser, under BOARD_ID in the branches' store. */
export interface KeptBoard { version: 2; nodes: KeptNode[]; main: string[]; start?: string } // start: a set-up position (design 21)
export const BOARD_ID = "board";

/** The kept branches as version 2's nodes: a version 1 line is the node at its end, in the lines' order. */
export const branchNodes = (b: KeptBranches | null): KeptNode[] =>
  !b ? [] : b.version === 2 ? b.nodes : b.lines.map((l, i): KeptNode => [pathKey(l), i]);
