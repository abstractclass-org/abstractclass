// The Analysis board's tree by link (Hedge School's design 21, item 7; design 33). The link is the shared one
// (@abstractclass/analysis/boardLink.ts), with Blueprints' moves (share.ts): `/analysis#packed=…&at=…`. Blueprints has
// no set-up start yet (design 33, "Decision", item 10), so a link or a file that names one cannot open. Nor can a link
// or a file whose board has a komi (Hedge School's design 24): the board starts its analysis at komi 0 before it
// chooses its board.
import * as shared from "@abstractclass/analysis/boardLink.ts";
import type { KeptBoard } from "@abstractclass/analysis/kept.ts";
import { BLUEPRINTS_CODE } from "./share.ts";
import { SITE_NAME } from "../site.ts";

/** Refuses a set-up start in a link's `Position` tag or a file's `start`, which Blueprints has no notation for yet:
 *  throws an Error that says so. Answers null, the standard start, for none. */
export function refuseSetUpStart(position: string | undefined): null {
  if (position) throw new Error(`it starts from a set-up position, which ${SITE_NAME} cannot open yet`);
  return null;
}

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
  const read = shared.readBoardLink(packed, at, BLUEPRINTS_CODE, refuseSetUpStart);
  refuseKomi(read.board.komi);
  return read;
}
