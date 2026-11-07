// Checks the engine settings' line during the GPU's first-use test (GpuControl, gpuStatusText), in a real pool with
// fake search engines and a fake GPU worker: no GPU runs. While a search that the test needs runs, the line says that
// the test measures the GPU's speed. While none runs, the test waits, and the line says that it continues with the next
// searches. The line follows the test to its end. Once the GPU has left the pool, or the control has ended, the test's
// searches change the line no more. Run: npm test.
import { mock, test } from "node:test";
import assert from "node:assert/strict";
import "./testing/svelteModules.ts";
import type { Manifest } from "@abstractclass/engine/client.ts";
import type { SpeedMeter } from "@abstractclass/engine/pool.ts";

/** A worker that does nothing: the pool's rules worker and the GPU worker's channel take one. */
class FakeWorker {
  onmessage: unknown = null;
  onerror: unknown = null;
  postMessage() {}
  terminate() {}
}
globalThis.Worker = FakeWorker as unknown as typeof Worker;
const stored = new Map<string, string>(); // the browser's localStorage, where the test's result goes
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem: (k: string) => stored.get(k) ?? null, setItem: (k: string, v: string) => stored.set(k, v),
  removeItem: (k: string) => stored.delete(k),
} });
Object.defineProperty(navigator, "gpu", { configurable: true, value: {
  requestAdapter: async () => ({ info: { vendor: "test", architecture: "gpu" } }),
} });

const { EngineError } = await import("@abstractclass/engine/channel.ts");
const { EngineWorker } = await import("@abstractclass/engine/client.ts");
const { EnginePool } = await import("@abstractclass/engine/pool.ts");
const { GpuEngines } = await import("@abstractclass/engine/gpuClient.ts");
const { GpuControl, gpuStatusText } = await import("./gpu.svelte.ts");

const MEASURING = "In use. Testing its speed against a worker…";
const WAITING = "In use. The speed test continues with the next searches.";
const MANIFEST = { artifacts: [{ kind: "gpu-module", id: "gpu-module" }] } as unknown as Manifest;

/** The searches that run, oldest first: `end(ms)` ends one with `ms` of search time and a visit each 10 ms, `fail` with
 *  an error. */
const runs: { kind: "cpu" | "gpu"; end: (ms: number) => void; fail: (e: Error) => void }[] = [];
const engine = (kind: "cpu" | "gpu") => ({ kind, terminate() {}, analyse: () => ({ stop() {},
  done: new Promise((resolve, fail) => runs.push({ kind, fail, end: ms => resolve({ ms, reply: { rootInfo: { visits: ms / 10 } } }) })) }) });

// The GPU worker starts at once, with one engine, in the workers' search.
mock.method(GpuEngines.prototype, "start", async function (this: InstanceType<typeof GpuEngines>) {
  this.slots.push(engine("gpu") as never);
  this.version = { search: "the search" } as never;
});
mock.method(GpuEngines.prototype, "evaluations", async () => 0);
mock.method(GpuEngines.prototype, "terminate", () => {});

const settle = async () => { for (let k = 0; k < 5; k++) await new Promise(r => setImmediate(r)); };

/** A pool of two CPU workers, Auto's control of its GPU, and the test's clock. */
function setup() {
  runs.length = 0;
  stored.clear();
  const pool = new EnginePool(0, new EngineWorker());
  pool.search = "the search";
  const internals = pool as unknown as { speed: SpeedMeter; free: unknown[] };
  internals.free.push(engine("cpu"), engine("cpu"));
  const tracked: string[] = [];
  const control = new GpuControl(pool, MANIFEST, "net", { track: name => tracked.push(name), networkName: id => id });
  const clock = performance.now;
  let now = 0, evaluations = 0;
  performance.now = () => now;
  return {
    pool, control, tracked,
    line: () => gpuStatusText(control.status),
    /** Starts `n` searches: the CPU workers take the first two, the GPU the next. */
    search: async (n: number) => {
      for (let k = 0; k < n; k++) void pool.run(0, "t", e => e.analyse({} as never).done).catch(() => {});
      await settle();
    },
    /** Ends the searches that run, each with `seconds` of search time. */
    end: async (seconds: number) => {
      for (const r of runs.splice(0)) r.end(seconds * 1000);
      await settle();
    },
    /** `seconds` of the GPU's samples, once a second, each 300 evaluations more: the test counts them only while the
     *  GPU searches. A new GPU's first sample only starts its count. */
    tick: (seconds: number) => { for (let s = 0; s < seconds; s++) { now += 1000; internals.speed.gpuSample(evaluations += 300); } },
    done: () => { pool.terminate(); performance.now = clock; },
  };
}

test("the line follows the first-use test: it measures while a search that the test needs runs, and waits between",
     async () => {
  const t = setup();
  try {
    await t.control.apply("auto");
    assert.equal(t.control.status.state, "waiting"); // the GPU starts when there is more work than the workers take
    await t.search(3);
    assert.equal(t.line(), MEASURING);
    t.tick(7); // the GPU's first sample, then 6 s
    await t.end(6); // a short review: the workers 12 s of their 20, the GPU 6 s
    assert.equal(t.line(), WAITING);
    await t.search(1);
    assert.equal(t.line(), MEASURING); // a worker searches, and the workers need seconds
    runs.splice(0)[0].fail(new Error("the search failed"));
    await settle();
    assert.equal(t.line(), WAITING); // a search that fails ends its count too
    await t.search(1);
    await t.end(8); // the workers have their 20 s
    await t.search(1);
    assert.equal(t.line(), WAITING); // a worker alone: the GPU needs seconds, and it searches only when no worker is free
    await t.end(5);
    await t.search(3);
    assert.equal(t.line(), MEASURING);
    t.tick(14); // the GPU's 20 s end the test while its search runs
    await settle();
    assert.equal(t.line(), "In use, test gpu: 3 times a worker's speed.");
    assert.equal(stored.size, 1); // the result, stored
    assert.deepEqual(t.tracked, ["gpu_test"]);
    await t.end(14);
    assert.equal(t.control.status.state, "on"); // the searches that end after the test change nothing
  } finally {
    t.done();
  }
});

test("the line stays once the GPU has left the pool (lost, or Off), or the control has ended", async () => {
  const t = setup();
  try {
    await t.control.apply("auto");
    await t.search(3);
    runs.find(r => r.kind === "gpu")!.fail(new EngineError({ id: "a", error: "the engine refused the search" }));
    await t.end(10); // the workers have their 20 s
    assert.equal(t.line(), WAITING); // a GPU search that the engine refused: the GPU stays, and its count falls
    await t.search(3);
    assert.equal(t.line(), MEASURING);
    runs.find(r => r.kind === "gpu")!.fail(new Error("the device was lost"));
    await settle();
    assert.equal(t.control.status.state, "failed");
    await t.end(10); // the workers' searches end, and the GPU's search runs again on a worker
    await t.end(10);
    assert.equal(t.control.status.state, "failed");

    await t.control.apply("auto"); // the setting again: a new GPU at the next backlog, and its test
    await t.search(3);
    assert.equal(t.line(), MEASURING);
    await t.control.apply("off");
    await t.end(10);
    assert.equal(t.control.status.state, "off");

    await t.control.apply("auto");
    await t.search(3);
    assert.equal(t.line(), MEASURING);
    t.control.end(); // another pool takes over, or the page closes
    await t.end(10);
    assert.equal(t.line(), MEASURING); // an ended control's line does not change
  } finally {
    t.done();
  }
});

test("the idle release in a hidden page, while the test waits: the line waits for more work", async () => {
  const t = setup();
  let onVisibility = () => {};
  const page = { visibilityState: "visible", addEventListener(_: string, f: () => void) { onVisibility = f; }, removeEventListener() {} };
  Object.assign(globalThis, { document: page });
  try {
    t.pool.releaseWhenIdle({ shown: 60_000, hidden: 0 });
    await t.control.apply("auto");
    await t.search(3);
    await t.end(6);
    assert.equal(t.line(), WAITING);
    page.visibilityState = "hidden"; // the page hides: the pool releases its idle engines at once, the GPU too
    onVisibility();
    await new Promise(r => setTimeout(r, 5));
    await settle();
    assert.equal(t.line(), "Waiting: it starts when there is more work than the workers can take.");
    page.visibilityState = "visible"; // and shows again
    onVisibility();
    await settle();
    assert.equal(t.control.status.state, "waiting");
  } finally {
    t.done();
    Reflect.deleteProperty(globalThis, "document");
  }
});
