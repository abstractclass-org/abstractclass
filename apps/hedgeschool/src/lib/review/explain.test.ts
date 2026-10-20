// A mistake explained by what happens next (explain.ts, design 30): the facts of the opponent's next turn in the
// engine's line, and the caption. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { explainMistake, explanationCaption } from "./explain.ts";
import type { Edge, LineStep, Position, Region } from "./enclosure.ts";

/** A square region from (x, y) with side `s`. */
const square = (x: number, y: number, s: number): Region =>
  ({ area: 0, rings: [[[x, y], [x + s, y], [x + s, y + s], [x, y + s]]] });
const blueSquare = square(1, 1, 3), redSquare = square(10, 10, 2);
/** The position after Blue's turn: Blue holds a square of 9, and Red has a turn of two edges. */
const after = {
  edges: [[], []], protected: [], placed: [], scores: [0, 0], areas: [9, 0], player: 1, movesLeft: 2,
  regions: [[blueSquare], []],
} as unknown as Position;
const step = (cut: Edge | null, regions: [Region[], Region[]], areas: [number, number]): LineStep => ({ cut, regions, areas });
const e = (x1: number, y1: number, x2: number, y2: number): Edge => [x1, y1, x2, y2];

test("the opponent's next turn cuts and closes: the caption gives the cut edge, the area and where", () => {
  const line = [e(2, 0, 2, 2), e(10, 12, 12, 12), e(5, 5, 5, 6)];
  const steps = [step(e(1, 1, 4, 1), [[], []], [0, 0]), step(null, [[], [redSquare]], [0, 4]), step(null, [[], [redSquare]], [0, 4])];
  const x = explainMistake(after, line, steps, 0)!;
  assert.equal(x.edges, 2); // the board draws Red's turn, not the rest of the line
  assert.deepEqual(x.outline, redSquare.rings);
  assert.equal(explanationCaption(x, 0, "turn"),
               "After this turn, Red cuts B2-E2 and closes 4 points of area at M12. Blue loses 9 points of area.");
});

test("a turn that only closes", () => {
  const steps = [step(null, [[blueSquare], []], [9, 0]), step(null, [[blueSquare], [redSquare]], [9, 4])];
  const x = explainMistake(after, [e(10, 10, 12, 10), e(10, 12, 12, 12)], steps, 0)!;
  assert.equal(explanationCaption(x, 0, "turn"), "After this turn, Red closes 4 points of area at M12.");
});

test("a region kept from before is not closed again", () => {
  const before = { ...after, regions: [[blueSquare], [redSquare]], areas: [9, 4] } as Position;
  const steps = [step(null, [[blueSquare], [redSquare]], [9, 4]), step(e(1, 1, 4, 1), [[], [redSquare]], [0, 4])];
  const x = explainMistake(before, [e(15, 15, 16, 15), e(2, 0, 2, 2)], steps, 0)!;
  assert.deepEqual(x.outline, []);
  assert.equal(explanationCaption(x, 0, "turn"), "After this turn, Red cuts B2-E2. Blue loses 9 points of area.");
});

test("by edge, the mover's edge left in the turn comes first, and the board draws it too", () => {
  const mid = { ...after, player: 0, movesLeft: 1 } as Position;
  const steps = [step(null, [[blueSquare], []], [9, 0]), step(null, [[blueSquare], []], [9, 0]),
                 step(null, [[blueSquare], [redSquare]], [9, 4])];
  const x = explainMistake(mid, [e(6, 6, 7, 6), e(10, 10, 12, 10), e(10, 12, 12, 12)], steps, 0)!;
  assert.equal(x.edges, 3);
  assert.equal(explanationCaption(x, 0, "edge"), "After this edge, Red's next turn closes 4 points of area at M12.");
});

test("a quiet next turn: the caption looks further along the line, to the opponent's first turn that closes or cuts", () => {
  const quiet = step(null, [[blueSquare], []], [9, 0]);
  const steps = [quiet, quiet, quiet, quiet, step(e(1, 1, 4, 1), [[], []], [0, 0]), step(null, [[], []], [0, 0])];
  const line = [e(6, 6, 7, 6), e(6, 7, 7, 7), e(8, 8, 9, 8), e(8, 9, 9, 9), e(2, 0, 2, 2), e(3, 0, 3, 1)];
  const x = explainMistake(after, line, steps, 0)!;
  assert.equal(x.edges, 6);
  assert.equal(explanationCaption(x, 0, "turn"),
               "In the engine's line, Red's second turn from here cuts B2-E2. Blue loses 9 points of area.");
});

test("no close or cut in the opponent's turns of the line: the loss is spread over the board", () => {
  const quiet = step(null, [[blueSquare], []], [9, 0]);
  const x = explainMistake(after, [e(6, 6, 7, 6), e(6, 7, 7, 7), e(8, 8, 9, 8)], [quiet, quiet, quiet], 0)!;
  assert.equal(x.edges, 0);
  assert.equal(explanationCaption(x, 0, "turn"),
               "Red's next turn in the engine's line closes and cuts nothing. The points lost are spread over the board.");
});

test("a line too short for one whole turn of the opponent's explains nothing", () => {
  assert.equal(explainMistake(after, [e(6, 6, 7, 6)], [step(null, [[blueSquare], []], [9, 0])], 0), null);
  assert.equal(explainMistake(after, [], [], 0), null);
});
