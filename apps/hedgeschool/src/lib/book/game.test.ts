// Checks a reviewed game's path through the book (game.ts) and the Report's rows (design 32, item 4) on games through
// the test book (tests/fixtures/test-book/prototype): one that leaves the book after a book move worse than Good, one that
// follows it to its end, one that is not in it from the first move and comes back by another move order, and games
// that play a trap. The expected rows are the journey's examples, worked out by hand from the book's values. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { bookMove, openBook, type Book } from "./book.ts";
import type { BookPosition } from "./form.ts";
import type { Label } from "@abstractclass/analysis/labels.ts";
import { gameOpening, openingRow, openingSentence, trapRows, worstBookPlay } from "./game.ts";
import { mirrorEdge } from "#lib/engine/notation.ts";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const read = async (url: string) => JSON.parse(readFileSync(join(root, "tests", "fixtures", url), "utf8"));
const book = await openBook("/test-book/prototype/index.json", read);

/** The review's judgments, from its label and loss at each index (the edge's, or by turn the turn's first edge's). The
 *  review has none for an index that is not in `by`. */
const judge = (by: Record<number, [Label, number]>) => (i: number) => by[i] ? { label: by[i][0], loss: by[i][1] } : null;
const unjudged = judge({});

/** A game's positions in the book, from its edges: each book position that its edges reach from the start by the book's
 *  moves, then null once an edge is not a book move. `known` gives the book's positions that the game reaches later by
 *  another move order, by their index. */
async function walk(b: Book, edges: string[], known: Record<number, string> = {}): Promise<(BookPosition | null)[]> {
  const positions: (BookPosition | null)[] = [await b.get(b.start)];
  for (const [k, e] of edges.entries()) {
    const p = positions[k], m = p && bookMove(p, e);
    positions.push(m ? await b.get(m.to) : known[k + 1] ? await b.get(known[k + 1]) : null);
  }
  return positions;
}

// The game of book-left-review.json: Red's O11-Q10 is a book move, and Blue leaves with D9-G11.
const LEFT = ["A10-D9", "N11-Q10", "O11-Q10", "D9-G11", "G11-J12", "Q10-T9"];
// The game of hedgefund-review.json, to the edge after the book's end (turn 3)
const WHOLE = ["A10-D9", "N11-Q10", "K9-N11", "D9-G10", "D10-G9", "H6-K9", "H12-K9"];
// The trap G9-K10 at turn 3, then its refutation: K10-N12 ends Blue's turn, and Red's K9-M10 M10-P11 punishes it
const TRAP = ["D10-G9", "N11-Q10", "K9-N11", "G9-K10", "K10-N12", "K9-M10", "M10-P11", "A10-D9"];
// book-never-review.json's first edges: not in the book from D10-G12, and back in it after G14-H11 (the book's tests,
// LINE_B)
const NEVER = ["D10-G12", "O9-Q10", "L10-O9", "A10-D9", "D9-E11", "H11-L10", "G14-H11", "D9-G11"];
const RETURN = "A10-D9,A10-D10,D9-E11,D10-G12 G14-H11*,H11-L10*,L10-O9,O9-Q10,Q10-T10 b2 3.75/0 7";

test("a game that leaves the book: the move that left it, the book move worse than Good by the review before it, and its book moves", async () => {
  const o = gameOpening(await walk(book, LEFT), LEFT)!;
  assert.equal(o.kind, "left");
  assert.equal(o.at, 3, "the position before D9-G11");
  assert.deepEqual(o.earlier.map(w => w.index), [0, 1, 2], "its book moves before the departure");
  // A10-D9, N11-Q10 and O11-Q10, each with the position symbol after it. D9-G11 left the book.
  assert.deepEqual(o.bookMoves, [{ index: 0, after: "Equal position" }, { index: 1, after: "Equal position" },
    { index: 2, after: "Blue is better" }]);
  assert.deepEqual(o.traps, []);
  // The review labels O11-Q10 an Inaccuracy (the book's own label of it): the row names it
  const weak = judge({ 2: ["inaccuracy", 0.08] });
  assert.equal(openingSentence(o, LEFT, "good", "edge", weak), "The game left the book at turn 3: Blue, D9-G11, Good. " +
    "Before that, at turn 2, Red played O11-Q10, a book move and an Inaccuracy.");
  assert.equal(openingSentence(o, LEFT, null, "edge", weak), "The game left the book at turn 3: Blue, D9-G11. " +
    "Before that, at turn 2, Red played O11-Q10, a book move and an Inaccuracy.", "the review has no label for D9-G11 yet");
  // It labels O11-Q10 Good, as the move list does: the row says nothing of it, whatever the book's label is
  assert.equal(openingSentence(o, LEFT, "good", "edge", judge({ 2: ["good", 0.04] })),
    "The game left the book at turn 3: Blue, D9-G11, Good.");
  assert.equal(openingSentence(o, LEFT, "good", "edge", judge({ 0: ["best", 0], 1: ["great", 0], 2: ["excellent", 0.01] })),
    "The game left the book at turn 3: Blue, D9-G11, Good.");
  // A move that the review has not judged yet is not named
  assert.equal(openingSentence(o, LEFT, null, "edge", unjudged), "The game left the book at turn 3: Blue, D9-G11.");
});

test("the book move that the review labels worst: the worst label first, then the larger loss, and no trap", async () => {
  // D10-G9 (edge 0), N11-Q10 (1) and K9-N11 (2) are book moves before the book's end, and G9-K10 (3) is a trap
  const o = gameOpening(await walk(book, TRAP), TRAP)!;
  const worst = (by: Record<number, [Label, number]>) => worstBookPlay(o, "edge", judge(by));
  assert.deepEqual(worst({ 0: ["inaccuracy", 0.09], 2: ["mistake", 0.12] })?.play.index, 2, "a Mistake before an Inaccuracy");
  assert.deepEqual(worst({ 0: ["blunder", 0.25], 1: ["mistake", 0.30 - 0.01], 2: ["inaccuracy", 0.09] })?.label, "blunder",
    "the worst label, not the largest loss");
  assert.deepEqual(worst({ 0: ["inaccuracy", 0.06], 2: ["inaccuracy", 0.09] })?.play.index, 2, "the larger loss, later");
  assert.deepEqual(worst({ 0: ["inaccuracy", 0.09], 2: ["inaccuracy", 0.06] })?.play.index, 0, "the larger loss, earlier");
  assert.deepEqual(worst({ 0: ["inaccuracy", 0.07], 2: ["inaccuracy", 0.07] })?.play.index, 0, "equal: the first");
  assert.equal(worst({ 0: ["good", 0.05], 1: ["excellent", 0.01], 2: ["best", 0] }), null, "none worse than Good");
  assert.equal(worst({}), null, "none judged yet");
  assert.equal(worst({ 3: ["blunder", 0.4] }), null, "the trap has its own row");
  assert.deepEqual(worst({ 1: ["mistake", 0.15] })?.play.moves.map(m => m.move), ["N11-Q10"]);
});

test("a game that follows the book to its end: the symbol there, and every move up to it a book move", async () => {
  const o = gameOpening(await walk(book, WHOLE), WHOLE)!;
  assert.equal(o.kind, "end");
  assert.equal(o.at, 5, "the end of the book, after D10-G9");
  assert.deepEqual(o.bookMoves.map(m => m.index), [0, 1, 2, 3, 4], "H6-K9 is past the end");
  assert.equal(o.bookMoves[4]!.after, "Blue is slightly better", "the end's symbol");
  // Blue's win chance there is 0.545: between 0.524 and 0.564
  assert.equal(openingSentence(o, WHOLE, "best", "edge", unjudged), "The game followed the book to its end, at turn 3. Blue is slightly better.");
  assert.equal(openingSentence(o, WHOLE, "best", "edge", judge({ 2: ["good", 0.04] })),
    "The game followed the book to its end, at turn 3. Blue is slightly better.");
});

test("a game that reaches the end of the book by a book move worse than Good: the row names the last book move", async () => {
  // The book ends after Blue's G10-J13 at turn 3, which the review labels an Inaccuracy
  const last = ["A10-D9", "N11-Q10", "L10-N11", "D9-G10", "G10-J13", "Q10-T9"];
  const o = gameOpening(await walk(book, last), last)!;
  assert.equal(o.kind, "end");
  assert.equal(worstBookPlay(o, "edge", judge({ 4: ["inaccuracy", 0.06] }))?.play.index, 4);
  assert.equal(openingSentence(o, last, null, "edge", judge({ 4: ["inaccuracy", 0.06] })),
    "The game followed the book to its end, at turn 3. Red is better. The last book move, G10-J13, is an Inaccuracy.");
  // The review's label, not the book's: a Blunder there, and none when the review says Good
  assert.equal(openingSentence(o, last, null, "edge", judge({ 4: ["blunder", 0.4] })),
    "The game followed the book to its end, at turn 3. Red is better. The last book move, G10-J13, is a Blunder.");
  assert.equal(openingSentence(o, last, null, "edge", judge({ 4: ["good", 0.04] })),
    "The game followed the book to its end, at turn 3. Red is better.");
});

test("a game not in the book from the first move, which comes back to it by another move order", async () => {
  const o = gameOpening(await walk(book, NEVER, { 7: RETURN }), NEVER)!;
  assert.equal(o.kind, "never");
  assert.equal(o.at, 0);
  // G14-H11 comes back to the book from a position outside it, and D9-G11 leaves it again: neither is a book move
  assert.deepEqual(o.bookMoves, []);
  assert.equal(openingSentence(o, NEVER, "mistake", "edge", unjudged), "The game was not in the book from the first move.");
});

test("an edge that reaches a book position without being listed at its position is not a book move", async () => {
  // LEFT's first three edges are listed book moves. D9-G11 at position 3 is not listed there, and the game reaches
  // RETURN (a book position, as in NEVER) by it: the position after it is in the book, the edge is not.
  const edges = LEFT.slice(0, 4);
  const o = gameOpening(await walk(book, edges, { 4: RETURN }), edges)!;
  assert.deepEqual(o.bookMoves.map(m => m.index), [0, 1, 2], "A10-D9, N11-Q10 and O11-Q10 keep their marks");
});

test("a trap and its refutation, and the book move worse than Good before it", async () => {
  const o = gameOpening(await walk(book, TRAP), TRAP)!;
  assert.deepEqual(o.traps.map(t => [t.index, t.move.move, t.refuted]), [[3, "G9-K10", true]]);
  assert.deepEqual(trapRows(o), [{ at: 3, text: "Turn 3: Blue played a trap, G9-K10. Red played its refutation." }]);
  // The review labels D10-G9 an Inaccuracy and K9-N11 a Mistake: the row names the worse. It does not name the trap
  // (a Blunder here), which has its own row. The book ends after M10-P11, and the worse book move came before it
  const judged = judge({ 0: ["inaccuracy", 0.06], 2: ["mistake", 0.17], 3: ["blunder", 0.4] });
  assert.equal(openingSentence(o, TRAP, null, "edge", judged), "The game followed the book to its end, at turn 4. Red is better. " +
    "Before that, at turn 2, Red played K9-N11, a book move and a Mistake.");
  // The same game in its mirror image: the start's twins play the same book moves, turned over
  const image = TRAP.map(mirrorEdge);
  const turned = gameOpening(await walk(book, image), image)!;
  assert.deepEqual(trapRows(turned), [{ at: 3, text: "Turn 3: Blue played a trap, G11-K10. Red played its refutation." }]);
});

test("a trap whose refutation the other side did not play", async () => {
  const missed = [...TRAP.slice(0, 6), "M10-P9", "A10-D9"]; // Red's second edge is not the refutation's
  const o = gameOpening(await walk(book, missed), missed)!;
  assert.deepEqual(trapRows(o), [{ at: 3, text: "Turn 3: Blue played a trap, G9-K10. Red did not play its refutation." }]);
});

test("a trap whose side ended its turn outside the refutation: the row names the trap only", async () => {
  // Blue's H6-K9 is not the refutation's K10-N12, so Red's K9-M10 M10-P11 answer another position
  const other = [...TRAP.slice(0, 4), "H6-K9", ...TRAP.slice(5)];
  const o = gameOpening(await walk(book, other), other)!;
  assert.equal(o.kind, "left");
  assert.deepEqual(trapRows(o), [{ at: 3, text: "Turn 3: Blue played a trap, G9-K10." }]);
});

test("a game that ends in the book, as a game imported while it is played: no opening row, and no claim on a refutation", async () => {
  const short = TRAP.slice(0, 5); // the game stops before Red's turn
  const o = gameOpening(await walk(book, short), short)!;
  assert.equal(o.kind, "in");
  assert.deepEqual(o.bookMoves.map(m => m.index), [0, 1, 2, 3, 4], "every edge of the game");
  assert.equal(openingSentence(o, short, null, "edge", unjudged), null);
  assert.deepEqual(trapRows(o), [{ at: 3, text: "Turn 3: Blue played a trap, G9-K10." }]);
});

test("no opening row for a game whose start the book does not hold", () => {
  assert.equal(gameOpening([null, null], ["A10-D9"]), null);
});

test("by turn: the opening row names the whole turn that left the book, and goes to the turn's start", async () => {
  // Blue's D9-G11 G11-J12 at turn 3: its first edge left the book. Red's turn 2 is a book turn, which the review labels
  // by the turn: the row names it when the label is worse than Good
  const o = gameOpening(await walk(book, LEFT), LEFT)!;
  assert.deepEqual(o.earlierTurns.map(w => [w.index, w.moves.map(m => m.move)]),
    [[0, ["A10-D9"]], [1, ["N11-Q10", "O11-Q10"]]], "Blue's first turn is one edge");
  assert.equal(openingSentence(o, LEFT, "good", "turn", judge({ 1: ["inaccuracy", 0.077] })),
    "The game left the book at turn 3: Blue, D9-G11 G11-J12, Good. " +
    "Before that, at turn 2, Red played N11-Q10 O11-Q10, a book turn and an Inaccuracy.");
  assert.equal(openingSentence(o, LEFT, "good", "turn", judge({ 1: ["good", 0.033] })),
    "The game left the book at turn 3: Blue, D9-G11 G11-J12, Good.", "the review's Good: no row on the turn");
  // The turn's index is its first edge's: the edge's own judgment at 2 does not name the turn
  assert.equal(openingSentence(o, LEFT, "good", "turn", judge({ 2: ["blunder", 0.4] })),
    "The game left the book at turn 3: Blue, D9-G11 G11-J12, Good.");
  assert.equal(openingRow(o, LEFT, null, "turn", unjudged)!.at, 3);
  assert.equal(openingRow(o, LEFT, null, "edge", unjudged)!.at, 3);
  // Blue's D9-G10 is a book move, and Q10-T9 after it is not: the turn's second edge left the book. The turn that left
  // is not a book turn
  const second = ["A10-D9", "N11-Q10", "K9-N11", "D9-G10", "Q10-T9", "A10-D10"];
  const s = gameOpening(await walk(book, second), second)!;
  assert.equal(s.kind, "left");
  assert.equal(s.at, 4, "the position before Q10-T9");
  assert.deepEqual(s.earlierTurns.map(w => w.index), [0, 1], "not the turn that left");
  assert.equal(openingSentence(s, second, "mistake", "turn", unjudged),
    "The game left the book at turn 3: Blue, D9-G10 Q10-T9, Mistake.");
  assert.equal(openingSentence(s, second, "mistake", "edge", unjudged), "The game left the book at turn 3: Blue, Q10-T9, Mistake.");
  assert.equal(openingRow(s, second, null, "turn", unjudged)!.at, 3, "the turn's start");
  assert.equal(openingRow(s, second, null, "edge", unjudged)!.at, 4);
  // The end of the book: the row's place does not change by turn
  const end = gameOpening(await walk(book, WHOLE), WHOLE)!;
  assert.equal(openingSentence(end, WHOLE, "best", "turn", unjudged), openingSentence(end, WHOLE, "best", "edge", unjudged));
  assert.equal(openingRow(end, WHOLE, null, "turn", unjudged)!.at, end.at);
});

test("by turn: the book turn worse than Good is a whole turn, by the turn's label of the review, and no turn with a trap", async () => {
  // Blue's D9-G10 G10-J13 reaches the end of the book: the review labels the turn from its start, here a Mistake
  const last = ["A10-D9", "N11-Q10", "L10-N11", "D9-G10", "G10-J13", "Q10-T9"];
  const o = gameOpening(await walk(book, last), last)!;
  assert.equal(openingSentence(o, last, null, "turn", judge({ 3: ["mistake", 0.105] })),
    "The game followed the book to its end, at turn 3. Red is better. The last book turn, D9-G10 G10-J13, is a Mistake.");
  // The turn is not named for the edge's label
  assert.equal(openingSentence(o, last, null, "turn", judge({ 4: ["mistake", 0.105] })),
    "The game followed the book to its end, at turn 3. Red is better.");
  // Blue's first turn D10-G9 (index 0) and Red's N11-Q10 K9-N11 (index 1): the row names the worse label, then the
  // larger loss. Blue's G9-K10 K10-N12 (index 3) holds the trap, which has its own row
  const t = gameOpening(await walk(book, TRAP), TRAP)!;
  const named = (by: Record<number, [Label, number]>) => worstBookPlay(t, "turn", judge(by))?.play.moves.map(m => m.move);
  assert.deepEqual(named({ 0: ["inaccuracy", 0.057], 1: ["mistake", 0.169], 3: ["blunder", 0.4] }), ["N11-Q10", "K9-N11"]);
  assert.deepEqual(named({ 0: ["mistake", 0.12], 1: ["mistake", 0.169] }), ["N11-Q10", "K9-N11"], "equal labels: the larger loss");
  assert.deepEqual(named({ 0: ["mistake", 0.18], 1: ["mistake", 0.169] }), ["D10-G9"], "equal labels: the larger loss");
  assert.deepEqual(named({ 0: ["blunder", 0.21], 1: ["mistake", 0.169] }), ["D10-G9"], "the worst label");
  assert.equal(named({ 0: ["good", 0.04], 1: ["excellent", 0.01], 3: ["blunder", 0.4] }), undefined, "none worse than Good");
  assert.equal(openingSentence(t, TRAP, null, "turn", judge({ 0: ["inaccuracy", 0.057], 1: ["mistake", 0.169] })),
    "The game followed the book to its end, at turn 4. Red is better. " +
    "Before that, at turn 2, Red played N11-Q10 K9-N11, a book turn and a Mistake.");
});
