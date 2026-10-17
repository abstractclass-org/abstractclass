// Checks the page's side of a worker (WorkerChannel): a request that the page sends after the worker ended rejects with
// Stopped, as a request still waiting does. A network load sends its request only once the page has checked the
// network (client.ts, checked), and the pool can end meanwhile. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Stopped, WorkerChannel } from "./channel.ts";

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
