// Blueprints' outcome in words (blueprints.ts, endingText and fmtMargin): the view's words and its rule for a draw
// (@abstractclass/review/game.ts, endingWords), with Blueprints' format of a margin. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { endingText, fmtMargin, type ReviewData } from "./blueprints.ts";

test("a game's outcome: by the scores when the rules ended it, else as its record says", () => {
  const game = (over: boolean, blue: number, red: number, result: string | null) => ({
    players: { blue: "Blue", red: "Red" }, result: { blue, red }, moves: [{}, {}],
    positions: [{ over: false }, { over: false }, { over }], analysis: [], ending: { result },
  }) as unknown as ReviewData;
  assert.equal(endingText(game(true, 1730, 1000, "b+730")), "Blue won by 730");
  assert.equal(endingText(game(true, 2024, 4048, "r+2024")), "Red won by 2,024");
  assert.equal(endingText(game(true, 500, 500, "0")), "A draw");
  // A record's Komi tag can be a half (the record reader takes one for every game): its margin keeps the half.
  assert.equal(endingText(game(true, 524.5, 500, "b+24.5")), "Blue won by 24.5");
  assert.equal(endingText(game(false, 3, 9, "b+24.5")), "Blue won by 24.5");
  assert.equal(endingText(game(false, 3, 9, "r+0.5")), "Red won by 0.5");
  assert.equal(endingText(game(false, 3, 9, "r+0.03")), "Red won by 0.03"); // a record's margin never reads as 0
  assert.equal(endingText(game(false, 3, 9, "0")), "A draw");
  assert.equal(endingText(game(false, 3, 9, "b+R")), "Blue won: Red resigned after move 2");
  assert.equal(endingText(game(false, 3, 9, "r+F")), "Red won: Blue left the game after move 2");
  assert.equal(endingText(game(false, 3, 9, "*")), "Unfinished after move 2");
  assert.deepEqual([24, 24.5, 1024].map(fmtMargin), ["24", "24.5", "1,024"]);
});
