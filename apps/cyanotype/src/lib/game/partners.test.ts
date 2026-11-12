// Checks Cyanotype's list of partners (partners.ts, design 33, "Partner sites"): it holds no site yet, and the partners'
// test counts the developer's own computer only in a build made for it. The shared checks are in
// packages/import/src/partners.test.ts, and the browser check of a whole exchange is
// apps/hedgeschool/scripts/cyanotype-partner-check.mjs.
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { partnerSite } from "@abstractclass/import/partners.ts";
import { cyanotypeSite, gamePartner, partnerOf } from "./partners.ts";

test("no site is a partner yet: a save page on any host counts for nothing", () => {
  assert.equal(partnerOf("https://strategyjam.org/save"), null);
  assert.equal(partnerOf("https://www.enclosuregame.com/hedge-school/save"), null); // Hedge School's partner
  assert.equal(gamePartner("https://partner.example/save"), null);
  assert.equal(gamePartner(null), null);
});

test("the developer's own computer counts only in the partners' test build (VITE_PARTNER_TEST=1)", () => {
  // Node runs this file with no Vite variables, as the live site and the dev preview build it: no test site.
  assert.equal(partnerOf("http://127.0.0.1:4213/save"), null);
  assert.equal(partnerOf("https://localhost/save"), null);
  const built = partnerSite(cyanotypeSite(true)); // the partners' test build
  assert.equal(built.partnerOf("http://127.0.0.1:4213/save")?.name, "the local test site");
  assert.deepEqual(built.gamePartner("http://localhost:4000/s"), { name: "the local test site", save: "http://localhost:4000/s" });
  assert.equal(built.partnerOf("https://strategyjam.org/save"), null); // and still no other host
});
