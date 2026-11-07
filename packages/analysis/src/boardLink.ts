// The Analysis board's tree by link (Hedge School's design 21, item 7). A link packs the tree as a review's shared link
// does (share.ts): every node a line from the start, with its "evaluated" bit, so that the main line's evaluated moves
// keep theirs. The main line is the first line from the start, as the board keeps it (GameAnalysis.reindex). A set-up
// start goes in the link's tags as `Position`, as a record carries it. Each site packs its own moves (MoveCode).
import { keyMoves } from "./cache.ts";
import type { KeptBoard } from "./kept.ts";
import { decodeShare, encodeShare, type MoveCode } from "./share.ts";

const NO_ENGINE = "00000000"; // a board's link names no engine: the recipient's browser searches what it shows

/** The keys of a board's positions in the browser's store (cache.ts): the start, then every node's line. */
export function boardPositionKeys(board: KeptBoard): Set<string> {
  const lines = ["", ...board.nodes.map(n => n[0])];
  return new Set(lines.map(l => keyMoves(board.start ?? null, l ? l.split(" ") : []).join(" ")));
}

/** The link to a board: its tree, and the position on screen as its place on the main line (`at`, 0 at the start).
 *  `via` names the site's own page that made the link (an analysis file), for the board's notice when the link fails
 *  and for a site's analytics (Hedge School's design 17). */
export function boardLink(origin: string, board: KeptBoard, at: number, code: MoveCode, via?: string): string {
  const packed = encodeShare({ module: NO_ENGINE, model: NO_ENGINE, visits: 1, tags: board.start ? { Position: board.start } : {},
                               moves: [], branches: board.nodes }, code);
  return `${origin}/analysis#packed=${packed}${at ? `&at=${at}` : ""}${via ? `&via=${via}` : ""}`;
}

/** A board from a link's `packed` and `at`. `start` reads the link's `Position` tag as the board's set-up start: none
 *  for the standard start. Throws an Error that says what is wrong with the link. */
export function readBoardLink(packed: string, at: string | null, code: MoveCode,
                              start: (position: string | undefined) => string | null | undefined): { board: KeptBoard; at: number } {
  const s = decodeShare(packed, code), from = start(s.tags.Position);
  return { board: { version: 2, main: [], nodes: s.branches, ...(from ? { start: from } : {}) }, at: Math.max(0, Math.floor(Number(at)) || 0) };
}
