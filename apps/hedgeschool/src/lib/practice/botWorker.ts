// The practice bot in a Web Worker (docs/design/24-practice.md): the engine's practice bot (practice_bot.mjs), one GTP
// command at a time, in order. In one of three forms (bot.ts, botModes): the threaded bot with its network on the GPU
// (ONNX Runtime Web on WebGPU, as the GPU worker runs it), the threaded bot with its network on CPU workers (the
// engine's evaluator workers, which this worker starts), or the bot with one search thread, which needs no JSPI.
import { bytesOf, fetchArtifact } from "#lib/engine/artifacts.ts";
import type { CpuEvaluatorLibrary, EngineLibrary, PracticeLibrary } from "#lib/engine/library.ts";
import { setUpOrt } from "#lib/engine/ort.ts";
import { errorText } from "#lib/errors.ts";
import type { BotInit, BotReply, BotRequest } from "./botMessages.ts";

let bot: { command(line: string): string | Promise<string> } | null = null;
let queue: Promise<void> = Promise.resolve();
const post = (m: BotReply) => self.postMessage(m);
const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;

async function init(m: BotInit): Promise<string> {
  const library = await load<PracticeLibrary>(m.library);
  const model = await bytesOf(m.model); // checked by the page (client.ts, checked)
  if (m.mode === "single") {
    const one = await library.createPracticeBot(m.module);
    one.setModel(model);
    bot = one;
    return one.command(`enclosure-start ${m.seed}`);
  }
  let evaluator: unknown;
  if (m.mode === "gpu" && m.gpu) {
    const ort = await import("onnxruntime-web/webgpu");
    const [wasm, graph] = await Promise.all([fetchArtifact(m.gpu.ortWasm), fetchArtifact(m.gpu.graph)]);
    setUpOrt(ort, m.gpu.ortGlue, wasm);
    evaluator = await (await load<EngineLibrary>(m.gpu.library)).createOrtEvaluator(ort, graph);
  } else if (m.mode === "cpu" && m.cpu) {
    const { worker, module, workers } = m.cpu;
    evaluator = await (await load<CpuEvaluatorLibrary>(m.cpu.library))
      .createCpuEvaluator(module, model, { workers, maxRows: m.threads, makeWorker: () => new Worker(worker, { type: "module" }) });
  } else {
    throw new Error(`the bot's ${m.mode} form lacks its files`);
  }
  const threaded = await library.createBatchedPracticeBot(m.module, evaluator, { maxBatch: m.threads });
  await threaded.setModel(model);
  bot = threaded;
  return threaded.command(`enclosure-start ${m.seed} ${m.threads}`);
}

self.onmessage = (event: MessageEvent<BotRequest>) => {
  const m = event.data;
  queue = queue.then(async () => {
    const t0 = performance.now();
    const reply = m.type === "init" ? await init(m)
      : bot ? await bot.command(m.line) : (() => { throw new Error("the practice bot has not started"); })();
    post({ type: "reply", id: m.id, reply, ms: performance.now() - t0, memory: 0 });
  }).catch(e => post({ type: "error", id: m.id, message: errorText(e) }));
};
