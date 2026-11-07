// Blueprints' game record: Hedge School's form (docs/design/33-cyanotype.md, item 7), with Blueprints' moves and
// capture marks (notation.ts). The frame is the shared one (@abstractclass/record/record.ts): the tags, with Blue and
// Red for the players, the turns with their numbers (Blue's first turn has one move, then two a turn), the comments,
// the variations, the quality marks, `[%clk]` and `[%eval]`, and the result. `1. 2@-6,-2 2. 1:0,0>3:1,-1 2@5,-2x+24 *`.
// A record from a set-up start has the start in its `Position` tag, in the position's notation (position.ts), and
// numbers its turns from the start's moves played (design 33, item 10).
import * as shared from "@abstractclass/record/record.ts";
import { captureText, readMove, type Capture } from "./notation.ts";
import { setUpStart, startTurn } from "./position.ts";
export { gamePage, playerNames, RecordError, writeRecord, writeTags, type Eval } from "@abstractclass/record/record.ts";

/** A game record of Blueprints: `marked` gives, by move, the capture mark that the record gives it, or null. */
export type GameRecord = shared.GameRecord<Capture | null>;

/** Blueprints' moves and capture marks, and the turn of a set-up start, for the shared record. */
const moveNotation: shared.Notation<Capture | null> = {
  read: readMove, mark: captureText, none: null, start: tags => startTurn(tags.Position),
};

/** Reads a game record. Throws a RecordError with the offset of the first problem. */
export const parseRecord = (text: string): GameRecord => shared.readRecord(text, moveNotation);

/** A record's text with its start given apart (the Analysis board's Import, its address's `position`): the start as
 *  the record's own `Position` tag, unless the record has one. The standard start adds nothing. */
export const withStart = (text: string, position: string | null): string => shared.withStartTag(text, setUpStart(position));

/** Why the review cannot take a record, or null: a review is of a game played from the standard start, so a record
 *  from a set-up start opens on the Analysis board only (Hedge School's design 21, item 9). */
export function setUpProblem(record: GameRecord, site: string): string | null {
  return setUpStart(record.tags.Position)
    ? `This game starts from another position. ${site} reviews games from the standard start only: open it on the Analysis board.`
    : null;
}

/** Adds the capture mark to every move that has none yet. `captures` is by move, from the engine (check.ts). */
export const markCaptures = (text: string, record: GameRecord, captures: (Capture | null)[]): string =>
  shared.markMoves(text, record, captures, moveNotation);
