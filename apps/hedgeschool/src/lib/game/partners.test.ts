// Checks Hedge School's list of partners (design 18): which addresses count as enclosuregame.com's save page. The
// shared checks are in packages/import/src/partners.test.ts. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { gamePartner, partnerOf } from "./partners.ts";

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
