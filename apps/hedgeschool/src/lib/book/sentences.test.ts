// Checks the book's sentences (sentences.ts) and symbols (symbols.ts) on every position of the test books
// (tests/fixtures/test-book), in both orientations: each sentence is read back by its template, and each fact that it
// states is checked against the book's values, by the design's numbers (design 32, "The book file", and design 10).
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { openBook, type Book } from "./book.ts";
import type { BookIndex, BookMove, BookPart, BookPosition } from "./form.ts";
import { SYMBOL_NAME, symbol } from "./symbols.ts";
import { bestMoveSentence, endSentence, lineText, lineTurn, mainLine, moveSentence, trapSentence } from
  "./sentences.ts";
import { mirrorPosition } from "#lib/engine/notation.ts";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const readJson = (url: string) => JSON.parse(readFileSync(join(root, "tests", "fixtures", url), "utf8"));
const BOOKS = ["/test-book/prototype/index.json", "/test-book/cases/index.json"];
const START = "A10-D10 Q10-T10 b1 0/0 0";

/** A book's positions as they are stored, and the book through its loader. A part that no file holds is skipped. */
async function load(url: string): Promise<{ book: Book; stored: string[] }> {
  const book = await openBook(url, async u => readJson(u));
  const index = readJson(url) as BookIndex, dir = url.slice(0, url.lastIndexOf("/") + 1);
  const stored = index.parts.flatMap(p => {
    try { return (readJson(dir + p.file) as BookPart).positions.map(q => q.position); } catch { return []; }
  });
  return { book, stored };
}
/** Every position of the test books, as the loader gives it, in the orientation stored and in its mirror image. */
async function everyPosition(): Promise<{ book: Book; p: BookPosition }[]> {
  const all: { book: Book; p: BookPosition }[] = [];
  for (const url of BOOKS) {
    const { book, stored } = await load(url);
    for (const s of stored) for (const q of new Set([s, mirrorPosition(s)])) all.push({ book, p: (await book.get(q))! });
  }
  return all;
}

// --- The facts, computed here from the values by the design's numbers -----------------------------------------
const mover = (p: BookPosition) => (p.mover === "b" ? "Blue" : "Red");
const win = (p: BookPosition, blueWin: number) => (p.mover === "b" ? blueWin : 1 - blueWin);
const count = (p: BookPosition) => Number(p.position.split(" ")[4]);
/** The words of the symbol at a line's end: 0.524, 0.564 and 0.635 of Blue's win chance, ∞ at a complexity of 0.10. */
function words(blueWin: number, complexity: number, form: "clause" | "state" | "name"): string {
  const side = blueWin > 0.5 ? "Blue" : "Red";
  const near = (cut: number) => blueWin <= cut + 1e-9 && blueWin >= 1 - cut - 1e-9;
  if (near(0.524)) {
    const what = complexity >= 0.10 ? "unclear" : "equal";
    return form === "name" ? (what === "equal" ? "Equal position" : "Unclear position")
      : form === "clause" ? `the game is ${what}` : `the game ${what}`;
  }
  const degree = near(0.564) ? "slightly better" : near(0.635) ? "better" : "winning";
  return form === "state" ? `${side} ${degree}` : `${side} is ${degree}`;
}
const lineEnd = (m: BookMove, form: "clause" | "state" | "name") => words(m.value.blueWin, m.end.complexity, form);
/** The mover's best win chance here: the first book move's, or the best outside the book's. */
const bestWin = (p: BookPosition) =>
  Math.max(win(p, p.moves[0].value.blueWin), p.outside ? win(p, p.outside.blueWin) : 0);
const loss = (p: BookPosition, m: BookMove) => Math.round((bestWin(p) - win(p, m.value.blueWin)) * 1e6) / 1e6;
const outsideBetter = (p: BookPosition) => !!p.outside && win(p, p.outside.blueWin) > win(p, p.moves[0].value.blueWin);
/** Design 10's bands, without Best: Excellent to 0.02, Good to 0.05, Inaccuracy to 0.10, Mistake to 0.20. */
const band = (x: number) => (x <= 0.02 ? "Excellent" : x <= 0.05 ? "Good" : x <= 0.10 ? "Inaccuracy" : x <= 0.20
  ? "Mistake" : "Blunder");
const percent = (x: number) => `${(100 * x).toFixed(1)}%`;
/** A place in the game: a turn and the place of an edge in it. */
type Place = { turn: number; edge: 1 | 2 };
/** The place after a position's next edge, from its turn and edge fields: turn 1 has one edge, the others two. */
const next = ({ turn, edge }: Place): Place => (turn === 1 || edge === 2 ? { turn: turn + 1, edge: 1 } : { turn, edge: 2 });
/** A line in the notation from a place: each turn's number from the places, not from the edge counts as lineText. */
function line(at: Place, edges: string[]): string {
  const words: string[] = [];
  edges.forEach((e, i) => {
    if (i === 0) words.push(`${at.turn}${at.edge === 2 ? "..." : "."}`);
    else if (at.edge === 1) words.push(`${at.turn}.`);
    words.push(e);
    at = next(at);
  });
  return words.join(" ");
}
const traps = (p: BookPosition) => p.moves.filter(m => m.trap);
const gap = (p: BookPosition, m: BookMove) => win(p, m.trap!.short) - win(p, m.value.blueWin);
/** A trap's text, from its values: its side's win chance with the best move here and after the trap (lower, so that
 *  "decreases" is true), its refutation from the place after it, and the end after that. */
function trapText(p: BookPosition, m: BookMove, again: string): string {
  assert.ok(percent(bestWin(p)) !== percent(win(p, m.value.blueWin)) && bestWin(p) > win(p, m.value.blueWin), m.move);
  return `${m.move} seems good after a short search, but ${again} decreases ${mover(p)}'s win chance from ` +
    `${percent(bestWin(p))} to ${percent(win(p, m.value.blueWin))}. After ${line(next(p), m.trap!.refutation)}, ` +
    `${lineEnd(m, "clause")}.`;
}

/** Each text's sentences: one plain sentence each, at most 25 words (Simplified Technical English's limit for a
 *  description), with no semicolon and nothing on what a turn encloses (design 30, "Why"). A full stop after a turn's
 *  number ("3." or "2...") ends no sentence. */
function plain(text: string) {
  const sentences = text.split(/(?<=\.)(?<!(?:^|\s)\d+\.)(?<!\.\.\.) /);
  for (const s of sentences) {
    assert.match(s, /^[A-Z0-9].*\.$/, `one sentence: ${s}`);
    assert.ok(s.split(" ").length <= 25, `at most 25 words: ${s}`);
    assert.doesNotMatch(s, /;|enclos|clos|area|region|point|cut/i, s);
  }
}

test("the symbols: the cut-offs of design 32, each inclusive, and ∞ for a hard equal position", () => {
  assert.equal(symbol(0.5, 0), "=");
  assert.equal(symbol(0.524, 0.05), "=");
  assert.equal(symbol(0.476, 0.10), "∞");
  assert.equal(symbol(0.525, 0.5), "⩲");
  assert.equal(symbol(0.436, 0), "⩱");
  assert.equal(symbol(0.635, 0), "±");
  assert.equal(symbol(0.364, 0), "−+");
  assert.equal(symbol(0.9, 0), "+−");
  assert.equal(SYMBOL_NAME["∓"], "Red is better");
});

test("a line in the notation numbers each turn, and a turn's second edge as N...", () => {
  assert.equal(lineText(0, ["A10-D9", "N11-Q10", "L10-N11", "D10-G12"]), "1. A10-D9 2. N11-Q10 L10-N11 3. D10-G12");
  assert.equal(lineText(2, ["N11-Q10", "G9-K10", "K10-M7"]), "2... N11-Q10 3. G9-K10 K10-M7");
});

test("the main line from the start: one sentence a turn, as the first view of Openings gives it", async () => {
  const { book } = await load(BOOKS[0]);
  const turns = await mainLine(book);
  assert.deepEqual(turns.map(t => t.sentence), [
    "1. A10-D9 keeps the game equal. The best other book move is 1. D10-G9. After it, Red is slightly better.",
    "2. N11-Q10 L10-N11 keep the game equal. The best other book move is 2. O11-Q10. After it, the game is equal.",
    "3. D10-G12 G12-J15 keep the game equal. The best other book move is 3. D9-G10. After it, the game is equal. " +
      "The main line ends here.",
  ]);
  assert.deepEqual(turns.map(t => [t.at, t.edges.length, t.ends]),
    [[{ turn: 1, edge: 1 }, 1, false], [{ turn: 2, edge: 1 }, 2, false], [{ turn: 3, edge: 1 }, 2, true]]);
});

test("every turn's sentence is true by the book's values, on the main line from every position", async () => {
  const re = /^(\d+)(\.|\.\.\.) (\S+)(?: (\S+))? (keeps|keep|leaves|leave) (.+?)\.((?: \S+ \S+ is better, but it is not in the book\.)*) (?:The best other book move is (.+)\. After it, (.+?)\.|(The book has no other move in this turn\.))( The main line ends here\.)?$/;
  let n = 0, outsideNamed = 0;
  for (const { book, p: from } of await everyPosition()) {
    if (!from.moves.length) {
      assert.throws(() => lineTurn(from), /no book move/);
      continue;
    }
    let p = from;
    for (const t of await mainLine(book, from.position)) {
      plain(t.sentence);
      const g = t.sentence.match(re);
      assert.ok(g, t.sentence);
      const [, turn, dots, e1, e2, verb, state, outside, other, otherEnd, none, ends] = g;
      const m1 = p.moves[0];
      assert.deepEqual([Number(turn), dots === "..." ? 2 : 1, e1], [p.turn, p.edge, m1.move], t.sentence);
      // A turn's second edge is on the line when the turn has one and the line goes on after the first
      let at = p, m = m1;
      const second = (await book.get(m1.to))!;
      if (p.edge === 1 && p.turn > 1 && m1.end.count > count(p) + 1) {
        at = second;
        m = second.moves[0];
        assert.equal(e2, m.move, t.sentence);
      } else assert.equal(e2, undefined, t.sentence);
      const steps = at === p ? [p] : [p, at];
      assert.equal(state, lineEnd(m, "state"), t.sentence);
      const keeps = words(p.value.blueWin, p.complexity, "state") === state;
      assert.equal(verb.startsWith("keep"), keeps, t.sentence);
      assert.equal(verb.endsWith("s"), !e2, t.sentence);
      // A better move outside the book, at either edge of the turn, is named
      assert.equal(outside, steps.filter(outsideBetter)
        .map(q => ` ${line(q, [q.outside!.move])} is better, but it is not in the book.`).join(""), t.sentence);
      if (outside) outsideNamed++;
      const others = steps.flatMap(q => q.moves.slice(1).map(o => ({ q, o })));
      if (others.length) {
        const best = Math.max(...others.map(({ q, o }) => win(q, o.value.blueWin)));
        const named = others.find(({ q, o }) => line(q, [o.move]) === other);
        assert.ok(named, `${t.sentence}: the other move is a book move of the turn`);
        assert.equal(win(named.q, named.o.value.blueWin), best, `${t.sentence}: the best of them`);
        assert.equal(otherEnd, lineEnd(named.o, "clause"), t.sentence);
      } else assert.ok(none, t.sentence);
      assert.equal(!!ends, m.end.count === count(at) + 1, t.sentence);
      assert.deepEqual([t.ends, t.to], [!!ends, m.to], t.sentence);
      n++;
      if (ends) break;
      p = (await book.get(m.to))!;
    }
  }
  assert.ok(n > 400 && outsideNamed > 0, `${n} turns, ${outsideNamed} with a better move outside the book`);
});

test("every position's best move, other move and trap sentences, and the book's end, are true by its values",
  async () => {
    const fine = /^(\S+) is (?:the only fine (book )?move|the best of the (\d+) fine (book )?moves) here\. After it, (.+?)\.$/;
    const outside = /^(\S+) is the best book move here\. After it, (.+?)\. (\S+) is better, but it is not in the book\.$/;
    const otherRe = /^(\S+) is (a|an) (\w+)( move)? here\. After it, (.+)\.$/;
    const seen = { only: 0, several: 0, outside: 0, avoids: 0, firstTraps: 0, traps: 0, others: 0, ends: 0 };
    for (const { p } of await everyPosition()) {
      if (!p.moves.length) {
        assert.equal(bestMoveSentence(p), null);
        assert.equal(endSentence(p), `End of the book. ${words(p.value.blueWin, p.complexity, "name")}.`);
        seen.ends++;
        continue;
      }
      const best = p.moves[0], text = bestMoveSentence(p)!;
      plain(text);
      // The traps at the text's end: the best move's own, then the avoided one with the largest gap
      const ts = traps(p).filter(m => m !== best).sort((a, b) => gap(p, b) - gap(p, a));
      const own = best.trap ? ` This move is a trap: ${trapText(p, best, best.move)}` : "";
      const avoids = ts.length ? ` This move avoids a trap: ${trapText(p, ts[0], ts[0].move)}` : "";
      assert.ok(text.endsWith(own + avoids), text);
      const rest = text.slice(0, text.length - (own + avoids).length);
      assert.doesNotMatch(rest, /trap/, text);
      if (own) seen.firstTraps++;
      if (avoids) seen.avoids++;
      if (outsideBetter(p)) {
        const g = rest.match(outside);
        assert.ok(g, text);
        assert.deepEqual(g.slice(1, 4), [best.move, lineEnd(best, "clause"), p.outside!.move], text);
        seen.outside++;
      } else {
        assert.ok(!best.trap, `${text}: the first book move is a trap only where a move outside the book is better`);
        const g = rest.match(fine);
        assert.ok(g, text);
        const [, edge, bookOnly, k, bookK, end] = g;
        const fines = p.moves.filter(m => loss(p, m) <= 0.05).length;
        const outsideFine = !!p.outside && win(p, best.value.blueWin) - win(p, p.outside.blueWin) <= 0.05 + 1e-9;
        assert.equal(edge, best.move, text);
        assert.equal(end, lineEnd(best, "clause"), text);
        assert.equal(k === undefined ? 1 : Number(k), fines, text);
        assert.equal(!!(bookOnly ?? bookK), outsideFine, text);
        seen[fines === 1 ? "only" : "several"]++;
      }

      // A row's sentence: a trap's for each trap, the first book move too, and the best move's for the first
      for (const m of p.moves) {
        const s = moveSentence(p, m);
        plain(s);
        if (m.trap) {
          assert.equal(s, trapSentence(p, m));
          assert.equal(s, trapText(p, m, "it"));
          seen.traps++;
        } else if (m === best) assert.equal(s, text);
        else {
          const g = s.match(otherRe);
          assert.ok(g, s);
          const [, edge, a, label, move, end] = g;
          assert.deepEqual([edge, label, !!move, end], [m.move, band(loss(p, m)), loss(p, m) <= 0.05,
            lineEnd(m, "clause")], s);
          assert.equal(a, /^[AEIOU]/.test(label) ? "an" : "a", s);
          seen.others++;
        }
      }
    }
    // Each kind of sentence comes on the test books: 39 traps, in both orientations
    assert.ok(Object.values(seen).every(x => x > 0), JSON.stringify(seen));
    assert.ok(seen.traps >= 78, JSON.stringify(seen));
  });

test("a position's sentences, as the table shows them: the best move with the trap it avoids, and the trap", async () => {
  const { book } = await load(BOOKS[0]);
  const start = (await book.get(START))!;
  assert.equal(bestMoveSentence(start), "A10-D9 is the only fine move here. After it, the game is equal.");
  assert.equal(moveSentence(start, start.moves[1]), "D10-G9 is an Inaccuracy here. After it, Red is slightly better.");
  const p = (await book.get("A10-D10,D10-G9* Q10-T10 r2 0/0 1"))!, trap = p.moves.find(m => m.trap)!;
  assert.equal(bestMoveSentence(p), "N11-Q10 is the best of the 2 fine moves here. After it, Red is slightly " +
    "better. This move avoids a trap: Q11-T10 seems good after a short search, but Q11-T10 decreases Red's win " +
    "chance from 55.3% to 46.8%. After 2... N11-Q10 3. G9-K10 K10-M7, Blue is slightly better.");
  assert.equal(trapSentence(p, trap), "Q11-T10 seems good after a short search, but it decreases Red's win chance " +
    "from 55.3% to 46.8%. After 2... N11-Q10 3. G9-K10 K10-M7, Blue is slightly better.");
});
