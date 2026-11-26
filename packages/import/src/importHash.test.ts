// Checks what a site's pages read after their `#` (importHash.ts), with a test game's record of words, unlike
// Enclosure's and Blueprints': a tool's game, another site's link, an older tool's bare record, a partner's page that
// sends a kept review, and the ways in that the review takes. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { analysisAddress, readImportHash, reviewArrives, staleTool } from "./importHash.ts";

const record = '[Event "a word game"]\n\n1. ab 2. cd ef *\n';
const NONE = { tool: null, version: "", site: null, at: null, link: false, save: null, from: null };

test("a tool's game: the tool, its version, the site it ran on, the position on its page and the record", () => {
  const hash = (more: Record<string, string>) => String(new URLSearchParams({ tool: "userscript", v: "abc", site: "play.example", ...more, record }));
  assert.deepEqual(readImportHash(hash({ at: "2" })), { ...NONE, record, tool: "userscript", version: "abc", site: "play.example", at: 2 });
  for (const at of ["", "-1", "1.5", "x"]) assert.equal(readImportHash(hash({ at })).at, null, at);
  assert.equal(readImportHash(hash({ tool: "other" })).tool, null); // a tool that the page does not know
  const current = { bookmarklet: "1", userscript: "abc" };
  assert.equal(staleTool(readImportHash(hash({})), current), null);
  assert.equal(staleTool({ tool: "userscript", version: "old" }, current), "userscript");
  assert.equal(staleTool({ tool: "bookmarklet", version: "" }, current), "bookmarklet");
  assert.equal(staleTool({ tool: null, version: "" }, current), "older");
});

test("another site's link, a partner's page that sends a kept review, and an older tool's bare record", () => {
  const save = "https://partner.example/save?game=1";
  assert.deepEqual(readImportHash(String(new URLSearchParams({ record, save }))), { ...NONE, record, link: true, save });
  assert.deepEqual(readImportHash(String(new URLSearchParams({ pgn: record }))), { ...NONE, record: "", link: true });
  assert.deepEqual(readImportHash(String(new URLSearchParams({ from: "https://partner.example" }))),
                   { ...NONE, record: "", link: true, from: "https://partner.example" });
  // A bare record starts with a tag, a turn or a move, never with a name and "=", even when it holds one.
  const bare = '[Event "a=b"]\n\n1. ab *';
  assert.deepEqual(readImportHash(encodeURIComponent(bare)), { ...NONE, record: bare });
});

test("a game that the site fetches by its id: its parameter gives the id, and without it the hash reads as before", () => {
  const tool = String(new URLSearchParams({ tool: "bookmarklet", v: "1", site: "play.example", at: "1", record }));
  const link = String(new URLSearchParams({ record, save: "https://partner.example/save" })), bare = encodeURIComponent(record);
  // With the site's parameter: the id, "" for an empty one, and null where the hash has none.
  assert.deepEqual(readImportHash("playtak=123", "playtak"), { ...NONE, record: "", link: true, id: "123" });
  assert.equal(readImportHash("playtak=", "playtak").id, "");
  assert.equal(readImportHash("playtak=123&record=x", "playtak").id, "123");
  for (const hash of [tool, link, bare, "other=123"]) {
    assert.deepEqual(readImportHash(hash, "playtak"), { ...readImportHash(hash), id: null }, hash);
  }
  // A tool's record that holds the parameter's name is no id.
  assert.equal(readImportHash(String(new URLSearchParams({ tool: "userscript", record: "playtak=1" })), "playtak").id, null);
  // Without it: what the import pages read before, with no `id`.
  assert.deepEqual(readImportHash(tool), { ...NONE, record, tool: "bookmarklet", version: "1", site: "play.example", at: 1 });
  assert.deepEqual(readImportHash(link), { ...NONE, record, link: true, save: "https://partner.example/save" });
  assert.deepEqual(readImportHash(bare), { ...NONE, record });
  assert.deepEqual(readImportHash("playtak=123"), { ...NONE, record: "", link: true });
});

// Which part holds a game (holdsGame) and a bare record's parameters (hashParams): @abstractclass/site's
// addressHash.test.ts.
test("which part after the `#` the review's arrival step takes", () => {
  for (const hash of ["#packed=AQx", "#from=https%3A%2F%2Fpartner.example", "#tool=userscript&v=old&record=x"])
    assert.equal(reviewArrives(hash), true, hash);
  for (const hash of ["#record=x", "#1.%20ab", "#record=x&tool=bookmarklet", "#game=abc", ""]) assert.equal(reviewArrives(hash), false, hash);
});

test("the Analysis board's address: the record, the page's position or the game's end, and the source if any", () => {
  const read = (address: string) => new URLSearchParams(address.slice("/analysis#".length));
  const at = read(analysisAddress({ record, at: 1 }, 3, "words_bookmarklet"));
  assert.deepEqual([at.get("record"), at.get("at"), at.get("via")], [record, "1", "words_bookmarklet"]);
  assert.equal(read(analysisAddress({ record, at: null }, 3, "words_userscript")).get("at"), "3");
  // A site that counts no events gives no source, and the address names none
  assert.deepEqual([...read(analysisAddress({ record, at: 2 }, 3, null)).keys()], ["record", "at"]);
});
