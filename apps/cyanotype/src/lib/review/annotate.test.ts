// Checks the annotated record with Blueprints' moves (annotate.ts): a move played keeps its capture mark, a bad turn
// names the engine's turn by its moves, a variation follows the turn it changes, and the record reads back as the same
// game. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { review, type Analysis, type Candidate } from "@abstractclass/analysis/model.ts";
import { parseMove, type Move } from "../game/notation.ts";
import { parseRecord } from "../game/record.ts";
import { annotatedRecord } from "./annotate.ts";
import { blueprints, type Played, type Position, type ReviewData, type Step } from "./blueprints.ts";

// Blue's first turn (A), Red's turn of two (B, C), Blue's turn of two (D, F): five moves, six positions. D captures
// and scores 24 points.
const [A, B, C, D, F, X, Y] = ["2@-6,-2", "2@5,-2", "1:0,0>3:1,-1", "2@-3,1", "1@0,2", "3@4,-1", "1@6,-3"];
const did = (captured: number, points: number) =>
  ({ captured: Object.fromEntries(Array.from({ length: captured }, (_, i) => [`${i},0`, [1, "normal"]])), points }) as unknown as Step;
const played = (player: 0 | 1, name: string, step = did(0, 0)): Played => ({ player, edge: parseMove(name) as Move, did: step } as Played);
const at = (blueWin: number, lead: number, candidates: Candidate<Move>[] = []): Analysis<Move> =>
  ({ blueWin, visits: 512, lead, spread: 100, candidates });
// Red's turn loses 0.3 of win chance: a Blunder, where the engine's best turn was X then Y.
const best: Candidate<Move> = { edge: parseMove(X), visits: 300, blueWin: 0.5, line: [parseMove(X), parseMove(Y)] };
const data: ReviewData = {
  players: { blue: "Ann", red: "Ben" }, result: { blue: 30, red: 0 },
  moves: [played(0, A), played(1, B), played(1, C), played(0, D, did(3, 24)), played(0, F)],
  positions: Array(6).fill({} as Position),
  analysis: [at(0.5, 0), at(0.5, 0, [best]), at(0.7, 30), at(0.8, 40), at(0.85, 45)],
};
const R = review(blueprints, data);

test("each move keeps its capture mark, and a bad turn says which turn was best", () => {
  const lines = annotatedRecord({ R, unit: "turn", tags: { Blue: "Ann", Red: "Ben" }, result: "b+30", note: "Cyanotype's Analysis board." });
  assert.ok(lines.split("\n").every(l => l.length <= 80));
  const [head, body] = lines.split("\n\n");
  const text = `${head}\n\n${body.replace(/\n/g, " ")}`;
  assert.match(text, /\[Result "b\+30"\]/);
  assert.ok(text.includes(`{ Cyanotype's Analysis board. } 1. ${A} { [%eval 0.500 +0.0 100.0] } 2. ${B}`), text);
  assert.ok(text.includes(`${C}?? { Blunder. ${X} ${Y} was best. [%eval 0.800 +40.0 100.0] }`), text);
  assert.ok(text.includes(`3. ${D}x+24 {`), text);
  assert.deepEqual(parseRecord(text).moves, [A, B, C, D, F]);
});

test("a variation follows the turn it changes", () => {
  const branches = {
    [`${A} ${X}`]: { move: played(1, X), order: 0 },
    [`${A} ${X} ${Y}`]: { move: played(1, Y), order: 1 },
    [`${A} ${B} ${Y}`]: { move: played(1, Y), order: 2 },
  };
  const text = annotatedRecord({ R, unit: "turn", tags: {}, result: null, branches }).replace(/\n/g, " ").replace(/\{[^}]*\}/g, "{}");
  assert.ok(text.includes(`2. ${B} {} ${C}?? {} (2. ${X} ${Y}) (2... ${Y}) 3. ${D}x+24`), text);
  assert.deepEqual(parseRecord(text.replace(/\{\}/g, "")).moves, [A, B, C, D, F]);
});
