// Checks the book's tree for Openings' move list (tree.ts, design 32, item 5) on both test books: the main line, a book
// move's line, a trap's refutation in its line, the canonical parent and its link, the move orders across turns, a
// line through a mirror image, and the folds' words. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { bookMove, openBook, type Book, type BookReader } from "./book.ts";
import type { BookPosition } from "./form.ts";
import { mirrorEdge } from "#lib/engine/notation.ts";
import { alsoReached, bookLine, canonical, canonicalPath, continues, folded, foldText, mainEdges } from "./tree.ts";
import { edgeCount } from "./sentences.ts";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const files: BookReader = async url => JSON.parse(readFileSync(join(root, "tests", "fixtures", url), "utf8"));
const START = "A10-D10 Q10-T10 b1 0/0 0";
const PROTOTYPE_MAIN = ["A10-D9", "N11-Q10", "L10-N11", "D10-G12", "G12-J15"];

/** The positions along a line from the start, as the player reaches them. */
async function walk(book: Book, line: string[]): Promise<BookPosition[]> {
  const out = [(await book.get(START))!];
  for (const e of line) {
    const m = bookMove(out.at(-1)!, e);
    assert.ok(m, `${e} is a book move after ${out.length - 1} edges`);
    out.push((await book.get(m.to))!);
  }
  return out;
}

test("the main line of the prototype's book, and a book move's line under its canonical parents", async () => {
  const book = await openBook("/test-book/prototype/index.json", files);
  assert.deepEqual(await mainEdges(book), PROTOTYPE_MAIN);
  const start = (await book.get(START))!;
  for (const m of start.moves) {
    const line = await bookLine(book, start, m);
    assert.equal(line[0], m.move);
    // Each edge is a book move, the canonical way to its position, and the line ends at its move's main line's end or
    // before, at the book's end
    const positions = await walk(book, line);
    positions.slice(1).forEach((p, k) => assert.ok(canonical(p, positions[k].position, line[k]), `${line.slice(0, k + 1)}`));
    assert.ok(edgeCount(positions.at(-1)!) <= m.end.count);
    if (!m.trap) assert.ok(edgeCount(positions.at(-1)!) === m.end.count || !positions.at(-1)!.moves.length);
  }
});

test("a trap's line plays its refutation after it", async () => {
  const book = await openBook("/test-book/prototype/index.json", files);
  // The traps of the first turns: each line starts with the trap, then its refutation
  let checked = 0;
  for (const line of [["D10-G9"], ["D10-F9"], ["D10-G9", "N11-Q10"], ["A10-D9", "N11-Q10", "K9-N11"]]) {
    const at = (await walk(book, line)).at(-1)!;
    for (const m of at.moves.filter(m => m.trap)) {
      const got = await bookLine(book, at, m);
      assert.deepEqual(got.slice(0, 1 + m.trap!.refutation.length), [m.move, ...m.trap!.refutation]);
      checked++;
    }
  }
  assert.equal(checked, 4);
});

test("a turn's two edges in the other order end with a link to the canonical line, and are no other move order", async () => {
  const book = await openBook("/test-book/prototype/index.json", files);
  // After 1. A10-D9, Red's turn 2 as N11-Q10 O11-Q10, or in the other order
  const canonicalLine = ["A10-D9", "N11-Q10", "O11-Q10"], swapped = ["A10-D9", "O11-Q10", "N11-Q10"];
  const positions = await walk(book, swapped), [start, , before, end] = positions;
  assert.ok(!canonical(end, before.position, "N11-Q10"));
  assert.deepEqual(await bookLine(book, before, bookMove(before, "N11-Q10")!), ["N11-Q10"], "the line stops there");
  assert.deepEqual(await continues(book, end, PROTOTYPE_MAIN), { text: "Continues in 2. N11-Q10 O11-Q10", to: canonicalLine });
  // The same position by the canonical line: its other parent is the other order of the turn, so no other move order
  const canon = await walk(book, canonicalLine);
  assert.deepEqual(await alsoReached(book, canon[3], canonicalLine, canon.map(p => p.position)), []);
  assert.deepEqual(await alsoReached(book, end, swapped, positions.map(p => p.position)), []);
  // A line of the main line names it
  const main = await walk(book, PROTOTYPE_MAIN.slice(0, 3));
  assert.equal((await continues(book, main[3], PROTOTYPE_MAIN))?.text, "Continues in the main line, 2. N11-Q10 L10-N11");
  assert.equal(start.parents.length, 0);
  assert.equal(await continues(book, start, PROTOTYPE_MAIN), null);
});

test("a position that two turns reach: the line by its other parent links to the canonical line, which lists it", async () => {
  const book = await openBook("/test-book/cases/index.json", files);
  const main = await mainEdges(book);
  assert.deepEqual(main, ["A10-D9", "O9-Q10", "L10-O9", "D10-G12", "D9-E11", "H11-L10", "G14-H11"]);
  // The other line plays Blue's edges of turns 1 and 3 in the other order (book.test.ts, LINE_B)
  const other = ["D10-G12", "O9-Q10", "L10-O9", "A10-D9", "D9-E11", "H11-L10", "G14-H11"];
  const positions = await walk(book, other), end = positions.at(-1)!;
  assert.ok(!canonical(end, positions.at(-2)!.position, "G14-H11"));
  const before = positions.at(-2)!;
  assert.deepEqual(await bookLine(book, before, bookMove(before, "G14-H11")!), ["G14-H11"]);
  const link = await continues(book, end, main);
  assert.deepEqual(link?.to, main);
  assert.match(link!.text, /^Continues in the main line, 4\. H11-L10 G14-H11$/);
  // By the main line, the title row lists the other line
  const mainPositions = await walk(book, main);
  const also = await alsoReached(book, mainPositions.at(-1)!, main, mainPositions.map(p => p.position));
  assert.deepEqual(also, [{ text: "4. H11-L10 G14-H11", to: other }]);
  // By the other line, it lists the main line
  const back = await alsoReached(book, end, other, positions.map(p => p.position));
  assert.deepEqual(back.map(l => l.to), [main]);
});

test("a line through a mirror image keeps the player's orientation", async () => {
  const book = await openBook("/test-book/prototype/index.json", files);
  // A10-D11 is the mirror image of A10-D9, the start's first book move: the book's moves come mirrored after it
  const start = (await book.get(START))!;
  const twin = bookMove(start, "A10-D11");
  assert.ok(twin && !start.moves.some(m => m.move === "A10-D11"));
  const line = await bookLine(book, start, twin);
  const mirrored = PROTOTYPE_MAIN.map(mirrorEdge);
  assert.deepEqual(line, mirrored);
  const positions = await walk(book, mirrored);
  assert.deepEqual(await canonicalPath(book, positions.at(-1)!), mirrored);
});

test("a fold holds the book moves but the one shown, and says how many", async () => {
  const book = await openBook("/test-book/prototype/index.json", files);
  const start = (await book.get(START))!;
  assert.deepEqual(folded(start, "A10-D9").map(m => m.move), start.moves.slice(1).map(m => m.move));
  assert.equal(folded(start, null).length, start.moves.length);
  assert.equal(foldText(2, "A10-D9", null), "2 other book moves instead of A10-D9");
  assert.equal(foldText(1, "N11-Q10", "A10-D9"), "1 other book move instead of N11-Q10");
  assert.equal(foldText(3, null, "G12-J15"), "3 book moves after G12-J15");
});
