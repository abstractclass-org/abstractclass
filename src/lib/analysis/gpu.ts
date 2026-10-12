// The GPU worker in the review (docs/design/15-gpu.md): whether it searches on this machine, and its first-use test.
// The site turns the GPU on for each machine after a short test (requests/06-webgpu.md). The test is the review's own
// work: the GPU joins the workers, and once both have searched for TEST_SECONDS, the GPU worker's network evaluations a
// second are compared with one CPU worker's visits a second (analysis/pool.ts, SpeedMeter). Where the GPU is slower, a CPU worker would do its work better, and Auto leaves it
// off from then on. This browser keeps the result for each network, each GPU and each build of the GPU module: the
// networks differ in size, so they differ in speed, a browser can change GPU (a laptop docked, another graphics setting
// in the system), and a new build can be faster.

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

function loadAll(): Record<string, GpuTest> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

/** The stored test of this GPU with this network and module, if any. */
export function loadGpuTest(f: GpuTestFor): GpuTest | null {
  const t = loadAll()[testKey(f)];
  return t && Number.isFinite(t.gpu) && Number.isFinite(t.cpu) ? t : null;
}

export function saveGpuTest(f: GpuTestFor, test: GpuTest) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadAll(), [testKey(f)]: test }));
  } catch {
    // The test then runs again on the next review.
  }
}
