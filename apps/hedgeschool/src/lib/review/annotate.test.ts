// The annotated record (annotate.ts): evaluations, labels with the better turn, and the player's variations where the
// notation puts them. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { edgeName, type Edge } from "#lib/engine/notation.ts";
import { parseRecord } from "#lib/game/record.ts";
import { annotatedRecord, evalCommand } from "./annotate.ts";
import { review, type Analysis, type Candidate, type Move, type Position, type ReviewData } from "./enclosure.ts";

// Blue's first turn (A), Red's turn of two (B, C), Blue's turn of two (D, E): five edges, six positions.
const E = (k: number): Edge => [k, 0, k, 1];
const [A, B, C, D, F, X, Y] = [0, 1, 2, 3, 4, 5, 6].map(E);
const at = (blueWin: number, lead: number, candidates: Candidate[] = []): Analysis => ({ blueWin, visits: 512, lead, spread: 100, candidates });
const moves: Move[] = [[0, A], [1, B], [1, C], [0, D], [0, F]].map(([player, edge]) => ({ player, edge, cut: null }) as Move);
// Red's turn loses 0.3 of win chance: a Blunder, where the engine's best turn was X then Y.
const best: Candidate = { edge: X, visits: 300, blueWin: 0.5, line: [X, Y] };
const data: ReviewData = {
  players: { blue: "Ann", red: "Ben" }, result: { blue: 10, red: 0 }, moves, positions: Array(6).fill({} as Position),
  analysis: [at(0.5, 0), at(0.5, 0, [best]), at(0.7, 30), at(0.8, 40), at(0.85, 45)],
};
const R = review(data);
const n = (e: Edge) => edgeName(e);

test("each edge carries the engine's view after it, and a bad turn says which turn was best", () => {
  const lines = annotatedRecord({ R, unit: "turn", tags: { Blue: "Ann", Red: "Ben" }, result: "b+10", note: "Reviewed by Hedge School." });
  assert.ok(lines.split("\n").every(l => l.length <= 80));
  assert.ok(lines.split("\n").every(l => !/\[%[^\]]*$/.test(l)), "a command is never broken across lines");
  const [head, body] = lines.split("\n\n");
  const text = `${head}\n\n${body.replace(/\n/g, " ")}`; // the turns on one line, to search them
  assert.match(text, /^\[Event "\?"\]\n/);
  assert.match(text, /\[Result "b\+10"\]/);
  assert.ok(text.includes(`{ Reviewed by Hedge School. } 1. ${n(A)} { [%eval 0.500 +0.0 100.0] } 2. ${n(B)}`));
  // By turn, the turn's label is also its quality mark, after its last edge and before its comment
  assert.ok(text.includes(`${n(C)}?? { Blunder. ${n(X)} ${n(Y)} was best. [%eval 0.800 +40.0 100.0] }`));
  // The last edge ends the game: no evaluation after it, then the result.
  assert.ok(text.trimEnd().endsWith(`${n(F)} b+10`));
  // A reader takes the game back.
  assert.deepEqual(parseRecord(text).moves, [A, B, C, D, F].map(n));
});

test("by edge, each edge's own label", () => {
  const text = annotatedRecord({ R, unit: "edge", tags: {}, result: null }).replace(/\n/g, " ");
  assert.ok(text.includes(`${n(B)} { Mistake. ${n(X)} was best.`)); // 0.2 lost by B: by edge, no quality marks
  assert.ok(text.trimEnd().endsWith("*"));
});

test("variations follow the turn they change: those from its start, then those from its second edge", () => {
  const branches = {
    // Red's turn played another way from its start: X then Y
    [`${n(A)} ${n(X)}`]: { move: { player: 1, edge: X, cut: null } as Move, order: 0 },
    [`${n(A)} ${n(X)} ${n(Y)}`]: { move: { player: 1, edge: Y, cut: null } as Move, order: 1 },
    // Red's second edge played another way: Y in place of C
    [`${n(A)} ${n(B)} ${n(Y)}`]: { move: { player: 1, edge: Y, cut: null } as Move, order: 2 },
  };
  const text = annotatedRecord({ R, unit: "turn", tags: {}, result: null, branches }).replace(/\n/g, " ").replace(/\{[^}]*\}/g, "{}");
  assert.ok(text.includes(`2. ${n(B)} {} ${n(C)}?? {} (2. ${n(X)} ${n(Y)}) (2... ${n(Y)}) 3. ${n(D)}`), text);
  // A reader takes the game back, marks and variations dropped
  assert.deepEqual(parseRecord(text.replace(/\{\}/g, "")).moves, [A, B, C, D, F].map(n));
});

test("the evaluation command: Blue's chance, the lead with its sign, the spread", () => {
  assert.equal(evalCommand(at(0.4, -12.34)), "[%eval 0.400 -12.3 100.0]");
  assert.equal(evalCommand(undefined), "");
  assert.equal(evalCommand({ blueWin: 0.5, visits: 1, candidates: [] }), "");
});

test("a hard position says so in its move's comment", () => {
  // Red to move at position 1: its likely edges lose 0.2 on average for Red (complexity 0.2, over HARD)
  const hard: Candidate[] = [{ ...best, prior: 0.5 }, { edge: Y, visits: 10, blueWin: 0.9, prior: 0.5 }];
  const H = review({ ...data, analysis: [data.analysis[0], at(0.5, 0, hard), ...data.analysis.slice(2)] });
  assert.equal(H.edges[1].hard, true);
  const byEdge = annotatedRecord({ R: H, unit: "edge", tags: {}, result: null }).replace(/\n/g, " ");
  assert.ok(byEdge.includes(`${n(B)} { Mistake. ${n(X)} was best. A hard position.`), byEdge);
  // By turn, the comment after the turn's last edge
  const byTurn = annotatedRecord({ R: H, unit: "turn", tags: {}, result: null }).replace(/\n/g, " ");
  assert.ok(byTurn.includes(`${n(C)}?? { Blunder. ${n(X)} ${n(Y)} was best. A hard position.`), byTurn);
  assert.ok(!annotatedRecord({ R, unit: "turn", tags: {}, result: null }).includes("hard"));
});
