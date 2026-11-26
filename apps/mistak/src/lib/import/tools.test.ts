// Checks Mistak's tools for playtak.com (tools.ts, playtakPage.ts): the userscript's header and the bookmark's loader,
// that the code they carry as text parses, and what the bookmarklet's code does on a playtak page that this test makes
// from two games written by hand (a finished game, and one in progress), with made-up players: the import page's hash
// that it sends, as the import page reads it (@abstractclass/import's importHash.ts), the record that Mistak takes from
// it, and the messages for a page with no game. The browser test on saved pages is
// apps/hedgeschool/tests/mistak-tools.spec.ts. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readImportHash, staleTool } from "@abstractclass/import/importHash.ts";
import { holdsGame } from "@abstractclass/site/addressHash.ts";
import { parseRecord } from "#lib/game/record.ts";
import { bringRecord } from "./ways.ts";
import { TOOL_NAME, bookmarkletHref, bookmarkletScript, userscriptHeader, userscriptSource } from "./tools.ts";

const ORIGIN = "https://mistak.example";

/** The values of the userscript's header lines `// @<key>`. */
const meta = (text: string, key: string) => [...text.matchAll(new RegExp(`^// @${key} +(.*)$`, "gm"))].map(m => m[1]);

test("the userscript's header names the script, playtak's pages, its rights and its files", () => {
  const text = userscriptSource(ORIGIN, "2026.11.26.1200", "abc");
  assert.deepEqual(meta(text, "name"), [TOOL_NAME]);
  assert.deepEqual(meta(text, "match"), ["https://playtak.com/*", "https://www.playtak.com/*"]);
  assert.deepEqual(meta(text, "sandbox"), ["raw"]);
  assert.deepEqual(meta(text, "grant").sort(), ["GM_openInTab", "GM_registerMenuCommand"]);
  assert.deepEqual(meta(text, "connect"), []); // it fetches nothing
  assert.deepEqual(meta(text, "updateURL"), [`${ORIGIN}/mistak.meta.js`]);
  assert.deepEqual(meta(text, "downloadURL"), [`${ORIGIN}/mistak.user.js`]);
  assert.match(meta(text, "icon")[0], /^data:image\/svg\+xml;base64,/);
  assert.ok(text.startsWith(userscriptHeader(ORIGIN, "2026.11.26.1200")));
});

test("the code that the userscript and the bookmarklet carry parses, with the site's address and name in it", () => {
  const script = userscriptSource(ORIGIN, "1", "abc");
  assert.doesNotThrow(() => new Function(script));
  assert.ok(script.includes(JSON.stringify(ORIGIN)) && script.includes("Open this game in Mistak"));
  const href = bookmarkletHref(ORIGIN);
  assert.ok(href.startsWith("javascript:"));
  const loader = decodeURIComponent(href.slice("javascript:".length));
  assert.doesNotThrow(() => new Function(loader));
  assert.ok(loader.includes(JSON.stringify(ORIGIN)) && loader.includes("/bookmarklet.js?bookmark=") && loader.includes('"Mistak"'));
  assert.doesNotThrow(() => new Function(bookmarkletScript()));
});

/** A playtak page as the reader sees it: the page's `gameData`, its move list's rows (each row's cells as text), and
 *  the players' names. `null` for a part that the page lacks. */
interface Page { data: object | null; rows: string[][] | null; names?: [string, string]; path?: string }

/** Runs the bookmarklet's code on `page`: what it alerts, and the address that it opens. */
function click({ data, rows, names = ["alder_test", "birch_test"], path = "/" }: Page) {
  const done: { alerts: string[]; opened: string[] } = { alerts: [], opened: [] };
  const element = (text: string) => ({ textContent: text });
  const list = rows && {
    querySelectorAll: (selector: string) => {
      assert.equal(selector, "tr");
      return rows.map(cells => ({ querySelectorAll: (td: string) => (assert.equal(td, "td"), cells.map(element)) }));
    },
  };
  Object.assign(globalThis, {
    gameData: data ?? undefined,
    document: {
      currentScript: { src: `${ORIGIN}/bookmarklet.js?bookmark=1` },
      querySelector: (selector: string) => (selector === "#moveslist" ? list
        : selector === ".player1-name" ? element(names[0]) : selector === ".player2-name" ? element(names[1]) : null),
    },
    location: { hostname: "playtak.com", origin: "https://playtak.com", pathname: path },
    alert: (text: string) => done.alerts.push(text),
    window: { open: (url: string) => { done.opened.push(url); return {}; } },
  });
  try {
    new Function(bookmarkletScript())();
  } finally {
    delete (globalThis as { gameData?: unknown }).gameData;
  }
  return done;
}

/** What the import page reads from the one address that the click opens. */
function sent(page: Page) {
  const { alerts, opened } = click(page);
  assert.deepEqual(alerts, []);
  assert.equal(opened.length, 1);
  assert.ok(opened[0].startsWith(`${ORIGIN}/import#`));
  const hash = new URL(opened[0]).hash;
  assert.equal(holdsGame(hash), true); // the import page takes it, and does not go to the tools
  return readImportHash(hash.slice(1), "playtak");
}

// A finished game on 5×5, written by hand: a road for White on the third row. Swap opening, komi 2 (playtak keeps
// 4, in half flats). The move list ends with the result's own row. The game's number is made up.
const FINISHED: Page = {
  data: { id: 999999901, size: 5, komi: 4, pieces: 21, capstones: 1, opening: "swap", result: "R-0", move_start: 0,
          move_shown: 11, is_game_end: true },
  rows: [["1.", "e5", "a1"], ["2.", "a3", "e4"], ["3.", "b3", "Sd4"], ["4.", "c3", "c4"], ["5.", "d3", "b4"],
         ["6.", "e3", ""], ["", "R-0"]],
};
const FINISHED_MOVES = ["e5", "a1", "a3", "e4", "b3", "Sd4", "c3", "c4", "d3", "b4", "e3"];

// A game in progress on 6×6, written by hand: a capstone, a wall and a stack move, komi 2.5. The page shows the
// position after Black's third move.
const PLAYING: Page = {
  data: { id: 999999902, size: 6, komi: 5, pieces: 30, capstones: 1, opening: "swap", result: "", move_start: 0,
          move_shown: 6 },
  rows: [["1.", "a6", "f1"], ["2.", "c3", "d3"], ["3.", "c4", "Cd4"], ["4.", "Sc2", "1d4<"], ["5.", "b3", ""]],
};

test("a finished game: the tool, its version, the site, the position on the page, and the record with its result", () => {
  const read = sent(FINISHED);
  assert.deepEqual([read.tool, read.version, read.site, read.at, read.link, read.id],
                   ["bookmarklet", "1", "playtak.com", 11, false, null]);
  assert.equal(staleTool(read, { bookmarklet: "1", userscript: "abc" }), null);
  assert.equal(read.record, [
    '[Site "PlayTak.com"]', '[Player1 "alder_test"]', '[Player2 "birch_test"]', '[Result "R-0"]', '[Size "5"]',
    '[Komi "2"]', '[Flats "21"]', '[Caps "1"]', '[PlayTakID "999999901"]', "",
    "1. e5 a1", "2. a3 e4", "3. b3 Sd4", "4. c3 c4", "5. d3 b4", "6. e3 R-0", "",
  ].join("\n"));
  const r = parseRecord(read.record);
  assert.deepEqual([r.moves.length, r.result, r.komi], [FINISHED_MOVES.length, "R-0", 2]);
  // What the import page does with it.
  assert.equal(bringRecord(read.record, false).game.moves.length, FINISHED_MOVES.length);
});

test("a game in progress: no result, half a flat of komi, and the position on the page", () => {
  const read = sent(PLAYING);
  assert.equal(read.at, 6);
  const r = parseRecord(read.record);
  assert.deepEqual([r.moves.length, r.result, r.komi], [9, "*", 2.5]);
  assert.deepEqual([r.tags.Size, r.tags.Opening, r.tags.Result, r.tags.PlayTakID], ["6", undefined, undefined, "999999902"]);
  assert.match(read.record, /\n\n1\. a6 f1\n2\. c3 d3\n3\. c4 Cd4\n4\. Sc2 1d4<\n5\. b3 \*\n$/);
  assert.equal(bringRecord(read.record, false).game.moves.length, 9);
});

test("the double black stack: the record names the opening and reads `2a1`, and the import says why it refuses it", () => {
  const page = { data: { ...PLAYING.data, opening: "double black stack" }, rows: [["1.", "2a1", "f6"], ["2.", "c3", ""]] };
  const read = sent(page);
  const r = parseRecord(read.record);
  assert.deepEqual([r.tags.Opening, r.moves.length], ["double black stack", 3]);
  assert.throws(() => bringRecord(read.record, false), /does not take a game with another opening: double black stack\./);
});

test("what the page gives: no number for a loaded game, a name's quote, no position, and the end of an aborted game", () => {
  // A game that a link loaded has the number 0, and the page shows a position past its moves: neither goes.
  const loaded = sent({ ...FINISHED, data: { ...FINISHED.data, id: 0, move_shown: 40 } });
  assert.equal(parseRecord(loaded.record).tags.PlayTakID, undefined);
  assert.equal(loaded.at, null);
  // PTN has no escapes: a `"` in a name is written as two `'`.
  assert.match(sent({ ...FINISHED, names: ['a"b', "c"] }).record, /\[Player1 "a''b"\]/);
  // playtak writes "0-0" in a move's cell, and "Game Over" (the 2D board's scratch game) as its result: no move, and
  // no result that PTN knows.
  const aborted = sent({ data: { ...FINISHED.data, result: "0-0" }, rows: [["1.", "e5", "a1"], ["2.", "0-0", ""]] });
  assert.deepEqual(parseRecord(aborted.record).moves.length, 2);
  const scratch = sent({ data: { ...FINISHED.data, result: "Game Over" }, rows: [["1.", "e5", "a1"]] });
  assert.equal(parseRecord(scratch.record).result, "*");
});

test("no game that the page can give: the bookmarklet says why, and opens nothing", () => {
  const says = (page: Page, message: RegExp) => {
    const { alerts, opened } = click(page);
    assert.deepEqual(opened, []);
    assert.equal(alerts.length, 1);
    assert.match(alerts[0], message);
  };
  says({ data: null, rows: null }, /^Mistak: this page shows no game that Mistak can read\..* https:\/\/mistak\.example\/tools\.$/);
  says({ data: null, rows: null, path: "/games/123" }, /^Mistak: this page is a game from the history of playtak\.com\./);
  says({ data: FINISHED.data, rows: [] }, /^Mistak: this game has no moves yet\./);
  // A game from a set-up position: the page keeps no position, only the cell "load", or the first move's number.
  says({ data: FINISHED.data, rows: [["1.", "--", "load"], ["2.", "a1", ""]] }, /^Mistak: this game starts from a set-up position\./);
  says({ data: { ...FINISHED.data, move_start: 3 }, rows: FINISHED.rows }, /set-up position.*https:\/\/mistak\.example\/review\.$/);
});
