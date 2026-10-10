// One engine module in a Web Worker (docs/design/02-static-site.md). Requests run one at a time, in order. A search
// runs in slices: after each slice the worker posts the results so far and yields, so that a stop message can arrive,
// then sends "continue", or "terminate" if stopped. The engine continues the same tree, so slices change no result.
import { loadEngine, type EngineModule } from "./module.ts";
import type { WorkerReply, WorkerRequest } from "./messages.ts";
import { errorText } from "#lib/errors.ts";

let engine: EngineModule | null = null;
let queue: Promise<void> = Promise.resolve();
const stopped = new Set<number>();
const post = (m: WorkerReply) => self.postMessage(m);
const yieldToMessages = () => new Promise<void>(r => setTimeout(r, 0));

function call(request: object): unknown {
  if (!engine) throw new Error("the engine module is not loaded");
  return JSON.parse(engine.call(request));
}

async function handle(m: WorkerRequest) {
  const t0 = performance.now();
  if (m.type === "init") {
    engine = await loadEngine(m.module, text => console.debug(text)); // compiled by the page (client.ts)
    post({ type: "reply", id: m.id, reply: call({ id: "v", action: "query_version" }), ms: performance.now() - t0, memory: engine.memoryBytes() });
  } else if (m.type === "model") {
    const response = await fetch(m.url);
    if (!response.ok) throw new Error(`${m.url}: HTTP ${response.status}`);
    engine!.setModel(new Uint8Array(await response.arrayBuffer()));
    const reply = call({ id: "load", action: "load_model", name: m.name, ...(m.settings ? { settings: m.settings } : {}) });
    post({ type: "reply", id: m.id, reply, ms: performance.now() - t0, memory: engine!.memoryBytes() });
  } else if (m.type === "call") {
    post({ type: "reply", id: m.id, reply: call(m.request), ms: performance.now() - t0, memory: engine!.memoryBytes() });
  } else if (m.type === "search") {
    const qid = `q${m.id}`;
    let reply = call({ ...m.request, id: qid }) as { isDuringSearch?: boolean };
    while (reply.isDuringSearch) {
      post({ type: "partial", id: m.id, reply, ms: performance.now() - t0 });
      await yieldToMessages();
      reply = call(stopped.has(m.id) ? { id: qid, action: "terminate", terminateId: qid } : { id: qid, action: "continue" }) as typeof reply;
    }
    stopped.delete(m.id);
    post({ type: "reply", id: m.id, reply, ms: performance.now() - t0, memory: engine!.memoryBytes() });
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const m = event.data;
  if (m.type === "stop") { stopped.add(m.id); return; }
  queue = queue.then(() => handle(m)).catch(e => post({ type: "error", id: m.id, message: errorText(e) }));
};
