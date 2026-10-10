// A pool of engine workers (docs/design/02-static-site.md: one module instance a worker, different positions a worker).
// Work waits in one queue, and a free worker takes the most urgent task: the position on screen before the key moments,
// and the key moments before the sweep of the whole game (KaTrain's priorities, core/engine.py). A task that can stop
// (a search in slices) gives way: when a more urgent task finds no free worker, the least urgent such task is stopped
// and waits in the queue again.
import { EngineWorker, type Manifest } from "#lib/engine/client.ts";
import type { ModelInfo, VersionReply } from "#lib/engine/protocol.ts";

/** A task's work. It gets a worker, and can name how to stop its work early (`onStop`). */
export type Work<T> = (engine: EngineWorker, onStop: (stop: () => void) => void) => Promise<T>;

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

  constructor(size: number) {
    this.engines = Array.from({ length: size }, () => new EngineWorker());
  }

  /** Starts the module in every worker, then loads the network. `onRules` runs once the rules work (no network). The
   *  first worker, which serves the rules calls, loads its network only after `onRules`, so that the board does not
   *  wait for a network. The other workers load theirs at once. */
  async start(manifest: Manifest, modelId: string, onRules?: () => Promise<void>) {
    const module = manifest.artifacts.find(a => a.kind === "module");
    const model = manifest.artifacts.find(a => a.kind === "model" && a.id === modelId);
    if (!module || !model) throw new Error(`the manifest lacks the module or the network ${modelId}`);
    const versions = await Promise.all(this.engines.map(e => e.init(module.url)));
    this.version = versions[0].reply;
    const load = async (e: EngineWorker) => {
      this.model = (await e.loadModel(model.url, model.id)).reply.model;
      this.free.push(e);
      this.dispatch();
    };
    await Promise.all([
      (async () => { await onRules?.(); await load(this.engines[0]); })(),
      ...this.engines.slice(1).map(load),
    ]);
  }

  /** The first worker, for rules calls (describe, play). They work before the network loads. */
  get rules(): EngineWorker { return this.engines[0]; }

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

  get waiting() { return this.queue.length; }

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
          this.free.push(engine);
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

  terminate() { this.engines.forEach(e => e.terminate()); }
}
