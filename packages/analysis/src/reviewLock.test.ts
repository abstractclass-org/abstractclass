// Checks the lock that lets one tab review a game at a time (reviewLock.ts), on Node's Web Locks API, which answers as
// a browser's does for the tabs of one site: each call here stands for a tab. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { holdReview } from "./reviewLock.ts";

const tick = () => new Promise(r => setTimeout(r, 10));

test("a game's lock: one tab holds it, another waits, and a tab that takes it stops the first", async () => {
  const lost: string[] = [];
  const first = await holdReview("g1", false, () => lost.push("first"));
  assert.equal(typeof first, "function");
  assert.equal(await holdReview("g1", false, () => lost.push("second")), null); // the game is open in another tab
  const other = await holdReview("g2", false, () => lost.push("other")); // another game: its own lock
  assert.equal(typeof other, "function");
  // "Review here": the tab takes the lock, and the first tab hears that it lost it
  const taken = await holdReview("g1", true, () => lost.push("taken"));
  assert.equal(typeof taken, "function");
  await tick();
  assert.deepEqual(lost, ["first"]);
  // Once freed, the lock is free for the next tab
  taken!();
  other!();
  await tick();
  const next = await holdReview("g1", false, () => {});
  assert.equal(typeof next, "function");
  next!();
});

test("a browser without the Web Locks API reviews in every tab", async () => {
  Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
  try {
    const a = await holdReview("g3", false, () => {}), b = await holdReview("g3", false, () => {});
    assert.equal(typeof a, "function");
    assert.equal(typeof b, "function");
  } finally {
    delete (navigator as { locks?: unknown }).locks; // Navigator's own again
  }
  assert.ok(navigator.locks);
});
