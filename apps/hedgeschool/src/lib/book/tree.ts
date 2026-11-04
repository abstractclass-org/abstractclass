// The book's tree in Openings' move list (design 32, item 5). The main line is the best move at each position, to the
// end of its main line (sentences.ts, `mainLine`). The other book moves hang under the move before them, folded. When
// the player opens a fold or plays a book move, the page adds each move's line: the move, a trap's refutation after it,
// then the best book moves to the end of the move's main line (`bookLine`). A position that move orders from other
// lines reach shows its subtree once, under its canonical parent: its first parent in the book (form.ts, BookPosition
// `parents`), as KataGo's book pages name one canonical parent. A line that reaches it by another parent ends there,
// with a link to the canonical line (`continues`). The book stores a position and its mirror image as one, and its
// lookups give each position as the player reached it (book.ts), so a line through a mirror image stays in the
// player's orientation.
//
// The functions take positions as the loader gives them, and paths as the move list names them: the edges from the
// start, in the notation.
import { bookMove, type Book } from "./book.ts";
import type { BookMove, BookPosition } from "./form.ts";
import { edgeCount, lineText, mainLine } from "./sentences.ts";

/** The edges of the book's main line from the start. It rejects as the book's lookups do. */
export async function mainEdges(book: Book): Promise<string[]> {
  return (await mainLine(book)).flatMap(t => t.edges);
}

/** The book's positions along a line from the start, as the player reaches them: the start, then the position after
 *  each edge while the edges are book moves. It rejects as the book's lookups do. */
export async function positionsAlong(book: Book, line: string[]): Promise<BookPosition[]> {
  const out: BookPosition[] = [];
  for (let q = await book.get(book.start), k = 0; q; k++) {
    out.push(q);
    const m = k < line.length ? bookMove(q, line[k]) : undefined;
    q = m ? await book.get(m.to) : null;
  }
  return out;
}

/** Whether the edge `edge` from the position `from` (its notation as the player reached it) is the canonical way to
 *  `to`: its first parent. The start has no parent. */
export const canonical = (to: BookPosition, from: string, edge: string) =>
  !to.parents.length || (to.parents[0].position === from && to.parents[0].move === edge);

/** A book move's line from `from`: the move, a trap's refutation after it, then the best book move at each position to
 *  the end of the move's main line (form.ts, BookMove `end`). The line stops at the end of the book, and after a move
 *  that reaches a position by another way than its canonical parent: that position's subtree is under the other parent
 *  (`continues`). It rejects as the book's lookups do. */
export async function bookLine(book: Book, from: BookPosition, m: BookMove): Promise<string[]> {
  const edges = [m.move];
  let here = await book.get(m.to);
  if (!here || !canonical(here, from.position, m.move)) return edges;
  const planned = [...(m.trap?.refutation ?? [])];
  for (;;) {
    const next = planned.shift() ?? (edgeCount(here) < m.end.count ? here.moves[0]?.move : undefined);
    const move = next === undefined ? undefined : bookMove(here, next);
    if (!move) return edges;
    const after = await book.get(move.to);
    if (!after) return edges;
    edges.push(next!);
    if (!canonical(after, here.position, next!)) return edges;
    here = after;
  }
}

/** The canonical line to a position: from the start, through each position's first parent, in the orientation in which
 *  the player reached it. It rejects as the book's lookups do, and throws where the book lacks a parent. */
export async function canonicalPath(book: Book, p: BookPosition): Promise<string[]> {
  const edges: string[] = [];
  for (let at = p; at.parents.length;) {
    const parent = at.parents[0], before = await book.get(parent.position);
    if (!before) throw new Error(`the book lacks ${parent.position}, a parent of ${at.position}`);
    edges.unshift(parent.move);
    at = before;
  }
  return edges;
}

/** The turn that a line's last edge ends or starts, in the notation: "2. N11-Q10 L10-N11", or "1. A10-D9" for a turn
 *  of one edge, or for a line that reaches a position after a turn's first edge. `before`: the position before the
 *  line's last edge. */
export function lastTurn(line: string[], before: BookPosition): string {
  const k = before.edge === 2 && line.length > 1 ? 2 : 1;
  return lineText(edgeCount(before) + 1 - k, line.slice(-k));
}

/** A link from a line that reaches a position by another way than its canonical parent, to the canonical line that
 *  holds the position's subtree: its words and its path. The words name the canonical line's last turn, and the main
 *  line as such: "Continues in the main line, 2. N11-Q10 L10-N11", or "Continues in 3. D10-G12 A10-D9". */
export interface LineLink { text: string; to: string[] }
export async function continues(book: Book, p: BookPosition, main: string[]): Promise<LineLink | null> {
  if (!p.parents.length) return null;
  const to = await canonicalPath(book, p), before = await book.get(p.parents[0].position);
  if (!before) return null;
  const onMain = to.length <= main.length && to.every((e, k) => e === main[k]);
  return { text: `Continues in ${onMain ? "the main line, " : ""}${lastTurn(to, before)}`, to };
}

/** The other move orders that reach a position, for the title row's "Also reached by" (design 32, item 5): each parent
 *  except the one on the player's path, with its canonical line and its last turn's words. A turn's two edges in the
 *  other order are one variation, as the table's one row a position (design 32, item 3), so they are left out: the list
 *  is for the move orders across turns. `path`: the player's edges to the position, and `notations` the notation of
 *  each position on it, the start first. */
export async function alsoReached(book: Book, p: BookPosition, path: string[], notations: string[]): Promise<LineLink[]> {
  const out: LineLink[] = [];
  const [from, before, last, secondLast] = [notations.at(-2), notations.at(-3), path.at(-1), path.at(-2)];
  for (const parent of p.parents) {
    if (parent.position === from && parent.move === last) continue; // the player's own way
    const q = await book.get(parent.position);
    if (!q) continue;
    // The other order of the turn's two edges: from the turn's start, the player's last edge, then their second last
    if (q.edge === 2 && parent.move === secondLast && q.parents.some(r => r.position === before && r.move === last)) continue;
    const to = [...await canonicalPath(book, q), parent.move];
    out.push({ text: lastTurn(to, q), to });
  }
  return out;
}

/** The book moves that a fold holds at a position: each book move there except the one that the move list shows after
 *  it (`next`, none at a line's end). */
export const folded = (p: BookPosition, next: string | null) => p.moves.filter(m => m.move !== next);

/** A fold's words, its button's text: how many book moves it holds, and the move that they replace. */
export function foldText(count: number, next: string | null, previous: string | null): string {
  const moves = `${count} ${next ? "other " : ""}book move${count === 1 ? "" : "s"}`;
  return next ? `${moves} instead of ${next}` : previous ? `${moves} after ${previous}` : moves;
}
