// A reviewed game's path through the opening book (design 32, item 4; journey 1, A1): where the game left the book, the
// book move worse than Good by the review's labels that it played before, the traps that it played and whether the
// other side refuted them, and the game's book moves, which the move list marks. The review gives the book's position
// at each of the game's positions (lookup.svelte.ts, `OpeningBook`), and the Report takes its rows from here. The
// sentences are in sentences.ts.
//
// A position is in the book when the book holds it, by any move order: so a game that leaves the book can come back
// to it by another move order. The Report names the first departure, and the move list marks each book move of each
// stretch in the book (the journey, A1, "Variations").
import { BAD_LABELS, LABELS, type Label } from "@abstractclass/analysis/labels.ts";
import type { Unit } from "@abstractclass/analysis/model.ts";
import type { BookJudgment, BookMoveMark } from "@abstractclass/review/game.ts";
import { moverOf } from "#lib/editor/position.ts";
import { bookMove } from "./book.ts";
import type { BookMove, BookPosition } from "./form.ts";
import { NOT_IN_BOOK_SENTENCE, bookEndSentence, edgeCount, lastBookMoveSentence, leftBookSentence, trapPlayedSentence,
  weakBookMoveSentence } from "./sentences.ts";
import { SYMBOL_NAME, positionSymbol } from "./symbols.ts";

/** A book move that the game played: the edge's index, and the book's position before it. */
export interface PlayedBookMove { index: number; position: BookPosition; move: BookMove }
/** Book moves that the game played in a row: one book move, or by turn a whole turn (one edge in Blue's first turn,
 *  else two). The first edge's index, and the book's position before it. */
export interface PlayedBookMoves { index: number; position: BookPosition; moves: BookMove[] }

export interface GameOpening {
  /** How the game met the book: it left the book, it followed the book to its end, it was not in the book from the
   *  first move, or it ended in the book (a game imported while it is played). */
  kind: "left" | "end" | "never" | "in";
  /** The position that the opening row goes to: the position before the move that left the book (the start for
   *  "never"), or the end of the book. */
  at: number;
  /** The book's position there. */
  position: BookPosition;
  /** The book moves that the game played before it left the book, none a trap: the trap has its own row. Each `moves`
   *  holds the one move. The row names the worst by the review's labels (`worstBookPlay`). */
  earlier: PlayedBookMoves[];
  /** By turn: the whole book turns that the game played before it left the book, none a turn with a trap. */
  earlierTurns: PlayedBookMoves[];
  /** The traps that the game played, in the game's order. `refuted`: whether the other side played the refutation's
   *  edges, in either order in its turn; null when the game ended before them, or when the side that played the trap
   *  ended its turn otherwise. */
  traps: (PlayedBookMove & { refuted: boolean | null })[];
  /** The game's book moves, in the game's order: each edge that the book lists at its position, when the position after
   *  it is in the book too, with the words of the position symbol after it (symbols.ts, SYMBOL_NAME). The move list marks each. */
  bookMoves: BookMoveMark[];
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
  const played = positions.flatMap((p, k): PlayedBookMove[] => {
    const m = p && k < edges.length ? bookMove(p, edges[k]) : undefined;
    return p && m ? [{ index: k, position: p, move: m }] : [];
  });
  // The book moves before the departure, and by turn the whole book turns. A trap has its own row, so neither holds one
  const before = (all: PlayedBookMoves[]) => all.filter(w => w.index + w.moves.length <= last && w.moves.every(m => !m.trap));
  // The game's whole turns in the book, from each turn's start: its edges are all book moves
  const moveAt = new Map(played.map(b => [b.index, b.move]));
  const turns = played.flatMap(({ index, position }): PlayedBookMoves[] => {
    const moves = Array.from({ length: moverOf(edgeCount(position)).left }, (_, j) => moveAt.get(index + j));
    return position.edge === 1 && moves.every(m => m) ? [{ index, position, moves: moves as BookMove[] }] : [];
  });
  const earlier = before(played.map(({ index, position, move }) => ({ index, position, moves: [move] })));
  const earlierTurns = before(turns);
  const bookMoves = played.flatMap(({ index }) => {
    const next = positions[index + 1];
    return next ? [{ index, after: SYMBOL_NAME[positionSymbol(next)] }] : [];
  });
  return {
    kind, at: last, position: end, earlier, earlierTurns,
    traps: played.filter(b => b.move.trap).map(b => ({ ...b, refuted: refuted(b, edges) })),
    bookMoves,
  };
}

/** Whether the other side played a trap's refutation: its edges of the refutation, which come after the rest of the
 *  trap's turn, in either order in its turn. Null when the game ended before them, and when the side that played the
 *  trap did not end its turn as the refutation does: the refutation then answers a position that the game did not
 *  reach. The book and the game write an edge in the notation's one spelling, as `bookMove` reads them. */
function refuted({ index, position, move }: PlayedBookMove, edges: string[]): boolean | null {
  const count = edgeCount(position), trapper = moverOf(count).player;
  const line = move.trap!.refutation
    .map((e, j) => ({ e, k: index + 1 + j, own: moverOf(count + 1 + j).player === trapper }));
  if (line.some(({ e, k, own }) => k >= edges.length || (own && edges[k] !== e))) return null;
  const theirs = line.filter(({ own }) => !own), played = new Set(theirs.map(({ k }) => edges[k]));
  return theirs.every(({ e }) => played.has(e));
}

/** The book move that the review labels worst before the game left the book: a label worse than Good, the worst label
 *  first (Inaccuracy, then Mistake, then Blunder), and between equal labels the larger loss, the first of equal ones.
 *  By turn, the whole book turn. `judged` gives the review's judgment of the move or the turn that starts at an edge's
 *  index, by the same unit. Null when none is worse than Good: a move that the review has not judged yet is not named. */
export function worstBookPlay(o: GameOpening, unit: Unit, judged: (index: number) => BookJudgment | null):
    { play: PlayedBookMoves; label: Label } | null {
  let worst: { play: PlayedBookMoves; label: Label; loss: number } | null = null;
  for (const play of unit === "turn" ? o.earlierTurns : o.earlier) {
    const j = judged(play.index);
    if (!j || !BAD_LABELS.includes(j.label)) continue;
    const rank = LABELS.indexOf(j.label);
    if (!worst || rank > LABELS.indexOf(worst.label) || (rank === LABELS.indexOf(worst.label) && j.loss > worst.loss))
      worst = { play, label: j.label, loss: j.loss };
  }
  return worst;
}

/** The Report's opening row (design 32, item 4): where the game left the book, with the review's label of the move
 *  that left it (`label`), and the book move that the review labels worst, when its label is worse than Good
 *  (`worstBookPlay`). When that move reached the end of the book, the row names it as the last book move. Null for a
 *  game that ended in the book. The row follows "Review by" (`unit`): by turn it names the whole turn that left the
 *  book, and `label` is the turn's label. Its earlier book move is a whole turn too, with the review's label of the
 *  turn. By edge it names the edge. */
export function openingSentence(o: GameOpening, edges: string[], label: Label | null, unit: Unit,
                                judged: (index: number) => BookJudgment | null): string | null {
  const w = worstBookPlay(o, unit, judged);
  const reachedEnd = o.kind === "end" && !!w && w.play.index + w.play.moves.length === o.at;
  const before = !w ? "" : ` ${reachedEnd ? lastBookMoveSentence(w.label, ...w.play.moves)
    : weakBookMoveSentence(w.play.position, w.label, ...w.play.moves)}`;
  switch (o.kind) {
    case "left": {
      const { at, length } = unit === "turn" ? leftTurn(o) : { at: o.at, length: 1 };
      return leftBookSentence(o.position, edges.slice(at, at + length).join(" "), label) + before;
    }
    case "end": return bookEndSentence(o.position) + before;
    case "never": return NOT_IN_BOOK_SENTENCE;
    case "in": return null;
  }
}

/** The turn that left the book: the index of its first edge and its edges' count. The move that left the book is the
 *  turn's first edge or its second. */
function leftTurn(o: GameOpening): { at: number; length: number } {
  const at = o.at - (o.position.edge - 1);
  return { at, length: moverOf(edgeCount(o.position) - (o.position.edge - 1)).left };
}

/** The Report's opening row (`openingSentence`), with the position that it goes to: the position before the move that
 *  left the book, or by turn before the turn that left it, where the book's table shows whole turns. */
export function openingRow(o: GameOpening, edges: string[], label: Label | null, unit: Unit,
                           judged: (index: number) => BookJudgment | null): { text: string; at: number } | null {
  const text = openingSentence(o, edges, label, unit, judged);
  return text === null ? null : { text, at: o.kind === "left" && unit === "turn" ? leftTurn(o).at : o.at };
}

/** The Report's trap rows: each trap that the game played, with the position before it, where its row goes. */
export const trapRows = (o: GameOpening): { at: number; text: string }[] =>
  o.traps.map(t => ({ at: t.index, text: trapPlayedSentence(t.position, t.move, t.refuted) }));
