// Checks the script in the review page's head (pageMarks.ts) as the page holds it: the marks that it puts on the root
// element before the first paint, for each way in after the `#` (design 22) and for a last review kept. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { REVIEW_PAGE_SCRIPT } from "./pageMarks.ts";

const record = '[Blue "a"] [Red "b"]\n\n1. D10-E13 2. Q10-R8 O11-Q10 *';

/** Runs the head's script at an address (`search` and `hash` as `location` gives them), with a browser's storage: the
 *  root element's marks after it. `storage` null: the browser blocks storage, so that each read throws. */
function marks(address: string, storage: Record<string, string> | null = {}, root = { dataset: {} as Record<string, string> }) {
  const url = new URL(address, "https://hedgeschool.abstractclass.org");
  const blocked = new Proxy({}, { get() { throw new Error("SecurityError"); } });
  const localStorage = storage ? { getItem: (key: string) => storage[key] ?? null } : blocked;
  new Function("document", "location", "localStorage", REVIEW_PAGE_SCRIPT)({ documentElement: root }, url, localStorage);
  return root.dataset;
}

test("an address that names a game marks the page, in each of its forms", () => {
  for (const address of [
    "/review#game=g1", "/review#game=g1&at=3", `/review#${new URLSearchParams({ record })}`,
    `/review#${new URLSearchParams({ tool: "bookmarklet", v: "4", site: "strategyjam.org", record })}`,
    "/review#packed=AbC", `/review#${new URLSearchParams({ from: "https://www.enclosuregame.com" })}`,
    `/review#${encodeURIComponent(record)}`, // an older tool's bare record
    "/review?game=g1", // an older address, which the page moves after the `#`
  ]) assert.deepEqual(marks(address), { reviewGame: "" }, address);
});

test("an address that names no game leaves the page unmarked: the Review tab shows", () => {
  for (const address of ["/review", "/review#", "/review#at=3", "/review#game=", "/review?game="])
    assert.deepEqual(marks(address), {}, address);
});

test("a last review that the store keeps marks the page, and a mark that no longer holds goes", async () => {
  const kept: Record<string, string> = {};
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => kept[key] ?? null, setItem: (key: string, value: string) => (kept[key] = value),
    removeItem: (key: string) => delete kept[key] } });
  const { rememberReview } = await import("#lib/game/store.ts");
  rememberReview("g1");
  const root = { dataset: {} as Record<string, string> };
  assert.deepEqual(marks("/review#game=g1", kept, root), { reviewGame: "", reviewLast: "" });
  // The page's code runs the script again for an address that a navigation in the page opened.
  rememberReview(null);
  assert.deepEqual(marks("/review", kept, root), {});
});

test("blocked storage keeps no room for the last review, and the address still marks the page", () => {
  assert.deepEqual(marks("/review#game=g1", null), { reviewGame: "" });
  assert.deepEqual(marks("/review", null), {});
});
