// Checks what the import page reads after its `#`: a link from another site (design 18), beside the meaf.us tools'
// (userscript.test.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { holdsGame, readImportHash, staleTool } from "./importHash.ts";

const record = '[Site "https://www.enclosuregame.com/game/abc123"]\n\n1. D10-E13 2. Q10-R8 O11-Q10 *';
const current = { bookmarklet: "1", userscript: "abc" };

test("another site's link: the record, its save page, and no notice to update a tool", () => {
  const save = "https://www.enclosuregame.com/hedge-school/save?game=abc123";
  const sent = readImportHash(String(new URLSearchParams({ record, save })));
  assert.deepEqual(sent, { record, tool: null, version: "", link: true, save, from: null });
  assert.equal(staleTool(sent, current), null);
});

test("a link may come without a save page, and a link without record has no record", () => {
  const sent = readImportHash(String(new URLSearchParams({ record })));
  assert.equal(sent.record, record);
  assert.equal(sent.save, null);
  assert.deepEqual(readImportHash(String(new URLSearchParams({ pgn: record }))), { record: "", tool: null, version: "", link: true, save: null, from: null });
});

test("a bare record is still an older tool's, even when it holds an equals sign", () => {
  const sent = readImportHash(encodeURIComponent('[Event "a=b"]\n\n1. D10-E13 *'));
  assert.equal(sent.link, false);
  assert.equal(staleTool(sent, current), "older");
});

test("a partner's page that sends a kept review names its origin, and may name its save page", () => {
  const sent = readImportHash(String(new URLSearchParams({ from: "https://www.enclosuregame.com", save: "https://www.enclosuregame.com/s" })));
  assert.deepEqual(sent, { record: "", tool: null, version: "", link: true, save: "https://www.enclosuregame.com/s", from: "https://www.enclosuregame.com" });
});

test("the analytics wait while the address holds a game after its `#` (design 22)", () => {
  for (const hash of ["#record=1.%20D10-G10", "#packed=AQx", "#from=https%3A%2F%2Fexample.com", "#tool=userscript&v=1&record=x",
                      "#s=AQx", "#1.%20D10-G10", "#game=abc&record=x"])
    assert.equal(holdsGame(hash), true, hash);
  for (const hash of ["", "#", "#game=abc123", "#at=4", "#game=abc&at=2"]) assert.equal(holdsGame(hash), false, hash);
});
