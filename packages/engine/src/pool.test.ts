// Checks that a pool takes a rules worker that the page started before it: the review page starts one once the
// engine's manifest is read, before it chooses the pool (the review's, or a review snapshot's). The pool does not start the
// worker a second time, and its rules work. Also checks the GPU's first-use test when the GPU leaves the pool, and while
// no search that it needs runs. And a worker that fails for good (it runs out of memory): the pool starts another in
// its place and runs the task once more, and a worker that dies at each start does not start again and again.
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PROTOCOL } from "./protocol.ts";
import type { Manifest } from "./client.ts";
import type { GpuEngines } from "./gpuClient.ts";
import type { SearchEngine, SpeedMeter } from "./pool.ts";
import type { AnalysisQuery } from "./protocol.ts";

/** A worker that keeps the messages that it gets, and answers each with a version of the site's protocol (and a
 *  search's visits). A worker that `fails` picks for a message fails for good on it, as a worker out of memory does: it
 *  answers nothing more, and its error event comes. One whose `refuses` picks a message answers it with an error. */
class FakeWorker {
  static made: FakeWorker[] = [];
  static fails: ((w: FakeWorker, m: { type: string }) => boolean) | null = null;
  static refuses: ((w: FakeWorker, m: { type: string }) => boolean) | null = null;
  sent: { type: string }[] = [];
  dead = false;
  ended = false;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { message: string; preventDefault(): void }) => void) | null = null;
  constructor() { FakeWorker.made.push(this); }
  postMessage(m: { type: string; id: number }) {
    this.sent.push(m);
    if (this.dead) return;
    if (FakeWorker.fails?.(this, m)) {
      this.dead = true;
      setImmediate(() => this.onerror?.({ message: "Out of memory", preventDefault() {} }));
      return;
    }
    if (FakeWorker.refuses?.(this, m)) {
      setImmediate(() => this.onmessage?.({ data: { type: "error", id: m.id, message: "the search failed" } }));
      return;
    }
    const reply = { id: "v", protocol: PROTOCOL, build: "b", search: "the search", rules: "r", model: null, trained: [],
                    rootInfo: { visits: 1 } };
    setImmediate(() => this.onmessage?.({ data: { type: "reply", id: m.id, reply, ms: 0, memory: 0 } }));
  }
  terminate() { this.ended = true; }
  /** The searches that it was sent. */
  get searches() { return this.sent.filter(m => m.type === "call" || m.type === "search").length; }
}
globalThis.Worker = FakeWorker as unknown as typeof Worker;
globalThis.fetch = (async () => new Response("")) as typeof fetch;
WebAssembly.compileStreaming = (async () => ({})) as unknown as typeof WebAssembly.compileStreaming;

/** Lets the promises in flight settle, and the fake workers' replies come. */
const settle = () => new Promise(r => setImmediate(r));

const { EngineWorker } = await import("./client.ts");
const gpuClient = await import("./gpuClient.ts");
const { EnginePool } = await import("./pool.ts");

const MANIFEST = { artifacts: [
  { kind: "module", id: "module", url: "/engine/module/engine.wasm" },
  { kind: "gpu-library", id: "library", url: "/engine/library/library.js" },
  // The SHA-256 of no bytes: what the fake fetch gives (client.ts, checked)
  { kind: "model", id: "net", url: "/engine/net/model.bin",
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
  { kind: "gpu-module", id: "gpu-module", url: "/engine/gpu/engine.wasm" },
  { kind: "ort-glue", id: "ort-glue", url: "/engine/ort/glue.mjs" },
  { kind: "ort-wasm", id: "ort-wasm", url: "/engine/ort/ort.wasm" },
  { kind: "graph", id: "graph", graphOf: "net", url: "/engine/net/model.onnx" },
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

/** A task's work: one search, and what it ran on. */
const searchOn = (ran: string[] = []) => async (e: SearchEngine) => {
  ran.push(e.kind);
  await e.analyse({} as AnalysisQuery).done;
  return "searched";
};

/** A pool of one search worker, started: the fake worker of its search worker, and of its rules worker. */
async function startedPool() {
  const pool = new EnginePool(1, new EngineWorker());
  await pool.start(MANIFEST, "net");
  const [rules, first] = FakeWorker.made.slice(-2);
  return { pool, rules, first, made: FakeWorker.made.length };
}

test("a worker that fails after it loaded: one starts in its place, the task runs again, the next tasks go to it",
     async () => {
  const { pool, first, made } = await startedPool();
  FakeWorker.fails = (w, m) => w === first && m.type === "call";
  try {
    assert.equal(await pool.run(1, "a", searchOn()), "searched");
    assert.equal(FakeWorker.made.length, made + 1);
    const next = FakeWorker.made.at(-1)!;
    assert.ok(first.ended); // the pool ended the worker that failed
    assert.deepEqual(next.sent.map(m => m.type), ["init", "model", "call"]); // the task ran once more, on the new one
    assert.equal(await pool.run(1, "b", searchOn()), "searched");
    assert.equal(await pool.run(1, "c", searchOn()), "searched");
    assert.deepEqual([first.searches, next.searches, pool.engines.length], [1, 3, 1]);
  } finally {
    FakeWorker.fails = null;
    pool.terminate();
  }
});

test("a worker that fails at each start after it loads: one starts in its place, none in place of that one",
     async () => {
  const { pool, rules, made } = await startedPool();
  FakeWorker.fails = (w, m) => w !== rules && m.type === "call";
  try {
    // The task fails on the second worker too: it fails as a search does (the panel's "Engine error")
    await assert.rejects(pool.run(1, "a", searchOn()), /^Error: the engine worker failed: Out of memory$/);
    assert.equal(FakeWorker.made.length, made + 1);
    assert.equal(pool.engines.length, 0);
    // No worker is left: a later task fails at once, and starts none
    await assert.rejects(pool.run(1, "b", searchOn()), /Out of memory/);
    assert.equal(FakeWorker.made.length, made + 1);
  } finally {
    FakeWorker.fails = null;
    pool.terminate();
  }
});

test("a worker that fails as it starts in place of one that failed: the pool drops it, the task fails", async () => {
  const { pool, first, made } = await startedPool();
  FakeWorker.fails = (w, m) => m.type === "call" ? w === first : m.type === "init"; // the workers after the first
  try {
    await assert.rejects(pool.run(1, "a", searchOn()), /Out of memory/);
    assert.equal(FakeWorker.made.length, made + 1);
    assert.equal(pool.engines.length, 0);
  } finally {
    FakeWorker.fails = null;
    pool.terminate();
  }
});

test("a search that fails on a live worker fails alone: the worker stays, and takes the next task", async () => {
  const { pool, first, made } = await startedPool();
  FakeWorker.refuses = (w, m) => w === first && m.type === "call";
  try {
    await assert.rejects(pool.run(1, "a", searchOn()), /^Error: the search failed$/);
    FakeWorker.refuses = null;
    assert.equal(await pool.run(1, "b", searchOn()), "searched");
    assert.deepEqual([FakeWorker.made.length, first.searches, first.ended], [made, 2, false]); // one run each
  } finally {
    FakeWorker.refuses = null;
    pool.terminate();
  }
});

test("a GPU worker that fails: the GPU leaves the pool, its task runs again on a CPU worker, and no worker starts",
     async () => {
  const pool = new EnginePool(0, new EngineWorker());
  const gpu = new gpuClient.GpuEngines();
  await gpu.start(MANIFEST, "net", 1);
  const gpuWorker = FakeWorker.made.at(-1)!, made = FakeWorker.made.length;
  FakeWorker.fails = (w, m) => w === gpuWorker && m.type === "search";
  const lost: unknown[] = [], ran: string[] = [];
  pool.onGpuLost = e => lost.push(e);
  try {
    pool.addGpu(gpu);
    const task = pool.run(1, "a", searchOn(ran));
    while (!lost.length) await settle();
    assert.match(String(lost[0]), /the engine worker failed: Out of memory/);
    assert.deepEqual([pool.hasGpu, gpuWorker.ended, pool.waiting], [false, true, 1]); // the task waits for a CPU worker
    const internals = pool as unknown as { free: unknown[]; dispatch(): void };
    internals.free.push({ kind: "cpu", terminate() {}, analyse: () => ({ stop() {},
      done: Promise.resolve({ ms: 0, reply: { rootInfo: { visits: 1 } } }) }) });
    internals.dispatch();
    assert.equal(await task, "searched");
    assert.deepEqual(ran, ["gpu", "cpu"]);
    assert.deepEqual([FakeWorker.made.length, pool.engines.length], [made, 0]); // a GPU slot has none in its place
  } finally {
    FakeWorker.fails = null;
    pool.terminate();
  }
});
