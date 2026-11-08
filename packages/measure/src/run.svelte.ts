// The engine measure's run (measure.ts): the device's facts, then the review's speed for each pool size (poolSizes),
// then the GPU worker against a CPU worker where WebGPU gives an adapter. The page shows each result as it comes. When
// the tab is hidden, the measure that runs stops at once (its workers end), its results are dropped, and the run waits:
// a hidden tab runs its timers late and its workers slowly, so its numbers would be wrong. "Run it again" runs that
// measure again and goes on with the rest. A site gives its game's part (MeasureSite): its positions, its default
// settings and its names. The engine's files come from the site's manifest, as the review's do.
import {
  checked, compile, EngineWorker, libraryOf, loadManifest, megabytes, modelOf, moduleOf, type Manifest,
} from "@abstractclass/engine/client.ts";
import { EnginePool } from "@abstractclass/engine/pool.ts";
import { GpuEngines, gpuSupport } from "@abstractclass/engine/gpuClient.ts";
import { errorText } from "@abstractclass/engine/errors.ts";
import { positionQuery, type AnalysisQuery, type PositionQuery, type VersionReply } from "@abstractclass/engine/protocol.ts";
import { LABEL_VISITS, SWEEP_VISITS } from "@abstractclass/analysis/cache.ts";
import { GPU_SEARCHES, TEST_SECONDS, gpuDownloadMB } from "@abstractclass/analysis/gpu.svelte.ts";
import { maxWorkers, reviewDepthText, reviewVisits, type EngineSettings } from "@abstractclass/analysis/settings.ts";
import { deviceFacts } from "./device.ts";
import {
  estimateSeconds, GPU_LIMIT_SECONDS, GPU_MEASURE, PHASE_SECONDS, poolName, poolRate, poolSizes, resultsText,
  spreadOrder, stepsSeconds, type DeviceFacts, type GpuResult, type MeasureResults, type PoolResult, type Step,
  type Stop, type TabMemory,
} from "./measure.ts";

/** A site's part of the measure: its game and its engine's default settings, as its review uses them. */
export interface MeasureSite {
  commit: string; // the site's commit (its SITE_VERSION)
  game: string; // the game whose positions are searched, in words: "Enclosure, the sample game (120 positions)"
  moves: string[]; // the game's moves: each position is the moves before one of them
  komi?: number; // the game's komi, which every search then asks (Hedge School's design 24)
  settings: EngineSettings; // the site's defaults (defaultEngine): the network, the review's depth and the pool
  networkName: string; // the settings' network, by its name
  /** A guess at one search of the review's depth on a phone's worker, in seconds, for the estimate before Start. */
  searchSeconds: number;
}

/** What the page shows of the measure that runs now. `searches` only for a pool size. */
interface Live { step: string; seconds: number; note: string; searches?: number }

/** Thrown into a step's work when the tab is hidden: the step stops. */
class Hidden extends Error {
  constructor() { super("the tab was hidden"); }
}

/** The work of one step: what to end when the step ends, by the tab hidden or at its end, and whether it was hidden. */
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

/** `value` after `ms`, with the timer cleared once `until` settles first. */
function timeout<T>(ms: number, value: T, until: Promise<unknown>): Promise<T> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(value), ms);
    void until.finally(() => clearTimeout(timer)).catch(() => {});
  });
}

/** The tab's memory where the browser gives it (measure.ts, TabMemory). The whole page's waits for the browser's next
 *  garbage collection, so it waits at most 20 seconds. */
async function tabMemory(): Promise<TabMemory> {
  const p = performance as Performance & {
    measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }>; memory?: { usedJSHeapSize: number };
  };
  const measured = globalThis.crossOriginIsolated && p.measureUserAgentSpecificMemory
    ? p.measureUserAgentSpecificMemory().then(m => m.bytes / 1e6) : null;
  const page = measured ? await Promise.race([measured, timeout(20_000, null, measured)]).catch(() => null) : null;
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

const ended = (s: Step) => s.state === "done" || s.state === "failed";

export class EngineMeasure {
  device = $state.raw<DeviceFacts | null>(null);
  version = $state.raw<VersionReply | null>(null);
  steps = $state<Step[]>([]);
  gpu = $state.raw<GpuResult | null>(null);
  memory = $state.raw<TabMemory | null>(null);
  searched = $state.raw<number[]>([]);
  stops = $state.raw<Stop[]>([]);
  live = $state.raw<Live | null>(null);
  status = $state<"loading" | "error" | "ready" | "running" | "paused" | "done">("loading");
  error = $state(""); // why the measure cannot run here
  readonly positions: PositionQuery[];
  readonly visits: number; // the review's label stage: its visits a position (the settings' default depth)
  readonly review: string; // the depth in words: "Lite (512 visits a position)"
  private manifest: Manifest | null = null;
  private current: StepRun | null = null;
  private activeMs = 0; // the run's time so far, without its waits after a stop
  private endedAt = "";
  private wakeLock: { release(): Promise<void> } | null = null;

  constructor(readonly name: string, readonly site: MeasureSite, readonly phaseSeconds = PHASE_SECONDS) {
    this.positions = site.moves.map((_, k) => positionQuery(null, site.moves.slice(0, k)));
    this.visits = reviewVisits(site.settings);
    this.review = reviewDepthText(this.visits);
  }

  /** The device's facts and the manifest: what the page shows before Start. */
  async load() {
    try {
      const [device, manifest] = await Promise.all([deviceFacts(), loadManifest()]);
      this.device = device;
      const network = this.site.settings.network;
      if (!manifest) throw new Error("this build has no engine (no /engine/manifest.json)");
      if (!moduleOf(manifest) || !modelOf(manifest, network)) throw new Error(`the manifest lacks the module or the network ${network}`);
      this.manifest = manifest;
      this.steps = [
        ...poolSizes(maxWorkers(), this.site.settings.workers).map(workers => ({ name: poolName(workers), workers, state: "waiting" as const })),
        { name: GPU_MEASURE, workers: null, state: "waiting" },
      ];
      this.status = "ready";
    } catch (e) {
      this.error = errorText(e);
      this.status = "error";
    }
  }

  /** The pool sizes, the smallest first. */
  get sizes(): number[] { return this.steps.flatMap(s => (s.workers === null ? [] : [s.workers])); }

  /** Whether the GPU part searches here: where the browser can run the GPU module, WebGPU gives an adapter and the
   *  build has a GPU module. */
  private get gpuRuns(): boolean {
    return gpuSupport().ok && typeof this.device?.webgpu === "object" && this.gpuModule !== null;
  }

  /** The run's time on this device, in seconds, before it starts (measure.ts, estimateSeconds). */
  get estimate(): number {
    return estimateSeconds(this.sizes.length, this.gpuRuns, this.site.searchSeconds, this.visits, this.phaseSeconds);
  }

  /** The run's time left, in seconds, once a pool size has measured: the steps not done, with one search as long as
   *  the last measured pool's workers took for it, less the time of the step that runs. Null before, and while the run
   *  waits. */
  get left(): number | null {
    const last = this.steps.findLast(s => s.pool)?.pool;
    if (!last || this.status !== "running") return null;
    const todo = this.steps.filter(s => !ended(s)), searchSeconds = (this.visits * last.workers) / poolRate(last);
    const all = stepsSeconds(todo.filter(s => s.workers !== null).length, this.gpuRuns && todo.some(s => s.workers === null),
                             searchSeconds, this.visits, this.phaseSeconds);
    return Math.max(0, all - (this.live?.seconds ?? 0));
  }

  /** The steps done, of all. */
  get done(): number { return this.steps.filter(ended).length; }

  /** The measure that the hidden tab stopped, while the run waits for "Run it again". */
  get hiddenStop(): string | null {
    return this.status === "paused" ? this.steps.find(s => s.state === "stopped")?.name ?? null : null;
  }

  /** Starts the run, or runs again the measure that the hidden tab stopped, then the rest. */
  start() {
    if (this.status === "ready" || this.status === "paused") void this.runFrom(this.steps.findIndex(s => !ended(s)));
  }

  private onVisibility = () => {
    if (document.visibilityState === "hidden") this.current?.stop();
  };

  private async runFrom(from: number) {
    this.status = "running";
    const since = performance.now();
    document.addEventListener("visibilitychange", this.onVisibility);
    void this.keepScreenOn();
    try {
      for (let k = from; k < this.steps.length; k++) {
        if (!(await this.runStep(k))) { this.status = "paused"; return; }
      }
      this.memory ??= await tabMemory();
      this.status = "done";
    } finally {
      this.activeMs += performance.now() - since;
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
        step.pool = await this.measurePool(step.workers, run);
        if (step.workers === this.sizes.at(-1)) this.memory = await tabMemory();
      } else {
        this.gpu = await this.measureGpu(run);
      }
      run.check();
      step.state = "done";
      return true;
    } catch (e) {
      if (run.stopped) {
        step.state = "stopped";
        this.stops = [...this.stops, { measure: step.name, at: new Date().toISOString() }];
        return false;
      }
      step.state = "failed";
      step.message = errorText(e);
      return true;
    } finally {
      run.stop(); // ends the step's workers and its progress line
      this.current = null;
    }
  }

  /** The review's query of position `k` at the review's depth: the label stage's (packages/analysis, search), with its
   *  early slice at LABEL_VISITS. */
  private query(k: number, visits = this.visits): AnalysisQuery {
    const komi = this.site.komi;
    return { ...this.positions[k], ...(komi ? { komi } : {}), maxVisits: visits, includePVVisits: true,
             includeOwnership: true, ...(visits > LABEL_VISITS ? { slice: { visits: LABEL_VISITS } } : {}) };
  }

  /** Shows the step's progress once a second, until the step ends. */
  private ticking(run: StepRun, step: string, note: () => string, searches?: () => number) {
    const t0 = performance.now();
    const show = () => { this.live = { step, seconds: (performance.now() - t0) / 1000, note: note(), searches: searches?.() }; };
    show();
    const timer = setInterval(show, 1000);
    run.onStop(() => clearInterval(timer));
  }

  /** One pool size: `size` new workers, each started and warmed by one search of SWEEP_VISITS at the game's start, then
   *  searching the same positions of the game in the same order (spreadOrder) until phaseSeconds have passed, each
   *  search to its end. New workers each time, so that no worker keeps the network's evaluations of a position that it
   *  searched before. */
  private async measurePool(size: number, run: StepRun): Promise<PoolResult> {
    const manifest = this.manifest!, model = modelOf(manifest, this.site.settings.network)!;
    let searches = 0, phase = "loading the engine's files";
    this.ticking(run, poolName(size), () => phase, () => searches);
    // The module and the network, fetched and checked together before the pool's start (the first pool's only: the
    // page keeps them), so that each pool's start counts only its workers' start. A hidden tab stops the wait.
    await Promise.race([Promise.all([compile(moduleOf(manifest)!.url), checked(model)]), run.halted]);
    phase = "starting";
    const workers = Array.from({ length: size }, () => new EngineWorker());
    run.onStop(() => workers.forEach(w => w.terminate()));
    const order = spreadOrder(this.positions.length), t0 = performance.now();
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
      return { rate: (1000 * visits) / ms, memory, positions: i };
    }));
    const reached = Math.max(...each.map(e => e.positions));
    if (reached > this.searched.length) this.searched = order.slice(0, reached);
    return { workers: size, rates: each.map(e => e.rate), searches, readyMs, memoryMB: each.reduce((n, e) => n + e.memory, 0) / 1e6 };
  }

  /** The GPU module's id in the manifest, where the build has one. */
  private get gpuModule(): string | null { return this.manifest?.artifacts.find(a => a.kind === "gpu-module")?.id ?? null; }

  /** The GPU part (design 15's first-use test): the site's default pool and the GPU worker with GPU_SEARCHES searches,
   *  on the review's label stage of the game's positions, until each kind has searched for TEST_SECONDS
   *  (EnginePool.measureGpu). Not run where the browser cannot run the GPU module, or where WebGPU gives no adapter. */
  private async measureGpu(run: StepRun): Promise<GpuResult> {
    const support = gpuSupport();
    if (!support.ok) return { state: "none", reason: `this browser has ${support.reason}` };
    if (typeof this.device?.webgpu !== "object") return { state: "none", reason: "WebGPU gives no adapter (no GPU)" };
    if (!this.gpuModule) return { state: "none", reason: "this build has no GPU module" };
    const manifest = this.manifest!, network = this.site.settings.network, pool = new EnginePool(this.site.settings.workers);
    run.onStop(() => { pool.halt(); pool.terminate(); });
    let phase = "starting the CPU workers", startMs: number | null = null, engineBytes = 0;
    this.ticking(run, GPU_MEASURE, () => phase);
    // A GPU that fails (a lost device, its worker ended) leaves the pool, and its test then never ends
    // (EnginePool.measureGpu). So the part fails with the GPU's error, as GpuControl reports it, and does not wait
    // for its limit.
    const lost = new Promise<never>((_, reject) => {
      pool.onGpuLost = e => reject(new Error(`the GPU failed during its test: ${errorText(e)}`));
    });
    lost.catch(() => {});
    const work = (async (): Promise<GpuResult> => {
      await pool.start(manifest, network);
      run.check();
      phase = "loading the GPU's files";
      const gpu = new GpuEngines(), t0 = performance.now();
      run.onStop(() => gpu.terminate());
      await gpu.start(manifest, network, GPU_SEARCHES);
      run.check();
      const ms = startMs = performance.now() - t0;
      // As GpuControl.start (@abstractclass/analysis/gpu.svelte.ts): a GPU module of another search would mix two.
      if (gpu.version?.search !== pool.search) throw new Error(`the GPU module searches as ${gpu.version?.search}, the workers as ${pool.search}`);
      pool.addGpu(gpu);
      phase = "testing";
      const measured = pool.measureGpu(TEST_SECONDS, measuring => { phase = measuring ? "testing" : "waiting for searches"; });
      for (const k of spreadOrder(this.positions.length)) {
        void pool.run(1, "measure", async engine => {
          const t = await engine.analyse(this.query(k)).done;
          if (engine.kind === "gpu") engineBytes = Math.max(engineBytes, t.memory);
        }).catch(() => {});
      }
      const speed = await Promise.race([measured, lost]);
      run.check();
      return { state: "done", gpu: speed.gpu, cpu: speed.cpu, startMs: ms, memoryMB: engineBytes ? (GPU_SEARCHES * engineBytes) / 1e6 : null };
    })();
    const late = timeout(GPU_LIMIT_SECONDS * 1000, "late" as const, Promise.race([work, run.halted]));
    const first = await Promise.race([work, late, run.halted]);
    if (first !== "late") return first;
    run.check();
    if (startMs === null) throw new Error(`it did not start within ${GPU_LIMIT_SECONDS} s`);
    return { state: "unfinished", startMs };
  }

  /** Every measure so far, for the results block. */
  get results(): MeasureResults | null {
    const d = this.device, m = this.manifest, v = this.version, s = this.site, network = s.settings.network;
    if (!d || !m) return null;
    const cpu = [moduleOf(m), libraryOf(m), modelOf(m, network)].reduce((n, a) => n + (a?.download ?? 0), 0);
    return {
      at: this.endedAt || new Date().toISOString(), device: d, game: s.game, positions: this.positions.length,
      visits: this.visits, review: this.review, defaultWorkers: s.settings.workers, phaseSeconds: this.phaseSeconds,
      gpuSearches: GPU_SEARCHES, gpuTestSeconds: TEST_SECONDS,
      build: {
        site: this.name, commit: s.commit, module: moduleOf(m)!.id, gpuModule: this.gpuModule, network,
        networkName: s.networkName, engine: v && { build: v.build, protocol: v.protocol, search: v.search },
      },
      steps: this.steps, searched: this.searched, gpu: this.gpu, memory: this.memory, stops: this.stops,
      download: { cpuMB: megabytes(cpu), gpuMB: gpuDownloadMB(m, network), transferredMB: engineTransferMB() },
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
