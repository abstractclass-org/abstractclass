// Checks the script in Cyanotype's review page's head (pageMarks.ts) as the page holds it, as Hedge School's test does:
// the marks that it puts on the root element before the first paint, for each way in after the `#` and for a last
// review kept. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { REVIEW_PAGE_SCRIPT } from "./pageMarks.ts";
import { LAST_REVIEW_KEY } from "#lib/site.ts";

const record = '[Blue "a"] [Red "b"]\n\n1. 1:-1,1>2:0,-1 2. 1:-1,1>2:-2,1 1:0,2>2:0,3 *';
const at = (address: string) => new URL(address, "https://cyanotype.abstractclass.org");

/** Runs the head's script at an address (`search` and `hash` as `location` gives them), with a browser's storage: the
 *  root element's marks after it. `storage` null: the browser blocks storage, so that each read throws. */
function marks(address: string, storage: Record<string, string> | null = {}, root = { dataset: {} as Record<string, string> }) {
  const blocked = new Proxy({}, { get() { throw new Error("SecurityError"); } });
  const localStorage = storage ? { getItem: (key: string) => storage[key] ?? null } : blocked;
  const script = new Function("document", "location", "localStorage", REVIEW_PAGE_SCRIPT);
  script({ documentElement: root }, at(address), localStorage);
  return root.dataset;
}

// The page's code (src/routes/review/+page.svelte) reads after the `#` a shared review (`packed`) or a partner's kept
// review (`from`), else a kept game's id (the first `game`, when it is not empty).
test("an address that names a game marks the page, in each of its forms", () => {
  for (const address of [
    "/review#game=g1", "/review#game=g1&at=3", "/review#game=g1&game=",
    "/review#packed=AbC", `/review#${new URLSearchParams({ from: "https://www.example.org", save: "https://www.example.org/s" })}`,
  ]) {
    assert.deepEqual(marks(address), { reviewGame: "" }, address);
  }
});

test("an address that names no game leaves the page unmarked: the Review tab shows", () => {
  // The page reads the first `game`: `#game=&game=g1` names none. Hedge School's older addresses are not Cyanotype's:
  // an older query's `?game=` and a tool's game from before the import page get the Review tab. So does a record,
  // which only the import page takes.
  for (const address of ["/review", "/review#", "/review#at=3", "/review#game=", "/review#game=&game=g1",
                         "/review?game=g1", `/review#${new URLSearchParams({ tool: "userscript", v: "old", record })}`,
                         `/review#${new URLSearchParams({ record })}`, `/review#${encodeURIComponent(record)}`]) {
    assert.deepEqual(marks(address), {}, address);
  }
});

test("a last review that the store keeps marks the page, and a mark that no longer holds goes", () => {
  const root = { dataset: {} as Record<string, string> };
  assert.deepEqual(marks("/review#game=g1", { [LAST_REVIEW_KEY]: "g1" }, root), { reviewGame: "", reviewLast: "" });
  // The page's code runs the script again for an address that a navigation in the page opened.
  assert.deepEqual(marks("/review", {}, root), {});
});

test("blocked storage keeps no room for the last review, and the address still marks the page", () => {
  assert.deepEqual(marks("/review#game=g1", null), { reviewGame: "" });
  assert.deepEqual(marks("/review", null), {});
});
