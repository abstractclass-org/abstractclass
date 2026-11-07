// Moves pasted in the Analysis board's Import (Hedge School's design 21, item 5): a record of this site, finished or
// not, or a plain list of moves, in the notation. The position field gives its start apart (withStart). A record that
// cannot be read says where, by line and column, as Hedge School's does (its src/lib/game/paste.ts). Cyanotype has no
// other site's export to read.
import { errorText } from "@abstractclass/engine/errors.ts";
import { givenStartProblem, pastedError } from "@abstractclass/record/record.ts";
import { setUpStart } from "./position.ts";
import { parseRecord, RecordError, withStart, type GameRecord } from "./record.ts";

export interface Pasted { record: GameRecord; recordText: string }

/** The pasted text read as a record, from `position` when the start is given apart: the record's own `Position` tag
 *  must then be the same position or absent (givenStartProblem). Throws an Error that says what is wrong, and where in
 *  the text. */
export function readPasted(text: string, position: string | null = null): Pasted {
  const recordText = withStart(text, position);
  let record: GameRecord;
  try {
    record = parseRecord(recordText);
  } catch (e) {
    throw e instanceof RecordError ? pastedError(e, text, recordText) : new Error(errorText(e));
  }
  const mismatch = givenStartProblem(record.tags, position, setUpStart);
  if (mismatch) throw new Error(mismatch);
  return { record, recordText };
}
