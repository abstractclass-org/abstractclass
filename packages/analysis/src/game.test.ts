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
import { rankOf, review, sameMove, shownCandidates, shownMaps, twinsOf, type Analysis, type ReviewData } from "./model.ts";
import { toAnalysis } from "./reply.ts";
import { wordFields, words, type Words } from "./testing/game.ts";

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

test("moves compare by the game's equality, symmetric twins too", () => {
  const a: Analysis<string> = { blueWin: 0.5, visits: 100, candidates: [
    { edge: "a", visits: 60, blueWin: 0.5 }, { edge: "a'", visits: 60, blueWin: 0.5, twinOf: "a" }, { edge: "b", visits: 40, blueWin: 0.48 }] };
  assert.equal(rankOf(words, a, "a'"), 1);
  assert.equal(rankOf(words, a, "b"), 2);
  assert.equal(sameMove(words, a, "a", "a'"), true);
  assert.deepEqual(twinsOf(words, a, a.candidates[0]).map(c => c.edge), ["a'"]);
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

test("each candidate's ownership is kept in hundredths, and the stored result keeps the shown candidates' alone", () => {
  const reply = {
    rootInfo: { visits: 100, winrate: 0.5, scoreLead: 0, scoreSelfplay: 0, scoreStdev: 0 },
    moveInfos: [{ move: "a", order: 0, edgeVisits: 60, winrate: 0.5, scoreLead: 0, pv: ["a"], ownership: [0.5, -0.256] },
                { move: "a'", order: 1, edgeVisits: 60, winrate: 0.5, scoreLead: 0, pv: ["a'"], ownership: [-0.256, 0.5], isSymmetryOf: "a" },
                { move: "b", order: 2, edgeVisits: 30, winrate: 0.49, scoreLead: 0, pv: ["b"], ownership: [1, 1] },
                { move: "c", order: 3, edgeVisits: 5, winrate: 0.5, scoreLead: 0, pv: ["c"], ownership: [0, 0] }],
  } as unknown as AnalysisReply;
  const a = toAnalysis(words, reply);
  assert.deepEqual(a.candidates.map(c => c.ownership), [[50, -26], [-26, 50], [100, 100], [0, 0]]);
  // "c" has too few visits to show: its map goes. A symmetric twin keeps its own, mirrored.
  assert.deepEqual(shownMaps(words, a, 0).candidates.map(c => c.ownership), [[50, -26], [-26, 50], [100, 100], undefined]);
  // From the second player's side, "b" is 0.01 better than the first choice, and shows too
  assert.deepEqual(shownMaps(words, a, 1).candidates.map(c => c.ownership !== undefined), [true, true, true, false]);
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
  await game.addLine(["a", "z"], false);
  assert.deepEqual(game.branches["a z"]?.move, { player: 1, edge: "z" });
});
