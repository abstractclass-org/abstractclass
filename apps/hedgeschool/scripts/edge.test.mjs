// Checks the gate on Edge (edge.mjs) and that each script that can start Edge goes through it, with no browser started:
// each script runs with Edge in its browser list and no HS_EDGE, and stops at the gate. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { browserList, checkBrowser, withEdge } from "./edge.mjs";

const NONE = {}, ASKED = { HS_EDGE: "1" };

test("Edge comes only when the environment has HS_EDGE=1", () => {
  assert.equal(withEdge(NONE), false);
  assert.equal(withEdge({ HS_EDGE: "0" }), false);
  assert.equal(withEdge({ HS_EDGE: "true" }), false);
  assert.equal(withEdge(ASKED), true);
});

test("with no variable, Edge is refused with a message that names the variable", () => {
  assert.throws(() => checkBrowser("msedge", NONE), /HS_EDGE=1/);
  assert.equal(checkBrowser("chromium", NONE), "chromium");
});

test("with HS_EDGE=1, Edge is allowed", () => {
  assert.equal(checkBrowser("msedge", ASKED), "msedge");
});

test("a browser that the scripts do not know is refused", () => {
  assert.throws(() => checkBrowser("firefox", ASKED), /firefox/);
});

test("with no browser list, the list is Chromium alone, with the variable too", () => {
  assert.deepEqual(browserList(undefined, NONE), ["chromium"]);
  assert.deepEqual(browserList(undefined, ASKED), ["chromium"]);
  assert.deepEqual(browserList("", NONE), ["chromium"]);
});

test("a list with Edge is refused with no variable, and kept with it", () => {
  assert.throws(() => browserList("chromium,msedge", NONE), /HS_EDGE=1/);
  assert.deepEqual(browserList("chromium,msedge", ASKED), ["chromium", "msedge"]);
});

// Each script, with Edge where its browser list goes (or none: favicon.mjs always runs Edge), in an environment
// without HS_EDGE. The gate stops it before it starts a server or a browser.
const SCRIPTS = {
  "scripts/measure/review-hidden.mjs": ["build", "1", "front", "msedge"],
  "scripts/measure/worker-yield.mjs": ["msedge"],
  "scripts/favicon.mjs": [],
};
for (const [script, args] of Object.entries(SCRIPTS)) {
  test(`${script} refuses Edge with no variable`, () => {
    const env = { ...process.env };
    delete env.HS_EDGE;
    delete env.EDGE;
    const run = spawnSync(process.execPath, [script, ...args], { env, encoding: "utf8", timeout: 30_000 });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /HS_EDGE=1/);
  });
}
