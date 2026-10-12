// Checks the userscript's file and the bookmarklet (userscript.ts, bookmarklet.ts): their headers and address, that the
// code they carry as text parses, and what the page functions decide (meafPage.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { USERSCRIPT_NAME, userscriptSource } from "./userscript.ts";
import { bookmarkletHref } from "./bookmarklet.ts";
import { explain, missingMoves } from "./meafPage.ts";
import type { MeafGame } from "./meaf.ts";

const ORIGIN = "https://hedge.example";

test("the userscript's header names the script, its author, its pages, its rights and its updates", () => {
  const text = userscriptSource(ORIGIN, "2026.10.12.1530");
  const meta = (key: string) => [...text.matchAll(new RegExp(`^// @${key} +(.*)$`, "gm"))].map(m => m[1]);
  assert.match(text, /^\/\/ ==UserScript==\n/);
  assert.deepEqual(meta("name"), [USERSCRIPT_NAME]);
  assert.deepEqual(meta("version"), ["2026.10.12.1530"]);
  assert.deepEqual(meta("author"), ["Yshan"]);
  assert.deepEqual(meta("homepage"), ["https://yhkao.com"]);
  assert.deepEqual(meta("homepageURL"), []);
  assert.deepEqual(meta("match"), ["https://meaf.us/sst1/*"]);
  assert.deepEqual(meta("sandbox"), ["raw"]);
  assert.deepEqual(meta("grant").sort(), ["GM_openInTab", "GM_registerMenuCommand"]);
  assert.deepEqual(meta("updateURL"), [`${ORIGIN}/hedge-school.user.js`]);
  assert.deepEqual(meta("downloadURL"), [`${ORIGIN}/hedge-school.user.js`]);
  assert.match(meta("icon")[0], /^data:image\/svg\+xml;base64,/);
});

test("the code that the userscript and the bookmarklet carry parses, with the site's address in it", () => {
  const script = userscriptSource(ORIGIN, "1");
  assert.doesNotThrow(() => new Function(script));
  assert.ok(script.includes(JSON.stringify(ORIGIN)));
  const href = bookmarkletHref(ORIGIN);
  assert.ok(href.startsWith("javascript:"));
  assert.doesNotThrow(() => new Function(decodeURIComponent(href.slice("javascript:".length))));
});

test("a game lacks its moves while it is played, until a watcher's view loads them, or on a finished game", () => {
  const at = (search: string) => { (globalThis as { location?: unknown }).location = { search }; };
  const game = (over: boolean, have: number, count: number): MeafGame =>
    ({ moveHistory: Array(have).fill({}), historyLength: count, phase: over ? "done" : "playing" });
  at("?game=abc");
  assert.equal(missingMoves(game(true, 3, 3)), null);
  assert.equal(missingMoves(game(false, 0, 3)), "playing");
  assert.equal(missingMoves(game(true, 0, 3)), "reload");
  at("?game=abc&spectate=1");
  assert.equal(missingMoves(game(true, 0, 3)), "loading");
  assert.match(explain("playing", "the Hedge School button"), /When the game is over, click the Hedge School button again\.$/);
});
