// The Analysis board's tree by link (Hedge School's design 21, item 7). A link packs the tree as a review's shared link
// does (share.ts): every node a line from the start, with its "evaluated" bit, so that the main line's evaluated moves
// keep theirs. The main line is the first line from the start, as the board keeps it (GameAnalysis.reindex). A set-up
// start goes in the link's tags as `Position`, and a komi as `Komi` (Hedge School's design 24), as a record carries
// them. Each site packs its own moves (MoveCode).
import { komiLimitProblem, komiOf, startTags } from "@abstractclass/record/record.ts";
import { positionKeys, type KeptBoard } from "./kept.ts";
import { decodeShare, encodeShare, type MoveCode } from "./share.ts";

const NO_ENGINE = "00000000"; // a board's link names no engine: the recipient's browser searches what it shows

/** The keys of a board's positions in the browser's store (cache.ts): the start, then every node's line, from the
 *  board's start, at its komi (kept.ts, positionKeys). */
export const boardPositionKeys = (board: KeptBoard): Set<string> =>
  positionKeys([], board, board.komi, board.start);

/** The link to a board: its tree, and the position on screen as its place on the main line (`at`, 0 at the start).
 *  `via` names the site's own page that made the link (an analysis file), for the board's notice when the link fails
 *  and for a site's analytics (Hedge School's design 17). */
export function boardLink(origin: string, board: KeptBoard, at: number, code: MoveCode, via?: string): string {
  const tags = startTags(board.start, board.komi);
  const packed = encodeShare({ module: NO_ENGINE, model: NO_ENGINE, visits: 1, tags, moves: [], branches: board.nodes }, code);
  return `${origin}/analysis#packed=${packed}${at ? `&at=${at}` : ""}${via ? `&via=${via}` : ""}`;
}

/** The place on the main line that a link's `at` gives (a link's record or a shared board's): after that many moves.
 *  A link with no `at`, or with one below 1 or not a number, opens at the start (Hedge School's design 21, item 5).
 *  The board opens a place past the main line's end at its end. */
export const linkAt = (at: string | null): number => Math.max(0, Math.floor(Number(at)) || 0);

/** A board from a link's `packed` and `at`. `start` reads the link's `Position` tag as the board's set-up start: none
 *  for the standard start. The `Komi` tag is the board's komi: none for 0. `maxKomi` is the game's komi limit, either
 *  way (its record's `MAX_RECORD_KOMI`, its engine's cap): beyond it, the analysis module searches with no error, but
 *  its numbers mean nothing (Hedge School's design 24). Throws an Error that says what is wrong with the link. */
export function readBoardLink(packed: string, at: string | null, code: MoveCode,
                              start: (position: string | undefined) => string | null | undefined,
                              maxKomi: number): { board: KeptBoard; at: number } {
  const s = decodeShare(packed, code), from = start(s.tags.Position), komi = komiOf(s.tags.Komi);
  if (komi === null) throw new Error(`the link's komi is not a number of points, whole or half: ${s.tags.Komi}`);
  const beyond = komiLimitProblem(komi, maxKomi, s.tags.Komi ?? komi);
  if (beyond) throw new Error(beyond);
  return { board: { version: 2, main: [], nodes: s.branches, ...(from ? { start: from } : {}), ...(komi ? { komi } : {}) },
           at: linkAt(at) };
}
