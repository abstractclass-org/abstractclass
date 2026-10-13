// Checks which addresses count as a partner's save page (design 18), the variant check on import, and the game's own
// page from its Site tag. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { gamePartner, partnerOf } from "./partners.ts";
import { variantProblem } from "./import.ts";
import { gamePage, parseRecord } from "./record.ts";

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
  const game = (tags: string) => parseRecord(`${tags}\n\n1. D10-E13 *`);
  assert.equal(variantProblem(game('[Event "?"]')), null);
  assert.match(variantProblem(game('[Rules "Race to 2000"]')) ?? "", /other rules \(Race to 2000\)/);
  assert.match(variantProblem(game('[Position "A10-D10 Q10-T10 b1 0/0 0"]')) ?? "", /another position/);
  assert.equal(variantProblem(game('[Rules "?"]')), null);
});

test("the game's own page comes from a web address in Site, and from nothing else", () => {
  assert.deepEqual(gamePage({ Site: "https://www.enclosuregame.com/game/abc" }), { href: "https://www.enclosuregame.com/game/abc", host: "enclosuregame.com" });
  assert.equal(gamePage({ Site: "meaf.us" }), null);
  assert.equal(gamePage({ Site: "javascript:alert(1)" }), null);
  assert.equal(gamePage({}), null);
});
