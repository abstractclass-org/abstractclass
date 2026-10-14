// The GPU module in a Web Worker (requests/06-webgpu.md, step 2): several engines, a search each, whose network
// evaluations the module's JavaScript half (gpu_engine.mjs) gathers into batches for ONNX Runtime Web on WebGPU. Each
// engine takes one request at a time. A search runs in slices, as in the CPU worker (channel.ts, searchInSlices). The
// engines search at once, so their evaluations reach the GPU together.
import * as ort from "onnxruntime-web/webgpu";
import { fetchArtifact } from "./artifacts.ts";
import { setUpOrt } from "./ort.ts";
import { searchInSlices } from "./channel.ts";
import { loadLibrary, type GpuEngine, type GpuEngines } from "./library.ts";
import type { GpuInit, GpuReply, GpuRequest } from "./gpuMessages.ts";
import { isError } from "./protocol.ts";
import { errorText } from "#lib/errors.ts";

let gpu: GpuEngines | null = null;
const queues: Promise<void>[] = [];
const stopped = new Set<number>();
const post = (m: GpuReply) => self.postMessage(m);
const reply = (id: number, value: unknown, ms = 0, memory = 0) => post({ type: "reply", id, reply: value, ms, memory });

async function init(m: GpuInit) {
  const t0 = performance.now();
  const lib = await loadLibrary(m.library);
  const support = lib.gpuEngineSupport();
  if (!support.ok) throw new Error(`the GPU module cannot run here: ${support.reason}`);
  const [wasm, graph, model] = await Promise.all([fetchArtifact(m.ortWasm), fetchArtifact(m.graph), fetchArtifact(m.model)]);
  setUpOrt(ort, m.ortGlue, wasm);
  const evaluator = await lib.createOrtEvaluator(ort, graph);
  const made = await lib.createGpuEngines(m.module, evaluator, { searches: m.searches, log: line => console.debug(line) });
  const refused = (await made.loadModel(model, { name: m.model.name })).find(isError);
  if (refused) throw new Error(`the GPU module did not load the network: ${refused.error}`);
  gpu = made;
  reply(m.id, JSON.parse(await made.engines[0].call({ id: "v", action: "query_version" })), performance.now() - t0); // its version
}

async function search(id: number, engine: GpuEngine, request: object) {
  const t0 = performance.now();
  const last = await searchInSlices(request, `q${id}`, async r => JSON.parse(await engine.call(r)),
                                    partial => post({ type: "partial", id, reply: partial, ms: performance.now() - t0 }),
                                    () => stopped.has(id));
  stopped.delete(id);
  reply(id, last, performance.now() - t0, engine.memoryBytes());
}

self.onmessage = (event: MessageEvent<GpuRequest>) => {
  const m = event.data;
  if (m.type === "stop") { stopped.add(m.id); return; }
  if (m.type === "stats") { reply(m.id, gpu?.stats().positions ?? 0); return; }
  if (m.type === "init") { init(m).catch(e => post({ type: "error", id: m.id, message: errorText(e) })); return; }
  // One request at a time for each engine, in order
  const k = m.engine;
  queues[k] = (queues[k] ?? Promise.resolve())
    .then(() => {
      const engine = gpu?.engines[k];
      if (!engine) throw new Error(`the GPU worker has no engine ${k}`);
      return search(m.id, engine, m.request);
    })
    .catch(e => post({ type: "error", id: m.id, message: errorText(e) }));
};
