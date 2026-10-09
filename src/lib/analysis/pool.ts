// A pool of engine workers (docs/design/02-static-site.md: one module instance a worker, different positions a worker).
// Work waits in one queue, and a free worker takes the most urgent task: the position on screen before the key moments,
// and the key moments before the sweep of the whole game (KaTrain's priorities, core/engine.py).
import { EngineWorker, type Manifest } from "#lib/engine/client.ts";
import type { ModelInfo, VersionReply } from "#lib/engine/protocol.ts";

interface Task { priority: number; tag: string; run: (e: EngineWorker) => Promise<void> }

export class EnginePool {
  readonly engines: EngineWorker[];
  version: VersionReply | null = null;
  model: ModelInfo | null = null;
  private free: EngineWorker[] = [];
  private queue: Task[] = [];

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

  /** Runs `fn` on the next free worker, by priority (higher first, then first come). */
  run<T>(priority: number, tag: string, fn: (e: EngineWorker) => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ priority, tag, run: e => fn(e).then(resolve, reject) });
      this.queue.sort((a, b) => b.priority - a.priority);
      this.dispatch();
    });
  }

  /** Drops the waiting tasks whose tag matches. Running tasks finish. */
  cancel(match: (tag: string) => boolean) {
    this.queue = this.queue.filter(t => !match(t.tag));
  }

  get waiting() { return this.queue.length; }

  private dispatch() {
    while (this.free.length && this.queue.length) {
      const engine = this.free.shift()!, task = this.queue.shift()!;
      task.run(engine).finally(() => { this.free.push(engine); this.dispatch(); });
    }
  }

  terminate() { this.engines.forEach(e => e.terminate()); }
}
