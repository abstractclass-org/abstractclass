// The player's notes on the board (design 07): rings round points and lines between points, drawn with the right
// button, as Lichess's board draws circles and arrows (its chessground board's drawable shapes). A note is only a
// drawing: it is not an edge, and cuts or encloses nothing.

export type NoteBrush = "green" | "yellow" | "purple" | "grey";
export interface BoardNote { at: [number, number]; to?: [number, number]; brush: NoteBrush }

const samePoint = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1];

/** The same ring, or the same line drawn either way. */
export function sameNote(a: BoardNote, b: BoardNote): boolean {
  if (!a.to || !b.to) return !a.to && !b.to && samePoint(a.at, b.at);
  return (samePoint(a.at, b.at) && samePoint(a.to, b.to)) || (samePoint(a.at, b.to) && samePoint(a.to, b.at));
}

/** A note drawn again, as chessground toggles a shape: the same note in the same colour goes, in another colour it
 *  changes colour, and a new note joins the others. */
export function toggleNote(notes: BoardNote[], note: BoardNote): BoardNote[] {
  const i = notes.findIndex(n => sameNote(n, note));
  if (i < 0) return [...notes, note];
  return notes[i].brush === note.brush ? notes.filter((_, k) => k !== i) : notes.map((n, k) => (k === i ? note : n));
}

/** The colour of a note from the keys held, as chessground picks its brushes by the keys: none, Shift or Ctrl, Alt or
 *  Meta (Option and Command on a Mac), or both. Lichess's red and blue would read as the players' colours here, so the
 *  brushes are purple by default, then yellow, green and grey. */
export function brushFor(keys: { shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean }): NoteBrush {
  const a = keys.shiftKey || keys.ctrlKey, b = keys.altKey || keys.metaKey;
  return a && b ? "grey" : a ? "yellow" : b ? "green" : "purple";
}

/** The brushes and the keys held for each, for the list of keys and clicks: groups of keys that must all be held, each
 *  group met by any one of its keys. Grey is Shift or Ctrl, and Alt. */
export const BRUSH_KEYS: [NoteBrush, string[][]][] = [
  ["purple", []], ["yellow", [["Shift", "Ctrl"]]], ["green", [["Alt"]]], ["grey", [["Shift", "Ctrl"], ["Alt"]]],
];
