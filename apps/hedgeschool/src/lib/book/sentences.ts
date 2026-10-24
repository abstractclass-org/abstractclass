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
import type { Book } from "./book.ts";
import type { BookMove, BookPosition } from "./form.ts";
import { SYMBOL_CLAUSE, SYMBOL_NAME, SYMBOL_STATE, lineEndSymbol, positionSymbol } from "./symbols.ts";

/** Where an edge goes in the game: its turn (1 to 61) and its place in the turn (1 or 2). Turn 1 has one edge. */
export interface TurnPlace { turn: number; edge: 1 | 2 }

/** The place of the edge after the edge at `at`. */
export const nextPlace = ({ turn, edge }: TurnPlace): TurnPlace =>
  turn === 1 || edge === 2 ? { turn: turn + 1, edge: 1 } : { turn, edge: 2 };

/** A line in the notation (the site's /notation page), from the edge at `at`: `3. D10-G12 G12-J15`, and `2...` before
 *  a line that starts at a turn's second edge: `2... N11-Q10 3. G9-K10 K10-M7`. */
export function lineText(at: TurnPlace, edges: string[]): string {
  const words: string[] = [];
  edges.forEach((e, i) => {
    if (i === 0) words.push(at.edge === 2 ? `${at.turn}...` : `${at.turn}.`);
    else if (at.edge === 1) words.push(`${at.turn}.`);
    words.push(e);
    at = nextPlace(at);
  });
  return words.join(" ");
}

/** A position's edge count: the fifth field of its notation. */
const edgeCount = (p: BookPosition) => Number(p.position.split(" ")[4]);
/** The mover's win chance after a move, from the values that the book gives in Blue's. */
const win = (p: BookPosition, blueWin: number) => moverWin(blueWin, playerOf(p.mover));
/** A loss of win chance, rounded so that the values' own decimals decide a band, not the floating point's. */
const rounded = (x: number) => Math.round(x * 1e6) / 1e6;

/** Whether the best move outside the book is better for the mover than the first book move. */
const outsideBetter = (p: BookPosition) =>
  !!p.outside && p.moves.length > 0 && win(p, p.outside.blueWin) > win(p, p.moves[0].value.blueWin);

/** A book move's loss of win chance for the mover, from the best move here: the first book move, or the best move
 *  outside the book when it is better (design 10, the engine's first choice). */
export function moveLoss(p: BookPosition, m: BookMove): number {
  const best = Math.max(...[...p.moves.slice(0, 1).map(b => b.value.blueWin), ...(p.outside ? [p.outside.blueWin] : [])]
    .map(w => win(p, w)));
  return rounded(Math.max(0, best - win(p, m.value.blueWin)));
}

/** A book move's label by design 10, from its loss (`moveLoss`). The first book move is Best when nothing outside the
 *  book is better. The book has no position before the opponent's last turn here, so it gives no Great: the table
 *  groups Best and Great as fine moves. */
export function moveLabel(p: BookPosition, m: BookMove): Label {
  return classify(moveLoss(p, m), m === p.moves[0] && !outsideBetter(p), false);
}

/** A fine move: Good or better (design 32, item 3, "Fine moves"). */
export const isFine = (p: BookPosition, m: BookMove) => moveLoss(p, m) <= GOOD_WIN;

/** Whether a move's main line ends at the position that the move reaches. */
const lineEndsAfter = (p: BookPosition, m: BookMove) => m.end.count === edgeCount(p) + 1;

/** One turn of a main line, with its sentence. */
export interface LineTurn {
  /** The turn's number and the place of its first edge (2 when the line starts at a turn's second edge). */
  at: TurnPlace;
  /** The turn's book moves on the main line: one or two edges. */
  edges: string[];
  sentence: string;
}

/** The sentence of a main line's turn: from `first`, the position before the turn's first edge on the line, and
 *  `second`, the position after it. `second` is needed when the turn has a second edge on the line. Example:
 *  "2. N11-Q10 L10-N11 keep the game equal. The best other book move is 2... L10-O9. After it, Red is slightly
 *  better." */
export function turnSentence(first: BookPosition, second?: BookPosition | null): LineTurn {
  const m1 = first.moves[0];
  if (!m1) throw new Error(`${first.position}: no book move, so no main line`);
  const twoEdges = first.edge === 1 && first.turn > 1 && !lineEndsAfter(first, m1);
  if (twoEdges && second?.position !== m1.to) throw new Error(`${first.position}: the turn needs the position after ${m1.move}`);
  const [at, line] = twoEdges && second ? [second, second.moves[0]] : [first, m1];
  const edges = twoEdges ? [m1.move, line.move] : [m1.move];
  const place = { turn: first.turn, edge: first.edge };
  const end = lineEndSymbol(line), plural = edges.length > 1;
  const verb = positionSymbol(first) === end ? (plural ? "keep" : "keeps") : (plural ? "leave" : "leaves");
  const parts = [`${lineText(place, edges)} ${verb} ${SYMBOL_STATE[end]}.`];
  // The other book moves of the turn, at its first edge and at its second: the mover's best of them
  const others = [first, ...(twoEdges ? [at] : [])].flatMap(p => p.moves.slice(1).map(m => ({ p, m })));
  const other = others.reduce<(typeof others)[number] | undefined>(
    (best, o) => (!best || win(o.p, o.m.value.blueWin) > win(best.p, best.m.value.blueWin) ? o : best), undefined);
  if (other) {
    parts.push(`The best other book move is ${lineText(other.p, [other.m.move])}.`,
      `After it, ${SYMBOL_CLAUSE[lineEndSymbol(other.m)]}.`);
  } else parts.push("The book has no other move in this turn.");
  if (lineEndsAfter(at, line)) parts.push("The main line ends here.");
  return { at: place, edges, sentence: parts.join(" ") };
}

/** The book's main line from a position (the start by default), one turn a sentence: the box of Openings' first view
 *  (design 32, item 5). It follows each position's first book move to the end of that move's main line. It rejects as
 *  the book's lookups do. */
export async function mainLine(book: Book, from: string = book.start): Promise<LineTurn[]> {
  const turns: LineTurn[] = [];
  let p = await book.get(from);
  while (p?.moves.length) {
    const m = p.moves[0];
    const next = await book.get(m.to);
    const turn = turnSentence(p, next);
    turns.push(turn);
    if (turn.sentence.endsWith("The main line ends here.")) break;
    p = turn.edges.length > 1 ? await book.get(next!.moves[0].to) : next;
  }
  return turns;
}

/** The sentence under the table: the best book move of a position (design 32, item 6), and the trap that it avoids.
 *  Null where the book ends: `endSentence` gives that position's text. Example: "F9-J10 is the only fine move here.
 *  After it, Red is winning." */
export function bestMoveSentence(p: BookPosition): string | null {
  const best = p.moves[0];
  if (!best) return null;
  const after = `After it, ${SYMBOL_CLAUSE[lineEndSymbol(best)]}.`;
  let parts: string[];
  if (outsideBetter(p)) {
    parts = [`${best.move} is the best book move here.`, after, `${p.outside!.move} is better, but it is not in the book.`];
  } else {
    // "book" when a move outside the book is fine too, so that the count stays true
    const kind = p.outside && rounded(win(p, best.value.blueWin) - win(p, p.outside.blueWin)) <= GOOD_WIN
      ? "book move" : "move";
    const fine = p.moves.filter(m => isFine(p, m)).length;
    parts = [fine === 1 ? `${best.move} is the only fine ${kind} here.`
      : `${best.move} is the best of the ${fine} fine ${kind}s here.`, after];
  }
  const trap = traps(p).find(t => t !== best);
  if (trap) {
    parts.push(`This move avoids a trap: ${trap.move} seems good after a short search, but ` +
      `${lineText(nextPlace(p), trap.trap!.refutation)} leaves ${SYMBOL_STATE[lineEndSymbol(trap)]}.`);
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
  const side = p.mover === "b" ? "Blue" : "Red";
  return `${m.move} seems good after a short search (${side} ${pct(win(p, m.trap.short))}). ` +
    `After ${lineText(nextPlace(p), m.trap.refutation)}, ${SYMBOL_CLAUSE[lineEndSymbol(m)]} ` +
    `(${side} ${pct(win(p, m.value.blueWin))}).`;
}

/** A book move's sentence: the row's sentence for the pointer or the focus. The best move's is `bestMoveSentence`, a
 *  trap's is `trapSentence`, and any other book move's gives its label and the end of its line. Example: "D10-G9 is an
 *  Inaccuracy here. After it, Red is slightly better." */
export function moveSentence(p: BookPosition, m: BookMove): string {
  if (m === p.moves[0]) return bestMoveSentence(p)!;
  if (m.trap) return trapSentence(p, m);
  const label = moveLabel(p, m), name = LABEL_TEXT[label];
  const what = isFine(p, m) ? `${article(name)} ${name} move` : `${article(name)} ${name}`;
  return `${m.move} is ${what} here. After it, ${SYMBOL_CLAUSE[lineEndSymbol(m)]}.`;
}

/** The text where the book ends (design 32, item 5): "End of the book. Blue is slightly better." */
export const endSentence = (p: BookPosition) => `End of the book. ${SYMBOL_NAME[positionSymbol(p)]}.`;

const article = (word: string) => (/^[AEIOU]/.test(word) ? "an" : "a");
