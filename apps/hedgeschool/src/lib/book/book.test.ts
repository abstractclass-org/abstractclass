// Checks the book's loader (book.ts) and the test books in tests/fixtures/test-book (scripts/test-book.mjs), as the dev
// and preview servers serve them (vite.config.ts, `testBook`): the form, the lookups with mirror images, the parts that
// load on demand and the part that fails. The engine's tests check the books' positions against the engine's rules,
// with its CPU module in Node (scripts/node-engine.mjs). They need its files (`npm run engine`), and are skipped
// without them. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { BookLoadError, bookMove, openBook, type Book, type BookReader } from "./book.ts";
import { BOOK_FORMAT, BOOK_VERSION, type BookIndex, type BookPart, type BookPosition } from "./form.ts";
import { POINTS, decodeArea, encodeArea, mirrorArea } from "./area.ts";
import { mirrorEdge, mirrorPosition } from "#lib/engine/notation.ts";
import { playerOf } from "#lib/engine/position.ts";
import { turnFromCount } from "#lib/review/enclosure.ts";
import { moverWin } from "@abstractclass/analysis/model.ts";
import { nodeEngine } from "../../../scripts/node-engine.mjs";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const TEST_BOOK = "/test-book/prototype/index.json", CASES = "/test-book/cases/index.json";
/** A test book's file by its address on the servers. */
const fixture = (url: string) => join(root, "tests", "fixtures", url);
const readJson = (url: string) => JSON.parse(readFileSync(fixture(url), "utf8"));
/** Reads the test books' files as the browser fetches them, and logs each address. */
const files = (log: string[] = []): BookReader => async url => {
  log.push(url);
  return readJson(url);
};
/** A book as its files store it: its index, the addresses of its files that exist, and their positions. */
function stored(url: string): { index: BookIndex; urls: string[]; positions: BookPosition[] } {
  const index = readJson(url) as BookIndex, dir = url.slice(0, url.lastIndexOf("/") + 1);
  const urls = [url, ...index.parts.map(p => dir + p.file)].filter(u => existsSync(fixture(u)));
  return { index, urls, positions: urls.slice(1).flatMap(u => (readJson(u) as BookPart).positions) };
}
const PROTOTYPE = stored(TEST_BOOK), HAND_MADE = stored(CASES);

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
  for (const { index, positions } of [PROTOTYPE, HAND_MADE]) {
    assert.equal(index.format, BOOK_FORMAT);
    assert.equal(index.version, BOOK_VERSION);
    assert.equal(index.start, START);
    assert.ok(index.parts[0].positions.includes(START), "the first part holds the start");
    assert.match(index.source.note ?? "", /not the engine's book/);
    const listed = new Set(index.parts.flatMap(p => p.positions));
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
      for (const v of [p.value, ...p.moves.map(m => m.value)])
        assert.ok(0 <= v.low && v.low <= v.blueWin && v.blueWin <= v.high && v.high <= 1, p.position);
      // The best move first, then by the mover's win chance: in this book the best has the most
      const wins = p.moves.map(m => moverWin(m.value.blueWin, playerOf(p.mover)));
      assert.ok(wins.every((w, i) => i === 0 || w <= wins[i - 1]), p.position);
      assert.equal(decodeArea(p.area).length, POINTS);
    }
    assert.ok(positions.every(p => listed.has(p.position)) && positions.length <= listed.size);
  }
  // The test book: the third prototype's positions and traps, each file a few hundred kilobytes at most, about 1 MB
  // in all with the cases.
  assert.equal(PROTOTYPE.positions.length, 404);
  assert.equal(PROTOTYPE.positions.flatMap(p => p.moves).filter(m => m.trap).length, 38);
  const sizes = [PROTOTYPE, HAND_MADE].flatMap(b => b.urls).map(u => statSync(fixture(u)).size);
  assert.ok(Math.max(...sizes) < 300_000 && sizes.reduce((a, b) => a + b) < 1_000_000, String(sizes));
});

test("a trap's refutation is a line of the book through the enemy's turn", async () => {
  const book = await openBook(TEST_BOOK, files());
  for (const { position } of PROTOTYPE.positions) {
    const p = (await book.get(position))!;
    for (const m of p.moves.filter(m => m.trap)) {
      const line = m.trap!.refutation;
      assert.ok(line.length >= 1 && line.length <= 3, `${position}: ${m.move}`);
      let at = (await book.get(m.to))!;
      for (const edge of line) {
        const next = at.moves.find(n => n.move === edge);
        assert.ok(next, `${position}: ${m.move}, then ${edge}`);
        at = (await book.get(next.to))!;
      }
      // It ends at the trapper's next turn, or where the book ends (one trap of the prototype's book)
      assert.ok(at.mover === p.mover || at.moves.length === 0, `${position}: ${m.move}: the refutation's end`);
    }
  }
});

test("the loader reads the index, then the start's part, then each part when a lookup needs it", async () => {
  const log: string[] = [];
  const book = await openBook(TEST_BOOK, files(log));
  assert.equal(book.start, START);
  assert.equal(book.source.network, "b10c128-s89066368-d17827487");
  assert.deepEqual(log, [TEST_BOOK, "/test-book/prototype/0.json"]);
  assert.equal((await book.get(START))?.position, START);
  assert.equal(log.length, 2, "the start's part loads once");
  // The position after A10-D9 and O9-Q10 and L10-O9 and D10-G12 is in the part of A10-D9's line
  const deep = LINE_B_POSITIONS[7];
  assert.equal(book.peek(deep), undefined, "its part has not loaded");
  assert.equal((await book.get(deep))?.position, deep);
  assert.equal(log.length, 3);
  assert.equal(book.peek(deep)?.position, deep, "now it is at hand");
});

test("a lookup finds a position stored as its mirror image, and gives it as the player reached it", async () => {
  const book = await openBook(TEST_BOOK, files());
  assert.ok(!PROTOTYPE.index.parts.some(p => p.positions.includes(AFTER_G11)), "the book stores only its image");
  const stored = PROTOTYPE.positions.find(p => p.position === AFTER_G9)!;
  assert.deepEqual(await book.get(AFTER_G9), stored, "a position that the book stores as it is");
  assert.equal((await book.get(START))?.position, START, "the start is its own image");
  // As the player reached it: its notation, its edges, the positions that its moves reach, its parents and its area
  // map mirrored
  const reached = (await book.get(AFTER_G11))!;
  assert.equal(reached.position, AFTER_G11);
  assert.deepEqual(reached.moves.map(m => [m.move, m.to]), stored.moves.map(m => [mirrorEdge(m.move), mirrorPosition(m.to)]));
  assert.ok(reached.moves.every(m => !("mirrored" in m)));
  assert.deepEqual(reached.parents, [{ position: START, move: "D10-G11" }]);
  assert.equal(reached.outside?.move, mirrorEdge(stored.outside!.move));
  assert.equal(reached.area, mirrorArea(stored.area));
  assert.deepEqual(reached.value, stored.value);
  // Each move's `to` is a position that the lookup gives as it is
  for (const m of reached.moves) assert.equal((await book.get(m.to))?.position, m.to);
});

test("in a position that is its own mirror image, an edge plays its twin's book move", async () => {
  const book = await openBook(TEST_BOOK, files());
  const start = (await book.get(START))!, g9 = bookMove(start, "D10-G9")!;
  assert.equal(g9.to, AFTER_G9);
  assert.ok(!start.moves.some(m => m.move === "D10-G11"), "the book lists one edge of the pair");
  const g11 = bookMove(start, "D10-G11")!;
  assert.deepEqual([g11.move, g11.to, g11.value], ["D10-G11", AFTER_G11, g9.value]);
  assert.equal((await book.get(g11.to))?.position, AFTER_G11);
  assert.equal(bookMove(start, "A1-B2"), undefined);
  // In a position that is not its own image, the image of a book move is not one by it
  const after = (await book.get(AFTER_G9))!;
  const m = after.moves.find(n => !after.moves.some(o => o.move === mirrorEdge(n.move)))!;
  assert.equal(bookMove(after, m.move), m);
  assert.equal(bookMove(after, mirrorEdge(m.move)), undefined);
});

test("a line that leaves the book and comes back is found at its start and its end", async () => {
  const book = await openBook(TEST_BOOK, files());
  assert.deepEqual(LINE_B_POSITIONS.map(p => book.peek(p) !== null), [true, false, false, false, false, false, false, true]);
  assert.equal(await book.get(LINE_B_POSITIONS[3]), null);
});

test("the cases: a position that move orders from two turns reach, and a line through a mirror image", async () => {
  const book = await openBook(CASES, files());
  assert.ok(!HAND_MADE.positions.some(p => p.position === LINE_B_POSITIONS[4]), "the book stores its image");
  // Its canonical parent is on the first line (A10-D9 at turn 1, D10-G12 at turn 3), the other on LINE_B
  assert.deepEqual((await book.get(LINE_B_POSITIONS[7]))?.parents, [
    { position: "A10-D9,A10-D10,D9-E11*,D10-G12* H11-L10+,L10-O9,O9-Q10,Q10-T10 r1 1.875/0 6", move: "G14-H11" },
    { position: LINE_B_POSITIONS[6], move: "G14-H11" },
  ]);
  // The explorer's walk: at each position, the line's move is a book move that reaches the line's next position, and
  // the next position has the move back as a parent
  for (let k = 0; k < LINE_B.length; k++) {
    const here = await book.get(LINE_B_POSITIONS[k]);
    assert.equal(here?.position, LINE_B_POSITIONS[k], `after ${k} edges`);
    assert.equal(here!.moves.find(m => m.move === LINE_B[k])?.to, LINE_B_POSITIONS[k + 1], `${LINE_B[k]} after ${k} edges`);
    const next = await book.get(LINE_B_POSITIONS[k + 1]);
    assert.ok(next?.parents.some(q => q.position === LINE_B_POSITIONS[k] && q.move === LINE_B[k]), `after ${k + 1} edges`);
  }
});

test("a part that does not load rejects each lookup in it, and a later lookup tries again", async () => {
  const cases = await openBook(CASES, files());
  assert.ok(HAND_MADE.index.parts[2].positions.includes(AFTER_G9) && !HAND_MADE.urls.includes("/test-book/cases/2.json"));
  assert.equal(cases.peek(AFTER_G9), undefined, "the book holds it");
  await assert.rejects(cases.get(AFTER_G9), BookLoadError);
  await assert.rejects(cases.get(AFTER_G9), BookLoadError);
  assert.equal(cases.peek(AFTER_G9), undefined);
  assert.equal((await cases.get(START))?.position, START, "the other parts still load");

  // A reader that fails once: the second lookup loads the part
  let fails = 1;
  const flaky: BookReader = async url => {
    if (url.endsWith("/1.json") && fails-- > 0) throw new Error("offline");
    return files()(url);
  };
  const book: Book = await openBook(TEST_BOOK, flaky);
  await assert.rejects(book.get(LINE_B_POSITIONS[7]), (e: unknown) =>
    e instanceof BookLoadError && e.url === "/test-book/prototype/1.json" && /offline/.test(e.message));
  assert.equal((await book.get(LINE_B_POSITIONS[7]))?.position, LINE_B_POSITIONS[7]);
});

test("the loader refuses a file that is not a book's, or a book of another form", async () => {
  await assert.rejects(openBook("/x.json", async () => ({ format: "other", version: 1 })), BookLoadError);
  await assert.rejects(openBook("/x.json", async () => ({ format: BOOK_FORMAT, version: 2 })), /form 2 is not 1/);
  await assert.rejects(openBook("/x.json", async () => { throw new Error("404 Not Found"); }), /404/);
});

test("an area map keeps each point's ownership in hundredths, and its mirror image turns the rows over", () => {
  const own = Array.from({ length: POINTS }, (_, i) => ((i * 37) % 201) - 100);
  assert.deepEqual(decodeArea(encodeArea(own)), own);
  assert.deepEqual(decodeArea(encodeArea([150, -150, 0.4, -0.6, ...own.slice(4)])).slice(0, 4), [100, -100, 0, -1]);
  const image = decodeArea(mirrorArea(encodeArea(own)));
  for (let y = 0; y < 19; y++)
    for (let x = 0; x < 19; x++) assert.equal(image[y * 19 + x], own[(18 - y) * 19 + x], `x ${x}, y ${y}`);
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
const positionAfter = (moves: string[]) => positionsAfter(moves).at(-1);

test("the engine reaches each book position by its book moves, and its mirror image by the moves' images", { skip }, async () => {
  const book = await openBook(TEST_BOOK, files());
  // From a position as the lookup gives it, by each book move: the engine's position after the moves is the move's
  // `to`. With `image`, the engine's position after the moves' images is the position's mirror image.
  const walk = async (moves: string[], position: string, seen: Set<string>, image: boolean) => {
    if (seen.has(position)) return;
    seen.add(position);
    assert.equal(positionAfter(moves), position, moves.join(" "));
    if (image) assert.equal(positionAfter(moves.map(mirrorEdge)), mirrorPosition(position), moves.join(" "));
    for (const m of (await book.get(position))!.moves) await walk([...moves, m.move], m.to, seen, image);
  };
  const all = new Set<string>();
  await walk([], START, all, true);
  assert.equal(all.size, 404);
  // The subtree after D10-G9, and the same walked through its mirror image: the lookup turns each position over
  const [stored, turned] = [new Set<string>(), new Set<string>()];
  await walk(["D10-G9"], AFTER_G9, stored, false);
  await walk(["D10-G11"], AFTER_G11, turned, false);
  assert.ok(stored.size > 1);
  assert.deepEqual([...turned], [...stored].map(mirrorPosition));
});

test("the engine gives the cases' line as the converter and these tests write it", { skip }, () => {
  assert.deepEqual(positionsAfter(LINE_B), LINE_B_POSITIONS);
  assert.equal(positionAfter(["D10-G11"]), AFTER_G11);
});
