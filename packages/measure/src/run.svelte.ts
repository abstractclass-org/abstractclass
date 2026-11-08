// The engine measure's run (measure.ts): the device's facts, then the review's speed for each pool size from 1 to the
// device's logical cores, then the GPU worker against a CPU worker where WebGPU gives an adapter. The page shows each
// result as it comes. When the tab is hidden, the measure that runs stops at once (its workers end), its results are
// dropped, and the run waits: a hidden tab runs its timers late and its workers slowly, so its numbers would be wrong.
// "Run it again" runs that measure again and goes on with the rest. A site gives its game's part (MeasureSite): its
// positions, its settings and its names. The engine's files come from the site's manifest, as the review's do.
import { EngineWorker, loadManifest, megabytes, modelOf, moduleOf, libraryOf, type Manifest } from "@abstractclass/engine/client.ts";
import { EnginePool } from "@abstractclass/engine/pool.ts";
import { GpuEngines, gpuSupport } from "@abstractclass/engine/gpuClient.ts";
import { errorText } from "@abstractclass/engine/errors.ts";
import type { AnalysisQuery, PositionQuery, VersionReply } from "@abstractclass/engine/protocol.ts";
import { LABEL_VISITS, SWEEP_VISITS } from "@abstractclass/analysis/cache.ts";
import { GPU_SEARCHES, TEST_SECONDS, gpuDownloadMB } from "@abstractclass/analysis/gpu.svelte.ts";
import { deviceFacts } from "./device.ts";
import {
  estimateSeconds, GPU_LIMIT_SECONDS, GPU_MEASURE, PHASE_SECONDS, poolName, poolSizes, resultsText, spreadOrder,
  type DeviceFacts, type Failure, type GpuResult, type MeasureResults, type PoolResult, type Stop, type TabMemory,
} from "./measure.ts";

/** A site's part of the measure: its game's positions and its engine's settings, as its review uses them. */
export interface MeasureSite {
  site: string; // the site's name: "Hedge School"
  commit: string; // the site's commit (its SITE_VERSION)
  game: string; // the game whose positions are searched, in words: "Enclosure, the sample game (120 positions)"
  positions: PositionQuery[]; // the game's positions from its start, each the query of the position before a move
  komi?: number; // the game's komi, which every search then asks (Hedge School's design 24)
  network: string; // the settings' network (the site's default)
  networkName: string;
  visits: number; // the review's label stage: its visits a position (the settings' default depth)
  review: string; // the depth's name: "Lite"
  workers: number; // the site's default pool on this device
  /** A guess at one search of `visits` on a phone's worker, in seconds, for the estimate before Start. */
  searchSeconds: number;
}

/** A measure of the run: a pool size, or the GPU part. */
export interface Step {
  name: string; // "1 worker", "the GPU"
  workers: number | null; // a pool size's workers, or null for the GPU part
  state: "waiting" | "running" | "done" | "stopped" | "failed";
}

/** What the page shows of the measure that runs now. */
export interface Live { step: string; seconds: number; of: number; searches: number; note: string }

/** Thrown into a step's work when the tab is hidden: the step stops. */
class Hidden extends Error {
  constructor() { super("the tab was hidden"); }
}

/** The work of one step: what to end when the tab is hidden, and whether it was. */
class StepRun {
  stopped = false;
  private ends: (() => void)[] = [];
  /** Rejects with Hidden when the step stops: a wait that the workers' end does not settle races it. */
  readonly halted = new Promise<never>((_, reject) => this.ends.push(() => reject(new Hidden())));
  constructor() { this.halted.catch(() => {}); }
  /** Ends `end` when the step stops, or at once when it has. */
  onStop(end: () => void) {
    if (this.stopped) end(); else this.ends.push(end);
  }
  stop() {
    this.stopped = true;
    for (const end of this.ends.splice(0)) end();
  }
  /** Throws Hidden when the step stopped. */
  check() {
    if (this.stopped) throw new Hidden();
  }
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** The tab's memory where the browser gives it (measure.ts, TabMemory). The whole page's waits for the browser's next
 *  garbage collection, so it waits at most 20 seconds. */
async function tabMemory(): Promise<TabMemory> {
  const p = performance as Performance & {
    measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }>; memory?: { usedJSHeapSize: number };
  };
  const page = globalThis.crossOriginIsolated && p.measureUserAgentSpecificMemory
    ? await Promise.race([p.measureUserAgentSpecificMemory().then(m => m.bytes / 1e6), sleep(20_000).then(() => null)]).catch(() => null)
    : null;
  return { pageMB: page, heapMB: p.memory ? p.memory.usedJSHeapSize / 1e6 : null };
}

/** The bytes that the page itself transferred for the engine's files (Resource Timing's transferSize: 0 for a file
 *  that the browser had kept). The workers' own fetches are not in the page's timeline. Null where the browser gives
 *  no sizes. */
function engineTransferMB(): number | null {
  const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const engine = entries.filter(e => new URL(e.name, location.href).pathname.startsWith("/engine/"));
  if (!engine.length || engine.every(e => e.transferSize === undefined)) return null;
  return engine.reduce((n, e) => n + (e.transferSize ?? 0), 0) / 1e6;
}

export class EngineMeasure {
  device = $state.raw<DeviceFacts | null>(null);
  version = $state.raw<VersionReply | null>(null);
  steps = $state<Step[]>([]);
  pools = $state.raw<(PoolResult | null)[]>([]);
  gpu = $state.raw<GpuResult | null>(null);
  memory = $state.raw<TabMemory | null>(null);
  searched = $state.raw<number[]>([]);
  stops = $state.raw<Stop[]>([]);
  failures = $state.raw<Failure[]>([]);
  live = $state.raw<Live | null>(null);
  status = $state<"loading" | "ready" | "running" | "paused" | "done">("loading");
  error = $state(""); // why the measure cannot run here
  hiddenStop = $state<string | null>(null); // the measure that the hidden tab stopped last, until it runs again
  private manifest: Manifest | null = null;
  private current: StepRun | null = null;
  private activeMs = 0; // the run's time so far, without its waits after a stop
  private since = 0; // when the run started to run again
  private endedAt = "";
  private wakeLock: { release(): Promise<void> } | null = null;
  readonly phaseSeconds: number;
  readonly site: MeasureSite;

  constructor(site: MeasureSite, phaseSeconds = PHASE_SECONDS) {
    this.site = site;
    this.phaseSeconds = phaseSeconds;
  }

  /** The device's facts and the manifest: what the page shows before Start. */
  async load() {
    try {
      const [device, manifest] = await Promise.all([deviceFacts(), loadManifest()]);
      this.device = device;
      if (!manifest) throw new Error("this build has no engine (no /engine/manifest.json)");
      if (!moduleOf(manifest) || !modelOf(manifest, this.site.network)) throw new Error(`the manifest lacks the module or the network ${this.site.network}`);
      this.manifest = manifest;
      this.steps = [
        ...poolSizes(device.cores).map(workers => ({ name: poolName(workers), workers, state: "waiting" as const })),
        { name: GPU_MEASURE, workers: null, state: "waiting" },
      ];
      this.pools = this.steps.filter(s => s.workers !== null).map(() => null);
      this.status = "ready";
    } catch (e) {
      this.error = errorText(e);
    }
  }

  /** The run's time on this device, in seconds, before it starts (measure.ts, estimateSeconds). */
  get estimate(): number {
    const d = this.device;
    return d ? estimateSeconds(d.cores, this.site.searchSeconds, this.site.visits, typeof d.webgpu === "object", this.phaseSeconds) : 0;
  }

  /** The steps done, of all. */
  get done(): number { return this.steps.filter(s => s.state === "done" || s.state === "failed").length; }

  /** Starts the run, or runs again the measure that the hidden tab stopped, then the rest. */
  start() {
    if (this.status !== "ready" && this.status !== "paused") return;
    const from = this.steps.findIndex(s => s.state !== "done" && s.state !== "failed");
    if (from < 0) return;
    void this.runFrom(from);
  }

  private onVisibility = () => {
    if (document.visibilityState === "hidden") this.current?.stop();
  };

  private async runFrom(from: number) {
    this.status = "running";
    this.hiddenStop = null;
    this.since = performance.now();
    document.addEventListener("visibilitychange", this.onVisibility);
    void this.keepScreenOn();
    try {
      for (let k = from; k < this.steps.length; k++) {
        if (!(await this.runStep(k))) { this.status = "paused"; return; }
      }
      this.memory ??= await tabMemory();
      this.status = "done";
    } finally {
      this.activeMs += performance.now() - this.since;
      this.endedAt = new Date().toISOString();
      this.live = null;
      document.removeEventListener("visibilitychange", this.onVisibility);
      void this.wakeLock?.release().catch(() => {});
      this.wakeLock = null;
    }
  }

  /** Asks the browser to keep the screen on while the run runs (the Screen Wake Lock API), where it can. */
  private async keepScreenOn() {
    const wake = (navigator as Navigator & { wakeLock?: { request(type: "screen"): Promise<{ release(): Promise<void> }> } }).wakeLock;
    this.wakeLock = await wake?.request("screen").catch(() => null) ?? null;
  }

  /** Runs one step. False when the hidden tab stopped it. */
  private async runStep(k: number): Promise<boolean> {
    const step = this.steps[k], run = this.current = new StepRun();
    step.state = "running";
    if (document.visibilityState === "hidden") run.stop();
    try {
      if (step.workers !== null) {
        const result = await this.measurePool(step.workers, run);
        this.pools = this.pools.map((p, i) => (i === step.workers! - 1 ? result : p));
        if (step.workers === this.pools.length) this.memory = await tabMemory();
      } else {
        this.gpu = await this.measureGpu(run);
      }
      run.check();
      step.state = "done";
      return true;
    } catch (e) {
      if (run.stopped) {
        step.state = "stopped";
        this.hiddenStop = step.name;
        this.stops = [...this.stops, { measure: step.name, at: new Date().toISOString() }];
        return false;
      }
      step.state = "failed";
      this.failures = [...this.failures, { measure: step.name, message: errorText(e) }];
      return true;
    } finally {
      run.stop(); // ends the step's workers
      this.current = null;
    }
  }

  /** The review's query of position `k` at the review's depth: the label stage's (packages/analysis, search), with its
   *  early slice at LABEL_VISITS. */
  private query(k: number, visits = this.site.visits): AnalysisQuery {
    const s = this.site;
    return { ...s.positions[k], ...(s.komi ? { komi: s.komi } : {}), maxVisits: visits, includePVVisits: true,
             includeOwnership: true, ...(visits > LABEL_VISITS ? { slice: { visits: LABEL_VISITS } } : {}) };
  }

  /** Shows the step's progress once a second, until `until` settles. */
  private ticking(step: string, of: number, count: () => number, note: () => string, until: Promise<unknown>) {
    const t0 = performance.now();
    const show = () => { this.live = { step, seconds: (performance.now() - t0) / 1000, of, searches: count(), note: note() }; };
    show();
    const timer = setInterval(show, 1000);
    void until.finally(() => clearInterval(timer)).catch(() => {});
  }

  /** One pool size: `size` new workers, each started and warmed by one search of SWEEP_VISITS at the game's start, then
   *  searching the same positions of the game in the same order (spreadOrder) until phaseSeconds have passed, each
   *  search to its end. New workers each time, so that no worker keeps the network's evaluations of a position that it
   *  searched before. */
  private async measurePool(size: number, run: StepRun): Promise<PoolResult> {
    const manifest = this.manifest!, model = modelOf(manifest, this.site.network)!;
    const workers = Array.from({ length: size }, () => new EngineWorker());
    run.onStop(() => workers.forEach(w => w.terminate()));
    const order = spreadOrder(this.site.positions.length);
    let searches = 0, phase = "starting";
    const work = (async () => {
      const t0 = performance.now();
      const versions = await Promise.all(workers.map(async w => {
        const v = await w.init(manifest);
        await w.loadModel(model);
        await w.analyse(this.query(0, SWEEP_VISITS)).done;
        return v.reply;
      }));
      run.check();
      this.version ??= versions[0];
      const readyMs = performance.now() - t0;
      phase = "searching";
      const deadline = performance.now() + this.phaseSeconds * 1000;
      const each = await Promise.all(workers.map(async w => {
        let visits = 0, ms = 0, memory = 0, i = 0;
        while (i < order.length && performance.now() < deadline) {
          const t = await w.analyse(this.query(order[i])).done;
          run.check();
          visits += t.reply.rootInfo.visits;
          ms += t.ms;
          memory = Math.max(memory, t.memory);
          searches++;
          i++;
        }
        return { visits, ms, memory, positions: i };
      }));
      const reached = Math.max(...each.map(e => e.positions));
      if (reached > this.searched.length) this.searched = order.slice(0, reached);
      return {
        workers: size, rates: each.map(e => (1000 * e.visits) / e.ms), searches, visits: each.reduce((n, e) => n + e.visits, 0),
        readyMs, memoryMB: each.reduce((n, e) => n + e.memory, 0) / 1e6,
      };
    })();
    this.ticking(poolName(size), this.phaseSeconds, () => searches, () => phase, work);
    return await work;
  }

  /** The GPU part (design 15's first-use test): the site's default pool and the GPU worker with GPU_SEARCHES searches,
   *  on the review's label stage of the game's positions, until each kind has searched for TEST_SECONDS
   *  (EnginePool.measureGpu). Not run where the browser cannot run the GPU module, or where WebGPU gives no adapter. */
  private async measureGpu(run: StepRun): Promise<GpuResult> {
    const support = gpuSupport();
    if (!support.ok) return { state: "none", reason: `this browser has ${support.reason}` };
    if (this.device?.webgpu === "no adapter" || this.device?.webgpu === "none") return { state: "none", reason: "WebGPU gives no adapter (no GPU)" };
    const manifest = this.manifest!, network = this.site.network;
    if (!manifest.artifacts.some(a => a.kind === "gpu-module")) return { state: "none", reason: "this build has no GPU module" };
    const cpuWorkers = this.site.workers, pool = new EnginePool(cpuWorkers);
    run.onStop(() => pool.terminate());
    let phase = "starting the CPU workers", startMs = 0, engineMB: number | null = null, started = false;
    const work = (async (): Promise<GpuResult> => {
      await pool.start(manifest, network);
      run.check();
      phase = "loading the GPU's files";
      const gpu = new GpuEngines(), t0 = performance.now();
      run.onStop(() => gpu.terminate());
      try {
        await gpu.start(manifest, network, GPU_SEARCHES);
      } catch (e) {
        run.check();
        return { state: "failed", message: errorText(e) };
      }
      run.check();
      startMs = performance.now() - t0;
      started = true;
      if (gpu.version?.search !== pool.search) {
        gpu.terminate();
        return { state: "failed", message: `the GPU module searches as ${gpu.version?.search}, the workers as ${pool.search}` };
      }
      pool.addGpu(gpu);
      phase = "testing";
      const measured = pool.measureGpu(TEST_SECONDS, measuring => { phase = measuring ? "testing" : "waiting for searches"; });
      for (const k of spreadOrder(this.site.positions.length)) {
        void pool.run(1, "measure", async engine => {
          const t = await engine.analyse(this.query(k)).done;
          if (engine.kind === "gpu") engineMB = Math.max(engineMB ?? 0, t.memory / 1e6);
        }).catch(() => {});
      }
      const speed = await measured;
      run.check();
      return { state: "done", gpu: speed.gpu, cpu: speed.cpu, cpuWorkers, startMs, engineMB };
    })();
    const limit = sleep(GPU_LIMIT_SECONDS * 1000).then(() => "late" as const);
    this.ticking(GPU_MEASURE, GPU_LIMIT_SECONDS, () => 0, () => phase, Promise.race([work, limit]));
    const ended = await Promise.race([work, limit, run.halted]);
    if (ended === "late") {
      run.check();
      return started ? { state: "unfinished", cpuWorkers, startMs }
        : { state: "failed", message: `it did not start within ${GPU_LIMIT_SECONDS} s` };
    }
    pool.halt();
    return ended;
  }

  /** Every measure so far, for the results block. */
  get results(): MeasureResults | null {
    const d = this.device, m = this.manifest, v = this.version, s = this.site;
    if (!d || !m) return null;
    const cpu = [moduleOf(m), libraryOf(m), modelOf(m, s.network)].reduce((n, a) => n + (a?.download ?? 0), 0);
    return {
      at: this.endedAt || new Date().toISOString(), device: d, game: s.game, positions: s.positions.length,
      visits: s.visits, review: s.review, defaultWorkers: s.workers, phaseSeconds: this.phaseSeconds,
      build: v ? {
        site: s.site, commit: s.commit, module: moduleOf(m)!.id, gpuModule: m.artifacts.find(a => a.kind === "gpu-module")?.id ?? null,
        build: v.build, protocol: v.protocol, search: v.search, network: s.network, networkName: s.networkName,
      } : null,
      pools: this.pools, searched: this.searched, gpu: this.gpu, memory: this.memory, stops: this.stops,
      failures: this.failures,
      download: { cpuMB: megabytes(cpu), gpuMB: gpuDownloadMB(m, s.network), transferredMB: engineTransferMB() },
      totalMs: this.activeMs,
    };
  }

  /** The results block (measure.ts, resultsText). */
  get text(): string {
    const r = this.results;
    return r ? resultsText(r) : "";
  }

  /** Ends the run's workers: the page closed. */
  end() {
    this.current?.stop();
    document.removeEventListener("visibilitychange", this.onVisibility);
  }
}
