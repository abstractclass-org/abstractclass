// The page's side of the GPU worker (gpuWorker.ts): the GPU module's engines, each a search at a time, all batched
// on the GPU. Each engine is a slot that the pool gives work to as it gives work to a CPU worker (pool.ts).
import { WorkerChannel } from "./channel.ts";
import { checked, checkVersion, compile, gpuFilesOf, libraryOf, type Manifest } from "./client.ts";
import type { GpuRequest } from "./gpuMessages.ts";
import type { AnalysisQuery, AnalysisReply, VersionReply } from "./protocol.ts";

/** Whether this browser can run the GPU module: JSPI (WebAssembly.Suspending and WebAssembly.promising) and WebGPU.
 *  The GPU library checks the same in the worker (gpuEngineSupport). */
export function gpuSupport(): { ok: boolean; reason: string | null } {
  const wasm = WebAssembly as unknown as { Suspending?: unknown; promising?: unknown };
  const jspi = typeof wasm.Suspending === "function" && typeof wasm.promising === "function";
  const webgpu = typeof navigator !== "undefined" && "gpu" in navigator && !!(navigator as { gpu?: unknown }).gpu;
  return { ok: jspi && webgpu, reason: !jspi ? "no JSPI" : !webgpu ? "no WebGPU" : null };
}

export class GpuEngines {
  private channel = new WorkerChannel<GpuRequest>(new Worker(new URL("./gpuWorker.ts", import.meta.url), { type: "module" }));
  readonly slots: GpuSlot[] = [];
  version: VersionReply | null = null; // the GPU module's, once it has started

  /** Starts `searches` engines with the network `modelId`: the module, ONNX Runtime and the network's graph download
   *  once, and the browser keeps them. The network comes checked by the page, as the CPU workers have it (checked).
   *  Rejects where the GPU cannot run them, and a protocol the site does not speak. */
  async start(manifest: Manifest, modelId: string, searches: number): Promise<void> {
    const files = gpuFilesOf(manifest, modelId), library = libraryOf(manifest);
    if (!files || !library) throw new Error(`the manifest lacks the GPU module's files for ${modelId}`);
    const [module, model] = await Promise.all([compile(files.module.url), checked(files.model)]);
    const { reply } = await this.channel.send<VersionReply>({
      type: "init", module, library: library.url, ortGlue: files.glue.url, ortWasm: files.wasm, graph: files.graph,
      model, name: files.model.id, searches,
    }).done;
    this.version = checkVersion(reply);
    for (let k = 0; k < searches; k++) this.slots.push(new GpuSlot(this, k));
  }

  /** The network evaluations that the worker has made so far, all its engines together: the positions of its batches
   *  (the GPU library's count, without the rows that pad a batch). */
  async evaluations(): Promise<number> {
    return (await this.channel.send<number>({ type: "stats" }).done).reply;
  }

  /** A search on engine `k`. With a slice, `onPartial` gets the results after each slice, and `stop` ends it. */
  analyse(k: number, q: AnalysisQuery, onPartial?: (r: AnalysisReply, ms: number) => void) {
    const { id, done } = this.channel.send<AnalysisReply>({ type: "search", engine: k, request: { id: "a", ...q } },
                                                          onPartial as (r: unknown, ms: number) => void);
    return { done, stop: () => this.channel.post({ type: "stop", id }) };
  }

  /** Ends the worker. The requests still waiting for a reply reject with Stopped. */
  terminate() { this.channel.terminate(); }
}

/** One engine of the GPU worker, as the pool sees a search engine. */
export class GpuSlot {
  readonly kind = "gpu" as const;
  constructor(private gpu: GpuEngines, readonly index: number) {}
  analyse(q: AnalysisQuery, onPartial?: (r: AnalysisReply, ms: number) => void) { return this.gpu.analyse(this.index, q, onPartial); }
  /** The pool ends the GPU worker itself (pool.ts, dropGpu). */
  terminate() {}
}
