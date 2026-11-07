// Checks the gate on Edge (edge.mjs) and that each script that can start Edge goes through it, with no browser started:
// each script runs with Edge in its browser list and no HS_EDGE, and stops at the gate. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { browserList, checkBrowser, checkLaunch, edgeProgram, hasWebGpuFlag, withEdge } from "./edge.mjs";
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

// The launch check on WebGPU flags: Playwright's chrome-headless-shell refuses every WebGPU device on this machine.
const WEBGPU = ["--enable-unsafe-webgpu", "--use-angle=d3d11", "--enable-features=Vulkan"];
const REASON = /chrome-headless-shell.*dxil\.dll.*Faults with the WebGPU flags/s;

test("a WebGPU flag is --enable-unsafe-webgpu, or --enable-features with WebGPU", () => {
  assert.equal(hasWebGpuFlag(WEBGPU), true);
  assert.equal(hasWebGpuFlag(["--enable-features=Vulkan,WebGPU"]), true);
  assert.equal(hasWebGpuFlag(["--use-webgpu-power-preference=force-high-performance"]), false);
  assert.equal(hasWebGpuFlag(["--disable-gpu", "--enable-features=Vulkan"]), false);
  assert.equal(hasWebGpuFlag(undefined), false);
});

test("a WebGPU launch with no channel, or a channel other than chromium, throws with the cause and the note", () => {
  assert.throws(() => checkLaunch({ args: WEBGPU }, NONE), REASON);
  assert.throws(() => checkLaunch({ args: ["--enable-unsafe-webgpu"], headless: false }, NONE), REASON);
  assert.throws(() => checkLaunch({ channel: "msedge", args: WEBGPU }, ASKED), REASON);
});

test("a WebGPU launch in the channel chromium passes", () => {
  assert.doesNotThrow(() => checkLaunch({ channel: "chromium", args: WEBGPU }, NONE));
});

test("a launch with no WebGPU flag passes as before, with or without a channel", () => {
  assert.doesNotThrow(() => checkLaunch({}, NONE));
  assert.doesNotThrow(() => checkLaunch({ args: ["--disable-gpu", "--disable-d3d11"] }, NONE));
  assert.doesNotThrow(() => checkLaunch({ channel: "msedge" }, ASKED));
});

test("the launch check keeps the gate on Edge and on unknown browsers", () => {
  assert.throws(() => checkLaunch({ channel: "msedge" }, NONE), /HS_EDGE=1/);
  assert.throws(() => checkLaunch({ channel: "firefox" }, ASKED), /firefox/);
});

test("the shell's control runs of the GPU diagnosis opt out, and only of the WebGPU rule", () => {
  assert.doesNotThrow(() => checkLaunch({ args: WEBGPU }, NONE, { reproducesFault: true }));
  assert.throws(() => checkLaunch({ channel: "msedge", args: WEBGPU }, NONE, { reproducesFault: true }), /HS_EDGE=1/);
});

// The opt-out stays with the GPU diagnosis: a launch that sets it starts the shell with WebGPU flags.
test("no script but the GPU diagnosis sets reproducesFault", () => {
  const app = fileURLToPath(new URL("..", import.meta.url));
  const setters = ["scripts", "tests", "../cyanotype/scripts"].flatMap(dir =>
    readdirSync(join(app, dir), { recursive: true }).map(f => join(dir, f).replaceAll("\\", "/"))
      .filter(f => /\.(m?js|ts)$/.test(f) && readFileSync(join(app, f), "utf8").includes("reproducesFault")));
  assert.deepEqual(setters.sort(), ["scripts/cyanotype-gpu-diagnose.mjs", "scripts/edge.mjs", "scripts/edge.test.mjs"]);
});

// The program that does not exist makes Playwright fail before it starts a browser, if a check in launch fails.
test("launch refuses a WebGPU flag outside the channel chromium, before it starts a browser", () => {
  assert.throws(() => launch({ args: WEBGPU, executablePath: process.env.EDGE }), REASON);
});

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
