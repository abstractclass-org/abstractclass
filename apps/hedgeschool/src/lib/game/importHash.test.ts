// Checks what the import page reads after its `#`: a link from another site (design 18), beside the meaf.us tools'
// (userscript.test.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { analysisAddress, holdsGame, offersChoice, readImportHash, staleTool } from "./importHash.ts";

const record = '[Site "https://www.enclosuregame.com/game/abc123"]\n\n1. D10-E13 2. Q10-R8 O11-Q10 *';
const current = { bookmarklet: "1", userscript: "abc" };

test("another site's link: the record, its save page, and no notice to update a tool", () => {
  const save = "https://www.enclosuregame.com/hedge-school/save?game=abc123";
  const sent = readImportHash(String(new URLSearchParams({ record, save })));
  assert.deepEqual(sent, { record, tool: null, version: "", site: null, at: null, link: true, save, from: null });
  assert.equal(staleTool(sent, current), null);
});

test("a link may come without a save page, and a link without record has no record", () => {
  const sent = readImportHash(String(new URLSearchParams({ record })));
  assert.equal(sent.record, record);
  assert.equal(sent.save, null);
  assert.deepEqual(readImportHash(String(new URLSearchParams({ pgn: record }))), { record: "", tool: null, version: "", site: null, at: null, link: true, save: null, from: null });
});

test("a bare record is still an older tool's, even when it holds an equals sign", () => {
  const sent = readImportHash(encodeURIComponent('[Event "a=b"]\n\n1. D10-E13 *'));
  assert.equal(sent.link, false);
  assert.equal(staleTool(sent, current), "older");
});

test("a partner's page that sends a kept review names its origin, and may name its save page", () => {
  const sent = readImportHash(String(new URLSearchParams({ from: "https://www.enclosuregame.com", save: "https://www.enclosuregame.com/s" })));
  assert.deepEqual(sent, { record: "", tool: null, version: "", site: null, at: null, link: true, save: "https://www.enclosuregame.com/s", from: "https://www.enclosuregame.com" });
});

test("the analytics wait while the address holds a game after its `#` (design 22)", () => {
  for (const hash of ["#record=1.%20D10-G10", "#packed=AQx", "#from=https%3A%2F%2Fexample.com", "#tool=userscript&v=1&record=x",
                      "#1.%20D10-G10", "#game=abc&record=x"])
    assert.equal(holdsGame(hash), true, hash);
  for (const hash of ["", "#", "#game=abc123", "#at=4", "#game=abc&at=2"]) assert.equal(holdsGame(hash), false, hash);
});

test("a tool's game offers the choice, and another site's link goes straight to the review (design 18)", () => {
  assert.equal(offersChoice(readImportHash(String(new URLSearchParams({ tool: "bookmarklet", v: "1", site: "meaf.us", record })))), true);
  assert.equal(offersChoice(readImportHash(encodeURIComponent(record))), true); // an older tool's bare record
  assert.equal(offersChoice(readImportHash(String(new URLSearchParams({ record })))), false);
  assert.equal(offersChoice(readImportHash(String(new URLSearchParams({ from: "https://www.enclosuregame.com" })))), false);
});

test("a tool's position on the page: its edges from the start, or none", () => {
  const sent = (at: string) => readImportHash(String(new URLSearchParams({ tool: "userscript", v: "abc", site: "meaf.us", at, record })));
  assert.equal(sent("2").at, 2);
  assert.equal(sent("0").at, 0);
  for (const at of ["", "-1", "1.5", "x"]) assert.equal(sent(at).at, null, at);
  assert.equal(readImportHash(String(new URLSearchParams({ tool: "userscript", v: "abc", record }))).at, null); // an older tool
});

test("the Analysis board's address: the record, the page's position or the game's end, and the import's source", () => {
  const read = (address: string) => new URLSearchParams(address.slice("/analysis#".length));
  const at = read(analysisAddress({ record, at: 1 }, 3, "strategyjam_bookmarklet"));
  assert.equal(at.get("record"), record);
  assert.equal(at.get("at"), "1");
  assert.equal(at.get("via"), "strategyjam_bookmarklet");
  assert.equal(read(analysisAddress({ record, at: null }, 3, "userscript")).get("at"), "3"); // no position: the end
  assert.equal(read(analysisAddress({ record, at: 9 }, 3, "userscript")).get("at"), "3"); // past the end: the end
  assert.ok(analysisAddress({ record, at: 0 }, 3, "older_tool").startsWith("/analysis#"));
});
