// A pool of engine workers (docs/design/02-static-site.md: one module instance a worker, different positions a worker).
// Work waits in one queue, and a free worker takes the most urgent task: the position on screen before the key moments,
// and the key moments before the sweep of the whole game (KaTrain's priorities, core/engine.py). A task that can stop
// (a search in slices) gives way: when a more urgent task finds no free worker, the least urgent such task is stopped
// and waits in the queue again. The pool can grow or shrink while it works (the engine settings, design 09).
//
// The GPU module's engines (engine/gpuClient.ts) join the pool as more search engines, a slot each (design 15). The GPU
// gains by many searches at once, whose evaluations go to it together, and each of its searches runs slower than a CPU
// worker's. So a task takes a free CPU worker first, and a free GPU slot when no CPU worker is free.
import { EngineError, EngineWorker, modelOf, moduleOf, type Manifest, type Timed } from "#lib/engine/client.ts";
import type { GpuEngines } from "#lib/engine/gpuClient.ts";
import type { AnalysisQuery, AnalysisReply, ModelInfo, VersionReply } from "#lib/engine/protocol.ts";

/** What searches: a CPU worker, or an engine of the GPU worker. */
export interface SearchEngine {
  readonly kind: "cpu" | "gpu";
  analyse(q: AnalysisQuery, onPartial?: (r: AnalysisReply, ms: number) => void): { done: Promise<Timed<AnalysisReply>>; stop: () => void };
  terminate(): void;
}

/** A task's work. It gets a search engine, and can name how to stop its work early (`onStop`). */
export type Work<T> = (engine: SearchEngine, onStop: (stop: () => void) => void) => Promise<T>;

/** Half the machine's cores, from 1 to 8: one module instance a worker, and room left for the page. On a laptop of 12
 *  cores each worker kept 86% of one worker's speed up to 8 (decisions/engine.md, "Speed on a laptop"). */
export const defaultPoolSize = () => Math.max(1, Math.min(8, Math.floor((navigator.hardwareConcurrency || 2) / 2)));

/** How long a pool that releases its engines when idle (releaseWhenIdle) waits, with no task, before it ends them: in a
 *  tab in view, and in a hidden tab. A search worker holds its module and network for as long as it lives (about 90 MB
 *  with HedgeFund 0.1 Lite, 240 MB with HedgeFund 0.1: docs/decisions/engine.md, "A review's memory"), and a finished
 *  review needs none of them until the player searches again. */
export const IDLE_RELEASE_MS = { shown: 60_000, hidden: 15_000 };

/** The rejection of a task that was cancelled before it ran. */
export class Cancelled extends Error {
  constructor() { super("cancelled"); }
}

interface Task {
  priority: number;
  tag: string;
  work: Work<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  stop?: () => void; // while it runs, when it can stop
  stopped?: boolean; // stopped to give way: it runs again later
  engine?: SearchEngine; // while it runs
}

export class EnginePool {
  readonly engines: EngineWorker[];
  version: VersionReply | null = null;
  model: ModelInfo | null = null;
  private free: SearchEngine[] = [];
  private queue: Task[] = [];
  private running = new Set<Task>();
  private retiring = new Set<SearchEngine>(); // engines removed while busy: they end when their task ends
  private gpu: GpuEngines | null = null; // the GPU worker, while its engines are in the pool
  private sampler: ReturnType<typeof setInterval> | undefined; // samples the GPU's evaluations while its test runs
  /** The searches' speed, for the GPU's first-use test (measureGpu). */
  private readonly speed = new SpeedMeter();
  /** Called when the GPU fails (a lost device, its worker ended): the pool drops it, and its tasks run again on the CPU
   *  workers. */
  onGpuLost: ((error: unknown) => void) | null = null;
  /** Called when tasks wait and no engine is free: the GPU starts then (design 15). */
  onBacklog: (() => void) | null = null;
  private load: ((e: EngineWorker) => Promise<void>) | null = null; // starts a search worker: the module, then the network
  // The release of idle engines (releaseWhenIdle): the search workers wanted, whether they are released now, and the
  // timer that releases them.
  private size: number;
  private released = false;
  private idleRelease: { shown: number; hidden: number } | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private onVisibility = () => this.scheduleRelease();
  /** Called when the idle engines are released: the GPU's control starts the GPU again at the next backlog. */
  onRelease: (() => void) | null = null;
  // A worker for the rules alone (describe, play): it loads no network and runs no search, so a rules call never
  // waits behind a search (a worker takes one request at a time). The board's rules, an engine line's cuts and a
  // player's own moves need answers at once.
  private rulesWorker = new EngineWorker();

  constructor(size: number) {
    this.size = size;
    this.engines = Array.from({ length: size }, () => new EngineWorker());
  }

  /** Starts the module in every worker, then loads the network in the search workers. `onRules` runs once the rules
   *  work, without waiting for a network. */
  async start(manifest: Manifest, modelId: string, onRules?: () => Promise<void>) {
    const module = moduleOf(manifest);
    const model = modelOf(manifest, modelId);
    if (!module || !model) throw new Error(`the manifest lacks the module or the network ${modelId}`);
    const load = this.load = async (e: EngineWorker) => {
      await e.init(manifest);
      this.model = (await e.loadModel(model)).reply.model;
      if (!this.engines.includes(e)) { // removed while it loaded
        this.retiring.delete(e);
        e.terminate();
        return;
      }
      this.free.push(e);
      this.dispatch();
    };
    await Promise.all([
      (async () => { this.version = (await this.rulesWorker.init(manifest)).reply; await onRules?.(); })(),
      ...this.engines.map(load),
    ]);
  }

  /** The worker for rules calls (describe, play). They work before the network loads. */
  get rules(): EngineWorker { return this.rulesWorker; }

  /** Runs `work` on the next free worker, by priority (higher first, then first come). Engines released when idle start
   *  again first. */
  run<T>(priority: number, tag: string, work: Work<T>): Promise<T> {
    clearTimeout(this.idleTimer);
    if (this.released) { this.released = false; this.resize(this.size); }
    return new Promise<T>((resolve, reject) => {
      this.enqueue({ priority, tag, work: work as Work<unknown>, resolve: resolve as (v: unknown) => void, reject });
      this.dispatch();
      this.giveWay();
    });
  }

  /** Drops the waiting tasks whose tag matches: their promises reject with Cancelled. Running tasks finish. */
  cancel(match: (tag: string) => boolean) {
    const dropped = this.queue.filter(t => match(t.tag));
    this.queue = this.queue.filter(t => !match(t.tag));
    for (const t of dropped) t.reject(new Cancelled());
    this.scheduleRelease();
  }

  /** Adds search workers or removes them, to `size`. A new worker takes work once it has loaded the network. A removed
   *  worker ends at once when it is free, or when its task ends. Call after start(). */
  resize(size: number) {
    this.size = size;
    if (this.released) return; // they start at this size with the next task
    while (this.engines.length < size) {
      const e = new EngineWorker();
      this.engines.push(e);
      this.load?.(e).catch(() => {
        const k = this.engines.indexOf(e);
        if (k >= 0) this.engines.splice(k, 1); // a worker that cannot start is dropped
        e.terminate();
      });
    }
    while (this.engines.length > Math.max(1, size)) {
      const e = this.engines.pop()!;
      const k = this.free.indexOf(e);
      if (k >= 0) {
        this.free.splice(k, 1);
        e.terminate();
      } else this.retiring.add(e); // busy, or still loading (it ends when it has loaded)
    }
  }

  /** Adds the GPU worker's engines, started (gpuClient.ts), to the pool's search engines. */
  addGpu(gpu: GpuEngines) {
    this.dropGpu();
    this.gpu = gpu;
    this.speed.gpuReset();
    this.free.push(...gpu.slots);
    this.dispatch();
  }

  /** Takes the GPU out of the pool: its worker ends at once, and its unfinished searches run again on the CPU workers.
   *  Each of them runs slower on the GPU than a new search on a CPU worker would (design 15), so none is waited for. */
  dropGpu() {
    const gpu = this.gpu;
    if (!gpu) return;
    this.gpu = null;
    clearInterval(this.sampler);
    gpu.terminate(); // its searches reject, and gpuLost puts their tasks back in the queue
    for (const e of this.free.filter(e => e.kind === "gpu")) e.terminate();
    this.free = this.free.filter(e => e.kind !== "gpu");
    for (const t of this.running) if (t.engine?.kind === "gpu") this.retiring.add(t.engine);
  }

  /** Whether the GPU's engines are in the pool. */
  get hasGpu(): boolean { return this.gpu !== null; }

  /** A CPU worker's visits a second over the searches that ended so far, or null before one ends: the machine's speed,
   *  which the review reports when it ends (design 17). */
  get workerSpeed(): number | null { return this.speed.cpuRate; }

  /** The GPU's first-use test (analysis/gpu.svelte.ts): a CPU worker's visits a second and the GPU worker's evaluations a
   *  second, once each has searched for `seconds`. The GPU's count is sampled once a second, only while the test runs.
   *  It never resolves when the GPU leaves the pool first. */
  measureGpu(seconds: number): Promise<{ cpu: number; gpu: number }> {
    const gpu = this.gpu;
    if (!gpu) return new Promise(() => {});
    clearInterval(this.sampler);
    this.sampler = setInterval(() => {
      gpu.evaluations().then(n => { if (this.gpu === gpu) this.speed.gpuSample(n); }, () => {});
    }, 1000);
    return this.speed.measured(seconds).finally(() => clearInterval(this.sampler));
  }

  /** Tasks wait, and no engine is free. */
  get backlogged(): boolean { return this.queue.length > 0 && this.free.length === 0; }

  /** Ends the search workers and the GPU worker when no task has run for a while (IDLE_RELEASE_MS, shorter in a hidden
   *  tab), and starts them again with the next task: an open tab then holds their memory only while it searches. The
   *  rules worker stays, so the board answers at once. Call after start(). */
  releaseWhenIdle(ms = IDLE_RELEASE_MS) {
    this.idleRelease = ms;
    document.addEventListener("visibilitychange", this.onVisibility);
    this.scheduleRelease();
  }

  /** Starts the idle timer when no task waits or runs, with the delay for the tab's state now. */
  private scheduleRelease() {
    clearTimeout(this.idleTimer);
    if (!this.idleRelease || this.released || this.queue.length || this.running.size) return;
    const ms = document.visibilityState === "hidden" ? this.idleRelease.hidden : this.idleRelease.shown;
    this.idleTimer = setTimeout(() => this.release(), ms);
  }

  /** Ends the search engines while nothing runs: a worker still loading ends when it has loaded (load), the GPU's worker
   *  at once (dropGpu). */
  private release() {
    if (this.queue.length || this.running.size) return;
    this.released = true;
    for (const e of this.engines) if (this.free.includes(e)) e.terminate(); else this.retiring.add(e);
    this.engines.length = 0;
    this.free = this.free.filter(e => e.kind === "gpu");
    this.dropGpu();
    this.onRelease?.();
  }

  /** Stops all searching: the waiting tasks are dropped (Cancelled), and the running tasks that can stop end now. A
   *  search not in slices finishes its few visits. */
  halt() {
    this.cancel(() => true);
    for (const t of this.running) if (t.stop && !t.stopped) t.stop();
  }

  private enqueue(task: Task) {
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  private dispatch() {
    while (this.free.length && this.queue.length) {
      const k = Math.max(0, this.free.findIndex(e => e.kind === "cpu")); // a CPU worker first
      const engine = this.free.splice(k, 1)[0], task = this.queue.shift()!;
      task.engine = engine;
      this.running.add(task);
      task.work(this.speed.watch(engine), stop => { task.stop = stop; })
        .then(value => {
          if (task.stopped) this.requeue(task); else task.resolve(value);
        }, error => {
          if (task.stopped) this.requeue(task);
          else if (engine.kind === "gpu" && !(error instanceof EngineError)) this.gpuLost(task, error);
          else task.reject(error);
        })
        .finally(() => {
          this.running.delete(task);
          task.stop = undefined;
          task.engine = undefined;
          if (this.retiring.delete(engine)) engine.terminate();
          else this.free.push(engine);
          this.dispatch();
          this.scheduleRelease();
        });
    }
    if (this.backlogged) this.onBacklog?.();
  }

  /** A GPU search failed, not by the engine's reply: the GPU leaves the pool, and the task waits for another engine. */
  private gpuLost(task: Task, error: unknown) {
    this.requeue(task);
    if (!this.gpu) return; // dropped already, by an earlier search's failure
    this.dropGpu();
    this.onGpuLost?.(error);
  }

  private requeue(task: Task) {
    task.stopped = false;
    this.enqueue(task);
  }

  /** When the most urgent waiting task finds no free worker, stops the least urgent running task that can stop and is
   *  less urgent than it. Its worker then takes the waiting task, and the stopped task waits to run again. */
  private giveWay() {
    const first = this.queue[0];
    if (!first || this.free.length) return;
    const victim = [...this.running]
      .filter(t => t.stop && !t.stopped && t.priority < first.priority)
      .sort((a, b) => a.priority - b.priority)[0];
    if (!victim) return;
    victim.stopped = true;
    victim.stop!();
  }

  terminate() {
    clearTimeout(this.idleTimer);
    if (this.idleRelease) document.removeEventListener("visibilitychange", this.onVisibility);
    this.engines.forEach(e => e.terminate());
    this.retiring.forEach(e => e.terminate());
    this.gpu?.terminate();
    clearInterval(this.sampler);
    this.rulesWorker.terminate();
  }
}

/** The searches' speed, for the GPU's first-use test (analysis/gpu.svelte.ts): a CPU worker's visits a second (its searches'
 *  visits over their time in the worker), and the GPU worker's network evaluations a second, all its searches together.
 *  The GPU's count comes from samples of its library's own count, about once a second, so that it counts the work of
 *  searches still running: a search on a slow GPU can take minutes. An interval counts while the GPU's searches run, and
 *  the first starts after its first batch, which compiled the GPU's kernels. A visit needs at most one evaluation (none
 *  where the search's cache or another order of edges gives the position), so the comparison leans to the CPU a little. */
export class SpeedMeter {
  private cpu = { visits: 0, ms: 0 };
  private gpu = { evaluations: 0, ms: 0 };
  private active = 0; // the GPU's searches running
  private last: { at: number; evaluations: number } | null = null; // the GPU's last sample, once it has evaluated
  private waiting: { seconds: number; resolve: (r: { cpu: number; gpu: number }) => void }[] = [];

  /** The engine, its searches measured. */
  watch(engine: SearchEngine): SearchEngine {
    return {
      kind: engine.kind,
      terminate: () => engine.terminate(),
      analyse: (q, onPartial) => {
        if (engine.kind === "gpu") this.active++;
        const run = engine.analyse(q, onPartial);
        run.done.then(t => this.ended(engine.kind, t.ms, t.reply.rootInfo.visits), () => this.ended(engine.kind, 0, 0));
        return run;
      },
    };
  }

  private ended(kind: "cpu" | "gpu", ms: number, visits: number) {
    if (kind === "gpu") { this.active--; return; }
    this.cpu.visits += visits;
    this.cpu.ms += ms;
    this.check();
  }

  /** Another GPU worker: its count starts from zero. */
  gpuReset() { this.last = null; }

  /** A CPU worker's visits a second, over every search that ended, or null before one ends. */
  get cpuRate(): number | null { return this.cpu.ms > 0 ? (1000 * this.cpu.visits) / this.cpu.ms : null; }

  /** A sample of the GPU worker's evaluations so far. */
  gpuSample(evaluations: number) {
    if (evaluations === 0) return; // no batch yet: the first compiles the kernels
    const now = performance.now();
    if (this.last && this.active > 0 && evaluations >= this.last.evaluations) {
      this.gpu.evaluations += evaluations - this.last.evaluations;
      this.gpu.ms += now - this.last.at;
    }
    this.last = { at: now, evaluations };
    this.check();
  }

  private check() {
    for (const w of [...this.waiting]) {
      if (this.cpu.ms < w.seconds * 1000 || this.gpu.ms < w.seconds * 1000) continue;
      this.waiting.splice(this.waiting.indexOf(w), 1);
      w.resolve({ cpu: (this.cpu.visits / this.cpu.ms) * 1000, gpu: (this.gpu.evaluations / this.gpu.ms) * 1000 });
    }
  }

  /** A CPU worker's visits a second and the GPU worker's evaluations a second, once each has searched for `seconds`.
   *  It never resolves when the work ends before that. */
  measured(seconds: number): Promise<{ cpu: number; gpu: number }> {
    return new Promise(resolve => {
      this.waiting.push({ seconds, resolve });
      this.check();
    });
  }
}
