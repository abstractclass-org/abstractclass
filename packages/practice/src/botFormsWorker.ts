// The practice bot in its Web Worker (Hedge School's design 24), for every form (botForms.ts): the practice bot's
// worker (botWorker.ts), with the evaluators of the threaded bot. Its network runs on the GPU (ONNX Runtime Web on
// WebGPU, as the GPU worker runs it), or on CPU workers (the engine's evaluator workers, which this worker starts). Each
// evaluator takes the network's sizes that the page gives from its manifest (library.ts, sizesOption).
import { fetchArtifact } from "@abstractclass/engine/artifacts.ts";
import { sizesOption, type CpuEvaluatorLibrary, type EngineLibrary } from "@abstractclass/engine/library.ts";
import { setUpOrt } from "@abstractclass/engine/ort.ts";
import { serveBot } from "./botWorker.ts";

const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;

serveBot({
  async gpu(m) {
    if (!m.gpu) throw new Error("the bot's gpu form lacks its files");
    const ort = await import("onnxruntime-web/webgpu");
    const [wasm, graph] = await Promise.all([fetchArtifact(m.gpu.ortWasm), fetchArtifact(m.gpu.graph)]);
    setUpOrt(ort, m.gpu.ortGlue, wasm);
    return (await load<EngineLibrary>(m.gpu.library)).createOrtEvaluator(ort, graph, sizesOption(m));
  },
  async cpu(m, model) {
    if (!m.cpu) throw new Error("the bot's cpu form lacks its files");
    const { worker, module, workers } = m.cpu;
    return (await load<CpuEvaluatorLibrary>(m.cpu.library)).createCpuEvaluator(module, model, {
      workers, maxRows: m.threads, makeWorker: () => new Worker(worker, { type: "module" }), ...sizesOption(m),
    });
  },
});
