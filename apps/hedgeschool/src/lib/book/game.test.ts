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
import { gameOpening, openingSentence, trapRows } from "./game.ts";
import { moveLabel } from "./sentences.ts";
import { mirrorEdge } from "#lib/engine/notation.ts";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const read = async (url: string) => JSON.parse(readFileSync(join(root, "tests", "fixtures", url), "utf8"));
const book = await openBook("/test-book/prototype/index.json", read);

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

// The game of book-left-review.json: Red's O11-Q10 is a book move and an Inaccuracy, and Blue leaves with D9-G11.
const LEFT = ["A10-D9", "N11-Q10", "O11-Q10", "D9-G11", "G11-J12", "Q10-T9"];
// The game of hedgefund-review.json, to the edge after the book's end (turn 3)
const WHOLE = ["A10-D9", "N11-Q10", "K9-N11", "D9-G10", "D10-G9", "H6-K9", "H12-K9"];
// The trap G9-K10 at turn 3, then its refutation: K10-N12 ends Blue's turn, and Red's K9-M10 M10-P11 punishes it
const TRAP = ["D10-G9", "N11-Q10", "K9-N11", "G9-K10", "K10-N12", "K9-M10", "M10-P11", "A10-D9"];
// book-never-review.json's first edges: not in the book from D10-G12, and back in it after G14-H11 (the book's tests,
// LINE_B)
const NEVER = ["D10-G12", "O9-Q10", "L10-O9", "A10-D9", "D9-E11", "H11-L10", "G14-H11", "D9-G11"];
const RETURN = "A10-D9,A10-D10,D9-E11,D10-G12 G14-H11*,H11-L10*,L10-O9,O9-Q10,Q10-T10 b2 3.75/0 7";

test("a game that leaves the book: the move that left it, the book move worse than Good before it, and its book moves", async () => {
  const o = gameOpening(await walk(book, LEFT), LEFT)!;
  assert.equal(o.kind, "left");
  assert.equal(o.at, 3, "the position before D9-G11");
  assert.equal(o.weak?.index, 2);
  assert.equal(moveLabel(o.weak!.position, o.weak!.move), "inaccuracy");
  // A10-D9, N11-Q10 and O11-Q10, each with the position symbol after it. D9-G11 left the book.
  assert.deepEqual(o.bookMoves, [{ index: 0, after: "Equal position" }, { index: 1, after: "Equal position" },
    { index: 2, after: "Blue is better" }]);
  assert.deepEqual(o.traps, []);
  assert.equal(openingSentence(o, LEFT, "good"), "The game left the book at turn 3: Blue, D9-G11, Good. " +
    "Before that, at turn 2, Red played O11-Q10, a book move and an Inaccuracy.");
  assert.equal(openingSentence(o, LEFT, null), "The game left the book at turn 3: Blue, D9-G11. " +
    "Before that, at turn 2, Red played O11-Q10, a book move and an Inaccuracy.", "the review has no label for it yet");
});

test("a game that follows the book to its end: the symbol there, and every move up to it a book move", async () => {
  const o = gameOpening(await walk(book, WHOLE), WHOLE)!;
  assert.equal(o.kind, "end");
  assert.equal(o.at, 5, "the end of the book, after D10-G9");
  assert.equal(o.weak, null, "K9-N11 is a Good book move");
  assert.deepEqual(o.bookMoves.map(m => m.index), [0, 1, 2, 3, 4], "H6-K9 is past the end");
  assert.equal(o.bookMoves[4]!.after, "Blue is slightly better", "the end's symbol");
  // Blue's win chance there is 0.545: between 0.524 and 0.564
  assert.equal(openingSentence(o, WHOLE, "best"), "The game followed the book to its end, at turn 3. Blue is slightly better.");
});

test("a game that reaches the end of the book by a book move worse than Good: the row names the last book move", async () => {
  // Blue's G10-J13 at turn 3 is an Inaccuracy, and the book ends after it
  const last = ["A10-D9", "N11-Q10", "L10-N11", "D9-G10", "G10-J13", "Q10-T9"];
  const o = gameOpening(await walk(book, last), last)!;
  assert.equal(o.kind, "end");
  assert.equal(o.weak?.index, 4);
  assert.equal(openingSentence(o, last, null), "The game followed the book to its end, at turn 3. Red is better. " +
    "The last book move, G10-J13, is an Inaccuracy.");
});

test("a game not in the book from the first move, which comes back to it by another move order", async () => {
  const o = gameOpening(await walk(book, NEVER, { 7: RETURN }), NEVER)!;
  assert.equal(o.kind, "never");
  assert.equal(o.at, 0);
  // G14-H11 comes back to the book from a position outside it, and D9-G11 leaves it again: neither is a book move
  assert.deepEqual(o.bookMoves, []);
  assert.equal(openingSentence(o, NEVER, "mistake"), "The game was not in the book from the first move.");
});

test("a trap and its refutation, and the book move worse than Good before it", async () => {
  const o = gameOpening(await walk(book, TRAP), TRAP)!;
  assert.deepEqual(o.traps.map(t => [t.index, t.move.move, t.refuted]), [[3, "G9-K10", true]]);
  // D10-G9 is an Inaccuracy and K9-N11 a Mistake: the row names the worse
  assert.equal(o.weak?.index, 2);
  assert.equal(moveLabel(o.weak!.position, o.weak!.move), "mistake");
  assert.deepEqual(trapRows(o), [{ at: 3, text: "Turn 3: Blue played a trap, G9-K10. Red played its refutation." }]);
  // The book ends after M10-P11, and the worse book move came before it
  assert.equal(openingSentence(o, TRAP, null), "The game followed the book to its end, at turn 4. Red is better. " +
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
  assert.equal(openingSentence(o, short, null), null);
  assert.deepEqual(trapRows(o), [{ at: 3, text: "Turn 3: Blue played a trap, G9-K10." }]);
});

test("no opening row for a game whose start the book does not hold", () => {
  assert.equal(gameOpening([null, null], ["A10-D9"]), null);
});
