// Checks the variant check on import and the arrival's refusals (import.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { variantProblem, wayRefusals } from "./import.ts";
import { parseRecord } from "./record.ts";

/** A record with these tags and moves. */
const game = (tags: string, moves = "1. D10-E13") => parseRecord(`${tags}\n\n${moves} *`);
const setUp = game('[Position "A10-D10,D10-G10* Q10-T10 r2 0/0 1"]', "2. N9-Q10"); // the start's own turn, Red's
const rulesGame = game('[Rules "Race to 2000"]');

test("a game of other rules, or from another start, is refused; the online rules' game is not", () => {
  assert.equal(variantProblem(game('[Event "?"]'), "review"), null);
  assert.match(variantProblem(rulesGame, "review") ?? "", /other rules \(Race to 2000\)/);
  assert.match(variantProblem(setUp, "review") ?? "", /another position/);
  assert.equal(variantProblem(setUp, "analysis"), null); // the Analysis board takes it
  assert.equal(variantProblem(setUp, "practice"), null); // and Practice
  assert.equal(variantProblem(game('[Position "A10-D10 Q10-T10 b1 0/0 0"]'), "review"), null); // the standard start, written out
  assert.equal(variantProblem(game('[Rules "?"]'), "review"), null);
});

test("the arrival's ways: a set-up start turns off the review only, and other rules turn off both, each in its own words", () => {
  assert.deepEqual(wayRefusals(setUp), { analyze: null, review: "This game starts from another position. Hedge School "
    + "reviews games from the standard start only: open it on the Analysis board." }); // Cyanotype's words (setUpRefusal)
  // Other rules: each way's reason is the one that its page gives after the click. The next test checks the words.
  assert.deepEqual(wayRefusals(rulesGame), { review: variantProblem(rulesGame, "review"), analyze: variantProblem(rulesGame, "analysis") });
  assert.deepEqual(wayRefusals(game('[Event "?"]')), { review: null, analyze: null });
});

test("each page refuses a game of other rules in its own words", () => {
  const uses = "This game uses other rules (Race to 2000). ";
  assert.equal(variantProblem(rulesGame, "review"), uses + "Hedge School reviews games of the online rules only.");
  assert.equal(variantProblem(rulesGame, "analysis"), uses + "The Analysis board shows games of the online rules only.");
  assert.equal(variantProblem(rulesGame, "practice"), uses + "Practice plays games of the online rules only.");
});
