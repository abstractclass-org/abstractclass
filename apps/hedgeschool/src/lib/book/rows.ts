// The book's table at a position (design 32, items 3, 7 and 9): its rows in their groups, each with its label and the
// symbol at its line's end by the rules of the sentences (`moveLabel` in sentences.ts, `lineEndSymbol` in symbols.ts),
// so that the table and the sentences agree, and the line that the board draws for it. The table (BookTable.svelte) and
// the board's numbers read the same rows, so a row's number is its candidate's rank on the board (design 07). The rows
// follow the display setting "Review by": by turn, at a turn's start, each row is a whole turn of two edges
// (`turnRows`). Elsewhere, and by edge, each row is one edge (`bookRows`).
import { GOOD_WIN, classify, type Label } from "@abstractclass/analysis/labels.ts";
import type { Player } from "@abstractclass/analysis/game.ts";
import { parseEdge, type Edge } from "#lib/engine/notation.ts";
import { playerOf } from "#lib/engine/position.ts";
import { moverOf } from "#lib/editor/position.ts";
import { LABEL_TEXT, moverWin, PLAYER_NAME } from "#lib/review/enclosure.ts";
import type { Book } from "./book.ts";
import type { BookMove, BookPosition, BookValue } from "./form.ts";
import { edgeCount, isFine, lineText, moveLabel, outsideLabel, traps } from "./sentences.ts";
import { lineEndSymbol, rounded, SYMBOL_NAME, type PositionSymbol } from "./symbols.ts";

/** The table's groups, in their order (design 32, item 3). */
export type BookGroup = "fine" | "other" | "trap" | "outside";
export const GROUP_TITLES: Record<BookGroup, string> = {
  fine: "Fine moves",
  other: "Other book moves",
  trap: "Traps: they seem good after a short search, and lose after a deep one",
  outside: "Best outside the book",
};
/** The groups' titles when the rows are whole turns. */
export const TURN_GROUP_TITLES: Record<BookGroup, string> = {
  fine: "Fine turns",
  other: "Other book turns",
  trap: GROUP_TITLES.trap,
  outside: "Best turn outside the book",
};
/** By turn, the table shows this many book turns that are not traps, and the rest after "Show more". */
export const TURNS_SHOWN = 8;

/** A row of the table: one edge, or by turn a whole turn of two edges. */
export interface BookRow {
  /** The row's number, from 1: the table's and the board's (design 07). */
  n: number;
  group: BookGroup;
  /** The row's name, by which the table and the board point at it: its edge, or a turn's two edges with a space
   *  between them ("D10-G9 Q11-T10"). */
  move: string;
  /** The row's edges, in the player's orientation: one, or a turn's two. The best turn outside the book has one edge
   *  when its first edge is outside the book: the book does not hold the second. */
  edges: string[];
  /** Its quality label by the book's values (sentences.ts, `moveLabel`, or `outsideLabel` for the best move outside
   *  the book. By turn: `turnRows`). */
  label: Label;
  /** Blue's win chance after the row's edges, by the book. */
  blueWin: number;
  /** The book's values after the row (a book row only): the win chance's bounds. */
  value?: BookValue;
  /** The symbol at the end of the main line after the row (a book row only). */
  symbol?: PositionSymbol;
  /** The book ends at the position after the row. */
  ends?: boolean;
  /** The row's last book move (a book row only). */
  book?: BookMove;
  /** A trap (design 32, item 7): Blue's win chance after the trap's edge by the short search, and the refutation, the
   *  book's line after the row's edges. A turn's refutation can be empty: then the table has no row to play it. */
  trap?: { short: number; refutation: string[] };
  /** By turn: a book turn after the best `TURNS_SHOWN`, which shows after "Show more" only. */
  more?: true;
}

/** The rows of a position's table, in their groups' order and numbered. */
export function bookRows(p: BookPosition): BookRow[] {
  const count = edgeCount(p);
  const row = (m: BookMove): BookRow => ({
    n: 0, group: m.trap ? "trap" : isFine(p, m) ? "fine" : "other", move: m.move, edges: [m.move],
    label: moveLabel(p, m), blueWin: m.value.blueWin, value: m.value, symbol: lineEndSymbol(m), ends: m.last <= count + 1,
    book: m, ...(m.trap ? { trap: m.trap } : {}),
  });
  const moves = p.moves.filter(m => !m.trap).map(row);
  // The traps: the largest gap between the short search and the deep one first (sentences.ts, `traps`)
  const rows = [...moves.filter(r => r.group === "fine"), ...moves.filter(r => r.group === "other"),
                ...traps(p).map(row)];
  if (p.outside) {
    const { move, blueWin } = p.outside;
    rows.push({ n: 0, group: "outside", move, edges: [move], blueWin, label: outsideLabel(p, blueWin) });
  }
  rows.forEach((r, k) => (r.n = k + 1));
  return rows;
}

/** Whether a position is the start of a turn of two edges: there the rows can be whole turns. The start is not: its
 *  turn has one edge. */
export const turnStart = (p: BookPosition) => p.edge === 1 && moverOf(edgeCount(p)).left === 2;

/** The rows of a turn's start by turn (design 32, item 3, "One edge at a time"): each whole turn of the book, its first
 *  edge a book move here and its second a book move of the position that the first reaches. `seconds[k]` is the book's
 *  position after the k-th book move (`p.moves[k]`): the book stores the position after each edge, with its minimaxed
 *  values, so the turns need no new search.
 *
 *  - **A turn's win chance** is the one after its second edge. Its loss is from the best turn here. By the book's
 *    minimax that is the best of the first book move's and the best move outside the book's (sentences.ts, `bestWin`).
 *    Its label comes from the loss, by the review's rule for a turn (design 10). The best book turn is Best when no
 *    turn outside the book is better. The book holds no position before the enemy's last turn, so no turn is Great,
 *    as no move is.
 *  - **The groups:** the fine turns (Good or better) and the other book turns, each by the mover's win chance, the best
 *    first. The best `TURNS_SHOWN` of them show, and the rest after "Show more". Then the traps: each turn that holds a
 *    trap's edge, the largest gap between the trap's two values first, with its refutation. A first edge's trap has
 *    the rest of its refutation after the second edge that the refutation starts with, and none after another.
 *  - **The best turn outside the book:** the best for the mover of these: the best first edge outside the book
 *    (`p.outside`), whose second edge the book does not hold, and each book move followed by the best second edge
 *    outside the book at the position that it reaches (`outside` there). */
export function turnRows(p: BookPosition, seconds: (BookPosition | null)[]): BookRow[] {
  const mover = playerOf(p.mover), count = edgeCount(p), win = (blueWin: number) => moverWin(blueWin, mover);
  const bestWin = Math.max(p.moves[0] ? win(p.moves[0].value.blueWin) : 0, p.outside ? win(p.outside.blueWin) : 0);
  const loss = (blueWin: number) => rounded(Math.max(0, bestWin - win(blueWin)));
  const turns = p.moves.flatMap((m1, k) => (seconds[k]?.moves ?? []).map((m2): BookRow => {
    const trap = turnTrap(m1, m2);
    return {
      n: 0, group: trap ? "trap" : loss(m2.value.blueWin) <= GOOD_WIN ? "fine" : "other", move: `${m1.move} ${m2.move}`,
      edges: [m1.move, m2.move], label: "best", blueWin: m2.value.blueWin, value: m2.value, symbol: lineEndSymbol(m2),
      ends: m2.last <= count + 2, book: m2, ...(trap ? { trap } : {}),
    };
  }));
  // The best turn outside the book: the start's own outside, then each first edge's
  const outsides = [
    ...(p.outside ? [{ edges: [p.outside.move], blueWin: p.outside.blueWin }] : []),
    ...p.moves.flatMap((m1, k) => {
      const o = seconds[k]?.outside;
      return o ? [{ edges: [m1.move, o.move], blueWin: o.blueWin }] : [];
    }),
  ];
  const outside = outsides.length ? outsides.reduce((a, o) => (win(o.blueWin) > win(a.blueWin) ? o : a)) : null;
  // The best book turn, and whether the best turn outside the book is better, as for a move (sentences.ts, moveLabel)
  const bookBest = turns.reduce<BookRow | null>((a, r) => (!a || win(r.blueWin) > win(a.blueWin) ? r : a), null);
  const outsideBetter = !!outside && (!bookBest || win(outside.blueWin) > win(bookBest.blueWin));
  for (const r of turns) r.label = classify(loss(r.blueWin), r === bookBest && !outsideBetter, false);
  const byWin = (rows: BookRow[]) => rows.sort((a, b) => win(b.blueWin) - win(a.blueWin));
  const gap = (r: BookRow) => win(r.trap!.short) - win(r.blueWin);
  const plain = [...byWin(turns.filter(r => r.group === "fine")), ...byWin(turns.filter(r => r.group === "other"))];
  plain.slice(TURNS_SHOWN).forEach(r => (r.more = true));
  const rows = [...plain, ...turns.filter(r => r.group === "trap").sort((a, b) => gap(b) - gap(a))];
  if (outside) {
    rows.push({ n: 0, group: "outside", move: outside.edges.join(" "), edges: outside.edges, blueWin: outside.blueWin,
                label: !bookBest ? "best" : classify(loss(outside.blueWin), outsideBetter, false) });
  }
  rows.forEach((r, k) => (r.n = k + 1));
  return rows;
}

/** A turn's trap, from its two book moves: the trap's short value, and its refutation after the turn. A second edge's
 *  refutation is the enemy's turn after it. A first edge's refutation starts with the rest of its turn: after that
 *  second edge the rest of the refutation follows, and after another second edge the book has none. Undefined when
 *  neither edge is a trap. */
function turnTrap(m1: BookMove, m2: BookMove): BookRow["trap"] {
  if (m2.trap) return { short: m1.trap?.short ?? m2.trap.short, refutation: m2.trap.refutation };
  if (!m1.trap) return undefined;
  const [rest, ...refutation] = m1.trap.refutation;
  return { short: m1.trap.short, refutation: rest === m2.move ? refutation : [] };
}

/** The row's line, as the board draws it: its edges, then the book's main line after them while the book's parts that
 *  hold it are loaded (book.ts, `peek`), or a trap's refutation. A row outside the book has its edges only. */
export function rowLine(book: Book, row: BookRow): string[] {
  const m = row.book;
  if (!m) return row.edges;
  if (row.trap) return [...row.edges, ...row.trap.refutation];
  const line = [...row.edges];
  for (let at = book.peek(m.to); at && at.moves.length; at = book.peek(at.moves[0].to)) line.push(at.moves[0].move);
  return line;
}

/** A trap's refutation in the notation, from the position after the row's edges: "4. N12-Q10 L11-O12", or "3... F9-J10
 *  4. …" when it finishes the trap's turn first. The row "Play the refutation" shows it. */
export const rowRefutation = (p: BookPosition, row: BookRow) =>
  lineText(edgeCount(p) + row.edges.length, row.trap!.refutation);

/** The rows as the board numbers them (Board.svelte, BoardCandidate: design 07), each with its note: its label, and the
 *  symbol at its line's end in words. The board numbers a row's first edge. By turn, rows can share a first edge: the
 *  edge takes the number of its first row. */
export function rowCandidates(rows: BookRow[]): { edge: Edge; rank: number; note: string }[] {
  const firsts = rows.filter((r, k) => rows.findIndex(o => o.edges[0] === r.edges[0]) === k);
  return firsts.map(r => ({
    edge: parseEdge(r.edges[0]), rank: r.n,
    note: [LABEL_TEXT[r.label], r.trap && "a trap", r.symbol && SYMBOL_NAME[r.symbol],
           r.group === "outside" && "not in the book"].filter(Boolean).join(" · "),
  }));
}

/** The row's line (rowLine) as the board draws it (Board.svelte, BoardLineEdge): each edge with its mover, from the
 *  edge count (editor/position.ts, moverOf). */
export function rowBoardLine(book: Book, p: BookPosition, row: BookRow): { edge: Edge; player: Player }[] {
  const count = edgeCount(p);
  return rowLine(book, row).map((e, i) => ({ edge: parseEdge(e), player: moverOf(count + i).player }));
}

/** The count of the position's book moves, as the table announces it once a step: "4 book moves, 1 trap". */
export function bookCount(p: BookPosition): string {
  if (!p.moves.length) return "End of the book";
  const traps = p.moves.filter(m => m.trap).length, n = p.moves.length;
  return `${n} book move${n === 1 ? "" : "s"}` + (traps ? `, ${traps} trap${traps === 1 ? "" : "s"}` : "");
}

/** The count of a turn's start's book turns, as the table announces it by turn: "12 book turns, 2 traps". */
export function turnCount(rows: BookRow[]): string {
  const turns = rows.filter(r => r.book), traps = turns.filter(r => r.trap).length, n = turns.length;
  if (!n) return "End of the book";
  return `${n} book turn${n === 1 ? "" : "s"}` + (traps ? `, ${traps} trap${traps === 1 ? "" : "s"}` : "");
}

/** The position as the title row names it (design 32, item 3): "Start · Blue to play", or the turn, the side to move
 *  and the edge of the turn. */
export function positionTitle(p: BookPosition): string {
  const side = PLAYER_NAME[playerOf(p.mover)], count = edgeCount(p);
  if (count === 0) return `Start · ${side} to play`;
  // The turn's edges: those played in it and those left (moverOf), as the review's title row counts them
  return `Turn ${p.turn} · ${side} to play, edge ${p.edge} of ${p.edge - 1 + moverOf(count).left}`;
}
