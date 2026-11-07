// The practice bot's forms (Hedge School's design 24): the practice bot (bot.ts) starts in the first form that this
// browser runs, with a fall back to the next. The threaded bot runs with its network on the GPU or on CPU workers
// (botFormsWorker.ts), and the bot with one search thread runs the network in its own module. Enclosure's engine and
// Blueprints' have all three forms. The evaluators take the network's sizes from the manifest (library.ts,
// sizesOption): Blueprints' release gives them, and Enclosure's gives none, so it keeps the library's default.
import { compile, gpuFilesOf, libraryOf, type ArtifactKind, type Manifest } from "@abstractclass/engine/client.ts";
import { gpuSupport } from "@abstractclass/engine/gpuClient.ts";
import { sizesOption } from "@abstractclass/engine/library.ts";
import { GPU_SEARCHES, gpuAdapterName, gpuFaster, loadGpuTest } from "@abstractclass/analysis/gpu.svelte.ts";
import type { EngineSettings } from "@abstractclass/analysis/settings.ts";
import { PracticeBot } from "./bot.ts";
import type { BotMode, ThreadedFiles } from "./botMessages.ts";

/** Where the bot runs, for the line under the game's board: "HedgeFund 0.2 Lite, 64 visits, Low variety, on the GPU." */
export const BOT_WHERE: Record<BotMode, string> = { gpu: "on the GPU", cpu: "on the CPU workers", single: "on one thread" };

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
 *  engine repository's measurement used 8 threads on 4 workers), and at most the evaluator's `maxThreads` where the
 *  manifest gives it (Blueprints' 128: its worker traps at 256). None for the form with one search thread. The threads
 *  are the most that a move uses: KataGo's play settings give each thread at least 8 of a move's new playouts
 *  (`minPlayoutsPerThread`), so a move below 16 visits searches with one thread (design 24, item 14). */
async function threadedFiles(manifest: Manifest, network: string, mode: BotMode, workers: number): Promise<ThreadedFiles | undefined> {
  const file = (kind: ArtifactKind, name?: string) => manifest.artifacts.find(a => a.kind === kind && (!name || a.url.endsWith(`/${name}`)));
  if (mode === "gpu") {
    const f = gpuFilesOf(manifest, network), lib = libraryOf(manifest);
    if (!f || !lib) throw new Error(`the manifest lacks the GPU's files for ${network}`);
    return { threads: GPU_SEARCHES, ...sizesOption(manifest), gpu: { library: lib.url, ortGlue: f.glue.url, ortWasm: f.wasm, graph: f.graph } };
  }
  if (mode === "cpu") {
    const pool = file("cpu-evaluator-library", "cpu_evaluator.mjs"), worker = file("cpu-evaluator-library", "cpu_eval_worker.mjs");
    const evaluator = file("practice-evaluator");
    if (!pool || !worker || !evaluator) throw new Error("the manifest lacks the CPU evaluator's files");
    return { threads: Math.min(2 * workers, evaluator.maxThreads ?? Infinity), ...sizesOption(manifest),
             cpu: { library: pool.url, worker: worker.url, module: await compile(evaluator.url), workers } };
  }
}

/** Starts the bot in the first form that runs in this browser (botModes): a form that fails to start gives way to the
 *  next. `game` is the game's name in the bot's own commands (`enclosure`, `blueprints`). */
export async function startBot(game: string, manifest: Manifest, network: string, engine: EngineSettings, seed: number): Promise<PracticeBot> {
  let failure: unknown = new Error("no form of the practice bot runs here");
  for (const mode of await botModes(manifest, network, engine)) {
    const bot = new PracticeBot(game, mode, new Worker(new URL("./botFormsWorker.ts", import.meta.url), { type: "module" }));
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
