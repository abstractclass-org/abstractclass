// A reviewed game's path through the opening book (design 32, item 4; journey 1, A1): where the game left the book, the
// book move worse than Good that it played before, the traps that it played and whether the other side refuted them,
// and the move list's mark at the game's last book move. The review gives the book's position at each of the game's
// positions (lookup.svelte.ts, `OpeningBook`), and the Report takes its rows from here. The sentences are in
// sentences.ts.
//
// A position is in the book when the book holds it, by any move order: so a game that leaves the book can come back
// to it by another move order. The Report names the first departure, and the move list marks the last book move of
// each stretch in the book (the journey, A1, "Variations").
import type { Label } from "@abstractclass/analysis/labels.ts";
import { edgeName, parseEdge } from "#lib/engine/notation.ts";
import { moverOf } from "#lib/editor/position.ts";
import { bookMove } from "./book.ts";
import type { BookMove, BookPosition } from "./form.ts";
import { NOT_IN_BOOK_SENTENCE, bookEndSentence, edgeCount, isFine, leftBookSentence, moveLabel, moveLoss,
  trapPlayedSentence, weakBookMoveSentence } from "./sentences.ts";

/** A book move that the game played: the edge's index, and the book's position before it. */
export interface PlayedBookMove { index: number; position: BookPosition; move: BookMove }

export interface GameOpening {
  /** How the game met the book: it left the book, it followed the book to its end, it was not in the book from the
   *  first move, or it ended in the book (a game imported while it is played). */
  kind: "left" | "end" | "never" | "in";
  /** The position that the opening row goes to: the position before the move that left the book (the start for
   *  "never"), or the end of the book. */
  at: number;
  /** The book's position there. */
  position: BookPosition;
  /** The book move worse than Good that the game played before it left the book, the worst first, not a trap: the
   *  trap has its own row. */
  weak: (PlayedBookMove & { label: Label }) | null;
  /** The traps that the game played, in the game's order. `refuted`: whether the other side played the refutation's
   *  edges, in either order in its turn; null when the game ended before them. */
  traps: (PlayedBookMove & { refuted: boolean | null })[];
  /** The game's last book move of each stretch in the book, by the edge's index: the move list's mark. */
  marks: number[];
}

/** The game's opening, from the book's position at each of its positions (null where the book does not hold it) and
 *  its edges in the notation (`edges[k]` leads from position k to position k + 1, "pass" for a pass). Null when the book
 *  does not hold the game's start, as for a game from a set-up board. */
export function gameOpening(positions: (BookPosition | null)[], edges: string[]): GameOpening | null {
  const start = positions[0];
  if (!start) return null;
  // The first stretch in the book ends at `last`
  let last = 0;
  while (last + 1 < positions.length && positions[last + 1]) last++;
  const end = positions[last]!;
  const kind = !end.moves.length ? "end" : last === positions.length - 1 ? "in" : last === 0 ? "never" : "left";
  // The book moves that the game played: from a book position, an edge that the book lists (bookMove reads a twin at
  // the start)
  const played: PlayedBookMove[] = [];
  positions.forEach((p, k) => {
    const m = p && k < edges.length ? bookMove(p, edges[k]) : undefined;
    if (p && m) played.push({ index: k, position: p, move: m });
  });
  const weak = played.filter(b => b.index < last && !b.move.trap && !isFine(b.position, b.move))
    .reduce<PlayedBookMove | null>((w, b) => (!w || moveLoss(b.position, b.move) > moveLoss(w.position, w.move) ? b : w), null);
  // Each stretch in the book ends at a position whose next position the book does not hold. The edge into it is the
  // stretch's last book move, but at the start, where no edge leads.
  const marks = positions.flatMap((p, k) => (p && k > 0 && k + 1 < positions.length && !positions[k + 1] ? [k - 1] : []));
  return {
    kind, at: last, position: end,
    weak: weak && { ...weak, label: moveLabel(weak.position, weak.move) },
    traps: played.filter(b => b.move.trap).map(b => ({ ...b, refuted: refuted(b, edges) })),
    marks,
  };
}

/** Whether the other side played a trap's refutation: its edges of the refutation, which comes after the rest of the
 *  trap's turn, in either order in its turn. Null when the game ended before them. */
function refuted({ index, position, move }: PlayedBookMove, edges: string[]): boolean | null {
  const count = edgeCount(position), trapper = moverOf(count).player;
  const theirs = move.trap!.refutation.map((e, j) => ({ e, k: index + 1 + j }))
    .filter(({ k }, j) => moverOf(count + 1 + j).player !== trapper);
  if (theirs.some(({ k }) => k >= edges.length)) return null;
  const same = (e: string) => (e === "pass" ? e : edgeName(parseEdge(e)));
  const played = new Set(theirs.map(({ k }) => same(edges[k])));
  return theirs.every(({ e }) => played.has(same(e)));
}

/** The Report's opening row (design 32, item 4): where the game left the book, with the review's label of the move
 *  that left it (`label`), and the book move worse than Good before it. Null for a game that ended in the book. */
export function openingSentence(o: GameOpening, edges: string[], label: Label | null): string | null {
  const before = o.weak ? ` ${weakBookMoveSentence(o.weak.position, o.weak.move)}` : "";
  switch (o.kind) {
    case "left": return leftBookSentence(o.position, edges[o.at], label) + before;
    case "end": return bookEndSentence(o.position) + before;
    case "never": return NOT_IN_BOOK_SENTENCE;
    case "in": return null;
  }
}

/** The Report's trap rows: each trap that the game played, with the position before it, where its row goes. */
export const trapRows = (o: GameOpening): { at: number; text: string }[] =>
  o.traps.map(t => ({ at: t.index, text: trapPlayedSentence(t.position, t.move, t.refuted) }));
