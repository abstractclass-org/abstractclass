// The engine's JavaScript library: `gpu_engine.mjs` in the engine's release (kind "gpu-library" in its manifest). It
// drives both modules with the few WASI imports they need: the CPU module (createCpuEngine), and the GPU module with
// its network on ONNX Runtime (createGpuEngines, createOrtEvaluator). The workers import it by URL, so that it comes
// with the modules it drives (engine.lock.json), and the site keeps no copy of the engine's driver.

/** The CPU module (enclosure-engine.wasm), instantiated. */
export interface CpuEngine {
  /** One request, one reply line. Blocks the calling thread while the engine works. */
  call(request: object): string;
  /** Hands the module a network's bytes. Then send {"action": "load_model"}. */
  setModel(bytes: Uint8Array): void;
  /** The module's linear memory, in bytes. */
  memoryBytes(): number;
}

/** One engine of the GPU module: a search at a time. */
export interface GpuEngine {
  /** One request, one reply line, once the engine's evaluations come back from the GPU. */
  call(request: object): Promise<string>;
  memoryBytes(): number;
}

/** The GPU module's engines, their evaluations batched on the GPU. */
export interface GpuEngines {
  engines: GpuEngine[];
  /** Loads the network into every engine: their replies. */
  loadModel(bytes: Uint8Array, options: { name: string }): Promise<unknown[]>;
  /** The batches evaluated so far, and their positions (without the rows that pad a batch). */
  stats(): { batches: number; positions: number };
}

export interface EngineLibrary {
  createCpuEngine(module: WebAssembly.Module, options?: { log?: (line: string) => void }): Promise<CpuEngine>;
  gpuEngineSupport(): { ok: boolean; reason: string | null };
  createOrtEvaluator(ortModule: unknown, graph: Uint8Array): Promise<unknown>;
  createGpuEngines(module: WebAssembly.Module, evaluator: unknown, options: { searches: number; log?: (line: string) => void }):
    Promise<GpuEngines>;
}

/** The library, from its URL in the manifest. */
export const loadLibrary = (url: string) => import(/* @vite-ignore */ url) as Promise<EngineLibrary>;
