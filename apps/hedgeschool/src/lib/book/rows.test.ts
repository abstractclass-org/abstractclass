// Checks the book's table rows (rows.ts) on the test book (tests/fixtures/test-book): the groups and their order, the
// labels and symbols of the sentences (sentences.ts, symbols.ts), the traps, the best move outside the book, the lines
// and the texts. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { openBook, type BookReader } from "./book.ts";
import type { BookPosition } from "./form.ts";
import { bookCount, bookRows, positionTitle, rowBoardLine, rowCandidates, rowLine, type BookRow } from "./rows.ts";
import { isFine, moveLabel } from "./sentences.ts";
import { lineEndSymbol, positionSymbol } from "./symbols.ts";
import { moverWin } from "@abstractclass/analysis/model.ts";
import { playerOf } from "#lib/engine/position.ts";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const files: BookReader = async url => JSON.parse(readFileSync(join(root, "tests", "fixtures", url), "utf8"));
const book = await openBook("/test-book/prototype/index.json", files);
const START = "A10-D10 Q10-T10 b1 0/0 0";
const at = async (position: string) => (await book.get(position))!;
const all: BookPosition[] = [];
{
  const index = JSON.parse(readFileSync(join(root, "tests/fixtures/test-book/prototype/index.json"), "utf8"));
  for (const part of index.parts) for (const p of part.positions) all.push(await at(p));
}
const groups = (rows: BookRow[]) => rows.map(r => r.group);

test("every position's rows: each book move once, the groups in their order, numbered from 1", () => {
  const order = ["fine", "other", "trap", "outside"];
  for (const p of all) {
    const rows = bookRows(p);
    assert.deepEqual(rows.map(r => r.n), rows.map((_, k) => k + 1), p.position);
    assert.deepEqual(rows.filter(r => r.book).map(r => r.move).sort(), p.moves.map(m => m.move).sort(), p.position);
    const ranks = groups(rows).map(g => order.indexOf(g));
    assert.ok(ranks.every((r, k) => k === 0 || r >= ranks[k - 1]), `${p.position}: ${groups(rows)}`);
    assert.equal(rows.filter(r => r.group === "outside").length, p.outside ? 1 : 0, p.position);
  }
});

test("the labels and symbols are the sentences': the fine moves Good or better, the best first, and no Great", () => {
  for (const p of all) {
    const rows = bookRows(p), mover = playerOf(p.mover);
    for (const r of rows.filter(r => r.book)) {
      assert.equal(r.label, moveLabel(p, r.book!), `${p.position}: ${r.move}`);
      assert.equal(r.symbol, lineEndSymbol(r.book!), `${p.position}: ${r.move}`);
      if (!r.book!.trap) assert.equal(r.group === "fine", isFine(p, r.book!), `${p.position}: ${r.move} ${r.label}`);
    }
    assert.ok(rows.every(r => r.label !== "great"), p.position);
    // The book's first move is Best, unless the best move outside the book is better: then that one is
    const outside = rows.find(r => r.group === "outside");
    const outsideBetter = !!outside && (!p.moves.length || moverWin(outside.blueWin!, mover) > moverWin(p.moves[0].value.blueWin, mover));
    assert.equal(rows.filter(r => r.label === "best").length, p.moves.length || p.outside ? 1 : 0, p.position);
    if (outsideBetter) assert.equal(outside.label, "best", p.position);
    else if (p.moves.length) assert.equal(rows.find(r => r.move === p.moves[0].move)!.label, "best", p.position);
  }
});

test("the traps follow the book moves, the largest gap between their two values first", () => {
  let seen = 0;
  for (const p of all) {
    const mover = playerOf(p.mover), traps = bookRows(p).filter(r => r.group === "trap");
    const gaps = traps.map(r => moverWin(r.book!.trap!.short, mover) - moverWin(r.blueWin!, mover));
    assert.ok(gaps.every((g, k) => k === 0 || g <= gaps[k - 1]), p.position);
    assert.equal(traps.length, p.moves.filter(m => m.trap).length);
    seen += traps.length;
  }
  assert.equal(seen, 38);
});

test("the best move outside the book has its label and no symbol", async () => {
  const s = await at(START), rows = bookRows(s);
  const outside = rows.find(r => r.group === "outside")!;
  assert.equal(outside.move, s.outside!.move);
  assert.equal(outside.book, undefined);
  assert.ok(outside.label && outside.symbol === undefined);
});

test("a row's line: the book's main line after it, a trap's refutation, an outside move alone", async () => {
  const s = await at(START), rows = bookRows(s);
  const line = rowLine(book, rows[0]);
  assert.equal(line[0], s.moves[0].move);
  let p = s;
  for (const edge of line) p = await at(p.moves.find(m => m.move === edge)!.to);
  assert.equal(p.moves.length, 0, "the line goes to the book's end");
  assert.equal(line.length, s.moves[0].end.count, "the end's edge count");
  assert.deepEqual(rowLine(book, rows.find(r => r.group === "outside")!), [s.outside!.move]);
  const trapAt = all.find(q => q.moves.some(m => m.trap))!, trap = bookRows(trapAt).find(r => r.group === "trap")!;
  assert.deepEqual(rowLine(book, trap), [trap.move, ...trap.book!.trap!.refutation]);
});

test("the texts: the count, the title and the symbol", async () => {
  const s = await at(START);
  assert.equal(bookCount(s), "3 book moves");
  const trapAt = all.find(q => q.moves.filter(m => m.trap).length === 1)!;
  assert.match(bookCount(trapAt), /^\d+ book moves?, 1 trap$/);
  assert.equal(bookCount(all.find(q => !q.moves.length)!), "End of the book");
  assert.equal(positionTitle(s), "Start · Blue to play");
  assert.equal(positionTitle(await at(s.moves[0].to)), "Turn 2 · Red to play, edge 1 of 2");
  assert.equal(positionSymbol(s), "=");
});

test("the board's numbers are the rows', and a line's edges have their movers", async () => {
  const s = await at(START), rows = bookRows(s), numbers = rowCandidates(rows);
  assert.deepEqual(numbers.map(c => c.rank), rows.map(r => r.n));
  assert.match(numbers[0].note, /^Best · Equal position$/);
  assert.match(numbers.at(-1)!.note, /not in the book$/);
  // From the start: Blue's one edge, then Red's two, then Blue's two
  assert.deepEqual(rowBoardLine(book, s, rows[0]).map(e => e.player), [0, 1, 1, 0, 0].slice(0, rowLine(book, rows[0]).length));
  const second = await at(s.moves[0].to), p2 = await at(second.moves[0].to);
  assert.deepEqual(rowBoardLine(book, p2, bookRows(p2)[0]).map(e => e.player).slice(0, 3), [1, 0, 0]);
});
