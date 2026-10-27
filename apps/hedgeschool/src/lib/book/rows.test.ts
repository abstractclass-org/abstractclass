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
import { bookCount, bookRows, positionTitle, rowBoardLine, rowCandidates, rowLine, rowRefutation, turnCount, turnRows,
  turnStart, TURNS_SHOWN, type BookRow } from "./rows.ts";
import { bestTurnSentence, edgeCount, isFine, moveLabel, turnSentence } from "./sentences.ts";
import { GOOD_WIN } from "@abstractclass/analysis/labels.ts";
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

// --- By turn (turnRows): at a turn's start, each row is a whole turn of two book moves -----------------------------

/** A turn's start, its rows by turn, from the book's positions after each of its book moves. */
async function byTurn(p: BookPosition): Promise<BookRow[]> {
  return turnRows(p, await Promise.all(p.moves.map(m => book.get(m.to))));
}
const starts = all.filter(p => turnStart(p) && p.moves.length);
// After Blue's D10-G9 at turn 1: Red's first edges, among them the traps Q11-T10 and N9-Q10
const AFTER_G9 = "A10-D10,D10-G9* Q10-T10 r2 0/0 1";

test("by turn: the book's counts of whole turns at a turn's start", async () => {
  assert.equal(starts.length, 78, "turn starts with book moves, after turn 1 of one edge");
  assert.ok(!turnStart(await at(START)), "the start: its turn has one edge");
  assert.ok(all.filter(p => p.edge === 2).every(p => !turnStart(p)), "a turn's middle");
  const counts = (await Promise.all(starts.map(byTurn))).map(rows => rows.filter(r => r.book).length).sort((a, b) => a - b);
  assert.equal(counts[Math.floor(counts.length / 2)], 1, "the median");
  assert.equal(counts.at(-1), 34, "the most");
  assert.equal(counts.filter(c => c > TURNS_SHOWN).length, 8, "the starts that give more than 8");
});

test("by turn: each book turn once, in the groups' order, numbered, and labelled from the turn's loss", async () => {
  const order = ["fine", "other", "trap", "outside"];
  for (const p of starts) {
    const rows = await byTurn(p), mover = playerOf(p.mover), win = (b: number) => moverWin(b, mover);
    const seconds = await Promise.all(p.moves.map(m => book.get(m.to)));
    const turns = p.moves.flatMap((m, k) => seconds[k]!.moves.map(m2 => `${m.move} ${m2.move}`)).sort();
    assert.deepEqual(rows.filter(r => r.book).map(r => r.move).sort(), turns, p.position);
    assert.deepEqual(rows.map(r => r.n), rows.map((_, k) => k + 1), p.position);
    const ranks = rows.map(r => order.indexOf(r.group));
    assert.ok(ranks.every((r, k) => k === 0 || r >= ranks[k - 1]), `${p.position}: ${rows.map(r => r.group)}`);
    // The best turn's win chance is the position's best: the first book move's, or the best move outside the book's
    const best = Math.max(win(p.moves[0].value.blueWin), p.outside ? win(p.outside.blueWin) : 0);
    for (const r of rows.filter(r => r.book)) {
      assert.equal(r.edges.length, 2, r.move);
      assert.equal(r.blueWin, r.book!.value.blueWin, "the win chance after the turn's second edge");
      assert.equal(r.book!.move, r.edges[1]);
      if (r.group !== "trap") assert.equal(r.group === "fine", best - win(r.blueWin) <= GOOD_WIN + 1e-9, r.move);
      assert.equal(!!r.trap, !!(p.moves.find(m => m.move === r.edges[0])!.trap || r.book!.trap), r.move);
    }
    assert.equal(rows.filter(r => r.label === "best").length, 1, p.position);
    assert.ok(rows.every(r => r.label !== "great"), p.position);
    // The fine and other turns by the mover's win chance, the best first; the best 8 show, the rest after "Show more"
    const plain = rows.filter(r => r.group === "fine" || r.group === "other");
    for (const g of ["fine", "other"]) {
      const w = plain.filter(r => r.group === g).map(r => win(r.blueWin));
      assert.ok(w.every((x, k) => k === 0 || x <= w[k - 1]), `${p.position}: ${g}`);
    }
    assert.deepEqual(plain.map(r => !!r.more), plain.map((_, k) => k >= TURNS_SHOWN), p.position);
    assert.ok(rows.filter(r => r.more).every(r => r.group !== "trap" && r.group !== "outside"));
    const traps = rows.filter(r => r.group === "trap"), gaps = traps.map(r => win(r.trap!.short) - win(r.blueWin));
    assert.ok(gaps.every((g, k) => k === 0 || g <= gaps[k - 1]), p.position);
  }
});

test("by turn: a first edge's trap, with the rest of its refutation after the turn that follows it", async () => {
  const p = await at(AFTER_G9), rows = await byTurn(p), trap = p.moves.find(m => m.move === "Q11-T10")!.trap!;
  assert.deepEqual(trap.refutation, ["N11-Q10", "G9-K10", "K10-M7"]);
  const row = rows.find(r => r.move === "Q11-T10 N11-Q10")!;
  assert.equal(row.group, "trap");
  assert.equal(row.trap!.short, trap.short);
  assert.deepEqual(row.trap!.refutation, ["G9-K10", "K10-M7"]);
  assert.equal(rowRefutation(p, row), "3. G9-K10 K10-M7");
  assert.deepEqual(rowLine(book, row), ["Q11-T10", "N11-Q10", "G9-K10", "K10-M7"]);
  assert.deepEqual(rowBoardLine(book, p, row).map(e => e.player), [1, 1, 0, 0]);
  assert.match(turnSentence(p, rows, row), /^Q11-T10 N11-Q10 seems good after a short search, but it decreases Red's win chance from \S+% to \S+%\. After 3\. G9-K10 K10-M7, /);
  // A second edge's trap: its refutation is the enemy's turn after it
  for (const q of starts) for (const r of (await byTurn(q)).filter(r => r.book?.trap)) {
    assert.deepEqual(r.trap!.refutation, r.book!.trap!.refutation, r.move);
    assert.equal(r.trap!.refutation.length, 2, r.move);
  }
});

test("by turn: the best turn outside the book is the best of the start's outside and each first edge's", async () => {
  let seen = 0;
  for (const p of starts) {
    const rows = await byTurn(p), mover = playerOf(p.mover), win = (b: number) => moverWin(b, mover);
    const seconds = await Promise.all(p.moves.map(m => book.get(m.to)));
    const outsides = [...(p.outside ? [{ edges: [p.outside.move], blueWin: p.outside.blueWin }] : []),
      ...p.moves.flatMap((m, k) => (seconds[k]!.outside ? [{ edges: [m.move, seconds[k]!.outside!.move], blueWin: seconds[k]!.outside!.blueWin }] : []))];
    const outside = rows.filter(r => r.group === "outside");
    assert.equal(outside.length, outsides.length ? 1 : 0, p.position);
    if (!outsides.length) continue;
    const best = Math.max(...outsides.map(o => win(o.blueWin)));
    assert.equal(win(outside[0].blueWin), best, p.position);
    assert.ok(outsides.some(o => o.edges.join(" ") === outside[0].move), p.position);
    assert.equal(outside[0].book, undefined);
    if (outside[0].edges.length === 2) seen++;
  }
  assert.ok(seen > 0, "a first edge's outside is the best somewhere");
});

test("by turn: the board numbers each first edge once, by its first row, and the texts", async () => {
  const p = await at(AFTER_G9), rows = await byTurn(p), numbers = rowCandidates(rows);
  const firsts = [...new Set(rows.map(r => r.edges[0]))];
  assert.deepEqual(numbers.map(c => c.rank), firsts.map(e => rows.find(r => r.edges[0] === e)!.n));
  assert.match(turnCount(rows), /^\d+ book turns?, 2 traps$/);
  assert.equal(turnCount([]), "End of the book");
  const best = rows.find(r => r.label === "best")!;
  assert.ok(bestTurnSentence(p, rows)!.startsWith(best.book ? `${best.move} is ` : `${rows[0].move} is the best book turn`));
  for (const r of rows.filter(r => r.book)) assert.ok(turnSentence(p, rows, r).startsWith(r.move), r.move);
  assert.equal(edgeCount(p), 1);
});
