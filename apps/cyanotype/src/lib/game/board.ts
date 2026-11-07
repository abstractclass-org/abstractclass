// The Analysis board's tree by link and from a record (Hedge School's design 21, item 7; design 33). The link is the
// shared one (@abstractclass/analysis/boardLink.ts), with Blueprints' moves (share.ts): `/analysis#packed=…&at=…`. A
// set-up start goes in the link's tags as `Position`, in the position's notation (position.ts), as a record carries it.
// A link or a file whose board has a komi (Hedge School's design 24) cannot open: the board starts its analysis at
// komi 0 before it chooses its board.
import * as shared from "@abstractclass/analysis/boardLink.ts";
import { boardOfLine, type KeptBoard } from "@abstractclass/analysis/kept.ts";
import { setUpStart } from "./position.ts";
import type { GameRecord } from "./record.ts";
import { BLUEPRINTS_CODE } from "./share.ts";

/** A board of a record's line: a node for each of its positions. The record's reader keeps the line only, so its
 *  variations stay behind. The record's `Position` tag is the board's start (Hedge School's design 21, item 9). */
export const boardOfRecord = (record: GameRecord): KeptBoard =>
  boardOfLine(record.moves, setUpStart(record.tags.Position), record.komi);

/** Refuses a board's komi (Hedge School's design 24): the board's analysis searches at komi 0, so it cannot open a
 *  board at another komi. Throws an Error that says so. */
export function refuseKomi(komi: number | undefined): void {
  if (komi) throw new Error("it has a komi. The Analysis board can analyze only at komi 0");
}

/** The link to a board: its tree, and the position on screen as its place on the main line (`at`, 0 at the start).
 *  `via` names the site's own page that made the link (an analysis file), for the board's notice when it fails. */
export const boardLink = (origin: string, board: KeptBoard, at: number, via?: string): string =>
  shared.boardLink(origin, board, at, BLUEPRINTS_CODE, via);

/** A board from a link's `packed` and `at`. Throws an Error that says what is wrong with the link. */
export function readBoardLink(packed: string, at: string | null): { board: KeptBoard; at: number } {
  const read = shared.readBoardLink(packed, at, BLUEPRINTS_CODE, setUpStart);
  refuseKomi(read.board.komi);
  return read;
}
