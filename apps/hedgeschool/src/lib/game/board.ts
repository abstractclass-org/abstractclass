// The Analysis board's tree by link and from a record (design 21). The link is the shared one
// (@abstractclass/analysis/boardLink.ts): it packs the tree as a review's shared link does (share.ts), with Enclosure's
// moves. A set-up start goes in the link's tags as `Position`, as a record carries it.
import { edgeName, parseEdge, setUpStart } from "#lib/engine/notation.ts";
import * as shared from "@abstractclass/analysis/boardLink.ts";
import { boardOfLine } from "@abstractclass/analysis/kept.ts";
import { ENCLOSURE_CODE } from "./share.ts";
import type { GameRecord } from "./record.ts";
import type { KeptBoard } from "./store.ts";
export { boardPositionKeys } from "@abstractclass/analysis/boardLink.ts";

/** A move as the board's tree names it (the notation's spelling, notation.ts). */
const treeName = (m: string) => (m === "pass" ? m : edgeName(parseEdge(m)));

/** A board of a record's line: a node for each of its positions, as a link packs every node with its parent. The
 *  record's reader keeps the line only, so its variations stay behind. The record's `Position` tag is the board's
 *  start (design 21). */
export function boardOfRecord(record: GameRecord): KeptBoard {
  return boardOfLine(record.moves.map(treeName), setUpStart(record.tags.Position));
}

/** The link to a board: its tree, and the position on screen as its place on the main line (`at`, 0 at the start).
 *  `via` names the import's source when this site's own page made the link (an analysis file), for the analytics only
 *  (design 17). */
export const boardLink = (origin: string, board: KeptBoard, at: number, via?: string): string =>
  shared.boardLink(origin, board, at, ENCLOSURE_CODE, via);

/** A board from a link's `packed` and `at`. Throws an Error that says what is wrong with the link. */
export const readBoardLink = (code: string, at: string | null): { board: KeptBoard; at: number } =>
  shared.readBoardLink(code, at, ENCLOSURE_CODE, setUpStart);
