// Checks the userscript's files and the bookmarklet (userscript.ts, bookmarklet.ts): their headers and address, that the
// code they carry as text parses, what the page functions decide (meafPage.ts), and how the import page reads what they
// send (importHash.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { USERSCRIPT_NAME, userscriptHeader, userscriptSource } from "./userscript.ts";
import { bookmarkletHref, bookmarkletScript } from "./bookmarklet.ts";
import { explain, missingMoves, shownMove } from "./meafPage.ts";
import { jamShownMove } from "./strategyjamPage.ts";
import { readImportHash, staleTool, toolSource } from "./importHash.ts";
import type { MeafGame } from "./meaf.ts";

const ORIGIN = "https://hedge.example";

test("the userscript's header names the script, its author, its pages, its rights and its updates", () => {
  const text = userscriptSource(ORIGIN, "2026.10.12.1530", "abc");
  const meta = (key: string) => [...text.matchAll(new RegExp(`^// @${key} +(.*)$`, "gm"))].map(m => m[1]);
  assert.match(text, /^\/\/ ==UserScript==\n/);
  assert.deepEqual(meta("name"), [USERSCRIPT_NAME]);
  assert.deepEqual(meta("version"), ["2026.10.12.1530"]);
  assert.deepEqual(meta("author"), ["Yshan"]);
  assert.deepEqual(meta("homepage"), ["https://yhkao.com"]);
  assert.deepEqual(meta("homepageURL"), []);
  assert.deepEqual(meta("match"), ["https://meaf.us/sst1/*", "https://strategyjam.org/enclosure/game/*"]);
  assert.deepEqual(meta("sandbox"), ["raw"]);
  assert.deepEqual(meta("grant").sort(), ["GM_openInTab", "GM_registerMenuCommand"]);
  assert.deepEqual(meta("updateURL"), [`${ORIGIN}/hedge-school.meta.js`]); // the header alone, for a small check
  assert.deepEqual(meta("downloadURL"), [`${ORIGIN}/hedge-school.user.js`]);
  assert.match(meta("icon")[0], /^data:image\/svg\+xml;base64,/);
  // The file that Tampermonkey checks is the same header, with no code.
  assert.ok(text.startsWith(userscriptHeader(ORIGIN, "2026.10.12.1530")));
  assert.match(userscriptHeader(ORIGIN, "1"), /==\/UserScript==\n$/);
});

test("the code that the userscript and the bookmarklet carry parses, with the site's address in it", () => {
  const script = userscriptSource(ORIGIN, "1", "abc");
  assert.doesNotThrow(() => new Function(script));
  assert.ok(script.includes(JSON.stringify(ORIGIN)));
  // The bookmark is a loader: it names the site's script and its own version.
  const href = bookmarkletHref(ORIGIN);
  assert.ok(href.startsWith("javascript:"));
  const loader = decodeURIComponent(href.slice("javascript:".length));
  assert.doesNotThrow(() => new Function(loader));
  assert.ok(loader.includes(JSON.stringify(ORIGIN)) && loader.includes("/bookmarklet.js?bookmark="));
  assert.doesNotThrow(() => new Function(bookmarkletScript()));
});

test("the import page reads the tool, its version, its site and the record, and an older tool's bare record", () => {
  const record = '[Blue "a b"]\n\n1. D10-G12 2. N9-Q10 O9-Q10 r+R\n';
  const sent = readImportHash(String(new URLSearchParams({ tool: "userscript", v: "abc", site: "strategyjam.org", record })));
  // Spaces and "+" come back as they were.
  assert.deepEqual(sent, { record, tool: "userscript", version: "abc", site: "strategyjam.org", at: null, link: false, save: null, from: null });
  assert.equal(toolSource(sent.tool!, sent.site), "strategyjam_userscript");
  // A tool from before the site's name ran on meaf.us.
  const older = readImportHash(String(new URLSearchParams({ tool: "bookmarklet", v: "1", record })));
  assert.equal(toolSource(older.tool!, older.site), "bookmarklet");
  assert.deepEqual(readImportHash(encodeURIComponent(record)), { record, tool: null, version: "", site: null, at: null, link: false, save: null, from: null });
  const current = { bookmarklet: "1", userscript: "abc" };
  assert.equal(staleTool(sent, current), null);
  assert.equal(staleTool({ tool: "userscript", version: "old" }, current), "userscript");
  assert.equal(staleTool({ tool: "bookmarklet", version: "1" }, current), null);
  assert.equal(staleTool({ tool: "bookmarklet", version: "" }, current), "bookmarklet");
  assert.equal(staleTool({ tool: null, version: "" }, current), "older");
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
  assert.match(explain("playing", "the Hedge School button", ORIGIN, "meaf.us"), /When the game is over, click the Hedge School button again\.$/);
  assert.ok(explain("none", "the Hedge School button", ORIGIN, "meaf.us").includes(`${ORIGIN}/tools`)); // where a new tool is
  assert.match(explain("none", "the Hedge School button", ORIGIN, "strategyjam.org"), /Open a game on strategyjam.org/);
});

test("the position that each site's page shows: its replay slider's value, or none", () => {
  // A page with one element for each selector, as the two sites draw their sliders.
  const page = (elements: Record<string, { value: string }>) => {
    (globalThis as { document?: unknown }).document = { querySelector: (selector: string) => elements[selector] ?? null };
  };
  page({ 'input[aria-label="Replay position"]': { value: "12" } });
  assert.equal(shownMove(), 12);
  assert.equal(jamShownMove(), null);
  page({ "input.replay-slider": { value: "0" } });
  assert.equal(jamShownMove(), 0);
  assert.equal(shownMove(), null);
  page({ 'input[aria-label="Replay position"]': { value: "" }, "input.replay-slider": { value: "x" } });
  assert.equal(shownMove(), null);
  assert.equal(jamShownMove(), null);
  delete (globalThis as { document?: unknown }).document;
});
