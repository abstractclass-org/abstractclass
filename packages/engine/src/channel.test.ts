// Checks the page's side of a worker (WorkerChannel): a request that the page sends after the worker ended rejects with
// Stopped, as a request still waiting does. A network load sends its request only once the page has checked the
// network (client.ts, checked), and the pool can end meanwhile. And the worker's side of a search in slices
// (searchInSlices): it yields between slices without a timer, and a stop ends it at the next slice. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers";
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

/** An engine's search of three slices: its replies, and the requests that it got. It answers a terminate at once. */
function slices() {
  const replies = [{ isDuringSearch: true }, { isDuringSearch: true }, { done: true }], got: object[] = [];
  let next = 0;
  const call = (request: object) => {
    got.push(request);
    return (request as { action?: string }).action === "terminate" ? { terminated: true } : replies[next++];
  };
  return { got, call };
}
/** Resolves after `n` turns of the event loop. */
const turns = (n: number) => new Promise<void>(resolve => {
  const next = (k: number) => (k ? setImmediate(() => next(k - 1)) : resolve());
  next(n);
});

test("a search in slices waits for no timer between its slices", async t => {
  // A hidden tab's timers run late: Chrome's from the fifth chained one at 4 ms, Edge's in a hidden tab at 15.6 ms.
  // Timers that never run stand for them.
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { got, call } = slices();
  const search = searchInSlices({ maxVisits: 96 }, "q1", call, () => {}, () => false);
  assert.deepEqual(await Promise.race([search, turns(50).then(() => "still waiting")]), { done: true });
  assert.deepEqual(got, [{ maxVisits: 96, id: "q1" }, { id: "q1", action: "continue" }, { id: "q1", action: "continue" }]);
});

test("a stop between slices ends the search at the next slice", async () => {
  const { got, call } = slices(), partials: unknown[] = [];
  const reply = await searchInSlices({ maxVisits: 96 }, "q1", call, r => partials.push(r), () => partials.length > 0);
  assert.equal(partials.length, 1);
  assert.deepEqual(got.at(-1), { id: "q1", action: "terminate", terminateId: "q1" });
  assert.deepEqual(reply, { terminated: true });
});
