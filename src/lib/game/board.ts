// The Analysis board's tree by link and from a record (design 21). A link packs the tree as a review's shared link
// does (share.ts): every node a line from the start, with its "evaluated" bit, so that the main line's evaluated moves
// keep theirs. The main line is the first line from the start, as the board keeps it (GameAnalysis.reindex). A set-up
// start goes in the link's tags as `Position`, as a record carries it.
import { edgeName, parseEdge, setUpStart } from "#lib/engine/notation.ts";
import { keyMoves } from "#lib/analysis/cache.ts";
import { decodeShare, encodeShare } from "./share.ts";
import type { GameRecord } from "./record.ts";
import type { KeptBoard } from "./store.ts";

const NO_ENGINE = "00000000"; // a board's link names no engine: the recipient's browser searches what it shows

/** A move as the board's tree names it (the notation's spelling, notation.ts). */
const treeName = (m: string) => (m === "pass" ? m : edgeName(parseEdge(m)));

/** A board of a record's line: a node for each of its positions, as a link packs every node with its parent. The
 *  record's reader keeps the line only, so its variations stay behind. The record's `Position` tag is the board's
 *  start (design 21). */
export function boardOfRecord(record: GameRecord): KeptBoard {
  const main = record.moves.map(treeName), start = setUpStart(record.tags.Position);
  return { version: 2, main, nodes: main.map((_, i) => [main.slice(0, i + 1).join(" "), 0]), ...(start ? { start } : {}) };
}

/** The keys of a board's positions in the browser's store (cache.ts): the start, then every node's line. */
export function boardPositionKeys(board: KeptBoard): Set<string> {
  const lines = ["", ...board.nodes.map(n => n[0])];
  return new Set(lines.map(l => keyMoves(board.start ?? null, l ? l.split(" ") : []).join(" ")));
}

/** The link to a board: its tree, and the position on screen as its place on the main line (`at`, 0 at the start).
 *  `via` names the import's source when this site's own page made the link (an analysis file), for the analytics only
 *  (design 17). */
export function boardLink(origin: string, board: KeptBoard, at: number, via?: string): string {
  const code = encodeShare({ module: NO_ENGINE, model: NO_ENGINE, visits: 1, tags: board.start ? { Position: board.start } : {},
                             moves: [], branches: board.nodes });
  return `${origin}/analysis#packed=${code}${at ? `&at=${at}` : ""}${via ? `&via=${via}` : ""}`;
}

/** A board from a link's `packed` and `at`. Throws an Error that says what is wrong with the link. */
export function readBoardLink(code: string, at: string | null): { board: KeptBoard; at: number } {
  const s = decodeShare(code), start = setUpStart(s.tags.Position);
  return { board: { version: 2, main: [], nodes: s.branches, ...(start ? { start } : {}) }, at: Math.max(0, Math.floor(Number(at)) || 0) };
}
