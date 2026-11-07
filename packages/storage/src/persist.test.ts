// Checks the request to the browser to keep the site's data (persist.ts): once a page, and only when the data is not
// kept already, with the browser's answer. Each case loads the module afresh, as a new page does. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";

let page = 0;
/** persist.ts as a new page loads it, with the browser's Storage API `storage` (none: a browser without it). */
async function newPage(storage: object | undefined) {
  Object.defineProperty(globalThis.navigator, "storage", { configurable: true, value: storage });
  return (await import(`./persist.ts?page=${++page}`)) as typeof import("./persist.ts");
}

test("the request asks once a page, and answers what the browser answered", async () => {
  let asked = 0, kept = false;
  const p = await newPage({ persisted: async () => kept, persist: async () => (asked++, (kept = true)) });
  assert.equal(await p.storageKept(), false);
  assert.equal(await p.keepStorage(), true);
  assert.equal(await p.keepStorage(), true);
  assert.equal(asked, 1);
  assert.equal(await p.storageKept(), true);
});

test("data kept already: no request", async () => {
  let asked = 0;
  const p = await newPage({ persisted: async () => true, persist: async () => (asked++, true) });
  assert.equal(await p.keepStorage(), true);
  assert.equal(asked, 0);
});

test("a browser that refuses, fails, or has no Storage API keeps the data as before", async () => {
  assert.equal(await (await newPage({ persisted: async () => false, persist: async () => false })).keepStorage(), false);
  const failing = await newPage({ persisted: async () => { throw new Error("blocked"); }, persist: async () => true });
  assert.equal(await failing.keepStorage(), false);
  assert.equal(await failing.storageKept(), null);
  const none = await newPage(undefined);
  assert.equal(await none.keepStorage(), false);
  assert.equal(await none.storageKept(), null);
});
