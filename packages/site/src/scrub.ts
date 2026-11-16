// What every event to PostHog loses before it goes (posthog.ts, `before_send`): a game, a record, a file's content and a
// typed name (Hedge School's design 17, "Error reports"). An error report carries text that the site does not write:
// the error's message, the stack's addresses, and the page's address as PostHog's client reads it. So the rules work on
// every string of the event, the client's own properties too:
// - The text of each tag of each record that the page read (the players' names, the event's name), with no quotes
//   too, and as an address spells it: a library's message or a partner site's message can hold one. The record's
//   reader notes the texts (@abstractclass/record's texts.ts). This rule goes first, so that a tag's address goes whole.
// - The part of an address after its `#` when it holds a game (holdsGame: a record, a packed review or analysis, or a
//   tool's game, Hedge School's design 22). A kept game's id and a place stay, and so does a stack's line and column
//   after the address.
// - Quoted text, in any kind of quotes: a record's tags give their values in quotes (the players' names), and a
//   browser quotes the text that it could not read (JSON.parse's message quotes a file's content).
// - A record's moves: a turn's number and a dot ("1."), then the moves of the turn, each with a digit in it.
// Each goes as "…", so that a report shows where text was.
import { holdsGame } from "@abstractclass/import/importHash.ts";
import { readTexts } from "@abstractclass/record/texts.ts";

/** The part of an address after its `#`, to the first space, quote or bracket: an address's own characters. */
const FRAGMENT = /#[^\s"'`<>()[\]{}]*/g;
/** A stack frame's line and column at the end of an address. */
const LINE_COLUMN = /(?::\d+){1,2}$/;
/** Quoted text, in each kind of quotes. A single quote opens and closes only beside no letter or digit, so that a
 *  word's apostrophe stays. */
const QUOTED = /"[^"]*"|“[^”]*”|‘[^’]*’|`[^`]*`|(?<![\p{L}\p{N}])'[^']*'(?![\p{L}\p{N}])/gu;
/** A record's turns: the turn's number and a dot, then its moves, each a word with a digit in it. */
const TURN = /\b\d+\.(?:\s+(?=\S*\d)\S+)+/g;
/** The marks of a run of turns, one after another. */
const MARKS = /…(?:\s+…)+/g;

/** The texts of the page's records as whole words, each as it is and as an address spells it, the longest first, and
 *  how many texts it holds. It matches nothing while the page has read no record. */
let textCache = { count: 0, pattern: /(?!)/g };

/** The pattern of the page's texts (readTexts), made again only when a record gave a new text. */
function textPattern(): RegExp {
  const texts = readTexts();
  if (texts.size === textCache.count) return textCache.pattern;
  const forms = new Set([...texts].flatMap(t => {
    const coded = encodeURIComponent(t);
    return [t, coded, coded.replaceAll("%20", "+")];
  }));
  const words = [...forms].sort((a, b) => b.length - a.length).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${words.join("|")})(?![\\p{L}\\p{N}])`, "gu");
  textCache = { count: texts.size, pattern };
  return textCache.pattern;
}

/** `text` without a game, a record or a name in it (the rules above). */
export function scrubText(text: string): string {
  return text
    .replace(textPattern(), "…")
    .replace(FRAGMENT, f => {
      const place = f.match(LINE_COLUMN)?.[0] ?? "";
      return holdsGame(f.slice(0, f.length - place.length)) ? `#…${place}` : f;
    })
    .replace(QUOTED, q => `${q[0]}…${q.at(-1)}`)
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
