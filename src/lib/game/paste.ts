// A game pasted in a page's box (the Review tab's, the Analysis board's): this site's record, or Constellation's export,
// which becomes this site's record (constellation.ts). A record that cannot be read says where, by line and column.
import { errorText } from "#lib/errors.ts";
import { constellationRecord, isConstellation } from "./constellation.ts";
import { parseRecord, RecordError, withStart, type GameRecord } from "./record.ts";

export interface Pasted { record: GameRecord; recordText: string; source: "pasted_record" | "pasted_constellation" }

/** The import source of a pasted text, before it is read (design 17). */
export const pastedSource = (text: string): Pasted["source"] => (isConstellation(text) ? "pasted_constellation" : "pasted_record");

/** The pasted text read as a record, from `position` when the start is given apart (withStart). Throws an Error that
 *  says what is wrong, and where in the text. */
export function readPasted(text: string, position: string | null = null): Pasted {
  const source = pastedSource(text);
  let recordText = text;
  try {
    if (source === "pasted_constellation") recordText = constellationRecord(text);
    recordText = withStart(recordText, position);
    return { record: parseRecord(recordText), recordText, source };
  } catch (e) {
    if (e instanceof RecordError && source === "pasted_record") {
      const tag = recordText.length - text.length; // the start's tag, put before the pasted text
      const before = text.slice(0, Math.max(0, e.offset - tag)).split("\n");
      throw new Error(`${e.message} (line ${before.length}, column ${before.at(-1)!.length + 1}).`);
    }
    throw new Error(errorText(e));
  }
}
