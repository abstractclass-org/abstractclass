// A pool of engine workers (docs/design/02-static-site.md: one module instance a worker, different positions a worker).
// Work waits in one queue, and a free worker takes the most urgent task: the position on screen before the key moments,
// and the key moments before the sweep of the whole game (KaTrain's priorities, core/engine.py). A task that can stop
// (a search in slices) gives way: when a more urgent task finds no free worker, the least urgent such task is stopped
// and waits in the queue again. The pool can grow or shrink while it works (the engine settings, design 09).
import { EngineWorker, moduleOf, type Manifest } from "#lib/engine/client.ts";
import type { ModelInfo, VersionReply } from "#lib/engine/protocol.ts";

/** A task's work. It gets a worker, and can name how to stop its work early (`onStop`). */
export type Work<T> = (engine: EngineWorker, onStop: (stop: () => void) => void) => Promise<T>;

/** Half the machine's cores, from 1 to 8: one module instance a worker, and room left for the page. On a laptop of 12
 *  cores each worker kept 86% of one worker's speed up to 8 (decisions/engine.md, "Speed on a laptop"). */
export const defaultPoolSize = () => Math.max(1, Math.min(8, Math.floor((navigator.hardwareConcurrency || 2) / 2)));

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
}

export class EnginePool {
  readonly engines: EngineWorker[];
  version: VersionReply | null = null;
  model: ModelInfo | null = null;
  private free: EngineWorker[] = [];
  private queue: Task[] = [];
  private running = new Set<Task>();
  private retiring = new Set<EngineWorker>(); // workers removed while busy: they end when their task ends
  private load: ((e: EngineWorker) => Promise<void>) | null = null; // starts a search worker: the module, then the network
  // A worker for the rules alone (describe, play): it loads no network and runs no search, so a rules call never
  // waits behind a search (a worker takes one request at a time). The board's rules, an engine line's cuts and a
  // player's own moves need answers at once.
  private rulesWorker = new EngineWorker();

  constructor(size: number) {
    this.engines = Array.from({ length: size }, () => new EngineWorker());
  }

  /** Starts the module in every worker, then loads the network in the search workers. `onRules` runs once the rules
   *  work, without waiting for a network. */
  async start(manifest: Manifest, modelId: string, onRules?: () => Promise<void>) {
    const module = moduleOf(manifest);
    const model = manifest.artifacts.find(a => a.kind === "model" && a.id === modelId);
    if (!module || !model) throw new Error(`the manifest lacks the module or the network ${modelId}`);
    const load = this.load = async (e: EngineWorker) => {
      await e.init(module.url);
      this.model = (await e.loadModel(model.url, model.id)).reply.model;
      if (!this.engines.includes(e)) { // removed while it loaded
        this.retiring.delete(e);
        e.terminate();
        return;
      }
      this.free.push(e);
      this.dispatch();
    };
    await Promise.all([
      (async () => { this.version = (await this.rulesWorker.init(module.url)).reply; await onRules?.(); })(),
      ...this.engines.map(load),
    ]);
  }

  /** The worker for rules calls (describe, play). They work before the network loads. */
  get rules(): EngineWorker { return this.rulesWorker; }

  /** Runs `work` on the next free worker, by priority (higher first, then first come). */
  run<T>(priority: number, tag: string, work: Work<T>): Promise<T> {
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
  }

  /** Adds search workers or removes them, to `size`. A new worker takes work once it has loaded the network. A removed
   *  worker ends at once when it is free, or when its task ends. Call after start(). */
  resize(size: number) {
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
      const engine = this.free.shift()!, task = this.queue.shift()!;
      this.running.add(task);
      task.work(engine, stop => { task.stop = stop; })
        .then(value => {
          if (task.stopped) this.requeue(task); else task.resolve(value);
        }, error => {
          if (task.stopped) this.requeue(task); else task.reject(error);
        })
        .finally(() => {
          this.running.delete(task);
          task.stop = undefined;
          if (this.retiring.delete(engine)) engine.terminate();
          else this.free.push(engine);
          this.dispatch();
        });
    }
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
    this.engines.forEach(e => e.terminate());
    this.retiring.forEach(e => e.terminate());
    this.rulesWorker.terminate();
  }
}
