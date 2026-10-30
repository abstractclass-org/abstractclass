// Checks the book's values as the review's results (results.ts; design 32, "The review"): a book position gives the
// values, the candidates, the area map and the complexity, and the review's own rules (design 10) give each book move
// of the test book the book's quality label and loss, by edge and by turn. A book whose parts do not load gives no
// values, so that the review searches every position. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { moverOf } from "#lib/editor/position.ts";
import { edgeName, mirrorEdge, parseEdge } from "#lib/engine/notation.ts";
import { playerOf } from "#lib/engine/position.ts";
import { review, type Analysis, type ReviewData } from "#lib/review/enclosure.ts";
import { decodeArea } from "./area.ts";
import { bookMove, openBook } from "./book.ts";
import type { BookPart, BookPosition } from "./form.ts";
import { bookAnalysis, bookResults } from "./results.ts";
import { turnRows } from "./rows.ts";
import { edgeCount, lossTo, moveLabel, moveLoss } from "./sentences.ts";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const read = async (url: string) => JSON.parse(readFileSync(join(root, "tests", "fixtures", url), "utf8"));
const book = await openBook("/test-book/prototype/index.json", read);
const VISITS = book.source.visits;
const names = (a: Analysis) => a.candidates.map(c => edgeName(c.edge));

/** The book's result of a position, as bookResults gives it: with the position after its first book move. */
const resultOf = async (p: BookPosition) => bookAnalysis(p, VISITS, p.moves[0] ? await book.get(p.moves[0].to) : null);

/** The review of a line of book positions, with the book's values at each (`end`: a search's result after the line's
 *  last edge, where the line leaves the book). The positions and the moves hold what the review reads of them. */
async function reviewOf(line: BookPosition[], edges: string[], end?: Analysis) {
  const at = (p: BookPosition) => ({ player: playerOf(p.mover), scores: [0, 0], over: false, count: edgeCount(p) });
  const count = edgeCount(line[0]), after = end ? [{ ...at(line.at(-1)!), count: count + edges.length }] : [];
  const data = {
    players: { blue: "Blue", red: "Red" }, result: { blue: 0, red: 0 },
    moves: edges.map((e, k) => ({ player: moverOf(count + k).player, edge: parseEdge(e) })),
    positions: [...line.map(at), ...after],
    analysis: [...(await Promise.all(line.map(resultOf))), ...(end ? [end] : [])],
  } as unknown as ReviewData;
  return review(data, "lead", 256);
}

/** Every position of the test book, as stored. */
const index = await read("test-book/prototype/index.json");
const stored: BookPosition[] = (await Promise.all(index.parts.map((p: { file: string }) => read(`test-book/prototype/${p.file}`))))
  .flatMap((part: BookPart) => part.positions);

test("a book position as a result: its values, its candidates the best first, its area map and its complexity", async () => {
  const start = (await book.get(book.start))!, a = await resultOf(start);
  assert.deepEqual([a.blueWin, a.lead, a.visits, a.complexity, a.book], [start.value.blueWin, start.value.lead, VISITS, start.complexity, true]);
  assert.deepEqual(a.ownership, decodeArea(start.area));
  // The start is its own mirror image: each edge's twin follows it. The best move outside the book, A10-C9, is the worst
  // for Blue here, so it comes last.
  assert.deepEqual(names(a), ["A10-D9", "A10-D11", "D10-G9", "D10-G11", "D10-F9", "D10-F11", "A10-C9", "A10-C11"]);
  assert.equal(edgeName(a.candidates[1].twinOf!), "A10-D9");
  // The first book move's line goes on with the best move after it, a twin's line in its own orientation
  assert.deepEqual(a.candidates[0].line!.map(edgeName), ["A10-D9", "N11-Q10"]);
  assert.deepEqual(a.candidates[1].line!.map(edgeName), ["A10-D11", mirrorEdge("N11-Q10")]);
  // Where the best move outside the book is better than the first book move, it is the first choice
  const better = stored.find(p => p.outside && p.moves.length
    && (p.mover === "b" ? p.outside.blueWin > p.moves[0].value.blueWin : p.outside.blueWin < p.moves[0].value.blueWin))!;
  const b = await resultOf((await book.get(better.position))!);
  assert.equal(names(b)[0], better.outside!.move);
  assert.equal(b.candidates.length, better.moves.length + 1);
});

test("the review's rules give O11-Q10 of book-left-review.json the book's label and loss, by edge and by turn", async () => {
  const edges = ["A10-D9", "N11-Q10", "O11-Q10"], line = [(await book.get(book.start))!];
  for (const e of edges) line.push((await book.get(bookMove(line.at(-1)!, e)!.to))!);
  // D9-G11 leaves the book: the position after it has a search's result
  const R = await reviewOf(line, [...edges, "D9-G11"], { blueWin: 0.3, visits: 512, lead: -20, candidates: [] });
  const o11 = bookMove(line[2], "O11-Q10")!;
  assert.deepEqual(R.edges.slice(0, 3).map(e => e.label), ["best", "best", moveLabel(line[2], o11)]);
  assert.equal(R.edges[2].label, "inaccuracy");
  assert.ok(Math.abs(R.edges[2].loss - moveLoss(line[2], o11)) < 1e-9);
  const row = turnRows(line[1], await Promise.all(line[1].moves.map(m => book.get(m.to)))).find(r => r.move === "N11-Q10 O11-Q10")!;
  assert.deepEqual([R.turns[1].label, R.turns[1].edges.length], [row.label, 2]);
  assert.ok(Math.abs(R.turns[1].loss - 0.077) < 1e-9);
  // The move that leaves the book: from the book's value before it to the search's after it
  assert.ok(Math.abs(R.edges[3].loss - (line[3].value.blueWin - 0.3)) < 1e-9);
});

test("every book move of the test book: the review's label and loss are the book's, by edge and by turn", async () => {
  let edges = 0, turns = 0;
  for (const s of stored) {
    const p = (await book.get(s.position))!;
    for (const m of p.moves) {
      const to = await book.get(m.to);
      if (!to) continue;
      const R = await reviewOf([p, to], [m.move]);
      assert.equal(R.edges[0].label, moveLabel(p, m), `${p.position} ${m.move}`);
      assert.ok(Math.abs(R.edges[0].loss - moveLoss(p, m)) < 1e-6, `${p.position} ${m.move}`);
      edges++;
    }
    // By turn at a turn's start: each whole book turn, in the book's order and in the other, as the table's row
    if (p.edge !== 1 || moverOf(edgeCount(p)).left !== 2) continue;
    const seconds = await Promise.all(p.moves.map(m => book.get(m.to)));
    for (const row of turnRows(p, seconds).filter(r => r.book && r.edges.length === 2)) {
      for (const order of [row.edges, [...row.edges].reverse()]) {
        const first = bookMove(p, order[0]), middle = first && (await book.get(first.to));
        const second = middle && bookMove(middle, order[1]), end = second && (await book.get(second.to));
        if (!end) continue; // the other order is not in the book
        const R = await reviewOf([p, middle, end], order);
        assert.equal(R.turns[0].label, row.label, `${p.position} ${order.join(" ")}`);
        assert.ok(Math.abs(R.turns[0].loss - lossTo(p, row.blueWin)) < 1e-6, `${p.position} ${order.join(" ")} the turn's loss`);
        // By edge, each edge of the turn has the label and the loss that the table by edge gives it at its own position,
        // the book's best turn in the other order too (model.ts, review)
        assert.deepEqual(R.edges.map(e => e.label), [moveLabel(p, first), moveLabel(middle, second)],
                         `${p.position} ${order.join(" ")} by edge`);
        assert.ok(Math.abs(R.edges[0].loss - moveLoss(p, first)) < 1e-6 && Math.abs(R.edges[1].loss - moveLoss(middle, second)) < 1e-6,
                  `${p.position} ${order.join(" ")} losses by edge`);
        turns++;
      }
    }
  }
  assert.ok(edges > 400 && turns > 200, `${edges} edges, ${turns} turns`);
});

test("a book whose parts do not load gives no values: the review searches every position", async () => {
  const failing = await openBook("/test-book/prototype/index.json", async url => {
    if (url.endsWith("index.json")) return read(url);
    throw new Error("offline");
  });
  const start = book.start, after = bookMove((await book.get(start))!, "A10-D9")!.to;
  assert.deepEqual(await bookResults(failing, [start, after, undefined]), [undefined, undefined, undefined]);
  // The book that loads: the positions that it holds, and none for the one that it does not
  const given = await bookResults(book, [start, after, "A10-D9 Q10-T10 r2 0/0 1"]);
  assert.deepEqual(given.map(a => a?.book ?? null), [true, true, null]);
});
