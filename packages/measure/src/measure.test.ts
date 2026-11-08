// The engine measure's plan and its results block (measure.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  browserOf, estimateSeconds, GPU_MEASURE, poolName, poolSizes, resultsText, reviewMinutes, spreadOrder,
  type MeasureResults,
} from "./measure.ts";

test("the pool sizes go from 1 to the device's cores", () => {
  assert.deepEqual(poolSizes(4), [1, 2, 3, 4]);
  assert.deepEqual(poolSizes(0), [1]);
});

test("the positions' order spreads each first part over the whole game", () => {
  const order = spreadOrder(120);
  assert.deepEqual(order.slice(0, 3), [60, 30, 90]);
  assert.equal(order.length, 119);
  assert.deepEqual([...order].sort((a, b) => a - b), Array.from({ length: 119 }, (_, k) => k + 1)); // each once, the start not
  assert.deepEqual(spreadOrder(5), [2, 1, 3, 4]);
});

test("the estimate counts each pool size, and the GPU part where the browser has WebGPU", () => {
  const four = estimateSeconds(4, 20, 512, false);
  assert.equal(estimateSeconds(4, 20, 512, true) - four, 90);
  assert.ok(Math.abs(four - (10 + 4 * (3 + 1.25 + 30 + 20))) < 1e-9);
  assert.ok(four < 10 * 60, "a phone of 4 cores takes at most 10 minutes");
  assert.equal(estimateSeconds(4, 20, 512, false, 5) - four, 4 * (5 - 30));
});

test("a review's minutes: the sweep and the label stage of every position", () => {
  assert.equal(reviewMinutes(120, 512, 136), (120 * 544) / 136 / 60);
});

const DEVICE: MeasureResults["device"] = {
  cores: 2, memoryGB: 8, power: "mains", browser: "Google Chrome 154.0.7680.12", platform: "Android 15 (Pixel 8)",
  userAgent: "Mozilla/5.0 (Linux; Android 10; K) Chrome/154.0.0.0 Mobile Safari/537.36",
  webgpu: { vendor: "qualcomm", architecture: "adreno-7xx", device: "", description: "", fallback: false }, jspi: true,
};

const RESULTS: MeasureResults = {
  at: "2026-11-08T12:34:56.000Z",
  build: { site: "Hedge School", commit: "a2f5be8", module: "engine-d6786eba", gpuModule: "engine-d6786eba-gpu",
           build: "d6786eba", protocol: "0.6.1", search: "85f1792", network: "b10c128-s89066368-d17827487",
           networkName: "HedgeFund 0.2 Lite" },
  device: DEVICE, game: "Enclosure, the sample game (v256 against v512, 120 positions)", positions: 120, visits: 512,
  review: "Lite", defaultWorkers: 1, phaseSeconds: 30,
  pools: [
    { workers: 1, rates: [31.25], searches: 2, visits: 1024, readyMs: 812, memoryMB: 91.2 },
    { workers: 2, rates: [28.5, 27.5], searches: 4, visits: 2048, readyMs: 1500, memoryMB: 183.7 },
  ],
  searched: [60, 30], gpu: { state: "done", gpu: 120.4, cpu: 30.1, cpuWorkers: 1, startMs: 4200, engineMB: 14 },
  memory: { pageMB: null, heapMB: 34.6 }, download: { cpuMB: "7.9", gpuMB: "16.5", transferredMB: 7.91 },
  stops: [], failures: [], totalMs: 3.3 * 60_000,
};

test("the results block names the build, the device and every measure with its unit", () => {
  const text = resultsText(RESULTS);
  for (const line of [
    "Engine measure, Hedge School, 2026-11-08 12:34 UTC",
    "- Site commit a2f5be8. Engine module engine-d6786eba (build d6786eba, protocol 0.6.1, search 85f1792).",
    "- GPU module: engine-d6786eba-gpu. Network: HedgeFund 0.2 Lite (b10c128-s89066368-d17827487).",
    "- Logical cores: 2. Memory: at least 8 GB. Power: on mains power.",
    "- Browser: Google Chrome 154.0.7680.12, on Android 15 (Pixel 8).",
    "- WebGPU adapter: qualcomm, adreno-7xx. JSPI: present.",
    `- User agent: ${DEVICE.userAgent}`,
    "- Positions: Enclosure, the sample game (v256 against v512, 120 positions). Searched: after 60, 30 moves.",
    "- The default pool on this device: 1 worker.",
    "| 1 | 31.3 | 31.3 | 2 | 34.8 min | 0.8 s | 91 MB |",
    "| 2 | 56.0 | 28.0 | 4 | 19.4 min | 1.5 s | 184 MB |",
    "- The GPU worker (16 searches): 120 evaluations a second.",
    "- One CPU worker, beside it: 30.1 visits a second (1 CPU worker, the default pool).",
    "- The ratio: 4.0.",
    "- The GPU worker's start: 4.2 s. Its 16 engines' WebAssembly memory: 224 MB.",
    "- At the end of the largest pool's measure: the whole page not given by this browser (it needs a cross-origin " +
      "isolated page), the page's JavaScript heap 35 MB.",
    "- Download, by the manifest: the CPU workers' files 7.9 MB, the GPU's 16.5 MB more. Transferred for the page's " +
      "own fetches of the engine's files: 7.9 MB (0 for a file that the browser had kept).",
    "- 3.3 minutes from Start to the end. No measure stopped.",
  ]) assert.ok(text.split("\n").includes(line), `the block lacks the line: ${line}\n\n${text}`);
  assert.doesNotMatch(text, /\n\n\n/);
});

test("the block says which measures did not run, stopped or failed", () => {
  const text = resultsText({
    ...RESULTS, pools: [RESULTS.pools[0], null, null], gpu: { state: "none", reason: "WebGPU gives no adapter (no GPU)" },
    stops: [{ measure: poolName(2), at: "2026-11-08T12:31:02.000Z" }],
    failures: [{ measure: poolName(3), message: "the engine worker ended" }],
    device: { ...DEVICE, cores: 3, memoryGB: null, power: null, webgpu: "no adapter", jspi: false, platform: "" },
  });
  for (const line of [
    "| 2 | stopped: the tab was hidden | | | | | |",
    "| 3 | failed: the engine worker ended | | | | | |",
    "- Not run: WebGPU gives no adapter (no GPU).",
    "- Logical cores: 3. Memory: not given. Power: not given.",
    "- WebGPU adapter: no adapter. JSPI: absent.",
    "- 3.3 minutes from Start to the end. Stopped because the tab was hidden: 2 workers (12:31:02 UTC).",
  ]) assert.ok(text.split("\n").includes(line), `the block lacks the line: ${line}\n\n${text}`);
  assert.match(resultsText({ ...RESULTS, gpu: null, stops: [{ measure: GPU_MEASURE, at: RESULTS.at }] }),
               /\n- Stopped: the tab was hidden\.\n/);
  assert.match(resultsText({ ...RESULTS, build: null }), /\n- No engine worker started\.\n\nDevice\n/);
});

test("a browser's name and version from its user agent", () => {
  assert.equal(browserOf("Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) " +
                         "Version/18.1 Mobile/15E148 Safari/604.1"), "Safari 18.1");
  assert.equal(browserOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0"), "Firefox 140.0");
  assert.equal(browserOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
                         "Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0"), "Edge 154.0.0.0");
  assert.equal(browserOf(DEVICE.userAgent), "Chrome 154.0.0.0");
  assert.equal(browserOf("curl/8"), "unknown");
});
