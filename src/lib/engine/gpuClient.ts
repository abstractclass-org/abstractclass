// The page's side of the GPU worker (gpuWorker.ts): the GPU module's engines, each a search at a time, all batched
// on the GPU. Each engine is a slot that the pool gives work to as it gives work to a CPU worker (analysis/pool.ts).
import type { Manifest, Timed } from "./client.ts";
import { EngineError, Stopped, libraryOf } from "./client.ts";
import type { GpuReply, GpuRequest } from "./gpuMessages.ts";
import { isError, type AnalysisQuery, type AnalysisReply, type ModelInfo, type VersionReply } from "./protocol.ts";

/** Whether this browser can run the GPU module: JSPI (WebAssembly.Suspending and WebAssembly.promising) and WebGPU.
 *  The GPU library checks the same in the worker (gpuEngineSupport). */
export function gpuSupport(): { ok: boolean; reason: string | null } {
  const wasm = WebAssembly as unknown as { Suspending?: unknown; promising?: unknown };
  const jspi = typeof wasm.Suspending === "function" && typeof wasm.promising === "function";
  const webgpu = typeof navigator !== "undefined" && "gpu" in navigator && !!(navigator as { gpu?: unknown }).gpu;
  return { ok: jspi && webgpu, reason: !jspi ? "no JSPI" : !webgpu ? "no WebGPU" : null };
}

type Pending = { resolve: (t: Timed<unknown>) => void; reject: (e: Error) => void; partial?: (r: unknown, ms: number) => void };

export class GpuEngines {
  private worker = new Worker(new URL("./gpuWorker.ts", import.meta.url), { type: "module" });
  private pending = new Map<number, Pending>();
  private nextId = 0;
  readonly slots: GpuSlot[] = [];
  version: VersionReply | null = null;
  model: ModelInfo | null = null;

  constructor() {
    this.worker.onmessage = (event: MessageEvent<GpuReply>) => {
      const m = event.data;
      const p = this.pending.get(m.id);
      if (!p) return;
      if (m.type === "partial") { p.partial?.(m.reply, m.ms); return; }
      this.pending.delete(m.id);
      if (m.type === "error") p.reject(new Error(m.message));
      else if (m.type === "ready") p.resolve({ reply: m, ms: m.ms, memory: 0 });
      else if (m.type === "stats") p.resolve({ reply: m.evaluations, ms: 0, memory: 0 });
      else if (isError(m.reply)) p.reject(new EngineError(m.reply));
      else p.resolve({ reply: m.reply, ms: m.ms, memory: m.memory });
    };
    // The worker failed outside a request (its script did not load, or it ran out of memory): every request fails.
    this.worker.onerror = (event: ErrorEvent) => {
      event.preventDefault();
      for (const p of this.pending.values()) p.reject(new Error(`the GPU worker failed: ${event.message || "no message"}`));
      this.pending.clear();
    };
  }

  private send<T>(m: DistributiveOmit<GpuRequest, "id">, partial?: (r: unknown, ms: number) => void) {
    const id = this.nextId++;
    const done = new Promise<Timed<T>>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (t: Timed<unknown>) => void, reject, partial });
      this.worker.postMessage({ ...m, id } as GpuRequest);
    });
    return { id, done };
  }

  /** Starts `searches` engines with the network `modelId`: the module, ONNX Runtime and the network's graph download
   *  once, and the browser keeps them. Rejects where the GPU cannot run them. */
  async start(manifest: Manifest, modelId: string, searches: number): Promise<number> {
    const find = (kind: string, test: (a: Manifest["artifacts"][number]) => boolean = () => true) =>
      manifest.artifacts.find(a => a.kind === kind && test(a));
    const module = find("gpu-module"), library = libraryOf(manifest), glue = find("ort-glue"), wasm = find("ort-wasm");
    const graph = find("graph", a => a.graphOf === modelId), model = find("model", a => a.id === modelId);
    if (!module || !library || !glue || !wasm || !graph || !model) throw new Error(`the manifest lacks the GPU module's files for ${modelId}`);
    const compiled = await WebAssembly.compileStreaming(fetch(module.url));
    const t = await this.send<{ version: VersionReply; model: { model: ModelInfo }; ms: number }>({
      type: "init", module: compiled, library: library.url, ortGlue: glue.url, ortWasm: wasm, graph, model: { ...model, name: model.id }, searches,
    }).done;
    this.version = t.reply.version;
    this.model = t.reply.model.model;
    for (let k = 0; k < searches; k++) this.slots.push(new GpuSlot(this, k));
    return t.ms;
  }

  /** The network evaluations that the worker has made so far, all its engines together: the positions of its batches
   *  (the GPU library's count, without the rows that pad a batch). */
  async evaluations(): Promise<number> {
    return (await this.send<number>({ type: "stats" }).done).reply;
  }

  /** A search on engine `k`. With a slice, `onPartial` gets the results after each slice, and `stop` ends it. */
  analyse(k: number, q: AnalysisQuery, onPartial?: (r: AnalysisReply, ms: number) => void) {
    const { id, done } = this.send<AnalysisReply>({ type: "search", engine: k, request: { id: "a", ...q } },
                                                  onPartial as (r: unknown, ms: number) => void);
    return { done, stop: () => this.worker.postMessage({ type: "stop", id } satisfies GpuRequest) };
  }

  /** Ends the worker. The requests still waiting for a reply reject with Stopped. */
  terminate() {
    this.worker.terminate();
    for (const p of this.pending.values()) p.reject(new Stopped());
    this.pending.clear();
  }
}

/** One engine of the GPU worker, as the pool sees a search engine. */
export class GpuSlot {
  readonly kind = "gpu" as const;
  constructor(private gpu: GpuEngines, readonly index: number) {}
  analyse(q: AnalysisQuery, onPartial?: (r: AnalysisReply, ms: number) => void) { return this.gpu.analyse(this.index, q, onPartial); }
  /** The pool ends the GPU worker itself (pool.ts, dropGpu). */
  terminate() {}
}

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
