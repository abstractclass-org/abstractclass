// The opening book's file, as the site reads it (design 32, "The book file"). The site proposes this form to the
// engine repository (request 22, item 5). The book holds values only: the site computes the labels, the position
// symbols and the sentences from them by its own rules. A book is an index and its parts: the index lists every
// position by the part that holds it, and the first part holds the start. Each position is keyed by the engine's
// position notation (src/lib/engine/notation.ts). The book stores a position and its mirror image as one, in one of
// the two orientations: a lookup finds both (book.ts, `find`).
//
// The units: every win chance is Blue's, from 0 to 1, whoever moves, as the engine gives it. A lead is Blue's expected
// score lead in points (negative when Red leads). An edge count is the position's fifth field: the edges played, 0 to
// 120.

export const BOOK_FORMAT = "hedge-school-book";
export const BOOK_VERSION = 1;

/** The book's index: the first file that the site loads. */
export interface BookIndex {
  format: typeof BOOK_FORMAT;
  version: typeof BOOK_VERSION;
  source: BookSource;
  /** The start: the root of the book, in the position notation. */
  start: string;
  /** The parts. The first holds the start, so it loads first. */
  parts: BookPartEntry[];
}

/** Where the book comes from, for the table's line "Book of …". */
export interface BookSource {
  /** The book's name and version, as the page names it. */
  name: string;
  /** The date when the book was made: ISO 8601. */
  made: string;
  /** The network that searched the book's positions (the engine's network id). */
  network: string;
  /** The visits of each position's deep search. */
  visits: number;
  /** The visits of the short search that finds the traps (BookMove, `trap`). */
  shortVisits: number;
  /** Anything that a reader of the file must know, for example that it is a test book. */
  note?: string;
}

/** A part as the index lists it. */
export interface BookPartEntry {
  /** The part's file, relative to the index's address. */
  file: string;
  /** The positions that the part holds, by their notation as stored. */
  positions: string[];
}

/** A part's file. */
export interface BookPart {
  format: typeof BOOK_FORMAT;
  version: typeof BOOK_VERSION;
  positions: BookPosition[];
}

/** A position's values, minimaxed through the book's tree (KataGo's book method). */
export interface BookValue {
  /** Blue's win chance, 0 to 1. */
  blueWin: number;
  /** The lower bound of Blue's win chance, 0 to 1. */
  low: number;
  /** The upper bound of Blue's win chance, 0 to 1. */
  high: number;
  /** Blue's expected score lead, in points. */
  lead: number;
}

/** A position of the book. */
export interface BookPosition {
  /** The position in the engine's notation, as the book stores it. */
  position: string;
  /** The side to move: "b" Blue, "r" Red. */
  mover: "b" | "r";
  /** The turn of the next edge: 1 to 61 (Blue's turns are odd). */
  turn: number;
  /** The next edge's place in its turn: 1 or 2. Turn 1 has one edge. */
  edge: 1 | 2;
  /** The book moves that lead here. The first is the canonical parent: the page shows the position's subtree under
   *  it. Empty at the start. */
  parents: BookParent[];
  /** The position's minimaxed values. */
  value: BookValue;
  /** The complexity of the position's own deep search: the mover's mean loss of win chance over the search's
   *  candidates, weighted by their prior, 0 to 1 (@abstractclass/analysis/model.ts, `complexity`; design 14). */
  complexity: number;
  /** The book moves, the best first, then by the mover's win chance. Empty where the book ends. */
  moves: BookMove[];
  /** The best move outside the book and its value (KataGo's "other" row), or null when the book holds every move
   *  that the search found. */
  outside: { move: string; blueWin: number } | null;
  /** The area map: the ownership of each point from the position's deep search, one byte a point (area.ts). */
  area: string;
}

/** A move from a book position to another book position. */
export interface BookParent {
  /** The position before the move, as the book stores it. */
  position: string;
  /** The edge, in the orientation of `position` as stored. */
  move: string;
  /** True when the book stores this position as the mirror image of the one that the move reaches. */
  mirrored?: true;
}

/** A book move. */
export interface BookMove {
  /** The edge, in the orientation of its position as stored. */
  move: string;
  /** The position after the move, as the book stores it. */
  to: string;
  /** True when the book stores `to` as the mirror image of the position that the move reaches. */
  mirrored?: true;
  /** The values after the move: the minimaxed values of `to`. */
  value: BookValue;
  /** The end of the book's main line after the move: the line of each position's best move, while that move is in
   *  the book. `count`: its edge count. `complexity`: the complexity of its deep search, as above. */
  end: { count: number; complexity: number };
  /** The edge count of the deepest book position under the move: how far the book goes on. */
  last: number;
  /** A trap: a move that a short search rates Good or better and the deep values a Mistake or worse (request 22,
   *  item 3). `short`: Blue's win chance after the move by the short search, 0 to 1 (its deep value is `value`).
   *  `refutation`: the book's line from the position after it: the rest of the trap's turn, then the opponent's turn
   *  that punishes it, in the orientation of `move`. */
  trap?: { short: number; refutation: string[] };
}
