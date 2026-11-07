// HedgeFund in its Web Worker (docs/design/24-practice.md): the practice bot's worker (@abstractclass/practice's
// botWorker.ts), with the evaluators of Enclosure's threaded bot. Its network runs on the GPU (ONNX Runtime Web on
// WebGPU, as the GPU worker runs it), or on CPU workers (the engine's evaluator workers, which this worker starts).
import { fetchArtifact } from "@abstractclass/engine/artifacts.ts";
import type { CpuEvaluatorLibrary, EngineLibrary } from "@abstractclass/engine/library.ts";
import { setUpOrt } from "@abstractclass/engine/ort.ts";
import { serveBot } from "@abstractclass/practice/botWorker.ts";

const load = <T>(url: string) => import(/* @vite-ignore */ url) as Promise<T>;

serveBot({
  async gpu(m) {
    if (!m.gpu) throw new Error("the bot's gpu form lacks its files");
    const ort = await import("onnxruntime-web/webgpu");
    const [wasm, graph] = await Promise.all([fetchArtifact(m.gpu.ortWasm), fetchArtifact(m.gpu.graph)]);
    setUpOrt(ort, m.gpu.ortGlue, wasm);
    return (await load<EngineLibrary>(m.gpu.library)).createOrtEvaluator(ort, graph);
  },
  async cpu(m, model) {
    if (!m.cpu) throw new Error("the bot's cpu form lacks its files");
    const { worker, module, workers } = m.cpu;
    return (await load<CpuEvaluatorLibrary>(m.cpu.library))
      .createCpuEvaluator(module, model, { workers, maxRows: m.threads, makeWorker: () => new Worker(worker, { type: "module" }) });
  },
});
