// Checks the home board's scenes (homeScene.ts) on the packages' test game (testing/game.ts): one move a turn, the
// players in turn. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { analysisKey, mapKey } from "./cache.ts";
import { BAD_LABELS } from "./labels.ts";
import { SCENE_BEFORE, sceneOf, storedGameReview, storedResults, turnSoFar } from "./homeScene.ts";
import type { Analysis } from "./model.ts";
import { wordFields, words } from "./testing/game.ts";

const analysis = (blueWin: number, visits = 512): Analysis<string> =>
  ({ blueWin, visits, lead: 0, candidates: [{ edge: "best", visits, blueWin, lead: 0 }] });

test("the stored results: the deepest of a position's, of the network given, at the visits given or more", () => {
  const key = (model: string, moves: string[], visits: number) => analysisKey("search", model, moves, visits);
  const resultOf = storedResults([
    [key("net", ["a"], 512), analysis(0.4)],
    [key("net", ["a"], 1024), analysis(0.3, 1024)],
    [key("net", ["a", "b"], 128), analysis(0.2, 128)],
    [key("other", ["a", "b"], 512), analysis(0.1)],
    [mapKey("search", "net", ["a", "b", "c"]), analysis(0.9)],
  ], "net", 256);
  assert.equal(resultOf(["a"])?.blueWin, 0.3);
  assert.equal(resultOf(["a", "b"]), undefined, "too few visits, or another network's");
  assert.equal(resultOf(["a", "b", "c"]), undefined, "an added map is no result");
});

/** A game of `n` moves whose results are even, except that the moves `drops` lose its mover the given win chance. */
function game(n: number, drops: Record<number, number>) {
  const moves = Array.from({ length: n }, (_, i) => `m${i}`);
  const fields = Array.from({ length: n + 1 }, (_, k) => wordFields(k));
  const positions = fields.map(words.position);
  const played = moves.map((m, i) => words.played(m, fields[i], fields[i + 1]));
  let blueWin = 0.5;
  const wins = [blueWin];
  for (let i = 0; i < n; i++) {
    blueWin += (drops[i] ?? 0) * (played[i].player === 0 ? -1 : 1);
    wins.push(blueWin);
  }
  const results = wins.map(w => analysis(w));
  const resultOf = (ms: string[]) => (ms.every((m, i) => m === moves[i]) ? results[ms.length] : undefined);
  return storedGameReview(words, { moves, positions, played, analysis: results, resultOf }, 256);
}

test("a scene ends on the game's latest bad move, away from its start and its end", () => {
  // Bad moves: one in the first turns, the one that the scene takes, and one at the game's end
  const R = game(30, { 3: 0.3, 20: 0.3, 22: 0.02, 28: 0.3 });
  assert.ok(BAD_LABELS.includes(R.edges[20].label!), `move 21 is bad: ${R.edges[20].label}`);
  const scene = sceneOf(R, 30)!;
  assert.equal(scene.key.index, 20);
  assert.equal(scene.first.start, 20 - SCENE_BEFORE, "the turns before it, one move a turn");
  assert.equal(scene.last, 21, "the position after the key move");
  assert.deepEqual(turnSoFar(R, 21), [20], "one move a turn: the last move alone");
});

test("no scene in a game with no bad move after its first turns", () => {
  const R = game(30, { 3: 0.3, 28: 0.3 });
  assert.equal(sceneOf(R, 30), undefined);
});
