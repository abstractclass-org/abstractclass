// Checks the gate on Edge (edge.mjs) and that each script that can start Edge goes through it, with no browser started:
// each script runs with Edge in its browser list and no HS_EDGE, and stops at the gate. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { browserList, checkBrowser, edgeProgram, withEdge } from "./edge.mjs";
import { launch, launchHideable } from "./measure/speed.mjs";

const NONE = {}, ASKED = { HS_EDGE: "1" };

// The environment of the tests below and of the scripts that they run: no HS_EDGE, and an EDGE that names no program,
// so that a script past a broken gate fails before Edge starts.
delete process.env.HS_EDGE;
process.env.EDGE = "no-such-folder/msedge.exe";

test("Edge comes only when the environment has HS_EDGE=1", () => {
  assert.equal(withEdge(NONE), false);
  assert.equal(withEdge({ HS_EDGE: "0" }), false);
  assert.equal(withEdge({ HS_EDGE: "true" }), false);
  assert.equal(withEdge(ASKED), true);
});

test("with no variable, the gate refuses Edge with a message that names the variable", () => {
  assert.throws(() => checkBrowser("msedge", NONE), /HS_EDGE=1/);
  assert.equal(checkBrowser("chromium", NONE), "chromium");
});

test("with HS_EDGE=1, the gate allows Edge", () => {
  assert.equal(checkBrowser("msedge", ASKED), "msedge");
});

test("the gate refuses a browser that the scripts do not know", () => {
  assert.throws(() => checkBrowser("firefox", ASKED), /firefox/);
});

test("with no browser list, the list is Chromium alone, with the variable too", () => {
  assert.deepEqual(browserList(undefined, NONE), ["chromium"]);
  assert.deepEqual(browserList(undefined, ASKED), ["chromium"]);
  assert.deepEqual(browserList("", NONE), ["chromium"]);
});

test("the gate refuses a list with Edge with no variable, and keeps it with the variable", () => {
  assert.throws(() => browserList("chromium,msedge", NONE), /HS_EDGE=1/);
  assert.deepEqual(browserList("chromium,msedge", ASKED), ["chromium", "msedge"]);
});

test("Edge's program comes only through the gate: EDGE, or Edge's usual place", () => {
  assert.throws(() => edgeProgram({ EDGE: "edge.exe" }), /HS_EDGE=1/);
  assert.equal(edgeProgram({ ...ASKED, EDGE: "edge.exe" }), "edge.exe");
  assert.match(edgeProgram(ASKED), /Microsoft\/Edge\/Application\/msedge\.exe$/);
});

// The program that does not exist makes Playwright fail before it starts a browser, if the gate in launch fails.
test("launch and launchHideable refuse Edge with no variable", async () => {
  assert.throws(() => launch({ channel: "msedge", executablePath: process.env.EDGE }), /HS_EDGE=1/);
  await assert.rejects(launchHideable({ channel: "msedge", port: 9 }), /HS_EDGE=1/);
});

// Each script, with Edge where its browser list goes (or none: favicon.mjs always runs Edge). The gate stops it before
// it starts a server or a browser.
const SCRIPTS = {
  "scripts/measure/review-hidden.mjs": ["build", "1", "front", "msedge"],
  "scripts/measure/worker-yield.mjs": ["msedge"],
  "scripts/favicon.mjs": [],
};
for (const [script, args] of Object.entries(SCRIPTS)) {
  test(`${script} refuses Edge with no variable`, () => {
    const run = spawnSync(process.execPath, [script, ...args], { encoding: "utf8", timeout: 30_000 });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /HS_EDGE=1/);
  });
}
