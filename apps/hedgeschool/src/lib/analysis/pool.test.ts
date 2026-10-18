// Checks that a pool takes a rules worker that the page started before it: the review page starts one once the
// engine's manifest is read, before it chooses the pool (the review's, or a snapshot's). The pool does not start the
// worker a second time, and its rules work. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PROTOCOL } from "#lib/engine/protocol.ts";
import type { Manifest } from "#lib/engine/client.ts";

/** A worker that keeps the messages that it gets, and answers each with a version of the site's protocol. */
class FakeWorker {
  static made: FakeWorker[] = [];
  sent: { type: string }[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: unknown = null;
  constructor() { FakeWorker.made.push(this); }
  postMessage(m: { type: string; id: number }) {
    this.sent.push(m);
    const reply = { id: "v", protocol: PROTOCOL, build: "b", search: "the search", rules: "r", model: null, trained: [] };
    setImmediate(() => this.onmessage?.({ data: { type: "reply", id: m.id, reply, ms: 0, memory: 0 } }));
  }
  terminate() {}
}
globalThis.Worker = FakeWorker as unknown as typeof Worker;
globalThis.fetch = (async () => new Response("")) as typeof fetch;
WebAssembly.compileStreaming = (async () => ({})) as unknown as typeof WebAssembly.compileStreaming;

const { EngineWorker } = await import("#lib/engine/client.ts");
const { EnginePool } = await import("./pool.ts");

const MANIFEST = { artifacts: [
  { kind: "module", id: "module", url: "/engine/module/engine.wasm" },
  { kind: "gpu-library", id: "library", url: "/engine/library/library.js" },
  { kind: "model", id: "net", url: "/engine/net/model.bin" },
] } as unknown as Manifest;

test("a pool takes a rules worker started before it, and starts it no second time", async () => {
  const rules = new EngineWorker();
  void rules.init(MANIFEST);
  const pool = new EnginePool(0, rules);
  await pool.start(MANIFEST, "net");
  assert.equal(pool.rules, rules);
  assert.equal(FakeWorker.made.length, 1); // the pool made no rules worker of its own
  assert.deepEqual(FakeWorker.made[0].sent.map(m => m.type), ["init"]);
  assert.equal(pool.search, "the search");
});
