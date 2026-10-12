// Checks how much of the engine's line the review trusts (on visits that the engine gave in the sample game's positions:
// docs/decisions/product.md, "The engine's line: where it stops"), and how a branch's edge is judged. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Edge } from "#lib/engine/notation.ts";
import { complexity, equalDepth, likelyEdges, judgeBranchEdge, review, roundTogether, trustedLine, turnCost, valuesAfter, type Analysis, type Candidate, type Move, type Position,
         type ReviewData } from "./model.ts";
import { accuracyWeight } from "./labels.ts";

const edges = (n: number): Edge[] => Array.from({ length: n }, (_, k): Edge => [k, 0, k, 1]);
const candidate = (lineVisits?: number[], n = lineVisits?.length ?? 6): Candidate =>
  ({ edge: edges(1)[0], visits: lineVisits?.[0] ?? 0, blueWin: 0.5, line: edges(n), lineVisits });

test("a line stops before its first edge with fewer than 25 visits", () => {
  assert.equal(trustedLine(candidate([182, 104, 103, 25, 19, 11])).length, 4); // 25 is enough
  assert.equal(trustedLine(candidate([253, 66, 9, 7, 6, 5])).length, 2);
  assert.equal(trustedLine(candidate([32, 7, 6, 2, 1])).length, 1); // the candidate alone
  assert.equal(trustedLine(candidate([589, 318, 154, 94, 93, 90])).length, 6);
});

test("visits that grow along a line do not bring back the edges after a thin one", () => {
  assert.equal(trustedLine(candidate([120, 20, 40, 40])).length, 1);
});

test("a line without its visits is kept whole", () => {
  assert.equal(trustedLine(candidate(undefined, 5)).length, 5);
});

test("a branch edge is judged as the game's: Best or Great when it is the first choice, and by its loss otherwise", () => {
  const best = edges(2)[0], other = edges(2)[1];
  const before: Analysis = { blueWin: 0.6, visits: 256, lead: 20, candidates: [
    { edge: best, visits: 200, blueWin: 0.6, lead: 20 }, { edge: other, visits: 40, blueWin: 0.45, lead: -10 }] };
  // Blue played the first choice, and the second looks 0.15 worse in that search. Great only when a search of the
  // position after the second, as deep, confirms the gap: until then Best.
  const after = { blueWin: 0.6, blueScore: 20 };
  assert.equal(judgeBranchEdge(before, after, 0, best, "lead", 256), "best");
  const second = (blueWin: number, visits = 256): Analysis => ({ blueWin, visits, candidates: [] });
  assert.equal(judgeBranchEdge(before, after, 0, best, "lead", 256, second(0.45)), "great");
  assert.equal(judgeBranchEdge(before, after, 0, best, "lead", 256, second(0.55)), "best"); // only 0.05 worse
  assert.equal(judgeBranchEdge(before, after, 0, best, "lead", 256, second(0.45, 32)), "best"); // too shallow
  // The position after the played edge searched deeper (the position on screen): the second's must be as deep.
  const deepAfter = { ...after, visits: 1024 };
  assert.equal(judgeBranchEdge(before, deepAfter, 0, best, "lead", 256, second(0.45)), "best");
  assert.equal(judgeBranchEdge(before, deepAfter, 0, best, "lead", 256, second(0.45, 1024)), "great");
  // Blue played the other edge: 0.15 of win chance and 30 points lost.
  assert.equal(judgeBranchEdge(before, { blueWin: 0.45, blueScore: -10 }, 0, other, "lead", 256), "mistake");
  // Not judged until the position before has the label budget, and the position after has values.
  assert.equal(judgeBranchEdge({ ...before, visits: 32 }, { blueWin: 0.6, blueScore: 20 }, 0, best, "lead", 256), null);
  assert.equal(judgeBranchEdge(before, undefined, 0, best, "lead", 256), null);
});

test("a Great's confirmation is as deep as the position it is compared with, by doublings of the budget", () => {
  assert.equal(equalDepth(512, 512), 512);
  assert.equal(equalDepth(512, 1024), 1024);
  assert.equal(equalDepth(512, 4096), 4096);
  assert.equal(equalDepth(512, 900), 512); // a search still running asks for no more than it has
  assert.equal(equalDepth(512, 3000), 2048); // or one stopped at its time limit
  assert.equal(equalDepth(512, undefined), 512); // the game's end: no search
  assert.equal(equalDepth(0, 1024), 0);
});

test("the values after a position: the result where the game ends, else its analysis with enough visits", () => {
  const p = { scores: [100, 90], over: true } as unknown as Position;
  assert.deepEqual(valuesAfter(p, undefined), { blueWin: 1, blueScore: 10 });
  const q = { scores: [0, 0], over: false } as unknown as Position;
  assert.equal(valuesAfter(q, { blueWin: 0.5, visits: 32, candidates: [] }, "lead", 256), undefined);
});

// A game of five edges: Blue's first turn (A), Red's turn of two (B then C, or C then B), Blue's turn of two (D, E).
// Red's turn leads from position 1 to position 3, through position 2. Values are Blue's.
const [A, B, C, D, E, F] = edges(6);
const at = (blueWin: number, lead: number, candidates: Candidate[] = []): Analysis => ({ blueWin, visits: 512, lead, candidates });
const cand = (edge: Edge, blueWin: number, line: Edge[] = [edge]): Candidate => ({ edge, visits: 100, blueWin, line });
function game(red: [Edge, Edge], analysis: (Analysis | undefined)[], extra: Partial<ReviewData> = {}): ReviewData {
  const moves: Move[] = [[0, A], [1, red[0]], [1, red[1]], [0, D], [0, E]].map(([player, edge]) => ({ player, edge, cut: null }) as Move);
  return { players: { blue: "b", red: "r" }, result: { blue: 10, red: 0 }, moves, positions: Array(6).fill({} as Position),
           analysis, ...extra };
}

test("a turn's loss comes from its two ends, so the search between them cancels", () => {
  // In the middle, Red looks 0.10 and 30 points better than at the start: the first edge gains, the second loses.
  const R = review(game([B, C], [at(0.5, 0), at(0.5, 0), at(0.4, -30), at(0.55, 20), at(0.6, 30)]));
  const red = R.turns[1];
  assert.deepEqual([red.start, red.end], [1, 3]);
  assert.ok(Math.abs(red.loss - 0.05) < 1e-9); // 0.5 less 0.45, not the second edge's 0.15
  assert.equal(red.pointsLost, 20); // 0 less −20, not the second edge's 50
  assert.equal(R.edges[2].pointsLost, 50);
  // The turn's note gives each edge's points after its own, a gain with a plus, so that they add up.
  assert.equal(turnCost(red), "−5.0% · −20.0 pts (+30.0 pts, −50.0 pts)");
});

test("labels read the engine's win chance, and points lost do not label", () => {
  // A decided game: Blue at 0.99. Red's turn loses 100 points, but its win chance only from 0.01 to 0.005.
  const decided = review(game([B, C], [0, 1, 2, 3, 4].map(i => (i === 3 ? at(0.995, 1100) : at(0.99, 1000)))));
  assert.equal(decided.turns[1].pointsLost, 100);
  assert.equal(decided.turns[1].label, "excellent");
  // An even game: Red's turn loses 5 points, but its win chance falls from 0.5 to 0.2.
  const R = review(game([B, C], [0, 1, 2, 3, 4].map(i => (i === 3 ? at(0.8, 5) : at(0.5, 0)))));
  assert.ok(Math.abs(R.turns[1].loss - 0.3) < 1e-12);
  assert.equal(R.turns[1].label, "blunder");
  // The values after a position give the engine's chance.
  const q = { scores: [0, 0], over: false } as unknown as Position;
  assert.equal(valuesAfter(q, at(0.8, 5))!.blueWin, 0.8);
});

test("a turn is Best when it is the engine's best turn, in either order", () => {
  // The engine's first choice at Red's start is B, then C: Red played C, then B.
  const start = at(0.4, -10, [cand(B, 0.4, [B, C]), cand(C, 0.41, [C, B])]);
  const R = review(game([C, B], [at(0.5, 0), start, at(0.4, -10, [cand(B, 0.4)]), at(0.4, -10), at(0.4, -10)]));
  assert.equal(R.turns[1].label, "best");
  // By edge too: C was not the first choice, but it begins the engine's best turn in the other order.
  assert.deepEqual([R.edges[1].label, R.edges[2].label], ["best", "best"]);
});

test("a turn is Great when searches from its start and its middle confirm it is the only good turn", () => {
  // Red's start: B (line B, C) and C (line C, B) are one turn. The other candidate, F, looks 0.15 worse for Red.
  const start = at(0.4, -10, [cand(B, 0.4, [B, C]), cand(C, 0.41, [C, B]), cand(F, 0.55)]);
  // The middle, after B: C, then a second choice 0.15 worse for Red.
  const middle = at(0.4, -10, [cand(C, 0.4), cand(D, 0.55)]);
  const analysis = [at(0.5, 0), start, middle, at(0.4, -10), at(0.4, -10)];
  const seconds = [undefined, undefined, at(0.58, 5)]; // after the middle's second choice: 0.18 worse for Red
  const confirmed = review(game([B, C], analysis, { seconds, others: [undefined, at(0.6, 10)] }));
  assert.equal(confirmed.turns[1].label, "great");
  assert.equal(turnCost(confirmed.turns[1]), "0.0% · 0.0 pts"); // the engine's own turn: no parts
  // By edge, B is only Best: the second choice at the start, C, is the same turn in the other order.
  assert.equal(confirmed.edges[1].label, "best");
  // Without the search after F, or with F as good as the turn, the turn stays Best.
  assert.equal(review(game([B, C], analysis, { seconds })).turns[1].label, "best");
  assert.equal(review(game([B, C], analysis, { seconds, others: [undefined, at(0.45, 0)] })).turns[1].label, "best");
});

test("the summary and the key moments come by turn and by edge", () => {
  const R = review(game([B, C], [at(0.5, 0), at(0.5, 0), at(0.4, -30), at(0.55, 20), at(0.6, 30)]));
  const labelled = (s: { counts: Record<string, number> }) => Object.values(s.counts).reduce((a, b) => a + b, 0);
  assert.equal(labelled(R.summary.edge[1]), 2); // Red's two edges
  assert.equal(labelled(R.summary.turn[1]), 1); // Red's one turn
});

test("a turn's parts are rounded together, so that they add up to the turn", () => {
  assert.deepEqual(roundTogether([143.6, 0.8]), [143, 1]); // 144.4: 144, not 144 and 1
  assert.deepEqual(roundTogether([-30.4, 50.2]), [-30, 50]);
  assert.deepEqual(roundTogether([0.5, 0.5]), [1, 0]); // 1
});

test("KaTrain's complexity in win chance: the candidates' prior-weighted loss, and a hard position from 0.10", () => {
  // Blue to move at 0.6: one likely edge keeps it (prior 0.5), two lose 0.2 and 0.4 (priors 0.3 and 0.2).
  const c = (blueWin: number, prior: number): Candidate => ({ edge: A, visits: 10, blueWin, prior });
  const a: Analysis = { blueWin: 0.6, visits: 512, candidates: [c(0.6, 0.5), c(0.4, 0.3), c(0.2, 0.2)] };
  assert.ok(Math.abs(complexity(a, 0)! - (0.3 * 0.2 + 0.2 * 0.4) / 1) < 1e-12); // 0.14
  assert.equal(complexity({ ...a, candidates: a.candidates.map(({ prior: _, ...k }) => k) }, 0), undefined);
  // The weight: full from a hard position or a Blunder's loss, 0.05 at least, 1 without a complexity.
  assert.equal(accuracyWeight(0.14, 0), 1);
  assert.equal(accuracyWeight(0, 0.01), 0.05);
  assert.ok(Math.abs(accuracyWeight(0.05, 0) - 0.5) < 1e-12);
  assert.equal(accuracyWeight(0, 0.3), 1);
  assert.equal(accuracyWeight(undefined, 0), 1);
  // In a review: the edge and its turn are hard, and the easy turns weigh little in the accuracy.
  const hard: Analysis = { ...at(0.5, 0), candidates: [c(0.5, 0.5), c(0.3, 0.5)] }; // complexity 0.1 for Blue
  const R = review(game([B, C], [hard, at(0.5, 0), at(0.5, 0), at(0.5, 0), at(0.5, 0)]));
  assert.equal(R.edges[0].hard, true);
  assert.equal(R.turns[0].hard, true);
  assert.equal(R.turns[1].hard, false);
});

test("the meter: the network's prior by the group of each searched edge's loss against the best one", () => {
  // Red to move: the best searched edge leaves Blue 0.40; others lose 0.03, 0.08, 0.15 and 0.30 for Red
  const c = (blueWin: number, prior: number): Candidate => ({ edge: A, visits: 10, blueWin, prior });
  const a: Analysis = { blueWin: 0.41, visits: 512, candidates: [c(0.4, 0.3), c(0.43, 0.2), c(0.48, 0.1), c(0.55, 0.15), c(0.7, 0.05)] };
  const m = likelyEdges(a, 1)!;
  const near = (x: number, y: number) => Math.abs(x - y) < 1e-12;
  assert.ok(near(m.good, 0.5) && near(m.inaccuracy, 0.1) && near(m.mistake, 0.15) && near(m.blunder, 0.05), JSON.stringify(m));
  assert.ok(near(m.unsearched, 0.2)); // the prior the search did not visit
  assert.equal(likelyEdges({ ...a, candidates: a.candidates.map(({ prior: _, ...k }) => k) }, 1), undefined);
});
