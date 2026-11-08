// The engine measure (docs/decisions/engine.md, "The engine measure on a visitor's device"): one page that a person
// opens on a laptop or a phone, which measures the site's engine there and gives the numbers as one block of text.
// This module is the measure's plan and its results block, with no browser in it, so that the unit tests can run it:
// the pool sizes, the positions and their order, the run's time estimate, and the text that "Copy results" copies.
// The measures are those of design 15 (the GPU worker against a CPU worker) and of design 16's stages (the review's
// speed for each pool size). Their units are those of decisions/engine.md, "The GPU in the review": a CPU worker's
// visits a second, the GPU worker's network evaluations a second, and MB (10^6 bytes).
import { SWEEP_VISITS } from "@abstractclass/analysis/cache.ts";

/** How long each pool size searches: each worker starts a new search until this time has passed, and finishes it. */
export const PHASE_SECONDS = 30;
/** The GPU part's limit, from the GPU worker's start: its test (TEST_SECONDS of each kind) ends by then, or the part
 *  ends without it. On a slow GPU, one search can take minutes (decisions/engine.md, "The GPU in the review"). */
export const GPU_LIMIT_SECONDS = 150;
/** The estimate's allowances, in seconds: the page's start (the manifest and the first checks), a pool size's start
 *  (its workers' module and network), and the GPU part where the browser has WebGPU (its files, then its test). */
const START_SECONDS = 10, POOL_START_SECONDS = 3, GPU_SECONDS = 90;

/** The pool sizes that the measure searches with: each from 1 to the device's logical cores. */
export const poolSizes = (cores: number): number[] => Array.from({ length: Math.max(1, cores) }, (_, k) => k + 1);

/** The positions of a game of `n` positions in an order that spreads every first part of it over the whole game: the
 *  middle, then the quarters, then the eighths (van der Corput's sequence). A slow device that searches only the first
 *  few still searches early, middle and late positions. The first position, the start, is left out: the review searches
 *  it as any other, but it is the easiest. */
export function spreadOrder(n: number): number[] {
  const order: number[] = [], seen = new Set<number>();
  for (let k = 1; order.length < n - 1 && k < 1 << 20; k++) {
    let f = 0, scale = 0.5;
    for (let b = k; b > 0; b >>= 1, scale /= 2) if (b & 1) f += scale;
    const i = Math.floor(f * n);
    if (i >= 1 && i < n && !seen.has(i)) { seen.add(i); order.push(i); }
  }
  return order;
}

/** The run's time on a device of `cores` logical cores, in seconds, before it starts: each pool size's start, its
 *  warm-up search (SWEEP_VISITS), its `phaseSeconds` and its last search, which can take `searchSeconds` (the site's
 *  guess at one search of the review's depth, `visits`, on a phone's worker), and the GPU part where the browser has
 *  WebGPU and an adapter. */
export function estimateSeconds(cores: number, searchSeconds: number, visits: number, webgpu: boolean,
                                phaseSeconds = PHASE_SECONDS): number {
  const warm = (searchSeconds * SWEEP_VISITS) / visits;
  return START_SECONDS + poolSizes(cores).length * (POOL_START_SECONDS + warm + phaseSeconds + searchSeconds) +
    (webgpu ? GPU_SECONDS : 0);
}

/** The minutes of a review of a game of `positions` positions, at `perSecond` visits a second for the whole pool: the
 *  sweep (SWEEP_VISITS) and the label stage (`visits`) of each position (design 16). The Greats' confirmations and the
 *  position on screen add to it. */
export const reviewMinutes = (positions: number, visits: number, perSecond: number) =>
  (positions * (SWEEP_VISITS + visits)) / perSecond / 60;

/** The build that was measured: the site's commit, and the engine's release (the CPU module's id and what it reports),
 *  with the network. */
export interface BuildFacts {
  site: string; // the site's name
  commit: string; // the site's commit, its first 7 hex digits
  module: string; // the CPU module's id in the manifest: "engine-d6786eba"
  gpuModule: string | null; // the GPU module's id, where the build has one
  build: string; // the module's build, as it reports it (query_version)
  protocol: string;
  search: string; // the module's search (request 17)
  network: string; // the network's id
  networkName: string; // the network's name, as the release gives it
}

/** The GPU adapter that WebGPU gives the page, as far as the browser describes it. */
export interface AdapterFacts { vendor: string; architecture: string; device: string; description: string; fallback: boolean }

/** The device, as the browser gives it to a page. */
export interface DeviceFacts {
  cores: number; // navigator.hardwareConcurrency
  memoryGB: number | null; // navigator.deviceMemory: at least this much, rounded down by the browser, where it gives it
  power: "mains" | "battery" | null; // the Battery Status API, where the browser has it
  browser: string; // its name and version: "Chrome 154.0.7680.12"
  platform: string; // the system, where the browser gives it: "Android 15", "Windows"
  userAgent: string;
  webgpu: "none" | "no adapter" | AdapterFacts; // no navigator.gpu, no adapter, or the adapter
  jspi: boolean; // WebAssembly.Suspending and WebAssembly.promising, which the GPU module needs
}

/** One pool size's measure: its workers' searches of the review's label stage, each to its end. */
export interface PoolResult {
  workers: number;
  rates: number[]; // each worker's visits a second: its visits over its searches' time in the worker
  searches: number; // all the workers' searches
  visits: number; // all their visits
  readyMs: number; // from the pool's start until its last worker was ready (its module, its network and the warm-up)
  memoryMB: number; // the workers' WebAssembly memory together, each at its largest
}

/** The GPU part: not run (the reason), run (its test), or ended without its test. */
export type GpuResult =
  | { state: "none"; reason: string }
  | { state: "done"; gpu: number; cpu: number; cpuWorkers: number; startMs: number; engineMB: number | null }
  | { state: "unfinished"; cpuWorkers: number; startMs: number }
  | { state: "failed"; message: string };

/** The tab's memory where the browser gives it to the page: the whole page's (performance.measureUserAgentSpecificMemory,
 *  only in a page that is cross-origin isolated), and the page's JavaScript heap (Chromium's performance.memory). */
export interface TabMemory { pageMB: number | null; heapMB: number | null }

/** A measure that the page stopped because the tab was hidden. */
export interface Stop { measure: string; at: string }
/** A measure that failed, and why. */
export interface Failure { measure: string; message: string }

export interface MeasureResults {
  at: string; // when the run ended, ISO 8601
  build: BuildFacts | null; // null before the first worker started
  device: DeviceFacts;
  game: string; // the game whose positions were searched: "Enclosure, the sample game (120 positions)"
  positions: number; // the game's positions
  visits: number; // the review's depth: its label stage's visits a position
  review: string; // the depth's name: "Lite"
  defaultWorkers: number; // the site's default pool on this device
  phaseSeconds: number;
  pools: (PoolResult | null)[]; // by pool size from 1: null where it was not measured
  searched: number[]; // the positions that the pools searched, by their moves played, in the order searched
  gpu: GpuResult | null; // null where the part did not run
  memory: TabMemory | null; // at the end of the largest pool's measure
  download: { cpuMB: string; gpuMB: string; transferredMB: number | null };
  stops: Stop[];
  failures: Failure[];
  totalMs: number; // the run's time, from Start to its end, its stops and runs again too
}

/** A rate with the digits that it needs: 404, 62.4, 9.85. */
export const rate = (x: number) => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** A pool's visits a second, all its workers together: the sum of each worker's rate. Each worker's last search can end
 *  after the others', so the visits over the pool's time would count the idle time of the workers that ended first. */
export const poolRate = (p: PoolResult) => sum(p.rates);

function adapterText(w: DeviceFacts["webgpu"]): string {
  if (w === "none") return "none (no navigator.gpu)";
  if (w === "no adapter") return "no adapter";
  const parts = [w.vendor, w.architecture, w.device, w.description].filter(Boolean).join(", ") || "not described";
  return `${parts}${w.fallback ? " (the software adapter)" : ""}`;
}

function gpuText(g: GpuResult | null, defaultWorkers: number): string[] {
  if (!g) return ["- Not run."];
  switch (g.state) {
    case "none": return [`- Not run: ${g.reason}.`];
    case "failed": return [`- The GPU worker did not start: ${g.message}`];
    case "unfinished":
      return [`- The GPU worker started in ${(g.startMs / 1000).toFixed(1)} s, with ${poolName(g.cpuWorkers).replace("worker", "CPU worker")}. The test ` +
        `did not end within ${GPU_LIMIT_SECONDS} s.`];
    case "done":
      return [
        `- The GPU worker (16 searches): ${rate(g.gpu)} evaluations a second.`,
        `- One CPU worker, beside it: ${rate(g.cpu)} visits a second (${poolName(g.cpuWorkers).replace("worker", "CPU worker")}, ` +
          `${g.cpuWorkers === defaultWorkers ? "the default pool" : "not the default pool"}).`,
        `- The ratio: ${(g.gpu / g.cpu).toPrecision(2)}.`,
        `- The GPU worker's start: ${(g.startMs / 1000).toFixed(1)} s.` +
          (g.engineMB !== null ? ` Its 16 engines' WebAssembly memory: ${(16 * g.engineMB).toFixed(0)} MB.` : ""),
      ];
  }
}

/** The results block that "Copy results" copies: plain text with every measure and the device's facts, for a chat. A
 *  measure that did not run says so. */
export function resultsText(r: MeasureResults): string {
  const b = r.build, d = r.device;
  const lines = [
    `Engine measure, ${b?.site ?? "?"}, ${r.at.slice(0, 16).replace("T", " ")} UTC`,
    "",
    "Build",
    b ? `- Site commit ${b.commit}. Engine module ${b.module} (build ${b.build}, protocol ${b.protocol}, search ${b.search}).`
      : "- No engine worker started.",
    b ? `- GPU module: ${b.gpuModule ?? "none in this build"}. Network: ${b.networkName} (${b.network}).` : "",
    "",
    "Device",
    `- Logical cores: ${d.cores}. Memory: ${d.memoryGB === null ? "not given" : `at least ${d.memoryGB} GB`}. ` +
      `Power: ${d.power === null ? "not given" : d.power === "mains" ? "on mains power" : "on battery"}.`,
    `- Browser: ${d.browser}${d.platform ? `, on ${d.platform}` : ""}.`,
    `- WebGPU adapter: ${adapterText(d.webgpu)}. JSPI: ${d.jspi ? "present" : "absent"}.`,
    `- User agent: ${d.userAgent}`,
    "",
    `The review's speed by pool size (abscls-eon)`,
    `- Work: the label stage of ${r.review} (${r.visits} visits a position), each search to its end, with the review's ` +
      `query. Each pool size searches for ${r.phaseSeconds} s, and each worker finishes its last search. Every worker ` +
      `searches the same positions, in the same order.`,
    `- Positions: ${r.game}. Searched: ${r.searched.length ? `after ${r.searched.join(", ")} moves` : "none"}.`,
    `- The default pool on this device: ${poolName(r.defaultWorkers)}.`,
    `- "A review": the sweep (${SWEEP_VISITS} visits) and the label stage of all ${r.positions} positions, at the ` +
      `pool's speed.`,
    "",
    "| Workers | Visits a second, all workers | Each worker | Searches | A review of the game | Start | Workers' memory |",
    "|---|---|---|---|---|---|---|",
    ...r.pools.map((p, k) => {
      const failed = r.failures.find(f => f.measure === poolName(k + 1));
      const stopped = r.stops.some(s => s.measure === poolName(k + 1));
      if (!p) return `| ${k + 1} | ${failed ? `failed: ${failed.message}` : stopped ? "stopped: the tab was hidden" : "not measured"} | | | | | |`;
      const all = poolRate(p);
      return `| ${p.workers} | ${rate(all)} | ${rate(all / p.workers)} | ${p.searches} | ` +
        `${reviewMinutes(r.positions, r.visits, all).toFixed(1)} min | ${(p.readyMs / 1000).toFixed(1)} s | ` +
        `${p.memoryMB.toFixed(0)} MB |`;
    }),
    "",
    "The GPU against a CPU worker (abscls-59x; the first-use test of design 15, 20 s of each kind on the review's work)",
    ...(r.failures.some(f => f.measure === GPU_MEASURE)
      ? [`- Failed: ${r.failures.find(f => f.measure === GPU_MEASURE)!.message}`]
      : r.stops.some(s => s.measure === GPU_MEASURE) && !r.gpu ? ["- Stopped: the tab was hidden."] : gpuText(r.gpu, r.defaultWorkers)),
    "",
    "Memory and downloads",
    r.memory
      ? `- At the end of the largest pool's measure: the whole page ${r.memory.pageMB === null ? "not given by this browser " +
        "(it needs a cross-origin isolated page)" : `${r.memory.pageMB.toFixed(0)} MB`}, the page's JavaScript heap ` +
        `${r.memory.heapMB === null ? "not given" : `${r.memory.heapMB.toFixed(0)} MB`}.`
      : "- Not measured.",
    `- Download, by the manifest: the CPU workers' files ${r.download.cpuMB} MB, the GPU's ${r.download.gpuMB} MB more. ` +
      `Transferred for the page's own fetches of the engine's files: ` +
      `${r.download.transferredMB === null ? "not given" : `${r.download.transferredMB.toFixed(1)} MB (0 for a file that ` +
        "the browser had kept)"}.`,
    "",
    "The run",
    `- ${(r.totalMs / 60_000).toFixed(1)} minutes from Start to the end.` +
      (r.stops.length ? ` Stopped because the tab was hidden: ${r.stops.map(s => `${s.measure} (${s.at.slice(11, 19)} UTC)`).join(", ")}.`
        : " No measure stopped."),
  ];
  return lines.filter((l, k) => l !== "" || lines[k - 1] !== "").join("\n");
}

/** A pool size's measure, by name: "1 worker", "4 workers". */
export const poolName = (workers: number) => `${workers} worker${workers === 1 ? "" : "s"}`;
/** The GPU part's measure, by name. */
export const GPU_MEASURE = "the GPU";

/** A browser's name and version from its user agent, where it gives no client hints (Safari, Firefox): the last of
 *  the browser's own tokens wins over the engines' that it also names (Chrome's "Safari/537.36"). */
export function browserOf(userAgent: string): string {
  const tests: [RegExp, string][] = [
    [/EdgA?\/([\d.]+)/, "Edge"], [/OPR\/([\d.]+)/, "Opera"], [/SamsungBrowser\/([\d.]+)/, "Samsung Internet"],
    [/CriOS\/([\d.]+)/, "Chrome (iOS)"], [/FxiOS\/([\d.]+)/, "Firefox (iOS)"], [/Firefox\/([\d.]+)/, "Firefox"],
    [/Chrome\/([\d.]+)/, "Chrome"], [/Version\/([\d.]+).*Safari\//, "Safari"],
  ];
  for (const [re, name] of tests) {
    const m = re.exec(userAgent);
    if (m) return `${name} ${m[1]}`;
  }
  return "unknown";
}
