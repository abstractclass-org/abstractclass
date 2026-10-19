// One engine module in a Web Worker (docs/design/02-static-site.md). Requests run one at a time, in order. A search
// runs in slices (channel.ts, searchInSlices): after each slice the worker posts the results so far and yields, so that
// a stop message can arrive. The engine continues the same tree, so slices change no result. The module runs through
// the engine's own library (library.ts, createCpuEngine), and the network comes checked by the page (client.ts,
// checked).
import { bytesOf } from "./artifacts.ts";
import { searchInSlices } from "./channel.ts";
import { loadLibrary, type CpuEngine } from "./library.ts";
import type { WorkerReply, WorkerRequest } from "./messages.ts";
import { errorText } from "#lib/errors.ts";

let engine: CpuEngine | null = null;
let queue: Promise<void> = Promise.resolve();
const stopped = new Set<number>();
const post = (m: WorkerReply) => self.postMessage(m);

function call(request: object): unknown {
  if (!engine) throw new Error("the engine module is not loaded");
  return JSON.parse(engine.call(request));
}

async function handle(m: WorkerRequest) {
  const t0 = performance.now();
  const done = (reply: unknown) => post({ type: "reply", id: m.id, reply, ms: performance.now() - t0, memory: engine!.memoryBytes() });
  if (m.type === "init") {
    const library = await loadLibrary(m.library);
    engine = await library.createCpuEngine(m.module, { log: text => console.debug(text) }); // compiled by the page (client.ts)
    done(call({ id: "v", action: "query_version" }));
  } else if (m.type === "model") {
    engine!.setModel(await bytesOf(m.model));
    done(call({ id: "load", action: "load_model", name: m.name, ...(m.settings ? { settings: m.settings } : {}) }));
  } else if (m.type === "call") {
    done(call(m.request));
  } else if (m.type === "search") {
    done(await searchInSlices(m.request, `q${m.id}`, call,
                              reply => post({ type: "partial", id: m.id, reply, ms: performance.now() - t0 }),
                              () => stopped.has(m.id)));
    stopped.delete(m.id);
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const m = event.data;
  if (m.type === "stop") { stopped.add(m.id); return; }
  queue = queue.then(() => handle(m)).catch(e => post({ type: "error", id: m.id, message: errorText(e) }));
};
