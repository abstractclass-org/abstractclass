// Checks which addresses count as a partner's save page (design 18), the variant check on import and the arrival's
// refusals, and the game's own page from its Site tag. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { gamePartner, partnerOf } from "./partners.ts";
import { variantProblem, wayRefusals } from "./import.ts";
import { gamePage, parseRecord } from "./record.ts";

/** A record with these tags and moves. */
const game = (tags: string, moves = "1. D10-E13") => parseRecord(`${tags}\n\n${moves} *`);
const setUp = game('[Position "A10-D10,D10-G10* Q10-T10 r2 0/0 1"]', "2. N9-Q10"); // the start's own turn, Red's
const rulesGame = game('[Rules "Race to 2000"]');

test("a save page counts only on a partner's own host, over https", () => {
  assert.equal(partnerOf("https://www.enclosuregame.com/hedge-school/save?game=1")?.name, "enclosuregame.com");
  assert.equal(partnerOf("https://enclosuregame.com/save")?.name, "enclosuregame.com");
  assert.equal(partnerOf("http://www.enclosuregame.com/save"), null); // not https
  assert.equal(partnerOf("https://enclosuregame.com.example.net/save"), null); // another host
  assert.equal(partnerOf("https://example.com/?u=https://www.enclosuregame.com/"), null);
  assert.equal(partnerOf("javascript:alert(1)"), null);
  assert.equal(partnerOf("not an address"), null);
  assert.deepEqual(gamePartner("https://www.enclosuregame.com/s"), { name: "enclosuregame.com", save: "https://www.enclosuregame.com/s" });
  assert.equal(gamePartner(null), null);
  assert.equal(gamePartner("https://example.com/s"), null);
});

test("a game of other rules, or from another start, is refused; the online rules' game is not", () => {
  assert.equal(variantProblem(game('[Event "?"]')), null);
  assert.match(variantProblem(rulesGame) ?? "", /other rules \(Race to 2000\)/);
  assert.match(variantProblem(setUp) ?? "", /another position/);
  assert.equal(variantProblem(setUp, "analysis"), null); // the Analysis board takes it
  assert.equal(variantProblem(setUp, "practice"), null); // and Practice
  assert.equal(variantProblem(game('[Position "A10-D10 Q10-T10 b1 0/0 0"]')), null); // the standard start, written out
  assert.equal(variantProblem(game('[Rules "?"]')), null);
});

test("the arrival's ways: a set-up start turns off the review only, and other rules turn off both, each in its own words", () => {
  assert.deepEqual(wayRefusals(setUp), { analyze: null, review: "This game starts from another position. Hedge School "
    + "reviews games from the standard start only: open it on the Analysis board." }); // Cyanotype's words (setUpRefusal)
  assert.deepEqual(wayRefusals(rulesGame), {
    review: "This game uses other rules (Race to 2000). Hedge School reviews games of the online rules only.",
    analyze: "This game uses other rules (Race to 2000). The Analysis board shows games of the online rules only.",
  });
  assert.deepEqual(wayRefusals(game('[Event "?"]')), { review: null, analyze: null });
});

test("each page refuses a game of other rules in its own words", () => {
  const uses = "This game uses other rules (Race to 2000). ";
  assert.equal(variantProblem(rulesGame), uses + "Hedge School reviews games of the online rules only.");
  assert.equal(variantProblem(rulesGame, "analysis"), uses + "The Analysis board shows games of the online rules only.");
  assert.equal(variantProblem(rulesGame, "practice"), uses + "Practice plays games of the online rules only.");
  assert.equal(wayRefusals(rulesGame).analyze, variantProblem(rulesGame, "analysis")); // the arrival's card, the board's page
});

test("the game's own page comes from a web address in Site, and from nothing else", () => {
  assert.deepEqual(gamePage({ Site: "https://www.enclosuregame.com/game/abc" }), { href: "https://www.enclosuregame.com/game/abc", host: "enclosuregame.com" });
  assert.equal(gamePage({ Site: "meaf.us" }), null);
  assert.equal(gamePage({ Site: "javascript:alert(1)" }), null);
  assert.equal(gamePage({}), null);
});
