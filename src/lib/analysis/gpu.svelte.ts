// The GPU worker in the review (docs/design/15-gpu.md): whether it searches on this machine, and its first-use test.
// The site turns the GPU on for each machine after a short test (requests/06-webgpu.md). The test is the review's own
// work: the GPU joins the workers, and once both have searched for TEST_SECONDS, the GPU worker's network evaluations a
// second are compared with one CPU worker's visits a second (analysis/pool.ts, SpeedMeter). Where the GPU is slower, a
// CPU worker would do its work better, and Auto leaves it off from then on. This browser keeps the result for each
// network, each GPU and each build of the GPU module: the networks differ in size, so they differ in speed, a browser can
// change GPU (a laptop docked, another graphics setting in the system), and a new build can be faster.
import type { EnginePool } from "./pool.ts";
import type { GpuMode } from "./engineSettings.ts";
import { gpuFilesOf, megabytes, type Manifest } from "#lib/engine/client.ts";
import { GpuEngines, gpuSupport } from "#lib/engine/gpuClient.ts";
import { errorText } from "#lib/errors.ts";
import { readLocalJson, writeLocal } from "#lib/storage/local.ts";

/** The searches that the GPU worker runs at once: one for each WebAssembly instance, their evaluations batched. The
 *  engine repository measured 16 (its v2/docs/decisions/build.md, "The GPU module"). */
export const GPU_SEARCHES = 16;
/** How long each kind searches before the test compares them. */
export const TEST_SECONDS = 20;

/** A test's result: the GPU worker's evaluations a second, and one CPU worker's visits a second. */
export interface GpuTest { gpu: number; cpu: number; at: string }

/** The GPU that WebGPU gives this page, by its vendor and architecture ("nvidia blackwell"), or null where it gives
 *  none. Browsers give no finer name, for privacy. */
export async function gpuAdapterName(): Promise<string | null> {
  const gpu = (navigator as { gpu?: { requestAdapter(): Promise<{ info?: { vendor?: string; architecture?: string } } | null> } }).gpu;
  const adapter = await gpu?.requestAdapter().catch(() => null);
  if (!adapter) return null;
  return [adapter.info?.vendor, adapter.info?.architecture].filter(Boolean).join(" ") || "unnamed GPU";
}

export const gpuFaster = (t: GpuTest) => t.gpu > t.cpu;

/** What the GPU does in this review, for the engine settings' line. */
export type GpuStatus =
  | { state: "off" }
  | { state: "unsupported"; reason: string }
  | { state: "waiting" }
  | { state: "loading" }
  | { state: "testing" }
  | { state: "on"; adapter: string; test: GpuTest | null }
  | { state: "slower"; adapter: string; test: GpuTest }
  | { state: "failed"; message: string };

/** The GPU's speed as a multiple of a worker's, to two figures: "9.6", "0.94". */
export const gpuRatio = (t: GpuTest) => String(Number((t.gpu / t.cpu).toPrecision(2)));

export function gpuStatusText(s: GpuStatus): string {
  switch (s.state) {
    case "off": return "";
    case "unsupported": return `This browser cannot use the GPU: it has ${s.reason}.`;
    case "waiting": return "Waiting: it starts when the review has more work than the workers can take.";
    case "loading": return "Loading the GPU's files…";
    case "testing": return "In use. Testing its speed against a worker…";
    case "on": return s.test ? `In use, ${s.adapter}: ${gpuRatio(s.test)} times a worker's speed.` : `In use, ${s.adapter}.`;
    case "slower": return `Off: ${s.adapter} is slower than a worker (${gpuRatio(s.test)} times its speed).`;
    case "failed": return `The GPU did not start: ${s.message}`;
  }
}

// Version 4: the results also for each build of the GPU module. Version 3: the GPU's speed from its evaluations,
// sampled (version 2 counted only its searches that ended, too few on a slow GPU). Version 2 kept the results for each
// network and each GPU, version 1 for each network.
const KEY = "learn-enclosure:gpu:4";

/** What a test's result holds for: the network, the GPU, and the GPU module's build (its id in the manifest). */
export interface GpuTestFor { network: string; adapter: string; module: string }
const testKey = (f: GpuTestFor) => `${f.network} ${f.adapter} ${f.module}`;

const loadAll = (): Record<string, GpuTest> => readLocalJson<Record<string, GpuTest>>(KEY) ?? {};

/** The stored test of this GPU with this network and module, if any. */
export function loadGpuTest(f: GpuTestFor): GpuTest | null {
  const t = loadAll()[testKey(f)];
  return t && Number.isFinite(t.gpu) && Number.isFinite(t.cpu) ? t : null;
}

/** Keeps a test's result. Where storage is blocked, the test runs again on the next review. */
export const saveGpuTest = (f: GpuTestFor, test: GpuTest) => writeLocal(KEY, JSON.stringify({ ...loadAll(), [testKey(f)]: test }));

/** The GPU's first download for the network `id`, in MB: the GPU module, ONNX Runtime and the network's graph. The
 *  engine's library and the network come with the CPU workers already. */
export function gpuDownloadMB(manifest: Manifest, id: string): string {
  const f = gpuFilesOf(manifest, id);
  return f ? megabytes(f.module.download + f.glue.download + f.wasm.download + f.graph.download) : "?";
}

let adapterName: Promise<string | null> | null = null; // the GPU that WebGPU gives the page, asked once

/** The GPU of one pool, from the setting (Off, On, Auto) and the stored tests: it starts the GPU worker once the pool's
 *  workers have more work than they take (a finished review needs no GPU), runs Auto's first-use test, and drops the GPU
 *  where the setting or the test says so. The page makes one for each pool, and ends it when another pool takes over. */
export class GpuControl {
  status = $state<GpuStatus>({ state: "off" });
  private mode: GpuMode = "off";
  private starting = false;
  private ended = false;

  constructor(private pool: EnginePool, private manifest: Manifest, private network: string) {
    pool.onGpuLost = e => { if (!this.ended) this.status = { state: "failed", message: errorText(e) }; };
  }

  /** Applies the setting: drops the GPU, keeps it, or starts it once the pool has a backlog. */
  async apply(mode: GpuMode) {
    this.mode = mode;
    const p = this.pool;
    p.onBacklog = null;
    if (mode === "off") {
      p.dropGpu();
      this.status = { state: "off" };
      return;
    }
    const support = gpuSupport();
    if (!support.ok) { this.status = { state: "unsupported", reason: support.reason! }; return; }
    const adapter = await (adapterName ??= gpuAdapterName());
    if (this.ended || this.mode !== mode) return; // changed meanwhile: a later call decides
    if (!adapter) { this.status = { state: "unsupported", reason: "no GPU for WebGPU" }; return; }
    const module = this.manifest.artifacts.find(a => a.kind === "gpu-module")?.id;
    if (!module) { this.status = { state: "unsupported", reason: "no GPU module in this build of the site" }; return; }
    const testFor = { network: this.network, adapter, module }, test = loadGpuTest(testFor);
    if (mode === "auto" && test && !gpuFaster(test)) {
      p.dropGpu();
      this.status = { state: "slower", adapter, test };
      return;
    }
    if (p.hasGpu) {
      if (this.status.state !== "testing") this.status = { state: "on", adapter, test };
      return;
    }
    const start = () => { p.onBacklog = null; void this.start(testFor, mode === "auto" && !test); };
    if (p.backlogged) start();
    else { p.onBacklog = start; this.status = { state: "waiting" }; }
  }

  private async start(testFor: GpuTestFor, testing: boolean) {
    if (this.starting) return;
    this.starting = true;
    this.status = { state: "loading" };
    const gpu = new GpuEngines();
    try {
      await gpu.start(this.manifest, testFor.network, GPU_SEARCHES);
    } catch (e) {
      gpu.terminate();
      if (!this.ended) this.status = { state: "failed", message: errorText(e) };
      return;
    } finally {
      this.starting = false;
    }
    if (this.ended || this.mode === "off") { gpu.terminate(); return; } // another pool, or the GPU turned off meanwhile
    this.pool.addGpu(gpu);
    const adapter = testFor.adapter;
    if (!testing) { this.status = { state: "on", adapter, test: loadGpuTest(testFor) }; return; }
    this.status = { state: "testing" };
    const speed = await this.pool.measureGpu(TEST_SECONDS);
    const test = { gpu: Math.round(speed.gpu), cpu: Math.round(speed.cpu), at: new Date().toISOString() };
    saveGpuTest(testFor, test);
    if (this.ended) return;
    if (this.mode === "on" || gpuFaster(test)) this.status = { state: "on", adapter, test };
    else { this.pool.dropGpu(); this.status = { state: "slower", adapter, test }; }
  }

  /** Ends the control: another pool took over, or the page closed. A GPU still loading then ends when it is ready. */
  end() {
    this.ended = true;
    this.pool.onBacklog = null;
    this.pool.onGpuLost = null;
  }
}
