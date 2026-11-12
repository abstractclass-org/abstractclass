// Checks Cyanotype's list of partners (partners.ts, design 33, "Partner sites"): it holds no site yet, and the build
// that Node runs (no Vite variables, as on the live site and the dev preview) counts no test site. The shared checks,
// the partners' test switch too, are in packages/import/src/partners.test.ts, and the browser check of a whole
// exchange on the partners' test build is apps/hedgeschool/scripts/cyanotype-partner-check.mjs.
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { gamePartner, partnerOf } from "./partners.ts";

test("no site is a partner yet: a save page on any host counts for nothing", () => {
  assert.equal(partnerOf("https://strategyjam.org/save"), null);
  assert.equal(partnerOf("https://www.enclosuregame.com/hedge-school/save"), null); // Hedge School's partner
  assert.equal(gamePartner("https://partner.example/save"), null);
  assert.equal(gamePartner(null), null);
});

test("with no VITE_PARTNER_TEST, the developer's own computer counts for nothing", () => {
  assert.equal(partnerOf("http://127.0.0.1:4174/save"), null);
  assert.equal(partnerOf("https://localhost/save"), null);
});
