// Blueprints' game record: Hedge School's form (docs/design/33-drawing-board.md, item 7), with Blueprints' moves and
// capture marks (notation.ts). The frame is the shared one (@abstractclass/record/record.ts): the tags, with Blue and
// Red for the players, the turns with their numbers (Blue's first turn has one move, then two a turn), the comments,
// the branches, the quality marks, `[%clk]` and `[%eval]`, and the result. `1. 2@-6,-2 2. 1:0,0>3:1,-1 2@5,-2x+24 *`.
// The record starts from the standard start: a position's notation waits for the board editor (design 33, item 10).
import * as shared from "@abstractclass/record/record.ts";
import { captureText, readMove, type Capture } from "./notation.ts";
export { gamePage, playerNames, RecordError, writeRecord, writeTags, type Eval } from "@abstractclass/record/record.ts";

/** A game record of Blueprints: `marked` gives, by move, the capture mark that the record gives it, or null. */
export type GameRecord = shared.GameRecord<Capture | null>;

const blueprints: shared.Notation<Capture | null> = { read: readMove, mark: captureText, none: null };

/** Whether a record's tags give a set-up start: "?" and "-" are PGN's values for none. */
const setUp = (tags: Record<string, string>) => !["", "?", "-"].includes(tags.Position?.trim() ?? "");

/** Reads a game record. Throws a RecordError with the offset of the first problem. */
export function parseRecord(text: string): GameRecord {
  const refuse = () => new shared.RecordError("Drawing Board reads a game from the standard start only: remove the Position tag",
                                              Math.max(0, text.search(/\[\s*Position\s/)));
  // A record with turn labels meets its start at its first label, before a wrong turn number: the start comes first.
  const start = (tags: Record<string, string>) => { if (setUp(tags)) throw refuse(); return { turn: 1, first: true }; };
  const record = shared.readRecord(text, { ...blueprints, start });
  if (setUp(record.tags)) throw refuse();
  return record;
}

/** Adds the capture mark to every move that has none yet. `captures` is by move, from the engine (check.ts). */
export const markCaptures = (text: string, record: GameRecord, captures: (Capture | null)[]): string =>
  shared.markMoves(text, record, captures, blueprints);
