// Checks Cyanotype's tools (tools.ts): the userscript's header and the bookmark's loader, that the code they carry
// as text parses, and what the bookmarklet's code does on a strategyjam.org game page of Blueprints that this test
// makes: the import page's hash that it sends, as the import page reads it (@abstractclass/import's importHash.ts),
// and its messages. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import data from "../board/fixtures.json" with { type: "json" };
import { holdsGame, readImportHash, staleTool } from "@abstractclass/import/importHash.ts";
import { LOGO_SMALL, svgElement } from "#lib/brand/logo.ts";
import { parseRecord } from "./record.ts";
import { TOOL_NAME, bookmarkletHref, bookmarkletScript, userscriptHeader, userscriptSource } from "./tools.ts";

const ORIGIN = "https://board.example";
const START = data.fixtures.find(f => f.name === "The start")!.position;
const MOVES = data.fixtures.find(f => f.name === "A middle game")!.moves;

/** The values of the userscript's header lines `// @<key>`. */
const meta = (text: string, key: string) => [...text.matchAll(new RegExp(`^// @${key} +(.*)$`, "gm"))].map(m => m[1]);

test("the userscript's header names the script, its pages, its rights and its files", () => {
  const text = userscriptSource(ORIGIN, "2026.10.27.1200", "abc");
  assert.deepEqual(meta(text, "name"), [TOOL_NAME]);
  assert.deepEqual(meta(text, "match"), ["https://strategyjam.org/blueprints/game/*"]); // Blueprints' game pages alone
  assert.deepEqual(meta(text, "sandbox"), ["raw"]);
  assert.deepEqual(meta(text, "grant").sort(), ["GM_openInTab", "GM_registerMenuCommand"]);
  assert.deepEqual(meta(text, "updateURL"), [`${ORIGIN}/cyanotype.meta.js`]);
  assert.deepEqual(meta(text, "downloadURL"), [`${ORIGIN}/cyanotype.user.js`]);
  assert.match(meta(text, "icon")[0], /^data:image\/svg\+xml;base64,/);
  assert.ok(text.startsWith(userscriptHeader(ORIGIN, "2026.10.27.1200")));
});

test("the button and Tampermonkey's lists show the logo's simple drawing (design 33, \"The logo\")", () => {
  const text = userscriptSource(ORIGIN, "1", "abc");
  assert.equal(atob(meta(text, "icon")[0].replace("data:image/svg+xml;base64,", "")), svgElement(LOGO_SMALL, 64));
  assert.ok(text.includes(JSON.stringify(svgElement(LOGO_SMALL, 44)).slice(1, -1)), "the button's picture");
});

test("the code that the userscript and the bookmarklet carry parses, with the site's address and name in it", () => {
  const script = userscriptSource(ORIGIN, "1", "abc");
  assert.doesNotThrow(() => new Function(script));
  assert.ok(script.includes(JSON.stringify(ORIGIN)) && script.includes("Open this game in Cyanotype"));
  const href = bookmarkletHref(ORIGIN);
  assert.ok(href.startsWith("javascript:"));
  const loader = decodeURIComponent(href.slice("javascript:".length));
  assert.doesNotThrow(() => new Function(loader));
  assert.ok(loader.includes(JSON.stringify(ORIGIN)) && loader.includes("/bookmarklet.js?bookmark=") && loader.includes('"Cyanotype"'));
  assert.doesNotThrow(() => new Function(bookmarkletScript()));
});

/** Runs the bookmarklet's code on a strategyjam.org page whose stage holds `props`, with the replay slider at
 *  `slider`: what it alerts, and the address that it opens. */
function click(props: object | null, slider?: string) {
  const done: { alerts: string[]; opened: string[] } = { alerts: [], opened: [] };
  const fiber = props && { return: { return: null, alternate: null, memoizedProps: props }, alternate: null, memoizedProps: {} };
  Object.assign(globalThis, {
    document: {
      currentScript: { src: `${ORIGIN}/bookmarklet.js?bookmark=1` },
      querySelector: (selector: string) => (selector === ".stage" ? fiber && { "__reactFiber$z": fiber }
        : selector === "input.replay-slider" && slider !== undefined ? { value: slider } : null),
    },
    location: { hostname: "strategyjam.org", origin: "https://strategyjam.org", pathname: "/blueprints/game/k3x9q" },
    alert: (text: string) => done.alerts.push(text),
    window: { open: (url: string) => { done.opened.push(url); return {}; } },
  });
  new Function(bookmarkletScript())();
  return done;
}
const rules = { id: "blueprints", version: 3, play: (s: { ply: number }) => ({ ply: s.ply + 1 }),
                observe: () => ({ scores: [0, 0], result: null }) };
const state = { seats: ["ann", "bob"], initial: START, history: MOVES, view: null, clock: { initialMs: 300000, incrementMs: 3000 } };

test("the import page's hash: the tool, its version, the site, the position on the page and the record", () => {
  const { alerts, opened } = click({ game: { rules }, state, status: "live" }, "5");
  assert.deepEqual(alerts, []);
  assert.equal(opened.length, 1);
  assert.ok(opened[0].startsWith(`${ORIGIN}/import#`));
  const hash = new URL(opened[0]).hash;
  assert.equal(holdsGame(hash), true); // the import page takes it, and does not go to the tools
  const sent = readImportHash(hash.slice(1));
  assert.deepEqual([sent.tool, sent.version, sent.site, sent.at, sent.link], ["bookmarklet", "1", "strategyjam.org", 5, false]);
  assert.equal(staleTool(sent, { bookmarklet: "1", userscript: "abc" }), null);
  assert.equal(staleTool(sent, { bookmarklet: "2", userscript: "abc" }), "bookmarklet"); // after a new loader
  const r = parseRecord(sent.record);
  assert.deepEqual(r.moves, MOVES);
  assert.deepEqual([r.tags.Site, r.tags.Blue, r.tags.Red, r.result], ["https://strategyjam.org/blueprints/game/k3x9q", "ann", "bob", "*"]);
  // A page with no slider sends no position.
  assert.equal(readImportHash(new URL(click({ game: { rules }, state }).opened[0]).hash.slice(1)).at, null);
});

test("no game, or a game that the record refuses: the bookmarklet says why, and opens nothing", () => {
  const none = click(null);
  assert.deepEqual(none.opened, []);
  assert.match(none.alerts[0], /^Cyanotype: this page shows no game that Cyanotype can read\./);
  assert.ok(none.alerts[0].includes(`click the ${TOOL_NAME} bookmark again`) && none.alerts[0].includes(`${ORIGIN}/tools`));
  const other = click({ game: { rules }, state: { ...state, initial: { ...START, cells: {} } } });
  assert.deepEqual(other.opened, []);
  assert.match(other.alerts[0], /^Cyanotype: this game does not start from the standard start/);
  const login = click({ game: { rules }, state: null, status: "login" });
  assert.match(login.alerts[0], /log in/);
});
