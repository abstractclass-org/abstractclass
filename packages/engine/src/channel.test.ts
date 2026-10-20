// Checks the page's side of a worker (WorkerChannel): a request that the page sends after the worker ended rejects with
// Stopped, as a request still waiting does. A network load sends its request only once the page has checked the
// network (client.ts, checked), and the pool can end meanwhile. And the worker's side of a search in slices
// (searchInSlices): it yields between slices without a timer, a stop ends it at the next slice, and its time limit at
// the end of the slice in which the limit passes. Run: npm test.
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { Stopped, WorkerChannel, searchInSlices } from "./channel.ts";

/** A worker that takes every message and never replies. */
const silent = () => ({ postMessage() {}, terminate() {} }) as unknown as Worker;

test("a request still waiting when the worker ends rejects with Stopped", async () => {
  const channel = new WorkerChannel<{ id: number; type: "call" }>(silent());
  const { done } = channel.send({ type: "call" });
  channel.terminate();
  await assert.rejects(done, Stopped);
});

test("a request sent after the worker ended rejects with Stopped", async () => {
  const channel = new WorkerChannel<{ id: number; type: "call" }>(silent());
  channel.terminate();
  await assert.rejects(channel.send({ type: "call" }).done, Stopped);
});

/** An engine's search of three slices: its replies, and the requests that it got. It answers a terminate at once. With
 *  `t`, each slice runs for `ms` on the clock of `performance.now`. */
function slices(t?: TestContext, ms = 0) {
  let now = 0;
  t?.mock.method(performance, "now", () => now);
  const replies = [{ isDuringSearch: true }, { isDuringSearch: true }, { done: true }], got: object[] = [];
  let next = 0;
  const call = (request: object) => {
    got.push(request);
    if ((request as { action?: string }).action === "terminate") return { terminated: true };
    now += ms;
    return replies[next++];
  };
  return { got, call };
}
/** Resolves after `n` turns of the event loop. */
const turns = async (n: number) => { for (let k = 0; k < n; k++) await new Promise(resolve => setImmediate(resolve)); };

test("a search in slices waits for no timer between its slices", async t => {
  // A worker's chained timers run late: after the first five, 4 ms at least, and 15.6 ms in a hidden tab of Edge.
  // Timers that never run stand for them.
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { got, call } = slices();
  const search = searchInSlices({ maxVisits: 96 }, "q1", call, () => {}, () => false);
  assert.deepEqual(await Promise.race([search, turns(50).then(() => "still waiting")]), { reply: { done: true }, late: false });
  assert.deepEqual(got, [{ maxVisits: 96, id: "q1" }, { id: "q1", action: "continue" }, { id: "q1", action: "continue" }]);
});

test("a stop between slices ends the search at the next slice", async () => {
  const { got, call } = slices(), partials: unknown[] = [];
  const ended = await searchInSlices({ maxVisits: 96 }, "q1", call, r => partials.push(r), () => partials.length > 0);
  assert.equal(partials.length, 1);
  assert.deepEqual(got.at(-1), { id: "q1", action: "terminate", terminateId: "q1" });
  assert.deepEqual(ended, { reply: { terminated: true }, late: false });
});

test("a time limit ends the search at the end of the slice in which it passes", async t => {
  const { got, call } = slices(t, 40), partials: unknown[] = []; // the limit passes in the second slice
  const ended = await searchInSlices({ maxVisits: 96 }, "q1", call, r => partials.push(r), () => false, 60);
  assert.equal(partials.length, 2);
  assert.deepEqual(got.slice(1), [{ id: "q1", action: "continue" }, { id: "q1", action: "terminate", terminateId: "q1" }]);
  assert.deepEqual(ended, { reply: { terminated: true }, late: true });
});

test("a search that ends its visits within its time limit is not late", async t => {
  const { call } = slices(t, 40);
  assert.deepEqual(await searchInSlices({ maxVisits: 96 }, "q1", call, () => {}, () => false, 120), { reply: { done: true }, late: false });
});
