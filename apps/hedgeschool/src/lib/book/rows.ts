// The book's table at a position (design 32, items 3, 7 and 9): its rows in their groups, each with its label and the
// symbol at its line's end by the rules of the sentences (sentences.ts, `moveLabel`; symbols.ts, `lineEndSymbol`), so
// that the table and the sentences agree, and the line that the board draws for it. The table (BookTable.svelte) and
// the board's numbers read the same rows, so a row's number is its candidate's rank on the board (design 07).
import type { Label } from "@abstractclass/analysis/labels.ts";
import type { Player } from "@abstractclass/analysis/game.ts";
import { mirrorEdge, mirrorPosition, parseEdge, type Edge } from "#lib/engine/notation.ts";
import { playerOf } from "#lib/engine/position.ts";
import { LABEL_TEXT, turnFromCount } from "#lib/review/enclosure.ts";
import { bookMove, type Book } from "./book.ts";
import type { BookMove, BookPosition } from "./form.ts";
import { edgeCount, isFine, moveLabel, outsideLabel, traps } from "./sentences.ts";
import { lineEndSymbol, SYMBOL_NAME, type PositionSymbol } from "./symbols.ts";

/** The table's groups, in their order (design 32, item 3). */
export type BookGroup = "fine" | "other" | "trap" | "outside" | "yours";
export const GROUP_TITLES: Record<BookGroup, string> = {
  fine: "Fine moves",
  other: "Other book moves",
  trap: "Traps: they seem good after a short search, and lose after a deep one",
  outside: "Best outside the book",
  yours: "Your game",
};
/** The game's move at the position, in the review (design 32, item 4): its edge, and its label and Blue's win chance
 *  by the review's own search. */
export interface GameMove { move: string; label: Label | null; blueWin: number | undefined }

/** A row of the table. */
export interface BookRow {
  /** The row's number, from 1: the table's and the board's (design 07). */
  n: number;
  group: BookGroup;
  /** The edge, in the player's orientation. */
  move: string;
  /** Its label by the book's values (sentences.ts, `moveLabel`). Null for the game's row, whose label is the review's
   *  (`game`). */
  label: Label | null;
  /** Blue's win chance after the move, by the book. Undefined for the game's row: the book has no value for it. */
  blueWin?: number;
  /** The bounds of `blueWin` (a book move only). */
  low?: number;
  high?: number;
  /** The symbol at the end of the move's main line (a book move only). */
  symbol?: PositionSymbol;
  /** The book ends at the position after the move. */
  ends?: boolean;
  /** The turns that the book goes on under the move, after the move's own turn (a book move only). */
  turns?: number;
  /** The book move (a book move only). */
  book?: BookMove;
  /** The game played this move (the review). */
  game?: GameMove;
}

/** The rows of a position's table, in their groups' order and numbered. `game`: the game's move at the position, in
 *  the review. */
export function bookRows(p: BookPosition, game?: GameMove | null): BookRow[] {
  const count = edgeCount(p);
  const lastTurn = (last: number) => turnFromCount(Math.max(0, last - 1)).turn;
  const row = (m: BookMove): BookRow => ({
    n: 0, group: m.trap ? "trap" : isFine(p, m) ? "fine" : "other", move: m.move, label: moveLabel(p, m),
    blueWin: m.value.blueWin, low: m.value.low, high: m.value.high, symbol: lineEndSymbol(m), ends: m.last <= count + 1,
    turns: Math.max(0, lastTurn(m.last) - p.turn), book: m,
  });
  const moves = p.moves.filter(m => !m.trap).map(row);
  // The traps: the largest gap between the short search and the deep one first (sentences.ts, `traps`)
  const rows = [...moves.filter(r => r.group === "fine"), ...moves.filter(r => r.group === "other"),
                ...traps(p).map(row)];
  if (p.outside)
    rows.push({ n: 0, group: "outside", move: p.outside.move, blueWin: p.outside.blueWin, label: outsideLabel(p) });
  if (game) {
    const own = rows.find(r => sameMove(p, r.move, game.move));
    if (own) own.game = game;
    else rows.push({ n: 0, group: "yours", move: game.move, label: null, game });
  }
  rows.forEach((r, k) => (r.n = k + 1));
  return rows;
}

/** Whether two edges play the same move from a position: the same edge, or, at a position that is its own mirror
 *  image (the start), its twin (book.ts, bookMove). */
function sameMove(p: BookPosition, a: string, b: string): boolean {
  return a === b || (mirrorPosition(p.position) === p.position && a === mirrorEdge(b));
}

/** The row's line, as the board draws it: its edge, then the book's main line after it while the book's parts that
 *  hold it are loaded (book.ts, `peek`), or a trap's refutation. A row outside the book has its edge only. */
export function rowLine(book: Book, row: BookRow): string[] {
  const m = row.book;
  if (!m) return [row.move];
  if (m.trap) return [m.move, ...m.trap.refutation];
  const line = [m.move];
  for (let at = book.peek(m.to); at && at.moves.length; at = book.peek(at.moves[0].to)) line.push(at.moves[0].move);
  return line;
}

/** The rows as the board numbers them (Board.svelte, BoardCandidate: design 07), each with its note: its label, and the
 *  symbol at its line's end in words. */
export function rowCandidates(rows: BookRow[]): { edge: Edge; rank: number; note: string }[] {
  return rows.map(r => ({
    edge: parseEdge(r.move), rank: r.n,
    note: [r.label && LABEL_TEXT[r.label], r.book?.trap && "a trap", r.symbol && SYMBOL_NAME[r.symbol],
           !r.book && r.group !== "yours" && "not in the book", r.group === "yours" && "your game"].filter(Boolean).join(" · "),
  }));
}

/** The row's line (rowLine) as the board draws it (Board.svelte, BoardLineEdge): each edge with its mover, from the
 *  position's mover and the edges left in its turn. */
export function rowBoardLine(book: Book, p: BookPosition, row: BookRow): { edge: Edge; player: Player }[] {
  let player = playerOf(p.mover), left = p.turn === 1 || p.edge === 2 ? 1 : 2;
  return rowLine(book, row).map(e => {
    const step = { edge: parseEdge(e), player };
    if (--left === 0) { player = (1 - player) as Player; left = 2; }
    return step;
  });
}

/** The count of the position's book moves, as the table announces it once a step: "4 book moves, 1 trap". */
export function bookCount(p: BookPosition): string {
  if (!p.moves.length) return "End of the book";
  const traps = p.moves.filter(m => m.trap).length, n = p.moves.length;
  return `${n} book move${n === 1 ? "" : "s"}` + (traps ? `, ${traps} trap${traps === 1 ? "" : "s"}` : "");
}

/** The position as the title row names it (design 32, item 3): "Start · Blue to play", or the turn, the side to move
 *  and the edge of the turn. */
export function positionTitle(p: BookPosition): string {
  const side = p.mover === "b" ? "Blue" : "Red";
  if (edgeCount(p) === 0) return `Start · ${side} to play`;
  const edges = p.turn === 1 || p.turn === 61 ? 1 : 2;
  return `Turn ${p.turn} · ${side} to play, edge ${p.edge} of ${edges}`;
}

/** The position that an edge reaches from a book position, by the book: the book move's `to`. Undefined when the edge
 *  is not a book move. */
export const bookTo = (p: BookPosition, edge: string) => bookMove(p, edge)?.to;
