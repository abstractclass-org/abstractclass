// The Analysis board's tree by link and from a record (Hedge School's design 21, item 7; design 33). The link is the
// shared one (@abstractclass/analysis/boardLink.ts), with Blueprints' moves (share.ts): `/analysis#packed=…&at=…`. A
// set-up start goes in the link's tags as `Position`, in the position's notation (position.ts), as a record carries it.
// A komi goes in the link's tags as `Komi` (Hedge School's design 24), and the board analyzes at it (design 33, "The
// komi"), up to the komi that a record can give (MAX_RECORD_KOMI).
import * as shared from "@abstractclass/analysis/boardLink.ts";
import { boardOfLine, keptKomiProblem as sharedKeptKomiProblem, type KeptBoard } from "@abstractclass/analysis/kept.ts";
import { setUpStart } from "./position.ts";
import { MAX_RECORD_KOMI, type GameRecord } from "./record.ts";
import { BLUEPRINTS_CODE } from "./share.ts";

/** A board of a record's line: a node for each of its positions. The record's reader keeps the line only, so its
 *  variations stay behind. The record's `Position` tag is the board's start (Hedge School's design 21, item 9), and its
 *  `Komi` tag the board's komi (Hedge School's design 24). */
export const boardOfRecord = (record: GameRecord): KeptBoard =>
  boardOfLine(record.moves, setUpStart(record.tags.Position), record.komi);

/** Why the board kept here cannot open at its komi, or null: a komi beyond the one that a record can give
 *  (MAX_RECORD_KOMI), kept from a link before the link's check, as on Hedge School. */
export const keptKomiProblem = (board: KeptBoard | null): string | null => sharedKeptKomiProblem(board, MAX_RECORD_KOMI);

/** The link to a board: its tree, and the position on screen as its place on the main line (`at`, 0 at the start).
 *  `via` names the site's own page that made the link (an analysis file), for the board's notice when it fails. */
export const boardLink = (origin: string, board: KeptBoard, at: number, via?: string): string =>
  shared.boardLink(origin, board, at, BLUEPRINTS_CODE, via);

/** A board from a link's `packed` and `at`. Throws an Error that says what is wrong with the link, also for a komi
 *  beyond the one that a record can give (MAX_RECORD_KOMI). */
export const readBoardLink = (packed: string, at: string | null): { board: KeptBoard; at: number } =>
  shared.readBoardLink(packed, at, BLUEPRINTS_CODE, setUpStart, MAX_RECORD_KOMI);
