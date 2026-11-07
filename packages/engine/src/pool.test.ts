// Checks that a pool takes a rules worker that the page started before it: the review page starts one once the
// engine's manifest is read, before it chooses the pool (the review's, or a review snapshot's). The pool does not start the
// worker a second time, and its rules work. Also checks the GPU's first-use test when the GPU leaves the pool. Run:
// npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PROTOCOL } from "./protocol.ts";
import type { Manifest } from "./client.ts";
import type { GpuEngines } from "./gpuClient.ts";
import type { SpeedMeter } from "./pool.ts";

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

const { EngineWorker } = await import("./client.ts");
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

test("the GPU's first-use test: a GPU that left the pool ends no test, and the next GPU's test goes on from the counts",
     async () => {
  // The idle release drops the GPU while its test waits, and the next backlog starts the GPU and its test again
  // (@abstractclass/analysis/gpu.svelte.ts). Only the second test may end: the first one ending too would save the test
  // and report it twice.
  const clock = performance.now;
  let now = 0;
  performance.now = () => now;
  const pool = new EnginePool(0, new EngineWorker());
  try {
    const gpuEngines = () => ({ slots: [], evaluations: async () => 0, terminate() {} }) as unknown as GpuEngines;
    const speed = (pool as unknown as { speed: SpeedMeter }).speed;
    /** 10 s of the GPU's samples, once a second: a GPU worker's first sample only starts its count. */
    const gpuFor10s = () => { for (let s = 1; s <= 11; s++) { now += 1000; speed.gpuSample(300 * s); } };
    const ended: string[] = [];
    pool.addGpu(gpuEngines());
    void pool.measureGpu(20).then(() => ended.push("first"));
    speed.watch({ kind: "gpu", terminate() {}, analyse: () => ({ done: new Promise(() => {}), stop() {} }) } as never)
      .analyse({} as never); // a GPU search that runs
    gpuFor10s();
    pool.dropGpu(); // the idle release
    pool.addGpu(gpuEngines());
    void pool.measureGpu(20).then(() => ended.push("second"));
    gpuFor10s();
    speed.watch({ kind: "cpu", terminate() {},
      analyse: () => ({ done: Promise.resolve({ ms: 20_000, reply: { rootInfo: { visits: 1600 } } }), stop() {} }) } as never)
      .analyse({} as never); // 20 s of a CPU worker's search
    await new Promise(r => setImmediate(r));
    assert.deepEqual(ended, ["second"]);
  } finally {
    pool.dropGpu();
    performance.now = clock;
  }
});

test("the GPU's first-use test waits while nothing searches, and the pool says so (onSearching)", async () => {
  // A short review ends before the test has 20 s of searches on each side. The seconds then stop, and they go on with
  // the next searches (@abstractclass/analysis/gpu.svelte.ts shows a line for each state).
  const clock = performance.now;
  let now = 0;
  performance.now = () => now;
  const pool = new EnginePool(0, new EngineWorker());
  try {
    type Run = { end: (ms: number) => void };
    /** A search engine whose searches end when the test says: `end(ms)` ends the oldest with `ms` of search time. */
    const engine = (kind: "cpu" | "gpu") => {
      const runs: Run[] = [];
      return { kind, runs, terminate() {}, analyse: () => {
        let end!: (ms: number) => void;
        const done = new Promise(resolve => { end = ms => resolve({ ms, reply: { rootInfo: { visits: ms / 10 } } }); });
        runs.push({ end });
        return { done, stop() {} };
      } };
    };
    const cpu = engine("cpu"), gpuSlot = engine("gpu");
    const internals = pool as unknown as { speed: SpeedMeter; free: unknown[] };
    internals.free.push(cpu);
    pool.addGpu({ slots: [gpuSlot], evaluations: async () => 0, terminate() {} } as unknown as GpuEngines);
    const events: boolean[] = [];
    pool.onSearching = s => events.push(s);
    const settle = () => new Promise(r => setImmediate(r));
    /** Two searches (the CPU worker takes the first, the GPU the second) that last `seconds`, the GPU sampled once a second. */
    const searchFor = async (seconds: number) => {
      const tasks = [0, 1].map(() => pool.run(0, "t", (e: { analyse: (q: never) => { done: Promise<unknown> } }) => e.analyse({} as never).done as never));
      internals.speed.gpuSample(1); // the first sample only starts the GPU's count
      for (let s = 1; s <= seconds; s++) { now += 1000; internals.speed.gpuSample(1 + 300 * s); }
      cpu.runs.shift()!.end(seconds * 1000);
      gpuSlot.runs.shift()!.end(seconds * 1000);
      await Promise.all(tasks);
      await settle();
    };
    let result: { cpu: number; gpu: number } | undefined;
    void pool.measureGpu(20).then(r => { result = r; });

    assert.equal(pool.searching, false);
    await searchFor(12); // a short review: 12 of the 20 s
    assert.deepEqual(events, [true, false]); // it searched, and it stopped
    assert.equal(pool.searching, false);
    for (let s = 0; s < 600; s++) { now += 1000; internals.speed.gpuSample(100_000 + s); } // 10 minutes with no search
    await settle();
    assert.equal(result, undefined); // the test waits: no timeout, and the idle minutes count for nothing
    await searchFor(8); // the next searches: 8 s more
    assert.deepEqual(events, [true, false, true, false]);
    const ended = result as { cpu: number; gpu: number } | undefined; // assigned in a callback: TypeScript still narrows it
    assert.ok(ended, "the test ends with the next searches");
    assert.equal(Math.round(ended.cpu), 100);
  } finally {
    pool.dropGpu();
    performance.now = clock;
  }
});
