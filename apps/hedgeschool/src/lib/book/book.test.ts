// Checks the book's loader (book.ts) and the test books in static/test-book (scripts/test-book.mjs), as the site serves
// them: the form, the lookups with mirror images, the parts that load on demand and the part that fails. The engine's
// tests check the books' positions against the engine's rules, with its CPU module in Node (scripts/node-engine.mjs).
// They need its files (`npm run engine`), and are skipped without them. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { BookLoadError, asReached, openBook, type Book, type BookReader } from "./book.ts";
import { BOOK_FORMAT, BOOK_VERSION, type BookIndex, type BookPart, type BookPosition } from "./form.ts";
import { POINTS, decodeArea, encodeArea, mirrorArea } from "./area.ts";
import { mirrorEdge, mirrorPosition } from "../engine/notation.ts";
import { turnFromCount } from "../review/enclosure.ts";
import { nodeEngine } from "../../../scripts/node-engine.mjs";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const TEST_BOOK = "/test-book/prototype/index.json", CASES = "/test-book/cases/index.json";
/** Reads the site's files as the browser fetches them, and logs each address. */
const files = (log: string[] = []): BookReader => async url => {
  log.push(url);
  return JSON.parse(readFileSync(join(root, "static", url), "utf8"));
};
/** Every position of a book's parts that load. */
function positionsOf(url: string): BookPosition[] {
  const index = JSON.parse(readFileSync(join(root, "static", url), "utf8")) as BookIndex;
  const dir = url.slice(0, url.lastIndexOf("/") + 1);
  return index.parts.filter(p => existsSync(join(root, "static", dir, p.file)))
    .flatMap(p => (JSON.parse(readFileSync(join(root, "static", dir, p.file), "utf8")) as BookPart).positions);
}

const START = "A10-D10 Q10-T10 b1 0/0 0";
// A line that swaps Blue's edges of turns 1 and 3 (scripts/test-book.mjs, the cases): its positions from the start,
// as the engine's describe_game gives them. The test book holds only its first and its last.
const LINE_B = ["D10-G12", "O9-Q10", "L10-O9", "A10-D9", "D9-E11", "H11-L10", "G14-H11"];
const LINE_B_POSITIONS = [
  START,
  "A10-D10,D10-G12* Q10-T10 r2 0/0 1",
  "A10-D10,D10-G12* O9-Q10+,Q10-T10 r1 0/0 2",
  "A10-D10,D10-G12 L10-O9*,O9-Q10*,Q10-T10 b2 0/0 3",
  "A10-D9+,A10-D10,D10-G12 L10-O9*,O9-Q10*,Q10-T10 b1 0/0 4",
  "A10-D9*,A10-D10,D9-E11*,D10-G12 L10-O9,O9-Q10,Q10-T10 r2 1.875/0 5",
  "A10-D9*,A10-D10,D9-E11*,D10-G12 H11-L10+,L10-O9,O9-Q10,Q10-T10 r1 1.875/0 6",
  "A10-D9,A10-D10,D9-E11,D10-G12 G14-H11*,H11-L10*,L10-O9,O9-Q10,Q10-T10 b2 3.75/0 7",
];
// D10-G11 is the mirror image of D10-G9, a book move of the start: the book stores the position after it as its image.
const AFTER_G11 = "A10-D10,D10-G11* Q10-T10 r2 0/0 1", AFTER_G9 = "A10-D10,D10-G9* Q10-T10 r2 0/0 1";

test("each test book is in the form, its links stay in the book, and the start's part comes first", () => {
  for (const url of [TEST_BOOK, CASES]) {
    const index = JSON.parse(readFileSync(join(root, "static", url), "utf8")) as BookIndex;
    assert.equal(index.format, BOOK_FORMAT);
    assert.equal(index.version, BOOK_VERSION);
    assert.equal(index.start, START);
    assert.ok(index.parts[0].positions.includes(START), `${url}: the first part holds the start`);
    assert.match(index.source.note ?? "", /not the engine's book/);
    const positions = positionsOf(url), listed = new Set(index.parts.flatMap(p => p.positions));
    const byPosition = new Map(positions.map(p => [p.position, p]));
    for (const p of positions) {
      const [, , mover, , count] = p.position.split(" ");
      const { turn, first } = turnFromCount(Number(count));
      assert.deepEqual([p.mover, p.turn, p.edge], [mover[0], turn, first ? 1 : 2], p.position);
      assert.equal(p.parents.length === 0, p.position === START, `${p.position}: only the start has no parent`);
      for (const q of p.parents) assert.ok(listed.has(q.position), `${p.position}: its parent ${q.position}`);
      for (const m of p.moves) assert.ok(listed.has(m.to), `${p.position}: ${m.move} to ${m.to}`);
      // The canonical parent has the move to it, when its part loads.
      const parent = p.parents[0] && byPosition.get(p.parents[0].position);
      if (parent) {
        const move = parent.moves.find(m => m.to === p.position && m.move === p.parents[0].move);
        assert.ok(move, `${p.position}: its first parent's move`);
        assert.equal(move.mirrored, p.parents[0].mirrored);
      }
      for (const v of [p.value, ...p.moves.map(m => m.value)]) assert.ok(v.low <= v.blueWin && v.blueWin <= v.high);
      assert.equal(decodeArea(p.area).length, POINTS);
    }
    assert.ok(positions.every(p => listed.has(p.position)) && positions.length <= listed.size);
  }
  // The test book: the third prototype's positions and traps, each part a few hundred kilobytes at most, about 1 MB in
  // all with the cases.
  const book = positionsOf(TEST_BOOK);
  assert.equal(book.length, 404);
  for (const p of book) { // the best move first, then by the mover's win chance: the best has the most
    const wins = p.moves.map(m => (p.mover === "b" ? m.value.blueWin : 1 - m.value.blueWin));
    assert.ok(wins.every((w, i) => i === 0 || w <= wins[i - 1]), p.position);
  }
  assert.equal(book.flatMap(p => p.moves).filter(m => m.trap).length, 38);
  const sizes = ["prototype", "cases"].flatMap(dir => ["index.json", "0.json", "1.json", "2.json", "3.json"]
    .map(f => join(root, "static", "test-book", dir, f)).filter(existsSync).map(f => statSync(f).size));
  assert.ok(Math.max(...sizes) < 300_000 && sizes.reduce((a, b) => a + b) < 1_000_000, String(sizes));
});

test("a trap's refutation is a line of the book through the opponent's turn", async () => {
  const book = await openBook(TEST_BOOK, files());
  for (const p of positionsOf(TEST_BOOK))
    for (const m of p.moves.filter(m => m.trap)) {
      const line = m.trap!.refutation;
      assert.ok(line.length >= 1 && line.length <= 3, `${p.position}: ${m.move}`);
      let at = (await book.get(m.to))!.position;
      for (const edge of line) {
        const next = at.moves.find(n => n.move === edge);
        assert.ok(next, `${p.position}: ${m.move}, then ${edge}`);
        at = (await book.get(next.to))!.position;
      }
      // It ends at the trapper's next turn, or where the book ends (one trap of the prototype's book)
      assert.ok(at.mover === p.mover || at.moves.length === 0, `${p.position}: ${m.move}: the refutation's end`);
    }
});

test("the loader reads the index, then the start's part, then each part when a lookup needs it", async () => {
  const log: string[] = [];
  const book = await openBook(TEST_BOOK, files(log));
  assert.equal(book.start, START);
  assert.equal(book.source.network, "b10c128-s89066368-d17827487");
  assert.deepEqual(log, [TEST_BOOK, "/test-book/prototype/0.json"]);
  const start = await book.get(START);
  assert.equal(start?.position.position, START);
  assert.equal(start?.mirrored, false);
  assert.equal(log.length, 2, "the start's part loads once");
  // The position after A10-D9 and O9-Q10 and L10-O9 and D10-G12 is in the part of A10-D9's line
  const deep = LINE_B_POSITIONS[7];
  assert.equal(book.peek(deep), undefined, "its part has not loaded");
  assert.equal(book.find(deep)?.mirrored, false);
  assert.equal((await book.get(deep))?.position.position, deep);
  assert.equal(log.length, 3);
  assert.equal(book.peek(deep)?.position.position, deep, "now it is at hand");
});

test("a lookup finds a position stored as its mirror image, and says so", async () => {
  const book = await openBook(TEST_BOOK, files());
  assert.deepEqual(book.find(AFTER_G9), { stored: AFTER_G9, part: 0, mirrored: false });
  assert.deepEqual(book.find(AFTER_G11), { stored: AFTER_G9, part: 0, mirrored: true });
  assert.equal(book.find(START)?.mirrored, false, "the start is its own image");
  const found = await book.get(AFTER_G11);
  assert.equal(found?.mirrored, true);
  // As the player reached it: its notation, its moves and its area map mirrored. The book's keys stay.
  const reached = asReached(found!), stored = found!.position;
  assert.equal(reached.position, AFTER_G11);
  assert.deepEqual(reached.moves.map(m => m.move), stored.moves.map(m => mirrorEdge(m.move)));
  assert.deepEqual(reached.moves.map(m => [m.to, m.mirrored]), stored.moves.map(m => [m.to, true]));
  assert.equal(reached.outside?.move, mirrorEdge(stored.outside!.move));
  const [a, b] = [decodeArea(reached.area), decodeArea(stored.area)];
  for (let i = 0; i < POINTS; i++) assert.equal(a[i], b[(18 - Math.floor(i / 19)) * 19 + (i % 19)]);
  assert.deepEqual(asReached({ position: reached, mirrored: true }), stored, "twice is the stored position");
  assert.deepEqual(asReached({ position: stored, mirrored: false }), stored);
  // The position that each move reaches in the player's orientation is the stored one that it names, mirrored
  for (const m of reached.moves) {
    const next = await book.get(m.mirrored ? mirrorPosition(m.to) : m.to);
    assert.deepEqual([next?.position.position, next?.mirrored], [m.to, !!m.mirrored]);
  }
});

test("a line that leaves the book and comes back is found at its start and its end", async () => {
  const book = await openBook(TEST_BOOK, files());
  assert.deepEqual(LINE_B_POSITIONS.map(p => !!book.find(p)), [true, false, false, false, false, false, false, true]);
  assert.equal(await book.get(LINE_B_POSITIONS[3]), null);
  assert.equal(book.peek(LINE_B_POSITIONS[3]), null);
});

test("the cases: a position that move orders from two turns reach, and a line through a mirror image", async () => {
  const book = await openBook(CASES, files());
  // Its canonical parent is on the first line (A10-D9 at turn 1, D10-G12 at turn 3), the other on LINE_B
  const end = (await book.get(LINE_B_POSITIONS[7]))!.position;
  assert.deepEqual(end.parents.map(p => [p.position, p.move]), [
    ["A10-D9,A10-D10,D9-E11*,D10-G12* H11-L10+,L10-O9,O9-Q10,Q10-T10 r1 1.875/0 6", "G14-H11"],
    [LINE_B_POSITIONS[6], "G14-H11"],
  ]);
  // The explorer's walk: at each position as reached, the line's move is a book move, and the lookup of the position
  // after it finds the stored position that the move names, mirrored as the move says.
  for (let k = 0; k < LINE_B.length; k++) {
    const here = await book.get(LINE_B_POSITIONS[k]);
    assert.ok(here, `after ${k} edges`);
    const reached = asReached(here);
    assert.equal(reached.position, LINE_B_POSITIONS[k]);
    const move = reached.moves.find(m => m.move === LINE_B[k]);
    assert.ok(move, `${LINE_B[k]} after ${k} edges`);
    const next = await book.get(LINE_B_POSITIONS[k + 1]);
    assert.deepEqual([next?.position.position, next?.mirrored], [move.to, !!move.mirrored], `after ${k + 1} edges`);
  }
  assert.equal(book.find(LINE_B_POSITIONS[4])?.mirrored, true, "the book stores it as its image");
});

test("a part that does not load rejects each lookup in it, and a later lookup tries again", async () => {
  const cases = await openBook(CASES, files());
  const failing = cases.find(AFTER_G9);
  assert.equal(failing?.part, 2);
  await assert.rejects(cases.get(AFTER_G9), BookLoadError);
  await assert.rejects(cases.get(AFTER_G9), BookLoadError);
  assert.equal(cases.peek(AFTER_G9), undefined);
  assert.equal((await cases.get(START))?.position.position, START, "the other parts still load");

  // A reader that fails once: the second lookup loads the part
  let fails = 1;
  const flaky: BookReader = async url => {
    if (url.endsWith("/1.json") && fails-- > 0) throw new Error("offline");
    return files()(url);
  };
  const book: Book = await openBook(TEST_BOOK, flaky);
  await assert.rejects(book.get(LINE_B_POSITIONS[7]), (e: unknown) =>
    e instanceof BookLoadError && e.url === "/test-book/prototype/1.json" && /offline/.test(e.message));
  assert.equal((await book.get(LINE_B_POSITIONS[7]))?.position.position, LINE_B_POSITIONS[7]);
});

test("the loader refuses a file that is not a book's, or a book of another form", async () => {
  await assert.rejects(openBook("/x.json", async () => ({ format: "other", version: 1 })), BookLoadError);
  await assert.rejects(openBook("/x.json", async () => ({ format: BOOK_FORMAT, version: 2 })), /form 2 is not 1/);
  await assert.rejects(openBook("/x.json", async () => { throw new Error("404 Not Found"); }), /404/);
});

test("an area map keeps each point's ownership in hundredths, and its mirror image turns the rows over", () => {
  const own = Array.from({ length: POINTS }, (_, i) => ((i * 37) % 201) - 100);
  assert.deepEqual(decodeArea(encodeArea(own)), own);
  assert.deepEqual(decodeArea(encodeArea(own.map(v => v * 1.5))), own.map(v => Math.max(-100, Math.min(100, Math.round(v * 1.5)))));
  const image = decodeArea(mirrorArea(encodeArea(own)));
  assert.equal(image[0], own[18 * 19]); // A1 is A19's
  assert.equal(image[9 * 19 + 4], own[9 * 19 + 4]); // row 10 stays
  assert.throws(() => encodeArea([1, 2, 3]));
});

test("a position's mirror image: each edge turns over, and the lists keep the notation's order", () => {
  assert.equal(mirrorPosition(START), START);
  assert.equal(mirrorPosition(AFTER_G9), AFTER_G11);
  assert.equal(mirrorPosition(LINE_B_POSITIONS[4]), "A10-D10,A10-D11+,D10-G8 L10-O11*,O11-Q10*,Q10-T10 b1 0/0 4");
  assert.equal(mirrorPosition("- Q10-T10 r1 0/4.5 9"), "- Q10-T10 r1 0/4.5 9");
  assert.equal(mirrorEdge("D10-G12"), "D10-G8");
  assert.equal(mirrorEdge("A10-D9"), "A10-D11");
});

// --- With the engine --------------------------------------------------------------------------------------------
const skip = existsSync(join(root, "static", "engine", "manifest.json")) ? false : "no engine: run `npm run engine` first";
const engine = skip ? null : await nodeEngine(root);
const positionsAfter = (moves: string[]): string[] =>
  engine!.call({ id: "g", action: "describe_game", moves, from: 0 }).positions.map((p: { position: string }) => p.position);

test("the engine reaches each book position by its book moves, and its mirror image by the moves' images", { skip }, async () => {
  const book = await openBook(TEST_BOOK, files());
  // Every position from the start by the book's moves: the engine's position after them is the one that the move names
  const seen = new Set<string>();
  const walk = async (moves: string[], position: string) => {
    if (seen.has(position)) return;
    seen.add(position);
    const [here, image] = [positionsAfter(moves).at(-1), positionsAfter(moves.map(mirrorEdge)).at(-1)];
    assert.equal(here, position, moves.join(" "));
    assert.equal(image, mirrorPosition(position), moves.join(" "));
    for (const m of (await book.get(position))!.position.moves) await walk([...moves, m.move], m.to);
  };
  await walk([], START);
  assert.equal(seen.size, 404);
});

test("the engine gives the cases' line as the converter and these tests write it", { skip }, () => {
  assert.deepEqual(positionsAfter(LINE_B), LINE_B_POSITIONS);
  assert.equal(positionsAfter(["D10-G11"]).at(-1), AFTER_G11);
});
