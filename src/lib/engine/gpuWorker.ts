// The GPU module in a Web Worker (requests/06-webgpu.md, step 2): several engines, a search each, whose network
// evaluations the module's JavaScript half (gpu_engine.mjs) gathers into batches for ONNX Runtime Web on WebGPU. Each
// engine takes one request at a time. A search runs in slices, as in the CPU worker (worker.ts): after each slice the
// worker posts the results so far, then sends "continue", or "terminate" when the page stopped it. The engines search
// at once, so their evaluations reach the GPU together.
import * as ort from "onnxruntime-web/webgpu";
import { fetchArtifact } from "./artifacts.ts";
import { loadLibrary, type GpuEngine, type GpuEngines } from "./library.ts";
import type { GpuInit, GpuReply, GpuRequest } from "./gpuMessages.ts";
import { errorText } from "#lib/errors.ts";

let gpu: GpuEngines | null = null;
let engines: GpuEngine[] = [];
const queues: Promise<void>[] = [];
const stopped = new Set<number>();
const post = (m: GpuReply) => self.postMessage(m);

async function init(m: GpuInit) {
  const t0 = performance.now();
  const lib = await loadLibrary(m.library);
  const support = lib.gpuEngineSupport();
  if (!support.ok) throw new Error(`the GPU module cannot run here: ${support.reason}`);
  // ONNX Runtime's WebAssembly is given as bytes: it is stored compressed (artifacts.ts). One thread: the page is not
  // cross-origin isolated, and the GPU does the network's work.
  const [wasm, graph, model] = await Promise.all([fetchArtifact(m.ortWasm), fetchArtifact(m.graph), fetchArtifact(m.model)]);
  ort.env.wasm.wasmPaths = { mjs: m.ortGlue };
  ort.env.wasm.wasmBinary = wasm;
  ort.env.wasm.numThreads = 1;
  const evaluator = await lib.createOrtEvaluator(ort, graph);
  const made = await lib.createGpuEngines(m.module, evaluator, { searches: m.searches, log: line => console.debug(line) });
  const loaded = await made.loadModel(model, { name: m.model.name });
  gpu = made;
  engines = made.engines;
  const version = JSON.parse(await engines[0].call({ id: "v", action: "query_version" }));
  post({ type: "ready", id: m.id, version, model: loaded[0], ms: performance.now() - t0 });
}

async function search(id: number, engine: GpuEngine, request: object) {
  const t0 = performance.now(), qid = `q${id}`;
  let reply = JSON.parse(await engine.call({ ...request, id: qid })) as { isDuringSearch?: boolean };
  while (reply.isDuringSearch) {
    post({ type: "partial", id, reply, ms: performance.now() - t0 });
    reply = JSON.parse(await engine.call(stopped.has(id) ? { id: qid, action: "terminate", terminateId: qid } : { id: qid, action: "continue" }));
  }
  stopped.delete(id);
  post({ type: "reply", id, reply, ms: performance.now() - t0, memory: engine.memoryBytes() });
}

self.onmessage = (event: MessageEvent<GpuRequest>) => {
  const m = event.data;
  if (m.type === "stop") { stopped.add(m.id); return; }
  if (m.type === "stats") { post({ type: "stats", id: m.id, evaluations: gpu?.stats().positions ?? 0 }); return; }
  if (m.type === "init") { init(m).catch(e => post({ type: "error", id: m.id, message: errorText(e) })); return; }
  // One request at a time for each engine, in order
  const k = m.engine;
  queues[k] = (queues[k] ?? Promise.resolve())
    .then(() => {
      if (!engines[k]) throw new Error(`the GPU worker has no engine ${k}`);
      return search(m.id, engines[k], m.request);
    })
    .catch(e => post({ type: "error", id: m.id, message: errorText(e) }));
};
