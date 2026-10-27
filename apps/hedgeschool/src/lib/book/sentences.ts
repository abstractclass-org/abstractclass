// The book's sentences (design 32, item 6), built from the book's values as the review builds its sentences from checked
// engine facts (design 04), never from a language model. Each function takes positions as the loader gives them (book.ts,
// `Book`: in the player's orientation) and gives the text that the table (beads abscls-tpaj.5), Openings
// (abscls-tpaj.12) and the review's Report (abscls-tpaj.6) show. The facts: how a line ends (its symbol, symbols.ts), how the other book moves end, a better
// move outside the book, the labels of the book moves (design 10), the traps that the best move avoids, and what a trap
// costs the side that plays it, with its refutation. No sentence says what a turn encloses: such sentences were exact
// and misleading (design 30, "Why").
//
// The words are strict Simplified Technical English (CLAUDE.md, "Writing the site's text"), from the templates of
// docs/ux/book-explorer/journey-book-explorer.md, "Copy specifications". Design 32, item 6, gives where they depart
// from the first templates, and why.
import { GOOD_WIN, classify, type Label } from "@abstractclass/analysis/labels.ts";
import { LABEL_TEXT, moverWin, pct } from "@abstractclass/analysis/model.ts";
import { playerOf } from "#lib/engine/position.ts";
import { PLAYER_NAME, otherPlayer, turnFromCount } from "#lib/review/enclosure.ts";
import type { Book } from "./book.ts";
import type { BookMove, BookPosition } from "./form.ts";
import type { BookRow } from "./rows.ts";
import { SYMBOL_NAME, lineEndSymbol, positionSymbol, rounded, type PositionSymbol } from "./symbols.ts";

/** A line in the notation (the site's /notation page), from the position after `count` edges: `3. D10-G12 G12-J15`,
 *  and `2...` before a line that starts at a turn's second edge: `2... N11-Q10 3. G9-K10 K10-M7`. */
export const lineText = (count: number, edges: string[]) => edges.map((e, i) => {
  const { turn, first } = turnFromCount(count + i);
  return i === 0 ? `${turn}${first ? "." : "..."} ${e}` : first ? `${turn}. ${e}` : e;
}).join(" ");

/** A position's edge count: the fifth field of its notation. */
export const edgeCount = (p: BookPosition) => Number(p.position.split(" ")[4]);
/** The side to move, by name. */
const side = (p: BookPosition) => PLAYER_NAME[playerOf(p.mover)];
/** The mover's win chance, from Blue's. */
const win = (p: BookPosition, blueWin: number) => moverWin(blueWin, playerOf(p.mover));
/** The mover's best win chance here: the first book move's, or the best move outside the book's when it is better
 *  (design 10, the engine's first choice). */
const bestWin = (p: BookPosition) =>
  Math.max(win(p, p.moves[0].value.blueWin), p.outside ? win(p, p.outside.blueWin) : 0);
/** The mover's loss of win chance from the best here, for a move to Blue's win chance `blueWin`. At a turn's start it
 *  is also a whole turn's loss: by the book's minimax, the best move's win chance here is the best turn's. */
export const lossTo = (p: BookPosition, blueWin: number) => rounded(Math.max(0, bestWin(p) - win(p, blueWin)));
/** Whether a move is the first book move. By its edge: each lookup gives new objects. */
const isFirst = (p: BookPosition, m: BookMove) => m.move === p.moves[0]?.move;
/** Whether the best move outside the book is better for the mover than the first book move. */
const outsideBetter = (p: BookPosition) =>
  !!p.outside && p.moves.length > 0 && win(p, p.outside.blueWin) > win(p, p.moves[0].value.blueWin);

/** A symbol as a clause: "After it, Blue is better.", "After it, the game is equal." */
const clause = (s: PositionSymbol) =>
  s === "=" ? "the game is equal" : s === "∞" ? "the game is unclear" : SYMBOL_NAME[s];
/** A symbol after "keeps" or "leaves": "keeps the game equal", "leaves Red winning". */
const state = (s: PositionSymbol) => clause(s).replace(" is ", " ");

/** A book move's loss of win chance for the mover, from the best move here: the first book move, or the best move
 *  outside the book when it is better (design 10, the engine's first choice). */
export const moveLoss = (p: BookPosition, m: BookMove) => lossTo(p, m.value.blueWin);

/** A book move's label by design 10, from its loss (`moveLoss`). The first book move is Best when nothing outside the
 *  book is better. The book has no position before the enemy's last turn here, so it gives no Great: the table
 *  groups Best and Great as fine moves. */
export function moveLabel(p: BookPosition, m: BookMove): Label {
  return classify(moveLoss(p, m), isFirst(p, m) && !outsideBetter(p), false);
}

/** The quality label of the best move outside the book (`p.outside`, Blue's win chance after it `blueWin`), by the
 *  same bands: Best when it is better than the first book move, or when the book has no move here. */
export const outsideLabel = (p: BookPosition, blueWin: number): Label =>
  !p.moves.length ? "best" : classify(lossTo(p, blueWin), outsideBetter(p), false);

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

/** A main line's turn and its sentence: from `first`, the position before the turn's first edge on the line, and
 *  `second`, the position after it. `second` is needed when the turn has a second edge on the line. Example:
 *  "2. N11-Q10 L10-N11 keep the game equal. The best other book move is 2... L10-O9. After it, Red is slightly
 *  better." */
export function lineTurn(first: BookPosition, second?: BookPosition | null): LineTurn {
  const m1 = first.moves[0];
  if (!m1) throw new Error(`${first.position}: no book move, so no main line`);
  const two = twoEdges(first);
  if (two && second?.position !== m1.to) throw new Error(`${first.position}: the turn needs the position after ${m1.move}`);
  // The positions before the turn's edges on the line, and its last book move
  const steps = two ? [first, second!] : [first], last = steps[steps.length - 1].moves[0];
  const edges = steps.map(q => q.moves[0].move);
  const end = lineEndSymbol(last);
  const verb = (positionSymbol(first) === end ? "keep" : "leave") + (two ? "" : "s");
  const parts = [`${lineText(edgeCount(first), edges)} ${verb} ${state(end)}.`];
  // The symbol before the turn counts a better move outside the book: the sentence names it
  for (const q of steps.filter(outsideBetter))
    parts.push(`${lineText(edgeCount(q), [q.outside!.move])} is better, but it is not in the book.`);
  // The other book moves of the turn, at its first edge and at its second: the mover's best of them
  const others = steps.flatMap(q => q.moves.slice(1).map(m => ({ q, m })));
  const other = others.length
    ? others.reduce((b, o) => (win(o.q, o.m.value.blueWin) > win(b.q, b.m.value.blueWin) ? o : b)) : null;
  if (other) {
    parts.push(`The best other book move is ${lineText(edgeCount(other.q), [other.m.move])}.`,
      `After it, ${clause(lineEndSymbol(other.m))}.`);
  } else parts.push("The book has no other move in this turn.");
  const ends = lineEndsAfter(steps[steps.length - 1], last);
  if (ends) parts.push("The main line ends here.");
  return { at: { turn: first.turn, edge: first.edge }, edges, to: last.to, ends, sentence: parts.join(" ") };
}

/** The book's main line from a position (the start by default), one turn a sentence: the box of Openings' first view
 *  (design 32, item 5). It follows each position's first book move to the end of that move's main line. It rejects as
 *  the book's lookups do. */
export async function mainLine(book: Book, from: string = book.start): Promise<LineTurn[]> {
  const turns: LineTurn[] = [];
  let p = await book.get(from);
  while (p?.moves.length) {
    const turn = lineTurn(p, twoEdges(p) ? await book.get(p.moves[0].to) : null);
    turns.push(turn);
    if (turn.ends) break;
    p = await book.get(turn.to);
  }
  return turns;
}

/** A trap's refutation in the notation, from `p` after the `played` edges of the trap's row (the trap's edge, or by turn
 *  a whole turn): "4. N12-Q10 L11-O12", or "3... F9-J10 4. …" when it finishes the trap's turn first. The sentence and
 *  the table's row "Play the refutation" show it. */
export const refutationText = (p: BookPosition, played: number, refutation: string[]) =>
  lineText(edgeCount(p) + played, refutation);

/** A trap: why it tempts, what it costs the side that plays it (that side's win chance with the best move here and
 *  after the trap), and its refutation with the end that it leads to. `t`: the trap's edge or turn (`move`), Blue's
 *  win chance after it and the symbol at its line's end. `after`: its refutation in the notation, or "it" where the
 *  book holds none. `again` names the trap after "but": its edge after "This move avoids a trap:", where "it" could
 *  read as this move. Only the win chance shows the cost always: a trap can keep the symbol, as from Blue 36.4% to
 *  16.6% with "Red is winning" before and after. */
const trapText = (p: BookPosition, t: { move: string; blueWin: number; symbol?: PositionSymbol }, after: string,
                  again: string) =>
  `${t.move} seems good after a short search, but ${again} decreases ${side(p)}'s win chance from ` +
  `${pct(bestWin(p))} to ${pct(win(p, t.blueWin))}. After ${after}, ${clause(t.symbol!)}.`;
/** A book move's trap text (`trapText`). */
const moveTrapText = (p: BookPosition, m: BookMove, again: string) =>
  trapText(p, { move: m.move, blueWin: m.value.blueWin, symbol: lineEndSymbol(m) },
           refutationText(p, 1, m.trap!.refutation), again);

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
  // The first book move can be a trap only where a move outside the book is better
  if (best.trap) parts.push(`This move is a trap: ${moveTrapText(p, best, best.move)}`);
  const trap = traps(p).find(t => t.move !== best.move);
  if (trap) parts.push(`This move avoids a trap: ${moveTrapText(p, trap, trap.move)}`);
  return parts.join(" ");
}

/** A position's traps, the largest gap between their two values first (design 32, item 3, "Traps"). */
export function traps(p: BookPosition): BookMove[] {
  const gap = (m: BookMove) => win(p, m.trap!.short) - win(p, m.value.blueWin);
  return p.moves.filter(m => m.trap).sort((a, b) => gap(b) - gap(a));
}

/** A trap's sentence (`trapText`). Its two values are in its move cell (design 32, item 7), not here: the short
 *  search's value is often below the deep value with the best move, so beside it the value could not show why the trap
 *  tempts. Example: "F9-J7 seems good after a short search, but it decreases Blue's win chance from 45.0% to 16.6%.
 *  After 4. N12-Q10 L11-O12, Red is winning." */
export function trapSentence(p: BookPosition, m: BookMove): string {
  if (!m.trap) throw new Error(`${p.position}: ${m.move} is not a trap`);
  return moveTrapText(p, m, "it");
}

/** A book move's sentence: the row's sentence for the pointer or the focus. A trap's is `trapSentence`, the first book
 *  move's too, as its row is in the group of traps. The best move's is `bestMoveSentence`, and any other book move's
 *  gives its label and the end of its line. Example: "D10-G9 is an Inaccuracy here. After it, Red is slightly
 *  better." */
export function moveSentence(p: BookPosition, m: BookMove): string {
  if (m.trap) return trapSentence(p, m);
  if (isFirst(p, m)) return bestMoveSentence(p)!;
  const name = LABEL_TEXT[moveLabel(p, m)];
  return `${m.move} is ${article(name)} ${name}${isFine(p, m) ? " move" : ""} here. ` +
    `After it, ${clause(lineEndSymbol(m))}.`;
}

// --- By turn (rows.ts, `turnRows`): the same sentences for whole turns, from the table's rows ----------------------

/** A trap turn's text (`trapText`), with its refutation after the turn where the book holds one. */
const turnTrapText = (p: BookPosition, row: BookRow, again: string) =>
  trapText(p, row, row.trap!.refutation.length ? refutationText(p, row.edges.length, row.trap!.refutation) : "it",
           again);

/** The sentence under the table by turn, at a turn's start: the best book turn, and the trap that it avoids, as
 *  `bestMoveSentence`. Null where the book has no turn here. Example: "D10-G9 Q11-T10 is the best of the 3 fine turns
 *  here. After it, Red is slightly better." */
export function bestTurnSentence(p: BookPosition, rows: BookRow[]): string | null {
  const turns = rows.filter(r => r.book);
  if (!turns.length) return null;
  const best = turns.reduce((b, r) => (win(p, r.blueWin) > win(p, b.blueWin) ? r : b));
  const outside = rows.find(r => r.group === "outside");
  const after = `After it, ${clause(best.symbol!)}.`;
  const kind = outside && lossTo(p, outside.blueWin) <= GOOD_WIN ? "book turn" : "turn";
  const fine = rows.filter(r => r.group === "fine").length;
  const parts = outside?.label === "best"
    ? [`${best.move} is the best book turn here.`, after, `${outside.move} is better, but it is not in the book.`]
    : [fine === 1 ? `${best.move} is the only fine ${kind} here.`
      : `${best.move} is the best of the ${fine} fine ${kind}s here.`, after];
  if (best.trap) parts.push(`This turn is a trap: ${turnTrapText(p, best, best.move)}`);
  const trap = rows.find(r => r.group === "trap" && r !== best);
  if (trap) parts.push(`This turn avoids a trap: ${turnTrapText(p, trap, trap.move)}`);
  return parts.join(" ");
}

/** A book turn's sentence, for the pointer or the focus, as `moveSentence`: a trap's, the best turn's, or its label
 *  and the end of its line. Example: "D10-G9 O9-Q10 is an Inaccuracy here. After it, Red is better." */
export function turnSentence(p: BookPosition, rows: BookRow[], row: BookRow): string {
  if (row.trap) return turnTrapText(p, row, "it");
  if (row.label === "best") return bestTurnSentence(p, rows)!;
  const name = LABEL_TEXT[row.label];
  return `${row.move} is ${article(name)} ${name}${row.group === "fine" ? " turn" : ""} here. ` +
    `After it, ${clause(row.symbol!)}.`;
}

/** The text where the book ends (design 32, item 5): "End of the book. Blue is slightly better." */
export const endSentence = (p: BookPosition) => `End of the book. ${SYMBOL_NAME[positionSymbol(p)]}.`;

const article = (word: string) => (/^[AEIOU]/.test(word) ? "an" : "a");

// --- The review's Report (design 32, item 4) -------------------------------------------------------------------------
// The rows of the Report on the game's opening, from the book's facts and the game's moves (game.ts, `gameOpening`).
// The review keeps its own labels (design 16), on book moves too: the rows give the review's label of each move.

/** The opening row of a game that left the book, at the position before the move that left it: "The game left the
 *  book at turn 3: Blue, D9-G11, Good." By turn, `move` is the whole turn that left: "Blue, D9-G11 D10-G9, Blunder".
 *  `label`: the review's quality label of the edge or the turn, null until the review has it. */
export const leftBookSentence = (p: BookPosition, move: string, label: Label | null) =>
  `The game left the book at turn ${p.turn}: ${side(p)}, ${move}${label ? `, ${LABEL_TEXT[label]}` : ""}.`;

/** Book moves that the game played from `p`: one, or by turn a whole turn of two. Their edges, "move" or "turn", and
 *  the review's quality label of them, with its article. */
function bookPlay(moves: BookMove[], label: Label) {
  const name = LABEL_TEXT[label];
  return { edges: moves.map(m => m.move).join(" "), noun: moves.length === 1 ? "move" : "turn",
           label: `${article(name)} ${name}` };
}

/** A book move that the game played before it left the book, and that the review labels worse than Good (`label`,
 *  the review's), at the position before it: "Before that, at turn 2, Red played O11-Q10, a book move and an
 *  Inaccuracy." By turn, `moves` is a whole book turn from its start: "Before that, at turn 2, Red played N11-Q10
 *  O11-Q10, a book turn and an Inaccuracy." */
export function weakBookMoveSentence(p: BookPosition, label: Label, ...moves: BookMove[]): string {
  const { edges, noun, label: name } = bookPlay(moves, label);
  return `Before that, at turn ${p.turn}, ${side(p)} played ${edges}, a book ${noun} and ${name}.`;
}

/** The book move that reached the end of the book, in the row of a game that followed the book to its end, with the
 *  review's label of it: "The last book move, G10-J13, is an Inaccuracy." "Before that" would put it before the end
 *  that it reached. By turn, a whole book turn: "The last book turn, D9-G10 G10-J13, is a Mistake." */
export function lastBookMoveSentence(label: Label, ...moves: BookMove[]): string {
  const { edges, noun, label: name } = bookPlay(moves, label);
  return `The last book ${noun}, ${edges}, is ${name}.`;
}

/** The opening row of a game whose first edge is not a book move. */
export const NOT_IN_BOOK_SENTENCE = "The game was not in the book from the first move.";

/** The opening row of a game that followed the book to its end (`end`, a position with no book move), with the turn
 *  of the book move that reached it and the symbol there in words: "The game followed the book to its end, at turn 3.
 *  Blue is slightly better." */
export const bookEndSentence = (end: BookPosition) =>
  `The game followed the book to its end, at turn ${turnFromCount(edgeCount(end) - 1).turn}. ` +
  `${SYMBOL_NAME[positionSymbol(end)]}.`;

/** A trap that the game played, at the position before it, and whether the other side played its refutation: "Turn 3:
 *  Blue played a trap, G9-K10. Red played its refutation." `refuted` is null when the game ended before it: the row
 *  then names the trap only. */
export function trapPlayedSentence(p: BookPosition, m: BookMove, refuted: boolean | null): string {
  const other = PLAYER_NAME[otherPlayer(playerOf(p.mover))];
  return `Turn ${p.turn}: ${side(p)} played a trap, ${m.move}.` +
    (refuted === null ? "" : ` ${other} ${refuted ? "played" : "did not play"} its refutation.`);
}
