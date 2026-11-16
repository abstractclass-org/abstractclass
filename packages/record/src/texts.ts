// The texts of the records that the page read: each tag's value and each comment's text, which a player typed or a file
// gave (the players' names, the event's name, the site's address, a note on a move). readRecord notes each one as it
// reads it, so a page that reads a record notes its texts with no call of its own. The error reports remove each one before they go (packages/site's
// scrub.ts, Hedge School's design 17, "Error reports"). The texts stay in the page's memory for its life, and go
// nowhere else.

const texts = new Set<string>();

/** Notes a tag's value or a comment's text, unless hiding it would remove letters or digits from every report: a value of one character
 *  (PGN's "?" and "-" for none too) or a plain number (a komi, a round). */
export function noteText(value: string) {
  const text = value.trim();
  if (text.length > 1 && !/^[+-]?\d+(?:\.\d+)?$/.test(text)) texts.add(text);
}

/** The texts that the page's records gave, each once. The set only grows. */
export const readTexts = (): ReadonlySet<string> => texts;
