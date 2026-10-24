// The book's sentences (design 32, item 6), built from the book's values as the review builds its sentences from checked
// engine facts (design 04), never from a language model. Each function takes positions as the loader gives them (book.ts,
// `Book`: in the player's orientation) and gives the text that the table (beads abscls-tpaj.5) and Openings
// (abscls-tpaj.12) show. The facts: how a line ends (its symbol, symbols.ts), how the other book moves end, the labels
// of the book moves (design 10), the traps that the best move avoids, and a trap's two values and its refutation. No
// sentence says what a turn encloses: such sentences were exact and misleading (design 30, "Why").
//
// The words are strict Simplified Technical English (CLAUDE.md, "Writing the site's text"), from the templates of
// docs/ux/book-explorer/journey-book-explorer.md, "Copy specifications". Two departures, for one word one meaning: a
// trap "seems good after a short search", not "looks good at a short look", and the best other move of a turn gets a
// sentence of its own ("The best other book move is …").
import { GOOD_WIN, classify, type Label } from "@abstractclass/analysis/labels.ts";
import { LABEL_TEXT, moverWin, pct } from "@abstractclass/analysis/model.ts";
import { playerOf } from "#lib/engine/position.ts";
import { PLAYER_NAME, turnFromCount } from "#lib/review/enclosure.ts";
import type { Book } from "./book.ts";
import type { BookMove, BookPosition } from "./form.ts";
import { SYMBOL_NAME, rounded, symbol, type PositionSymbol } from "./symbols.ts";

/** A line in the notation (the site's /notation page), from the position after `count` edges: `3. D10-G12 G12-J15`,
 *  and `2...` before a line that starts at a turn's second edge: `2... N11-Q10 3. G9-K10 K10-M7`. */
export const lineText = (count: number, edges: string[]) => edges.map((e, i) => {
  const { turn, first } = turnFromCount(count + i);
  return i === 0 ? `${turn}${first ? "." : "..."} ${e}` : first ? `${turn}. ${e}` : e;
}).join(" ");

/** A position's edge count: the fifth field of its notation. */
const edgeCount = (p: BookPosition) => Number(p.position.split(" ")[4]);
/** The side to move, by name. */
const side = (p: BookPosition) => PLAYER_NAME[playerOf(p.mover)];
/** The mover's win chance, from Blue's. */
const win = (p: BookPosition, blueWin: number) => moverWin(blueWin, playerOf(p.mover));
/** The mover's best win chance here: the first book move's, or the best move outside the book's when it is better
 *  (design 10, the engine's first choice). */
const bestWin = (p: BookPosition) =>
  Math.max(win(p, p.moves[0].value.blueWin), p.outside ? win(p, p.outside.blueWin) : 0);
/** The mover's loss of win chance from the best here, for a move to Blue's win chance `blueWin`. */
const lossTo = (p: BookPosition, blueWin: number) => rounded(Math.max(0, bestWin(p) - win(p, blueWin)));
/** Whether a move is the first book move. By its edge: each lookup gives new objects. */
const isFirst = (p: BookPosition, m: BookMove) => m.move === p.moves[0]?.move;
/** Whether the best move outside the book is better for the mover than the first book move. */
const outsideBetter = (p: BookPosition) =>
  !!p.outside && p.moves.length > 0 && win(p, p.outside.blueWin) > win(p, p.moves[0].value.blueWin);

/** A position's own symbol: from its minimaxed value and its own complexity. At the book's end, the symbol in "End of
 *  the book". */
const positionSymbol = (p: BookPosition) => symbol(p.value.blueWin, p.complexity);
/** The symbol at the end of a book move's main line: the move's values are those of its line's end. */
const lineEndSymbol = (m: BookMove) => symbol(m.value.blueWin, m.end.complexity);
/** A symbol as a clause: "After it, Blue is better.", "After it, the game is equal." */
const clause = (s: PositionSymbol) =>
  s === "=" ? "the game is equal" : s === "∞" ? "the game is unclear" : SYMBOL_NAME[s];
/** A symbol after "keeps" or "leaves": "keeps the game equal", "leaves Red winning". */
const state = (s: PositionSymbol) => clause(s).replace(" is ", " ");

/** A book move's loss of win chance for the mover, from the best move here: the first book move, or the best move
 *  outside the book when it is better (design 10, the engine's first choice). */
export const moveLoss = (p: BookPosition, m: BookMove) => lossTo(p, m.value.blueWin);

/** A book move's label by design 10, from its loss (`moveLoss`). The first book move is Best when nothing outside the
 *  book is better. The book has no position before the opponent's last turn here, so it gives no Great: the table
 *  groups Best and Great as fine moves. */
export function moveLabel(p: BookPosition, m: BookMove): Label {
  return classify(moveLoss(p, m), isFirst(p, m) && !outsideBetter(p), false);
}

/** A fine move: Good or better (design 32, item 3, "Fine moves"). */
export const isFine = (p: BookPosition, m: BookMove) => moveLoss(p, m) <= GOOD_WIN;

/** Whether a move's main line ends at the position that the move reaches. */
const lineEndsAfter = (p: BookPosition, m: BookMove) => m.end.count === edgeCount(p) + 1;
/** Whether the main line's turn from `p` has two edges on the line: the next edge opens no turn, and the line goes on
 *  after it. */
const twoEdges = (p: BookPosition) => !turnFromCount(edgeCount(p) + 1).first && !lineEndsAfter(p, p.moves[0]);

/** One turn of a main line, with its sentence. */
export interface LineTurn {
  /** The turn's number and the place of its first edge on the line (2 when the line starts at a turn's second edge). */
  at: { turn: number; edge: 1 | 2 };
  /** The turn's book moves on the main line: one or two edges. */
  edges: string[];
  /** The position after the turn's last edge on the line. */
  to: string;
  /** Whether the main line ends after the turn. */
  ends: boolean;
  sentence: string;
}

/** The sentence of a main line's turn: from `first`, the position before the turn's first edge on the line, and
 *  `second`, the position after it. `second` is needed when the turn has a second edge on the line. Example:
 *  "2. N11-Q10 L10-N11 keep the game equal. The best other book move is 2... L10-O9. After it, Red is slightly
 *  better." */
export function turnSentence(first: BookPosition, second?: BookPosition | null): LineTurn {
  const m1 = first.moves[0];
  if (!m1) throw new Error(`${first.position}: no book move, so no main line`);
  const two = twoEdges(first);
  if (two && second?.position !== m1.to) throw new Error(`${first.position}: the turn needs the position after ${m1.move}`);
  const at = two ? second! : first, line = at.moves[0];
  const edges = two ? [m1.move, line.move] : [m1.move];
  const end = lineEndSymbol(line);
  const verb = (positionSymbol(first) === end ? "keep" : "leave") + (two ? "" : "s");
  const parts = [`${lineText(edgeCount(first), edges)} ${verb} ${state(end)}.`];
  // The other book moves of the turn, at its first edge and at its second: the mover's best of them
  const others = (two ? [first, at] : [first]).flatMap(p => p.moves.slice(1).map(m => ({ p, m })));
  const other = others.length
    ? others.reduce((b, o) => (win(o.p, o.m.value.blueWin) > win(b.p, b.m.value.blueWin) ? o : b)) : null;
  if (other) {
    parts.push(`The best other book move is ${lineText(edgeCount(other.p), [other.m.move])}.`,
      `After it, ${clause(lineEndSymbol(other.m))}.`);
  } else parts.push("The book has no other move in this turn.");
  const ends = lineEndsAfter(at, line);
  if (ends) parts.push("The main line ends here.");
  return { at: { turn: first.turn, edge: first.edge }, edges, to: line.to, ends, sentence: parts.join(" ") };
}

/** The book's main line from a position (the start by default), one turn a sentence: the box of Openings' first view
 *  (design 32, item 5). It follows each position's first book move to the end of that move's main line. It rejects as
 *  the book's lookups do. */
export async function mainLine(book: Book, from: string = book.start): Promise<LineTurn[]> {
  const turns: LineTurn[] = [];
  let p = await book.get(from);
  while (p?.moves.length) {
    const turn = turnSentence(p, twoEdges(p) ? await book.get(p.moves[0].to) : null);
    turns.push(turn);
    if (turn.ends) break;
    p = await book.get(turn.to);
  }
  return turns;
}

/** The sentence under the table: the best book move of a position (design 32, item 6), and the trap that it avoids.
 *  Null where the book ends: `endSentence` gives that position's text. Example: "F9-J10 is the only fine move here.
 *  After it, Red is winning." */
export function bestMoveSentence(p: BookPosition): string | null {
  const best = p.moves[0];
  if (!best) return null;
  const after = `After it, ${clause(lineEndSymbol(best))}.`;
  // "book" when a move outside the book is fine too, so that the count stays true
  const kind = p.outside && lossTo(p, p.outside.blueWin) <= GOOD_WIN ? "book move" : "move";
  const fine = p.moves.filter(m => isFine(p, m)).length;
  const parts = outsideBetter(p)
    ? [`${best.move} is the best book move here.`, after, `${p.outside!.move} is better, but it is not in the book.`]
    : [fine === 1 ? `${best.move} is the only fine ${kind} here.`
      : `${best.move} is the best of the ${fine} fine ${kind}s here.`, after];
  const trap = traps(p).find(t => t.move !== best.move);
  if (trap) {
    parts.push(`This move avoids a trap: ${trap.move} seems good after a short search, but ` +
      `${lineText(edgeCount(p) + 1, trap.trap!.refutation)} leaves ${state(lineEndSymbol(trap))}.`);
  }
  return parts.join(" ");
}

/** A position's traps, the largest gap between their two values first (design 32, item 3, "Traps"). */
export function traps(p: BookPosition): BookMove[] {
  const gap = (m: BookMove) => win(p, m.trap!.short) - win(p, m.value.blueWin);
  return p.moves.filter(m => m.trap).sort((a, b) => gap(b) - gap(a));
}

/** A trap's sentence: why it tempts, and its refutation with the end that it leads to. Example: "F9-J7 seems good
 *  after a short search (Blue 41.4%). After 4. N12-Q10 L11-O12, Red is winning (Blue 16.6%)." */
export function trapSentence(p: BookPosition, m: BookMove): string {
  if (!m.trap) throw new Error(`${p.position}: ${m.move} is not a trap`);
  return `${m.move} seems good after a short search (${side(p)} ${pct(win(p, m.trap.short))}). ` +
    `After ${lineText(edgeCount(p) + 1, m.trap.refutation)}, ${clause(lineEndSymbol(m))} ` +
    `(${side(p)} ${pct(win(p, m.value.blueWin))}).`;
}

/** A book move's sentence: the row's sentence for the pointer or the focus. The best move's is `bestMoveSentence`, a
 *  trap's is `trapSentence`, and any other book move's gives its label and the end of its line. Example: "D10-G9 is an
 *  Inaccuracy here. After it, Red is slightly better." */
export function moveSentence(p: BookPosition, m: BookMove): string {
  if (isFirst(p, m)) return bestMoveSentence(p)!;
  if (m.trap) return trapSentence(p, m);
  const name = LABEL_TEXT[moveLabel(p, m)];
  return `${m.move} is ${article(name)} ${name}${isFine(p, m) ? " move" : ""} here. ` +
    `After it, ${clause(lineEndSymbol(m))}.`;
}

/** The text where the book ends (design 32, item 5): "End of the book. Blue is slightly better." */
export const endSentence = (p: BookPosition) => `End of the book. ${SYMBOL_NAME[positionSymbol(p)]}.`;

const article = (word: string) => (/^[AEIOU]/.test(word) ? "an" : "a");
