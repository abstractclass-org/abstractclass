// The player's notes on the board (design 07): rings round points and lines between points, drawn with the right
// button, as Lichess's board draws circles and arrows (its chessground board's drawable shapes). A note is only a
// drawing: it is not an edge, and cuts or encloses nothing. A point is the game's: Enclosure's point (x, y), and
// Blueprints' hex (q, r), which Drawing Board's board draws as a marked hex and an arrow (design 33). Each site's
// board draws the notes, and each site gives its keys for the colours (`BrushKeys`).

export type NoteBrush = "green" | "yellow" | "purple" | "grey";
type Point = readonly [number, number];
export interface BoardNote { at: Point; to?: Point; brush: NoteBrush }

export const samePoint = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1];

/** The note that a drag of the right button draws: a ring where the drag ends on its first point, else a line. */
export const drawnNote = (from: Point, to: Point, brush: NoteBrush): BoardNote =>
  samePoint(from, to) ? { at: from, brush } : { at: from, to, brush };

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

/** Whether a point has a ring in a colour. A drag of rings that starts there removes rings (`ringPoints`). */
export const ringed = (notes: readonly BoardNote[], p: Point, brush: NoteBrush) =>
  notes.some(n => !n.to && n.brush === brush && samePoint(n.at, p));

/** The notes after a drag of rings (Drawing Board's Shift with the right button, design 33): a ring in the colour at
 *  each point that the drag goes across, where a ring of another colour changes colour. With `clear`, the drag removes
 *  that colour's rings at those points instead. A note between two points stays. When nothing changes, the same
 *  notes. */
export function ringPoints(notes: BoardNote[], points: readonly Point[], brush: NoteBrush, clear: boolean): BoardNote[] {
  let out = notes;
  for (const p of points) {
    const i = out.findIndex(n => !n.to && samePoint(n.at, p));
    if (clear) { if (i >= 0 && out[i].brush === brush) out = out.filter((_, k) => k !== i); }
    else if (i < 0) out = [...out, { at: p, brush }];
    else if (out[i].brush !== brush) out = out.map((n, k) => (k === i ? { at: p, brush } : n));
  }
  return out;
}

/** A key held while a note is drawn. Alt is Alt or Meta (Option and Command on a Mac). */
export type NoteKey = "Shift" | "Ctrl" | "Alt";
/** A site's keys for the notes' colours: each colour with the groups of keys that must all be held, each group met by
 *  any one of its keys. The first colour takes no key. The site's board chooses a colour by them (`brushFor`), and its
 *  list of keys and clicks shows them. */
export type BrushKeys = readonly (readonly [NoteBrush, readonly (readonly NoteKey[])[]])[];

/** Hedge School's keys, as chessground picks its brushes by the keys: none, Shift or Ctrl, Alt or Meta, or both.
 *  Lichess's red and blue would read as the players' colours here, so the brushes are purple by default, then yellow,
 *  green and grey. */
export const BRUSH_KEYS: BrushKeys = [
  ["purple", []], ["yellow", [["Shift", "Ctrl"]]], ["green", [["Alt"]]], ["grey", [["Shift", "Ctrl"], ["Alt"]]],
];

/** The colour of a note from the keys held, by a site's table of keys (Hedge School's by default): of the colours
 *  whose groups are all met, the one with the most groups. */
export function brushFor(keys: { shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean },
                         table: BrushKeys = BRUSH_KEYS): NoteBrush {
  const held = (k: NoteKey) => (k === "Shift" ? keys.shiftKey : k === "Ctrl" ? keys.ctrlKey : keys.altKey || keys.metaKey);
  let best = table[0];
  for (const entry of table) if (entry[1].length > best[1].length && entry[1].every(g => g.some(held))) best = entry;
  return best[0];
}
