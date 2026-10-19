// The page's side of the practice bot (botWorker.ts, docs/design/24-practice.md): it starts the bot in the first form that
// this browser runs, and sends it GTP commands, one at a time.
import { WorkerChannel } from "@abstractclass/engine/channel.ts";
import { checked, compile, gpuFilesOf, libraryOf, modelOf, type ArtifactKind, type Manifest } from "@abstractclass/engine/client.ts";
import { gpuSupport } from "@abstractclass/engine/gpuClient.ts";
import { GPU_SEARCHES, gpuAdapterName, gpuFaster, loadGpuTest } from "@abstractclass/analysis/gpu.svelte.ts";
import type { EngineSettings } from "#lib/analysis/engineSettings.ts";
import { gtpAnswer } from "./practice.ts";
import type { BotMode, BotRequest } from "./botMessages.ts";

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

/** The practice bot in its own worker, in one form. */
export class PracticeBot {
  private channel = new WorkerChannel<BotRequest>(new Worker(new URL("./botWorker.ts", import.meta.url), { type: "module" }));
  constructor(readonly mode: BotMode) {}

  /** Starts the bot with the network `network` and the seed `seed`. The CPU form runs on `workers` workers, with two
   *  search threads for each (the engine repository's measurement used 8 threads on 4 workers). */
  async start(manifest: Manifest, network: string, seed: number, workers: number): Promise<void> {
    const file = (kind: ArtifactKind, name?: string) => manifest.artifacts.find(a => a.kind === kind && (!name || a.url.endsWith(`/${name}`)));
    const library = file("practice-library"), model = modelOf(manifest, network);
    const module = file(this.mode === "single" ? "practice-module" : "practice-threaded-module");
    if (!library || !model || !module) throw new Error("the manifest lacks the practice bot's files");
    let gpu, cpu;
    if (this.mode === "gpu") {
      const f = gpuFilesOf(manifest, network), lib = libraryOf(manifest);
      if (!f || !lib) throw new Error(`the manifest lacks the GPU's files for ${network}`);
      gpu = { library: lib.url, ortGlue: f.glue.url, ortWasm: f.wasm, graph: f.graph };
    } else if (this.mode === "cpu") {
      const pool = file("cpu-evaluator-library", "cpu_evaluator.mjs"), worker = file("cpu-evaluator-library", "cpu_eval_worker.mjs");
      const evaluator = file("practice-evaluator");
      if (!pool || !worker || !evaluator) throw new Error("the manifest lacks the CPU evaluator's files");
      cpu = { library: pool.url, worker: worker.url, module: await compile(evaluator.url), workers };
    }
    const threads = this.mode === "gpu" ? GPU_SEARCHES : 2 * workers;
    const [compiled, checkedModel] = await Promise.all([compile(module.url), checked(model)]);
    gtpAnswer((await this.channel.send<string>({ type: "init", mode: this.mode, seed, threads, library: library.url,
                                                 module: compiled, model: checkedModel, gpu, cpu }).done).reply);
  }

  /** A GTP command's answer. Throws with the bot's message when it refuses the command. */
  async command(line: string): Promise<string> {
    return gtpAnswer((await this.channel.send<string>({ type: "command", line }).done).reply);
  }

  /** Ends the worker, and its CPU evaluators with it. */
  terminate() { this.channel.terminate(); }
}

/** Starts the bot in the first form that runs in this browser (botModes): a form that fails to start gives way to the
 *  next. */
export async function startBot(manifest: Manifest, network: string, engine: EngineSettings, seed: number): Promise<PracticeBot> {
  let failure: unknown = new Error("no form of the practice bot runs here");
  for (const mode of await botModes(manifest, network, engine)) {
    const bot = new PracticeBot(mode);
    try {
      await bot.start(manifest, network, seed, engine.workers);
      return bot;
    } catch (e) {
      bot.terminate();
      failure = e;
    }
  }
  throw failure;
}
