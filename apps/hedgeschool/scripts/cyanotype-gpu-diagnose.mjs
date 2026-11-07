// A diagnosis of the GPU worker's start on Cyanotype's preview, for a fault such as "The GPU did not start: 9943656"
// (docs/working-notes.md, "Faults with the WebGPU flags"). A GPU-path run: only through `scripts/machine run --gpu`,
// after the coordinators' yes. Not a check: it prints.
//
//   CYANOTYPE_BASE_URL=http://127.0.0.1:4187 node scripts/cyanotype-gpu-diagnose.mjs [--shell] [--cpu]
//
// In Playwright's chrome-headless-shell, the browser of a headless chromium.launch, WebGPU gives the RTX 5080's
// adapter, but Dawn's D3D12 device fails ("DynamicLib.Open: dxil.dll Windows Error: 87", at EnsureDXCLibraries). The
// shell ships no dxil.dll or dxcompiler.dll, and the full Chromium, which ships both, makes the device. ONNX Runtime
// then logs "WebGPU device lost (4): Device creation failed." and throws a C++ exception, which reaches JavaScript as
// its pointer.
// The default run tries both of Playwright's browsers, the shell first as the control, each launch whatever the others
// give:
// 1. The headless shell with the note's flags: the control, which fails.
// 2. Playwright's full Chromium (channel "chromium", the new headless mode), with the note's flags. It then opens the
//    review with the GPU On and prints the engine settings' GPU line once it settles.
// 3. Playwright's full Chromium, with the engine repository's flags.
// A launch with a channel goes through the repository's browser gate (scripts/edge.mjs). The installed Chrome is not
// one of the gate's browsers, and the run does not use it.
// --shell runs three launches of the shell instead, one after the other:
// 1. With docs/working-notes.md's WebGPU flags (the check's): the control.
// 2. The same flags and --use-webgpu-power-preference=force-high-performance. It then opens the review.
// 3. The flags of the engine repository's run in Chrome (games/enclosure/webgpu/serve.mjs, launchChrome):
//    --enable-unsafe-webgpu --use-webgpu-power-preference=force-high-performance, no ANGLE or Vulkan flag.
// Each launch prints its browser's product and revision (CDP Browser.getVersion). In every page, in the probe worker
// and in the site's GPU worker, a wrapper of GPUAdapter.prototype.requestDevice logs the descriptor that ONNX Runtime
// asks for (each required feature and limit beside the adapter's own), and the device's end: made, refused, lost or an
// uncaptured error, each with its own message.
// In each, a probe worker on the preview's origin first logs the adapters that WebGPU gives (default, high-performance,
// low-power: info, features, limits), then runs the GPU worker's start (packages/engine/src/gpuWorker.ts, init) step by
// step with the files that the preview serves, ONNX Runtime Web's own bundle (onnxruntime-web/webgpu) and its log at
// "verbose" with env.debug: createOrtEvaluator on WebGPU, createGpuEngines, loadModel, query_version, then 16 searches
// of 64 visits. Each step prints its time, or what it threw, with the type of the value. The page's and the workers'
// console messages print too, and the job's DEBUG=pw:browser prints the browser's own standard error.
// The whole run has a limit (LIMIT), under the job's --expect of 5 minutes: each wait ends at it at the latest, and a
// launch that would start after it does not run. A watchdog closes the browser and ends the run 30 s after the limit.
// --cpu: a dry run of the script itself, the same launches with the layout test's flags (no WebGPU), which starts no
// GPU code.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import config from "../playwright.config.ts";
import { checkBrowser } from "./edge.mjs";
import { ENGINE_KEY } from "../../cyanotype/src/lib/site.ts";
import { CYANOTYPE, LITE, LIVE_TURNS, testRecord } from "../tests/cyanotype-review.ts";

if (!CYANOTYPE) throw new Error("CYANOTYPE_BASE_URL gives no Cyanotype preview");
const NOTE = ["--enable-unsafe-webgpu", "--use-angle=d3d11", "--enable-features=Vulkan"]; // the working note's flags
const ENGINE_REPO = ["--enable-unsafe-webgpu", "--use-webgpu-power-preference=force-high-performance"];
const launchOptions = config.projects.find(p => p.name === "chromium").use.launchOptions;
/** The launches: a label, the browser (channel: none for the headless shell), the flags, and whether the review follows. */
const CONTROL = { label: "shell, the note's flags (control)", args: NOTE };
const SHELL_RUNS = [CONTROL,
                    { label: "shell, force-high-performance", args: [...NOTE, "--use-webgpu-power-preference=force-high-performance"], review: true },
                    { label: "shell, the engine repository's flags", args: ENGINE_REPO }];
const BROWSER_RUNS = [CONTROL,
                      { label: "Chromium, the note's flags", channel: "chromium", args: NOTE, review: true },
                      { label: "Chromium, the engine repository's flags", channel: "chromium", args: ENGINE_REPO }];
const cpu = process.argv.includes("--cpu");
const RUNS = (process.argv.includes("--shell") ? SHELL_RUNS : BROWSER_RUNS)
  .map(r => cpu ? { ...r, label: `${r.label} (off the GPU)`, args: launchOptions.args } : r);
const ORT = readFileSync(new URL("../../../node_modules/onnxruntime-web/dist/ort.webgpu.bundle.min.mjs", import.meta.url));
const PROBE_WAIT = 180_000;
/** The whole run's limit. The two diagnostic jobs on the GPU took 3 s and 28 s. */
const LIMIT = 4 * 60_000, deadline = Date.now() + LIMIT;
/** A wait of at most `ms`, and at most to the run's limit. */
const upTo = ms => Math.max(1, Math.min(ms, deadline - Date.now()));

/** The browser that runs now, for the watchdog. */
let current = null;
// The watchdog: a step that has no limit of its own ends here, 30 s after the run's limit. It closes the browser (at
// most 5 s) and ends the process.
setTimeout(async () => {
  console.log(`DIAGNOSIS-STOPPED: the run passed its limit of ${LIMIT / 60_000} minutes by 30 s`);
  await Promise.race([current?.close().catch(() => {}), new Promise(resolve => setTimeout(resolve, 5000))]);
  process.exit(1);
}, LIMIT + 30_000).unref();

/** Wraps GPUAdapter.prototype.requestDevice in a page or a worker: it logs the descriptor that the caller (ONNX
 *  Runtime) asks for, each required feature and limit beside the adapter's own, and the device's end: made, refused
 *  (the rejection's message), lost (the loss's message) or an uncaptured error. */
function wrapRequestDevice() {
  const Adapter = self.GPUAdapter;
  if (!Adapter || Adapter.prototype.diagWrapped) return;
  Adapter.prototype.diagWrapped = true;
  const request = Adapter.prototype.requestDevice;
  const say = (...a) => console.log("[requestDevice]", ...a);
  say(`the wrapper is in ${self.constructor.name} ${self.location?.pathname}`);
  Adapter.prototype.requestDevice = function (descriptor) {
    const limits = {};
    for (const k in this.limits) limits[k] = this.limits[k];
    const features = [...(descriptor?.requiredFeatures ?? [])];
    const asked = Object.entries(descriptor?.requiredLimits ?? {}).map(([k, v]) => [k, { asked: v, adapter: limits[k] }]);
    say(JSON.stringify({ label: descriptor?.label, requiredFeatures: features,
                         missingFeatures: features.filter(f => !this.features.has(f)), requiredLimits: Object.fromEntries(asked) }));
    say("the adapter's features:", [...this.features].sort().join(","));
    say("the adapter's limits:", JSON.stringify(limits));
    const made = request.call(this, descriptor);
    made.then(device => {
      say("device made");
      device.lost.then(info => say("device lost:", info.reason, info.message));
      device.addEventListener("uncapturederror", e => say("uncaptured error:", e.error?.message));
    }, e => say("refused:", e?.name, e?.message ?? String(e)));
    return made;
  };
}
const WRAP = `(${wrapRequestDevice})();\n`;

/** The probe worker: the adapters, then the GPU worker's start, step by step. */
const PROBE = WRAP + `
import * as ort from "/__diag/ort.mjs";
const log = (...a) => postMessage({ log: a.join(" ") });
self.addEventListener("error", e => log("worker error:", e.message));
self.addEventListener("unhandledrejection", e => log("worker unhandled rejection:", typeof e.reason, String(e.reason)));
async function adapter(label, options) {
  let a;
  try { a = await navigator.gpu?.requestAdapter(options); } catch (e) { log(label, "requestAdapter threw", String(e)); return; }
  if (!a) { log(label, "no adapter"); return; }
  const i = a.info ?? {};
  log(label, JSON.stringify({ vendor: i.vendor, architecture: i.architecture, device: i.device, description: i.description,
                              isFallbackAdapter: i.isFallbackAdapter, subgroupMinSize: i.subgroupMinSize }));
  log(label, "features:", [...a.features].sort().join(","));
  const limits = {};
  for (const k in a.limits) limits[k] = a.limits[k];
  log(label, "limits:", JSON.stringify(limits));
}
async function fetchArtifact(a) {
  const pieces = await Promise.all((a.parts ?? [a.url]).map(async u => {
    const r = await fetch(u);
    if (!r.ok) throw new Error(u + ": HTTP " + r.status);
    return new Uint8Array(await r.arrayBuffer());
  }));
  let bytes = new Uint8Array(await new Blob(pieces).arrayBuffer());
  if (a.encoding === "gzip" && bytes[0] === 0x1f && bytes[1] === 0x8b)
    bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
  return bytes;
}
async function step(name, f) {
  const t0 = performance.now();
  try {
    const v = await f();
    log(name + ": ok, " + Math.round(performance.now() - t0) + " ms");
    return v;
  } catch (e) {
    log(name + ": threw " + typeof e + " after " + Math.round(performance.now() - t0) + " ms: " + (e instanceof Error ? e.stack : String(e)));
    throw e;
  }
}
onmessage = async ({ data: manifest }) => {
  try {
    log("navigator.gpu:", String(!!navigator.gpu), "JSPI:", String(typeof WebAssembly.Suspending === "function"));
    await adapter("adapter, default:");
    await adapter("adapter, high-performance:", { powerPreference: "high-performance" });
    await adapter("adapter, low-power:", { powerPreference: "low-power" });
    const by = kind => manifest.artifacts.find(a => a.kind === kind);
    const model = by("model"), graph = manifest.artifacts.find(a => a.kind === "graph" && a.graphOf === model.id);
    const sizes = manifest.sizes ? { sizes: manifest.sizes } : {};
    ort.env.logLevel = "verbose";
    ort.env.debug = true;
    ort.env.wasm.wasmPaths = { mjs: new URL(by("ort-glue").url, location.origin).href };
    ort.env.wasm.wasmBinary = await fetchArtifact(by("ort-wasm"));
    ort.env.wasm.numThreads = 1;
    const lib = await import(by("gpu-library").url);
    log("gpuEngineSupport:", JSON.stringify(lib.gpuEngineSupport()), "sizes:", JSON.stringify(sizes));
    const graphBytes = await fetchArtifact(graph);
    const evaluator = await step("createOrtEvaluator (webgpu)", () => lib.createOrtEvaluator(ort, graphBytes, sizes));
    const used = ort.env.webgpu?.adapter;
    if (used?.info) log("ONNX Runtime's adapter:", JSON.stringify({ vendor: used.info.vendor, architecture: used.info.architecture,
                                                                    device: used.info.device, description: used.info.description }));
    const module = await WebAssembly.compile(await fetchArtifact(by("gpu-module")));
    const made = await step("createGpuEngines (16)", () => lib.createGpuEngines(module, evaluator, { searches: 16, log: l => log("module:", l) }));
    const loads = await step("loadModel", async () => made.loadModel(await fetchArtifact(model), { name: model.id }));
    log("load_model:", JSON.stringify(loads[0]).slice(0, 300));
    log("query_version:", await step("query_version", () => made.engines[0].call({ id: "v", action: "query_version" })));
    const replies = await step("16 searches of 64 visits", () => Promise.all(made.engines.map((e, k) =>
      e.call({ id: "s" + k, moves: [], maxVisits: 64 }))));
    const r = JSON.parse(replies[0]);
    log("search 0:", r.error ?? (r.moveInfos?.length + " moves, best " + r.moveInfos?.[0]?.move));
    log("stats:", JSON.stringify(made.stats()));
    postMessage({ done: "PROBE-OK" });
  } catch {
    postMessage({ done: "PROBE-FAILED" });
  }
};`;

const manifest = await (await fetch(new URL("/engine/manifest.json", CYANOTYPE))).json();
for (const { label, channel, args, review } of RUNS) {
  const say = line => console.log(`[${label}] ${line}`);
  if (Date.now() >= deadline) { say("not run: the run's limit has passed"); continue; }
  const options = { ...launchOptions, args, channel, timeout: upTo(60_000) }; // headless, Playwright's default
  let browser = null;
  try {
    if (channel) checkBrowser(channel);
    browser = current = await chromium.launch(options);
    const context = await browser.newContext();
    const page = await context.newPage();
    const version = await (await context.newCDPSession(page)).send("Browser.getVersion");
    say(`browser ${version.product}, revision ${version.revision}, channel ${channel ?? "none (chrome-headless-shell)"}, ` +
        `flags ${JSON.stringify(args)}`);
    page.on("console", m => say(`console ${m.type()}: ${m.text()}`));
    page.on("pageerror", e => say(`page error: ${e}`));
    await page.route("**/__diag/ort.mjs", r => r.fulfill({ body: ORT, contentType: "text/javascript" }));
    await page.route("**/__diag/probe.mjs", r => r.fulfill({ body: PROBE, contentType: "text/javascript" }));
    // The wrapper in every page (an init script) and in the site's own GPU worker (Playwright's init scripts do not
    // reach workers): its script, as the preview serves it, after the wrapper
    await context.addInitScript({ content: WRAP });
    await page.route("**/workers/gpuWorker-*.js", async r => {
      const response = await r.fetch();
      await r.fulfill({ response, body: WRAP + await response.text() });
    });
    await page.exposeFunction("diagLog", line => say(line));
    await page.goto(new URL("/about", CYANOTYPE).href, { timeout: upTo(30_000) });
    // A probe worker that does not load (an error before its first message) ends the wait at once
    const done = await page.evaluate(([m, wait]) => new Promise(resolve => {
      const w = new Worker("/__diag/probe.mjs", { type: "module" });
      const timer = setTimeout(() => resolve("PROBE-TIMEOUT"), wait);
      let heard = false;
      w.onmessage = ({ data }) => {
        heard = true;
        if (data.log) window.diagLog(data.log);
        if (data.done) { clearTimeout(timer); w.terminate(); resolve(data.done); }
      };
      w.onerror = e => {
        window.diagLog(`probe worker error: ${e.message}`);
        if (!heard) { clearTimeout(timer); resolve("PROBE-NOT-LOADED"); }
      };
      w.postMessage(m);
    }), [manifest, upTo(PROBE_WAIT)]);
    say(done);

    if (review) {
      // The site's own start: the review with the GPU On, until the engine settings' GPU line settles
      await page.evaluate(([key, engine]) => localStorage.setItem(key, JSON.stringify(engine)),
                          [ENGINE_KEY, { on: true, ...LITE, gpu: "on" }]);
      await page.goto(new URL(`/review#record=${encodeURIComponent(testRecord(LIVE_TURNS))}`, CYANOTYPE).href,
                      { timeout: upTo(30_000) });
      await page.getByRole("button", { name: "Engine settings" }).click({ timeout: upTo(30_000) });
      const line = page.getByRole("region", { name: "Engine settings" }).locator("p[aria-live]");
      await line.filter({ hasText: /^(This browser cannot|In use|The GPU did not start)/ }).first()
        .waitFor({ timeout: upTo(120_000) }).catch(() => {});
      say(`the review's GPU line: ${await line.first().innerText({ timeout: 1000 }).catch(() => "(none)")}`);
    }
  } catch (e) {
    say(`LAUNCH-FAILED: ${e instanceof Error ? e.message.split("\n")[0] : e}`); // the next launch runs all the same
  } finally {
    await browser?.close().catch(() => {});
    current = null;
  }
}
console.log("DIAGNOSIS-DONE");
