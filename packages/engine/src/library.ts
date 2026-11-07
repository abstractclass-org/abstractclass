// The engine's JavaScript library: `gpu_engine.mjs` in the engine's release (kind "gpu-library" in its manifest). It
// drives both modules with the few WASI imports they need: the CPU module (createCpuEngine), and the GPU module with
// its network on ONNX Runtime (createGpuEngines, createOrtEvaluator). The workers import it by URL, so that it comes
// with the modules it drives (engine.lock.json), and the site keeps no copy of the engine's driver. Both evaluators
// (createOrtEvaluator, and the CPU evaluator's createCpuEvaluator) take the network's sizes (`sizes`), Enclosure's by
// default: a site gives them from its manifest (sizesOption). Enclosure's releases before Blueprints' have no such
// option and give none in their manifests, so Hedge School passes none.

/** A network's sizes, which both evaluators need: the board's side, and the policy's channels a point. Enclosure's are
 *  19 and 48 (the library's default), Blueprints' 67 and 6. */
export interface NetworkSizes { board: number; policyChannels: number }
/** The evaluators' options for a manifest's networks (client.ts, Manifest): their sizes where the manifest gives them,
 *  else none, so that the library takes its default, Enclosure's. */
export const sizesOption = (manifest: { sizes?: NetworkSizes }) => (manifest.sizes ? { sizes: manifest.sizes } : {});

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
  createOrtEvaluator(ortModule: unknown, graph: Uint8Array, options?: { sizes?: NetworkSizes }): Promise<unknown>;
  createGpuEngines(module: WebAssembly.Module, evaluator: unknown, options: { searches: number; log?: (line: string) => void }):
    Promise<GpuEngines>;
}

/** The library, from its URL in the manifest. */
export const loadLibrary = (url: string) => import(/* @vite-ignore */ url) as Promise<EngineLibrary>;

/** The practice bot (practice_bot.mjs, kind "practice-library", docs/design/24-practice.md): GTP commands, one at a
 *  time, on the bot with one search thread or on the bot whose threads' positions an evaluator batches (JSPI). */
export interface PracticeLibrary {
  createPracticeBot(module: WebAssembly.Module, options?: { log?: (line: string) => void }):
    Promise<{ command(line: string): string; setModel(bytes: Uint8Array): void }>;
  createBatchedPracticeBot(module: WebAssembly.Module, evaluator: unknown, options: { maxBatch: number; log?: (line: string) => void }):
    Promise<{ command(line: string): Promise<string>; setModel(bytes: Uint8Array): Promise<void> }>;
}

/** The CPU evaluator's pool (cpu_evaluator.mjs): workers that run the network for the threaded practice bot. */
export interface CpuEvaluatorLibrary {
  createCpuEvaluator(module: WebAssembly.Module, model: Uint8Array,
                     options: { workers: number; maxRows: number; makeWorker: () => Worker; sizes?: NetworkSizes }):
    Promise<{ release(): void }>;
}
