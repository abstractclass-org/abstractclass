// Checks the game interface (game.ts, design 29) on a game unlike Enclosure (testing/game.ts): moves as words, one move
// a turn. The review's model, the engine's reply and the analysis of a game compute with the game's functions only:
// its moves' names and equality, its positions, its moves played, its rules, its lines' steps and its turn numbers.
// Hedge School's tests check Enclosure's game. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import "./testing/svelteModules.ts";
import type { AnalysisReply, PositionQuery } from "@abstractclass/engine/protocol.ts";
import type { EnginePool } from "@abstractclass/engine/pool.ts";
import { memoryDb } from "@abstractclass/storage/memoryDb.ts";
import { distinctCandidates, judgeTurn, moveNumber, moveRows, rankOf, review, sameMove, shownCandidates, twinsOf, withTwins, type Analysis,
         type ReviewData } from "./model.ts";
import { SWEEP_VISITS, analysisKey, cachePut } from "./cache.ts";
import { toAnalysis } from "./reply.ts";
import { annotatedRecord } from "./annotate.ts";
import { pairs, wordFields, words, type Words } from "./testing/game.ts";

memoryDb();
const { GameAnalysis } = await import("./analysis.svelte.ts");

const analysis = (blueWin: number, best: string, visits = 256, others: [string, number][] = []): Analysis<string> => ({
  blueWin, visits, lead: 0, candidates: [{ edge: best, visits, blueWin, lead: 0 }, ...others.map(([edge, win]) => ({ edge, visits, blueWin: win, lead: 0 }))],
});

test("each move is a turn of its own, numbered by the game", () => {
  const positions = [0, 1, 2, 3].map(k => words.position(wordFields(k)));
  const data: ReviewData<Words> = {
    players: { blue: "First", red: "Second" }, result: { blue: 0, red: 0 },
    moves: ["a", "b", "c"].map((m, k) => words.played(m, wordFields(k), wordFields(k + 1))),
    positions, analysis: [analysis(0.5, "a"), analysis(0.5, "x"), analysis(0.5, "c"), analysis(0.5, "d")],
  };
  const R = review(words, data, "lead", 256);
  assert.deepEqual(R.turns.map(t => [t.number, t.player, t.edges.length]), [[1, 0, 1], [2, 1, 1], [3, 0, 1]]);
  assert.deepEqual(R.edges.map(e => e.label), ["best", "excellent", "best"]); // "b" lost no win chance: not the first choice
  assert.deepEqual(R.turns.map(t => t.best), [["a"], ["x"], ["c"]]);
});

// A game whose notation numbers two moves a number and whose review judges each move (Tak's, design 34): `numbers`.
const line = (from: number, moves: string[], values: Analysis<string>[]): ReviewData<Words> => ({
  players: { blue: "First", red: "Second" }, result: { blue: 0, red: 0 },
  moves: moves.map((m, k) => words.played(m, wordFields(from + k), wordFields(from + k + 1))),
  positions: Array.from({ length: moves.length + 1 }, (_, k) => words.position(wordFields(from + k))), analysis: values,
});
const fromStart = line(0, ["a", "b", "c"], [analysis(0.6, "x"), analysis(0.45, "y"), analysis(0.75, "c"), analysis(0.75, "z")]);
/** The rows as the list shows them: the number, whether it starts in the row's middle, and each player's moves. */
const rowsOf = (game: typeof words, data: ReviewData<Words>) => moveRows(game, review(game, data, "lead", 256)).map(r =>
  [r.number, !!r.continued, r.turns.map(t => [t.player, t.edges.map(e => e.edge).join(" ")])]);

test("two moves a number: a row has both players' moves, the first player's first, and each move is judged", () => {
  assert.deepEqual(rowsOf(pairs, fromStart), [[1, false, [[0, "a"], [1, "b"]]], [2, false, [[0, "c"]]]]);
  const R = review(pairs, fromStart, "lead", 256);
  assert.deepEqual(R.edges.map(e => e.label), ["mistake", "blunder", "best"]);
  assert.deepEqual(R.turns.map(t => [t.player, t.edges.length, t.label]), [[0, 1, "mistake"], [1, 1, "blunder"], [0, 1, "best"]]);
  assert.deepEqual(R.summary.turn.map(s => s.counts), R.summary.edge.map(s => s.counts)); // by turn and by move judge the same
  // A Great too, which each unit confirms by a search of its own: c is the only good move, and keeps what b gave
  const only = { ...line(0, ["a", "b", "c", "d"], [analysis(0.5, "a"), analysis(0.5, "b"), analysis(0.6, "c", 256, [["x", 0.45]]),
                                                   analysis(0.6, "d"), analysis(0.6, "e")]),
                 seconds: [undefined, undefined, analysis(0.45, "y")], others: [undefined, undefined, analysis(0.45, "y")] };
  const G = review(pairs, only, "lead", 256);
  assert.deepEqual(G.edges.map(e => e.label), ["best", "best", "great", "best"]);
  assert.deepEqual(G.turns.map(t => t.label), G.edges.map(e => e.label));
  // The notation changes no judgment
  assert.deepEqual(R.edges, review(words, fromStart, "lead", 256).edges);
});

test("two moves a number: a line with the second player to move starts in its row's middle", () => {
  const data = line(23, ["a", "b", "c"], [analysis(0.5, "a"), analysis(0.5, "b"), analysis(0.5, "c"), analysis(0.5, "d")]);
  assert.deepEqual(rowsOf(pairs, data), [[12, true, [[1, "a"]]], [13, false, [[0, "b"], [1, "c"]]]]);
  assert.deepEqual([0, 1, 2].map(k => moveNumber(pairs, 23, k)), [
    { turn: 12, first: false }, { turn: 13, first: true }, { turn: 13, first: false }]);
});

test("a game without numbers of its own has one row a turn, by the turn's number", () => {
  assert.deepEqual(rowsOf(words, fromStart), [[1, false, [[0, "a"]]], [2, false, [[1, "b"]]], [3, false, [[0, "c"]]]]);
  assert.equal(moveNumber(words, 0, 1), undefined);
  // Turns of two, from a set-up start in a turn's middle: the turn's own row, continued
  const twos = { ...words, turn: (c: number) => ({ turn: Math.floor((c - 1) / 2) + 2, first: (c - 1) % 2 === 0 }) };
  const movers = [0, 1, 1] as const;
  const data: ReviewData<Words> = { ...fromStart, moves: ["a", "b", "c"].map((edge, k) => ({ player: movers[k], edge })),
    positions: [4, 5, 6, 7].map(count => words.position({ mover: 0, scores: [0, 0], over: false, count })) };
  assert.deepEqual(rowsOf(twos, data), [[3, true, [[0, "a"]]], [4, false, [[1, "b c"]]]]);
});

test("two moves a number: the annotated record numbers so, a variation of either player's move too", () => {
  const R = review(pairs, fromStart, "lead", 256);
  const branch = (path: string[], order: number) => ({ move: words.played(path.at(-1)!, wordFields(path.length - 1), wordFields(path.length)), order });
  const written = (game: typeof words, unit: "turn" | "edge") => annotatedRecord(game, m => m.edge ?? "pass", {
    R, unit, tags: {}, result: null, branches: { "a y": branch(["a", "y"], 0), "a y w": branch(["a", "y", "w"], 1), "x": branch(["x"], 2) },
  }).split("\n\n")[1].replace(/\{[^}]*\} ?/g, "").replace(/\s+/g, " ").trim();
  assert.equal(written(pairs, "edge"), "1. a (1. x) b (1... y 2. w) 2. c *");
  assert.equal(written(words, "edge"), "1. a (1. x) 2. b (2. y 3. w) 3. c *");
});

test("the end is the result where the rules ended the game, and a search where the record ends before", () => {
  const data = (over: boolean): ReviewData<Words> => ({
    players: { blue: "First", red: "Second" }, result: { blue: 3, red: 1 },
    moves: ["a", "b"].map((m, k) => words.played(m, wordFields(k), wordFields(k + 1))),
    positions: [0, 1, 2].map(k => words.position(wordFields(k, k === 2 && over))),
    analysis: [analysis(0.5, "a"), analysis(0.5, "b"), analysis(0.4, "c", SWEEP_VISITS)],
  });
  const ended = review(words, data(true), "lead", 256), early = review(words, data(false), "lead", 256);
  assert.equal(ended.endedByRules, true);
  assert.equal(ended.blueScore[2], 2); // the result, Blue less Red
  assert.equal(early.endedByRules, false);
  assert.equal(early.blueWin[2], 0.4); // the end's search
});

test("a move's loss labels it, from the mover's side", () => {
  const positions = [0, 1, 2].map(k => words.position(wordFields(k)));
  const data: ReviewData<Words> = {
    players: { blue: "First", red: "Second" }, result: { blue: 0, red: 0 },
    moves: ["a", "b"].map((m, k) => words.played(m, wordFields(k), wordFields(k + 1))),
    positions, analysis: [analysis(0.6, "x"), analysis(0.45, "y"), analysis(0.75, "z")],
  };
  const R = review(words, data, "lead", 256);
  assert.deepEqual(R.edges.map(e => e.label), ["mistake", "blunder"]); // the first player lost 0.15, the second 0.30
});

test("the book's values judge as a search's do, below the label budget too, and no move from or into them is Great", () => {
  const positions = [0, 1, 2, 3, 4].map(k => words.position(wordFields(k)));
  // c, the first player's first choice at position 2, is the only good move (x is 0.15 worse there, and after it), and
  // keeps what b gave (from 0.5): Great, where every value is a search's
  const only = analysis(0.6, "c", 256, [["x", 0.45]]);
  const data = (book: number[]): ReviewData<Words> => ({
    players: { blue: "First", red: "Second" }, result: { blue: 0, red: 0 },
    moves: ["a", "b", "c", "d"].map((m, k) => words.played(m, wordFields(k), wordFields(k + 1))),
    positions,
    analysis: [analysis(0.5, "a"), analysis(0.5, "b"), only, analysis(0.6, "d"), analysis(0.6, "e")]
      .map((a, k) => (book.includes(k) ? { ...a, visits: 100, book: true as const } : a)),
    seconds: [undefined, undefined, analysis(0.45, "y")],
  });
  assert.equal(review(words, data([]), "lead", 256).edges[2].label, "great");
  // The book's values at 100 visits, under the label budget, still judge: c is Best, as the book gives no Great
  assert.deepEqual(review(words, data([2]), "lead", 256).edges.map(e => e.label), ["best", "best", "best", "best"]);
  assert.equal(review(words, data([3]), "lead", 256).edges[2].label, "best");
  assert.deepEqual(review(words, data([0, 1, 2, 3, 4]), "lead", 256).turns.map(t => t.label), ["best", "best", "best", "best"]);
});

test("by edge, the best turn in the other order is Best, but an edge between two positions with the book's values", () => {
  // The first player's turn y x: the engine's best turn is x y, and its second choice y loses nothing (Excellent)
  const at = (count: number) => words.position({ mover: count < 2 ? 0 : 1, scores: [0, 0], over: false, count });
  const start: Analysis<string> = { blueWin: 0.6, visits: 256, candidates: [
    { edge: "x", visits: 256, blueWin: 0.6, line: ["x", "y"] }, { edge: "y", visits: 256, blueWin: 0.6 }] };
  // After y: w first, and x 0.02 worse (Excellent)
  const middle = analysis(0.62, "w", 256, [["x", 0.6]]);
  const labels = (book: number[]) => review(words, {
    players: { blue: "First", red: "Second" }, result: { blue: 0, red: 0 },
    moves: [{ player: 0, edge: "y" }, { player: 0, edge: "x" }, { player: 1, edge: "z" }],
    positions: [0, 1, 2, 3].map(at),
    analysis: [start, middle, analysis(0.6, "z"), analysis(0.6, "v")]
      .map((a, k) => (book.includes(k) ? { ...a, book: true as const } : a)),
  }, "lead", 256).edges.slice(0, 2).map(e => e.label);
  assert.deepEqual(labels([]), ["best", "best"], "design 10: both edges of the best turn");
  assert.deepEqual(labels([0, 1, 2]), ["excellent", "excellent"], "two book moves: each its own label, as the book's table");
  assert.deepEqual(labels([0]), ["best", "best"], "y leaves the book, and x is played outside it");
  assert.deepEqual(labels([1, 2]), ["best", "excellent"], "y comes into the book, and x is a book move");
});

test("moves compare by the game's equality, symmetric twins too", () => {
  const a: Analysis<string> = { blueWin: 0.5, visits: 100, candidates: [
    { edge: "a", visits: 60, blueWin: 0.5 }, { edge: "a'", visits: 60, blueWin: 0.5, twinOf: "a" }, { edge: "b", visits: 40, blueWin: 0.48 }] };
  assert.equal(rankOf(words, a, "a'"), 1);
  assert.equal(rankOf(words, a, "b"), 2);
  assert.equal(sameMove(words, a, "a", "a'"), true);
  assert.deepEqual(twinsOf(words, a, a.candidates[0]).map(c => c.edge), ["a'"]);
});

// The test game with a key of the position that a move gives: the move's letters in order, so "ba" gives the position
// of "ab", as two of Blueprints' edits can give one hand (Cyanotype's design 33, item 9).
const keyed = { ...words, afterKey: (m: string) => [...m].sort().join("") };

test("moves that give one position are one move: the engine's candidates, and the tree's moves", () => {
  const a: Analysis<string> = { blueWin: 0.5, visits: 100, candidates: [
    { edge: "ab", visits: 50, blueWin: 0.5, prior: 0.3, line: ["ab", "c"] }, { edge: "c", visits: 30, blueWin: 0.45 },
    { edge: "ba", visits: 20, blueWin: 0.48, prior: 0.2 }] };
  const at = words.position(wordFields(0));
  // A game without the key: the analysis as it is, so Enclosure's review is unchanged
  assert.equal(withTwins(words, a, at, ["ba", "abc"]), a);
  const t = withTwins(keyed, a, at);
  assert.deepEqual(t.candidates.map(c => [c.edge, c.twinOf]), [["ab", undefined], ["c", undefined], ["ba", "ab"]]);
  assert.deepEqual(distinctCandidates(t).map(c => c.edge), ["ab", "c"]);
  assert.equal(rankOf(keyed, t, "ba"), 1);
  assert.equal(withTwins(keyed, a, at), t); // the same object again: the page derives nothing again
  // A move of the tree that gives a candidate's position is its twin, with its values and line, without its prior
  const two = withTwins(keyed, { ...a, candidates: a.candidates.slice(0, 2) }, at, ["ba", "abc", null]);
  assert.deepEqual(two.candidates.map(c => [c.edge, c.twinOf, c.visits, c.prior, c.line]),
                   [["ab", undefined, 50, 0.3, ["ab", "c"]], ["ba", "ab", 50, undefined, ["ba", "c"]], ["c", undefined, 30, undefined, undefined]]);
  assert.equal(sameMove(keyed, two, "ab", "ba"), true);
  assert.equal(sameMove(keyed, two, "ab", "abc"), false);
});

test("a turn in the engine's order is its turn where its first edge gives the same position, not the mirror image", () => {
  // The first choice "ab" and its line's next edge "c". "ab'" is its symmetric twin (protocol 0.4), and "ba" gives the
  // same position (withTwins).
  const start = withTwins(keyed, { blueWin: 0.5, visits: 100, lead: 0, candidates: [
    { edge: "ab", visits: 60, blueWin: 0.5, lead: 0, line: ["ab", "c"] }, { edge: "ab'", visits: 60, blueWin: 0.5, lead: 0, twinOf: "ab" },
    { edge: "d", visits: 40, blueWin: 0.3, lead: 0 }] }, words.position(wordFields(0)), ["ba"]);
  const after = { blueWin: 0.4, blueScore: 0, visits: 100 };
  const label = (turn: string[]) => judgeTurn(keyed, 0, turn, start, undefined, after, false, undefined, undefined, undefined)?.label;
  // "ba" then "c" is the engine's turn. After the mirror image "ab'", the engine's next edge is the mirror image of
  // "c", so "ab'" then "c" is another turn: as for Enclosure's symmetric twins before the twins by position.
  assert.equal(label(["ba", "c"]), "best");
  assert.notEqual(label(["ab'", "c"]), "best");
  assert.equal(label(["c", "ab"]), "best"); // the engine's edges in the other order
});

test("the analysis of a game gives each position's analysis with the moves that give one position as twins", async () => {
  const pool = {
    search: "test", model: { sha256: "m" },
    rules: { describeGame: async (q: PositionQuery, from = 0) =>
      ({ reply: { positions: Array.from({ length: q.moves.length + 1 }, (_, k) => wordFields(k)).slice(from) } }) },
  } as unknown as EnginePool;
  // The game "ba" then "c": the engine's first choice at the start is "ab", which gives the same position as "ba"
  const game = new GameAnalysis(keyed, pool, ["ba", "c"], "twins");
  await game.start();
  const start: Analysis<string> = { blueWin: 0.6, visits: SWEEP_VISITS, lead: 0, candidates: [
    { edge: "ab", visits: SWEEP_VISITS, blueWin: 0.6, lead: 0 }, { edge: "d", visits: 1, blueWin: 0.3, lead: 0 }] };
  const after: Analysis<string> = { blueWin: 0.6, visits: SWEEP_VISITS, lead: 0, candidates: [{ edge: "c", visits: SWEEP_VISITS, blueWin: 0.6, lead: 0 }] };
  await cachePut(analysisKey("test", "m", [], SWEEP_VISITS), start);
  await cachePut(analysisKey("test", "m", ["ba"], SWEEP_VISITS), after);
  await game.fromStore("test", "m");
  assert.deepEqual(game.analysisOf([])?.candidates.map(c => [c.edge, c.twinOf]), [["ab", undefined], ["ba", "ab"], ["d", undefined]]);
  const data = game.data({ blue: "First", red: "Second" })!;
  assert.deepEqual(data.analysis[0]?.candidates.map(c => c.edge), ["ab", "ba", "d"]);
  // The game's move gives the first choice's position: Best
  assert.equal(review(keyed, data, "lead", 0).edges[0].label, "best");
  // In a game whose move is "d", a variation's move "ba" from the start is the twin of the first choice
  const other = new GameAnalysis(keyed, pool, ["d", "c"], "twins-variation");
  await other.start();
  await other.fromStore("test", "m");
  await other.addLine(["ba"], false);
  assert.deepEqual(other.analysisOf([])?.candidates.map(c => [c.edge, c.twinOf]), [["ab", undefined], ["ba", "ab"], ["d", undefined]]);
  // A line that the player plays goes along the tree's node of each position that it gives, as far as the tree goes
  assert.deepEqual(other.nodesOf(["ab", "x"]), ["ba", "x"]);
  assert.deepEqual(other.nodesOf(["d", "c"]), ["d", "c"]);
  assert.deepEqual(other.nodesOf(["ac"]), ["ac"]);
  // A game without the key: the path as it is
  const plain = new GameAnalysis(words, pool, ["ba", "c"], "twins-plain");
  await plain.start();
  const path = ["ab"];
  assert.equal(plain.nodesOf(path), path);
});

test("a candidate shows within 3 of Go's points times the game's score scale", () => {
  const a: Analysis<string> = { blueWin: 0.5, visits: 100, lead: 0, candidates: [
    { edge: "a", visits: 50, blueWin: 0.5, lead: 0 }, { edge: "b", visits: 50, blueWin: 0.5, lead: -3 },
    { edge: "c", visits: 50, blueWin: 0.5, lead: -3.5 }] };
  assert.deepEqual(shownCandidates(words, a, 0).map(r => r.c.edge), ["a", "b"]);
  assert.deepEqual(shownCandidates({ ...words, scoreScale: 12 }, a, 0).map(r => r.c.edge), ["a", "b", "c"]);
});

test("the engine's reply keeps the game's moves, and a line stops at a pass", () => {
  const reply = {
    rootInfo: { visits: 10, winrate: 0.5, scoreLead: 0, scoreSelfplay: 0, scoreStdev: 0 },
    moveInfos: [{ move: "b", order: 1, edgeVisits: 4, winrate: 0.4, pv: ["b"] },
                { move: "a", order: 0, edgeVisits: 6, winrate: 0.6, pv: ["a", "c", "pass", "d"], pvEdgeVisits: [6, 5, 4, 3] }],
  } as unknown as AnalysisReply;
  const a = toAnalysis(words, reply);
  assert.deepEqual(a.candidates.map(c => [c.edge, c.line, c.lineVisits]), [["a", ["a", "c"], [6, 5]], ["b", ["b"], undefined]]);
});

test("the engine's ownership is kept for each point in hundredths, from Blue's side", () => {
  const reply = {
    rootInfo: { visits: 10, winrate: 0.5, scoreLead: 0, scoreSelfplay: 0, scoreStdev: 0 },
    moveInfos: [{ move: "a", order: 0, edgeVisits: 10, winrate: 0.5, pv: ["a"] }],
    ownership: [0.98761, -0.004999, -0.506, 0],
  } as unknown as AnalysisReply;
  assert.deepEqual(toAnalysis(words, reply).ownership, [99, 0, -51, 0]);
  assert.equal(toAnalysis(words, { ...reply, ownership: undefined }).ownership, undefined); // a reply without it
});

test("the analysis of a game takes its positions, its moves played, its rules and its lines' steps from the game", async () => {
  const fields = (q: PositionQuery) => Array.from({ length: q.moves.length + 1 }, (_, k) => wordFields(k));
  const pool = {
    search: "test", model: { sha256: "m" },
    rules: {
      describeGame: async (q: PositionQuery, from = 0) => ({ reply: { positions: fields(q).slice(from) } }),
      describe: async (q: PositionQuery) => ({ reply: { ...wordFields(q.moves.length), legal: ["x", "y"] } }),
    },
  } as unknown as EnginePool;
  const game = new GameAnalysis(words, pool, ["a", "pass", "c"], "g");
  await game.start();
  assert.deepEqual(game.mainNames, ["a", "pass", "c"]);
  assert.deepEqual(game.played, [{ player: 0, edge: "a" }, { player: 1, edge: null }, { player: 0, edge: "c" }]);
  assert.deepEqual(game.positions.map(p => p.player), [0, 1, 0, 1]);
  assert.deepEqual(await game.rulesAt(["a"]), ["x", "y"]);
  assert.deepEqual(await game.lineSteps(["a"], ["d", "e"]), [2, 3]);
  // A line played: its steps, and the position after its last edge (an engine line's image needs both)
  assert.deepEqual(await game.linePlayed(["a"], ["d", "e"]), { steps: [2, 3], end: words.position(wordFields(3)) });
  await game.addLine(["a", "z"], false);
  assert.deepEqual(game.branches["a z"]?.move, { player: 1, edge: "z" });
});
