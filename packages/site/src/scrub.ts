// What every event to PostHog loses before it goes (posthog.ts, `before_send`): a game, a record, a file's content and a
// typed name (Hedge School's design 17, "Error reports"). An error report carries text that the site does not write:
// the error's message, the stack's addresses, and the page's address as PostHog's client reads it. So the rules work on
// every string of the event, the client's own properties too, and match what a game looks like in text:
// - The part of an address after its `#`, unless it names only a kept game's id and a place (holdsGame): a record, a
//   packed review or analysis, or a tool's game is there (Hedge School's design 22). A stack's line and column after
//   the address stay.
// - Quoted text, in any kind of quotes: a record's tags give their values in quotes (the players' names), and a
//   browser quotes the text that it could not read (JSON.parse's message quotes a file's content).
// - A record's moves: a turn's number and a dot ("1."), then the moves of the turn, each with a digit in it.
// Each goes as "…", so that a report shows where text was.
import { holdsGame } from "@abstractclass/import/importHash.ts";

/** The part of an address after its `#`, to the first space, quote or bracket: an address's own characters. */
const FRAGMENT = /#[^\s"'`<>()[\]{}]*/g;
/** A stack frame's line and column at the end of an address. */
const LINE_COLUMN = /(?::\d+){1,2}$/;
/** Quoted text. A single quote opens and closes only beside no letter or digit, so that a word's apostrophe stays. */
const QUOTED = [/"[^"]*"/g, /“[^”]*”/g, /‘[^’]*’/g, /`[^`]*`/g, /(?<![\p{L}\p{N}])'[^']*'(?![\p{L}\p{N}])/gu];
/** A record's turns: the turn's number and a dot, then its moves, each a word with a digit in it. */
const TURN = /\b\d+\.(?:\s+(?=\S*\d)\S+)+/g;
/** The marks of a run of turns, one after another. */
const MARKS = /…(?:\s+…)+/g;

/** `text` without a game, a record or a name in it (the rules above). */
export function scrubText(text: string): string {
  return text
    .replace(FRAGMENT, f => {
      const place = f.match(LINE_COLUMN)?.[0] ?? "";
      return holdsGame(f.slice(0, f.length - place.length)) ? `#…${place}` : f;
    })
    .replace(QUOTED[0], '"…"').replace(QUOTED[1], "“…”").replace(QUOTED[2], "‘…’").replace(QUOTED[3], "`…`")
    .replace(QUOTED[4], "'…'")
    .replace(TURN, "…")
    .replace(MARKS, "…");
}

/** `value` with each string in it scrubbed (scrubText), in its arrays and plain objects at any depth. Other values,
 *  such as a date, stay as they are. */
export function scrubEvent<T>(value: T): T {
  if (typeof value === "string") return scrubText(value) as T;
  if (Array.isArray(value)) return value.map(scrubEvent) as T;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype)
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrubEvent(v)])) as T;
  return value;
}
