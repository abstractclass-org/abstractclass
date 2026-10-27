// Checks the tools' frame (bookmarklet.ts, userscript.ts, pageCode.ts) with a test site unlike Hedge School and Drawing
// Board: its game is a list of words in a page's `data-moves`, and its page code finds it, says why it finds none, or
// names another address that has the moves. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BOOKMARK_VERSION, bookmarkletHref, bookmarkletScript } from "./bookmarklet.ts";
import type { Tool } from "./importHash.ts";
import { pageCodeText, type Found } from "./pageCode.ts";
import { userscriptHeader, userscriptSource, type UserscriptSite } from "./userscript.ts";

const ORIGIN = "https://words.example";

/** The test site's game, as its page holds it: the moves, an id, and whether the page lacks them. */
type WordGame = { id: string; moves: string[]; partial?: boolean };

function findWords(): WordGame | null {
  const el = document.querySelector("[data-moves]") as (Element & { game?: WordGame }) | null;
  return el && el.game ? el.game : null;
}
function wordsRecord(g: WordGame): string {
  if (!g.moves.length) throw new Error("this game has no words yet");
  return g.moves.join(" ");
}
/** The functions that `read` reaches: each self-contained. */
const PAGE = { findWords, wordsRecord };
function read(page: typeof PAGE, tool: Tool, click: string, origin: string): Found {
  const game = page.findWords();
  if (!game) return { say: `Words: no game here. Click ${click} on a game. The tools are on ${origin}/tools.` };
  if (game.partial) return { say: `Words (${tool}): the page reloads.`, reload: { url: location.href + "?full", id: game.id } };
  return { id: game.id, record: () => page.wordsRecord(game), at: String(game.moves.length) };
}
const CODE = { read, ...PAGE };

/** Runs the bookmarklet's code on a page with `game`: what it alerts, the tab that it opens, and the address that it
 *  loads in its own tab. `opens` says whether the browser lets the click open a tab. */
function click(game: WordGame | null, opens = true) {
  const done: { alerts: string[]; opened: string[]; loaded: string[] } = { alerts: [], opened: [], loaded: [] };
  Object.assign(globalThis, {
    document: {
      currentScript: { src: `${ORIGIN}/bookmarklet.js?bookmark=${BOOKMARK_VERSION}` },
      querySelector: (selector: string) => (selector === "[data-moves]" && game ? { game } : null),
    },
    location: { hostname: "play.example", href: "https://play.example/g/7", assign: (url: string) => done.loaded.push(url) },
    alert: (text: string) => done.alerts.push(text),
    window: { open: (url: string) => { done.opened.push(url); return opens ? {} : null; } },
  });
  new Function(bookmarkletScript({ name: "Words", toolName: "Words", page: CODE }))();
  return done;
}

test("a page code as text: an object of the same functions, by name", () => {
  const code = new Function(`return ${pageCodeText(CODE)};`)() as typeof CODE;
  assert.deepEqual(Object.keys(code), ["read", "findWords", "wordsRecord"]);
  assert.equal(code.wordsRecord({ id: "1", moves: ["ab", "cd"] }), "ab cd");
});

test("the bookmarklet opens the import page with the tool, its version, the site, the position and the record", () => {
  const { alerts, opened, loaded } = click({ id: "7", moves: ["ab", "cd", "ef"] });
  assert.deepEqual([alerts, loaded], [[], []]);
  const sent = new URLSearchParams(new URL(opened[0]).hash.slice(1));
  assert.ok(opened[0].startsWith(`${ORIGIN}/import#`));
  assert.deepEqual(Object.fromEntries(sent), { tool: "bookmarklet", v: String(BOOKMARK_VERSION), site: "play.example", at: "3", record: "ab cd ef" });
  // When the browser refuses the tab, this tab goes to the import page.
  assert.deepEqual(click({ id: "7", moves: ["ab"] }, false).loaded, [opened[0].replace("at=3&record=ab+cd+ef", "at=1&record=ab")]);
});

test("the bookmarklet says what the page code says, loads the address that it names, and says why a record fails", () => {
  const none = click(null);
  assert.deepEqual([none.alerts, none.opened], [[`Words: no game here. Click the Words bookmark on a game. The tools are on ${ORIGIN}/tools.`], []]);
  const partial = click({ id: "7", moves: [], partial: true });
  assert.deepEqual([partial.alerts, partial.loaded, partial.opened], [["Words (bookmarklet): the page reloads."], ["https://play.example/g/7?full"], []]);
  const empty = click({ id: "7", moves: [] });
  assert.deepEqual([empty.alerts, empty.opened], [["Words: this game has no words yet"], []]);
});

test("the bookmark is a loader of the site's script, with its version and the site's name", () => {
  const loader = decodeURIComponent(bookmarkletHref(ORIGIN, "Words").slice("javascript:".length));
  assert.doesNotThrow(() => new Function(loader));
  assert.ok(loader.includes(`${JSON.stringify(ORIGIN)}, ${BOOKMARK_VERSION}, "Words"`));
});

test("the userscript's header and file: the site's names, pages and files, and code that parses", () => {
  const site: UserscriptSite<typeof CODE> = {
    name: "Words", toolName: "Open in Words", id: "words-site",
    icon: size => `<svg width="${size}" height="${size}"></svg>`, places: { "play.example": { css: "display: block", into: ".bar" } },
    description: "Opens the game in Words.", author: "Someone", homepage: "https://someone.example",
    matches: ["https://play.example/g/*", "https://other.example/g/*"], page: CODE,
  };
  const text = userscriptSource(site, ORIGIN, "2026.10.27.1200", "abc");
  const meta = (key: string) => [...text.matchAll(new RegExp(`^// @${key} +(.*)$`, "gm"))].map(m => m[1]);
  assert.deepEqual([meta("name"), meta("namespace"), meta("version")], [["Open in Words"], [`${ORIGIN}/`], ["2026.10.27.1200"]]);
  assert.deepEqual(meta("match"), site.matches);
  assert.deepEqual([meta("updateURL"), meta("downloadURL")], [[`${ORIGIN}/words-site.meta.js`], [`${ORIGIN}/words-site.user.js`]]);
  assert.equal(atob(meta("icon")[0].replace("data:image/svg+xml;base64,", "")), site.icon(64));
  assert.ok(text.startsWith(userscriptHeader(site, ORIGIN, "2026.10.27.1200")));
  assert.doesNotThrow(() => new Function(text));
  for (const part of ['"code":"abc"', '"id":"words-site"', '"click":"the Words button"', '"open":"Open this game in Words"',
                      '"into":".bar"', site.icon(44).replaceAll('"', '\\"')])
    assert.ok(text.includes(part), part);
});
