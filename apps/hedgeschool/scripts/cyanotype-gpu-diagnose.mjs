// A diagnosis of the GPU worker's start on Cyanotype's preview (abscls-8tl1.64: "The GPU did not start: 9943656"). A
// GPU-path run: only through `scripts/machine run --gpu`, after the coordinators' yes. Not a check: it prints.
//
//   CYANOTYPE_BASE_URL=http://127.0.0.1:4187 node scripts/cyanotype-gpu-diagnose.mjs [--first] [--cpu]
//
// The first diagnosis (--first) found the cause in Playwright's chrome-headless-shell, the browser of a headless
// chromium.launch: WebGPU gives the RTX 5080's adapter, but Dawn's D3D12 device fails ("DynamicLib.Open: dxil.dll
// Windows Error: 87", at EnsureDXCLibraries), since the shell ships no dxil.dll or dxcompiler.dll. ONNX Runtime then
// logs "WebGPU device lost (4): Device creation failed." and throws a C++ exception, which reaches JavaScript as its
// pointer. Its three launches of the shell, one after the other:
// 1. With docs/working-notes.md's WebGPU flags (the check's): the control, which failed.
// 2. The same flags and --use-webgpu-power-preference=force-high-performance.
// 3. The flags of the engine repository's run in Chrome (games/enclosure/webgpu/serve.mjs, launchChrome):
//    --enable-unsafe-webgpu --use-webgpu-power-preference=force-high-performance, no ANGLE or Vulkan flag.
// The second diagnosis (the default) tries the browsers that ship the shader compiler, each launch whatever the
// others give:
// 1. The headless shell with the note's flags: the control, which fails.
// 2. Playwright's full Chromium (channel "chromium", the new headless mode), with the note's flags. It then opens the
//    review with the GPU On and prints the engine settings' GPU line once it settles.
// 3. Playwright's full Chromium, with the engine repository's flags.
// 4. The installed Google Chrome (channel "chrome"), headless, with the engine repository's flags, in a new temporary
//    profile folder that the run removes after it: never the owner's profile.
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
// --cpu: a dry run of the script itself, the same launches with the layout test's flags (no WebGPU), which starts no
// GPU code.
import { chromium } from "@playwright/test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import config from "../playwright.config.ts";
import { ENGINE_KEY } from "../../cyanotype/src/lib/site.ts";
import { CYANOTYPE, LITE, LIVE_TURNS, testRecord } from "../tests/cyanotype-review.ts";

if (!CYANOTYPE) throw new Error("CYANOTYPE_BASE_URL gives no Cyanotype preview");
const NOTE = ["--enable-unsafe-webgpu", "--use-angle=d3d11", "--enable-features=Vulkan"];
const ENGINES = ["--enable-unsafe-webgpu", "--use-webgpu-power-preference=force-high-performance"];
const launchOptions = config.projects.find(p => p.name === "chromium").use.launchOptions;
/** The launches: a label, the browser (channel: none for the headless shell), the flags, and whether the review follows. */
const FIRST = [{ label: "shell, the note's flags", args: NOTE },
               { label: "shell, force-high-performance", args: [...NOTE, "--use-webgpu-power-preference=force-high-performance"], review: true },
               { label: "shell, the engine repository's flags", args: ENGINES }];
const SECOND = [{ label: "shell, the note's flags (control)", args: NOTE },
                { label: "Chromium, the note's flags", channel: "chromium", args: NOTE, review: true },
                { label: "Chromium, the engine repository's flags", channel: "chromium", args: ENGINES },
                { label: "Chrome, the engine repository's flags", channel: "chrome", args: ENGINES }];
const cpu = process.argv.includes("--cpu");
const RUNS = (process.argv.includes("--first") ? FIRST : SECOND)
  .map(r => cpu ? { ...r, label: `${r.label} (off the GPU)`, args: launchOptions.args } : r);
const ORT = readFileSync(new URL("../../../node_modules/onnxruntime-web/dist/ort.webgpu.bundle.min.mjs", import.meta.url));
const PROBE_WAIT = 180_000;

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
  const pieces = await Promise.all((a.parts ?? [a.url]).map(async u => new Uint8Array(await (await fetch(u)).arrayBuffer())));
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
  const options = { ...launchOptions, headless: true, args, ...(channel ? { channel } : {}) };
  // The installed Chrome only in a new temporary profile folder, removed after the launch
  const profile = channel === "chrome" ? mkdtempSync(join(tmpdir(), "cyanotype-gpu-diagnose-")) : null;
  let browser = null, context = null;
  try {
    if (profile) {
      say(`temporary profile folder: ${profile}`);
      context = await chromium.launchPersistentContext(profile, options);
    } else {
      browser = await chromium.launch(options);
      context = await browser.newContext();
    }
    const page = context.pages()[0] ?? await context.newPage();
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
    await page.goto(new URL("/about", CYANOTYPE).href);
    const done = await page.evaluate(([m, wait]) => new Promise(resolve => {
      const w = new Worker("/__diag/probe.mjs", { type: "module" });
      const timer = setTimeout(() => resolve("PROBE-TIMEOUT"), wait);
      w.onmessage = ({ data }) => {
        if (data.log) window.diagLog(data.log);
        if (data.done) { clearTimeout(timer); w.terminate(); resolve(data.done); }
      };
      w.onerror = e => window.diagLog(`probe worker error: ${e.message}`);
      w.postMessage(m);
    }), [manifest, PROBE_WAIT]);
    say(done);

    if (review) {
      // The site's own start: the review with the GPU On, until the engine settings' GPU line settles
      await page.evaluate(([key, engine]) => localStorage.setItem(key, JSON.stringify(engine)),
                          [ENGINE_KEY, { on: true, ...LITE, gpu: "on" }]);
      await page.goto(new URL(`/review#record=${encodeURIComponent(testRecord(LIVE_TURNS))}`, CYANOTYPE).href);
      await page.getByRole("button", { name: "Engine settings" }).click();
      const line = page.getByRole("region", { name: "Engine settings" }).locator("p[aria-live]");
      await line.filter({ hasText: /^(This browser cannot|In use|The GPU did not start)/ }).first()
        .waitFor({ timeout: 120_000 }).catch(() => {});
      say(`the review's GPU line: ${await line.first().innerText().catch(() => "(none)")}`);
    }
  } catch (e) {
    say(`LAUNCH-FAILED: ${e instanceof Error ? e.message.split("\n")[0] : e}`); // the next launch runs all the same
  } finally {
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
    if (profile) {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
      say(`temporary profile folder removed: ${profile}`);
    }
  }
}
console.log("DIAGNOSIS-DONE");
