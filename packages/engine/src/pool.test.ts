// Checks that a pool takes a rules worker that the page started before it: the review page starts one once the
// engine's manifest is read, before it chooses the pool (the review's, or a review snapshot's). The pool does not start the
// worker a second time, and its rules work. Also checks the GPU's first-use test when the GPU leaves the pool, and while
// no search that it needs runs. Run: npm test.
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

test("the GPU's first-use test waits while no search that it needs runs, and says so (onMeasuring)", async () => {
  // A short review ends before the test has 20 s of searches on each side. Its seconds then stop. Once the CPU workers
  // have their 20 s, a search on a worker alone (the GPU searches only when no worker is free) adds none either. They
  // continue when the GPU searches again (@abstractclass/analysis/gpu.svelte.ts shows a line for each state).
  const clock = performance.now;
  let now = 0;
  performance.now = () => now;
  const pool = new EnginePool(0, new EngineWorker());
  try {
    /** The searches that run: each ends when the test says, with `ms` of search time and a visit each 10 ms. */
    const ends: ((ms: number) => void)[] = [];
    const engine = (kind: "cpu" | "gpu") => ({ kind, terminate() {}, analyse: () => ({ stop() {},
      done: new Promise(resolve => ends.push(ms => resolve({ ms, reply: { rootInfo: { visits: ms / 10 } } }))) }) });
    const internals = pool as unknown as { speed: SpeedMeter; free: unknown[] };
    internals.free.push(engine("cpu"), engine("cpu"));
    pool.addGpu({ slots: [engine("gpu")], evaluations: async () => 0, terminate() {} } as unknown as GpuEngines);
    let evaluations = 0;
    /** `seconds` of the GPU's samples, once a second, each 300 evaluations more: the meter counts them only while the GPU
     *  searches. */
    const tick = (seconds: number) => {
      for (let s = 0; s < seconds; s++) { now += 1000; internals.speed.gpuSample(evaluations += 300); }
    };
    const settle = () => new Promise(r => setImmediate(r));
    /** `n` searches of `seconds` each: the two CPU workers take the first two, the GPU the third. */
    const search = async (n: number, seconds: number) => {
      const tasks = Array.from({ length: n }, () => pool.run(0, "t", e => e.analyse({} as never).done));
      tick(seconds);
      for (const end of ends.splice(0)) end(seconds * 1000);
      await Promise.all(tasks);
      await settle();
    };
    const events: boolean[] = [], results: { cpu: number; gpu: number }[] = [];
    void pool.measureGpu(20, m => events.push(m)).then(r => results.push(r));
    tick(1); // the GPU's first sample only starts its count

    assert.deepEqual(events, [false]); // it tells at once: nothing searches
    await search(3, 12); // a short review: the workers 24 s, the GPU 12 s of its 20
    assert.deepEqual(events, [false, true, false]);
    tick(600); // 10 minutes with no search
    await search(1, 5); // a search on a worker alone
    assert.deepEqual(events, [false, true, false]); // the GPU still needs seconds, and it does not search
    assert.equal(results.length, 0); // the test waits: no timeout, and the idle minutes count for nothing
    await search(3, 8); // the next searches: 8 s more on the GPU end the test while they run
    assert.deepEqual(events, [false, true, false, true]); // and the ended test hears nothing more
    assert.equal(results.length, 1);
    assert.equal(Math.round(results[0].cpu), 100);
    assert.equal(Math.round(results[0].gpu), 300);
  } finally {
    pool.dropGpu();
    performance.now = clock;
  }
});

/** A search engine whose searches end when the test says (`ends`), with a reply that the pool's speed meter reads. */
const heldEngine = (kind: "cpu" | "gpu", ends: (() => void)[]) => ({ kind, terminate() {}, analyse: () => ({ stop() {},
  done: new Promise(resolve => ends.push(() => resolve({ ms: 0, reply: { rootInfo: { visits: 0 } } }))) }) });

test("a task for the CPU alone waits for a CPU worker: a free GPU slot takes the next task instead", async () => {
  // The weak walls (protocol 0.6.2): the GPU module refuses the field, so their search runs on a CPU worker. It is the
  // most urgent task here, and the GPU slot takes the less urgent search behind it.
  const pool = new EnginePool(0, new EngineWorker());
  try {
    const ran: string[] = [], ends: (() => void)[] = [];
    const internals = pool as unknown as { free: unknown[] };
    const work = (name: string) => async (e: { kind: string; analyse: (q: never) => { done: Promise<unknown> } }) => {
      ran.push(`${name} on ${e.kind}`);
      await e.analyse({} as never).done;
    };
    pool.addGpu({ slots: [heldEngine("gpu", ends)], evaluations: async () => 0, terminate() {} } as unknown as GpuEngines);
    const walls = pool.run(9, "walls", work("walls"), { cpu: true });
    const sweep = pool.run(1, "sweep", work("sweep"));
    await new Promise(r => setImmediate(r));
    assert.deepEqual(ran, ["sweep on gpu"]); // the walls wait: the only free engine is the GPU's
    internals.free.push(heldEngine("cpu", ends));
    const pass = pool.run(0, "pass", work("pass")); // a CPU worker comes free: the walls take it, before this task
    await new Promise(r => setImmediate(r));
    assert.deepEqual(ran, ["sweep on gpu", "walls on cpu"]);
    while (ends.length) { ends.splice(0).forEach(end => end()); await new Promise(r => setImmediate(r)); }
    await Promise.all([walls, sweep, pass]);
    assert.equal(ran.length, 3); // the pass runs on the engine that frees first
  } finally {
    pool.dropGpu();
  }
});

test("a task for the CPU alone stops a less urgent search on a CPU worker, not on the GPU", async () => {
  const pool = new EnginePool(0, new EngineWorker());
  try {
    const stopped: string[] = [];
    const internals = pool as unknown as { free: unknown[] };
    const ends: (() => void)[] = [];
    const slow = (name: string) => (_e: unknown, onStop: (stop: () => void) => void) =>
      new Promise<void>(resolve => { ends.push(resolve); onStop(() => { stopped.push(name); resolve(); }); });
    internals.free.push(heldEngine("cpu", []));
    pool.addGpu({ slots: [heldEngine("gpu", [])], evaluations: async () => 0, terminate() {} } as unknown as GpuEngines);
    void pool.run(1, "on cpu", slow("on cpu")).catch(() => {});
    const onGpu = pool.run(2, "on gpu", slow("on gpu"));
    await new Promise(r => setImmediate(r));
    const walls = pool.run(9, "walls", async e => e.kind, { cpu: true });
    assert.deepEqual(stopped, ["on cpu"]); // the GPU's search is less urgent too, and goes on
    assert.equal(await walls, "cpu");
    ends.forEach(end => end());
    await onGpu;
  } finally {
    pool.halt();
    pool.dropGpu();
  }
});
