// HedgeFund's forms (docs/design/24-practice.md): the practice bot (@abstractclass/practice's bot.ts) starts in the first
// form that this browser runs, with a fall back to the next. Enclosure's engine has the threaded bot, with its network
// on the GPU or on CPU workers (hedgefundWorker.ts), and the bot with one search thread.
import { compile, gpuFilesOf, libraryOf, type ArtifactKind, type Manifest } from "@abstractclass/engine/client.ts";
import { gpuSupport } from "@abstractclass/engine/gpuClient.ts";
import { GPU_SEARCHES, gpuAdapterName, gpuFaster, loadGpuTest } from "@abstractclass/analysis/gpu.svelte.ts";
import { PracticeBot } from "@abstractclass/practice/bot.ts";
import type { BotMode, ThreadedFiles } from "@abstractclass/practice/botMessages.ts";
import type { EngineSettings } from "#lib/analysis/engineSettings.ts";

/** Whether this browser has JSPI (WebAssembly.Suspending and WebAssembly.promising), which the threaded bot needs. */
function hasJspi(): boolean {
  const wasm = WebAssembly as unknown as { Suspending?: unknown; promising?: unknown };
  return typeof wasm.Suspending === "function" && typeof wasm.promising === "function";
}

/** The bot's forms to try, in order (design 24): the GPU where the engine settings let it (with Auto, not where the GPU's
 *  first-use test found it slower than a worker, design 15), then the CPU workers, both through the threaded bot, then
 *  one search thread. */
async function botModes(manifest: Manifest, network: string, engine: EngineSettings): Promise<BotMode[]> {
  const modes: BotMode[] = [];
  if (hasJspi()) {
    if (engine.gpu !== "off" && gpuSupport().ok && (engine.gpu === "on" || (await gpuNotSlower(manifest, network)))) modes.push("gpu");
    modes.push("cpu");
  }
  modes.push("single");
  return modes;
}

async function gpuNotSlower(manifest: Manifest, network: string): Promise<boolean> {
  const adapter = await gpuAdapterName(), module = manifest.artifacts.find(a => a.kind === "gpu-module")?.id;
  if (!adapter || !module) return false;
  const test = loadGpuTest({ network, adapter, module });
  return !test || gpuFaster(test);
}

/** The threaded bot's files for a form. The CPU form runs on `workers` workers, with two search threads for each (the
 *  engine repository's measurement used 8 threads on 4 workers). None for the form with one search thread. */
async function threadedFiles(manifest: Manifest, network: string, mode: BotMode, workers: number): Promise<ThreadedFiles | undefined> {
  const file = (kind: ArtifactKind, name?: string) => manifest.artifacts.find(a => a.kind === kind && (!name || a.url.endsWith(`/${name}`)));
  if (mode === "gpu") {
    const f = gpuFilesOf(manifest, network), lib = libraryOf(manifest);
    if (!f || !lib) throw new Error(`the manifest lacks the GPU's files for ${network}`);
    return { threads: GPU_SEARCHES, gpu: { library: lib.url, ortGlue: f.glue.url, ortWasm: f.wasm, graph: f.graph } };
  }
  if (mode === "cpu") {
    const pool = file("cpu-evaluator-library", "cpu_evaluator.mjs"), worker = file("cpu-evaluator-library", "cpu_eval_worker.mjs");
    const evaluator = file("practice-evaluator");
    if (!pool || !worker || !evaluator) throw new Error("the manifest lacks the CPU evaluator's files");
    return { threads: 2 * workers, cpu: { library: pool.url, worker: worker.url, module: await compile(evaluator.url), workers } };
  }
}

/** Starts the bot in the first form that runs in this browser (botModes): a form that fails to start gives way to the
 *  next. */
export async function startBot(manifest: Manifest, network: string, engine: EngineSettings, seed: number): Promise<PracticeBot> {
  let failure: unknown = new Error("no form of the practice bot runs here");
  for (const mode of await botModes(manifest, network, engine)) {
    const bot = new PracticeBot("enclosure", mode, new Worker(new URL("./hedgefundWorker.ts", import.meta.url), { type: "module" }));
    try {
      await bot.start(manifest, network, seed, await threadedFiles(manifest, network, mode, engine.workers));
      return bot;
    } catch (e) {
      bot.terminate();
      failure = e;
    }
  }
  throw failure;
}
