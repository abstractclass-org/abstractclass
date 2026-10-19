// Checks the script in the review page's head (pageMarks.ts) as the page holds it: the marks that it puts on the root
// element before the first paint, for each way in after the `#` (design 22) and for a last review kept. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { REVIEW_PAGE_SCRIPT } from "./pageMarks.ts";
import { reviewArrives } from "#lib/game/importHash.ts";
import { LAST_REVIEW } from "#lib/game/store.ts";

const record = '[Blue "a"] [Red "b"]\n\n1. D10-E13 2. Q10-R8 O11-Q10 *';
const at = (address: string) => new URL(address, "https://hedgeschool.abstractclass.org");

/** Runs the head's script at an address (`search` and `hash` as `location` gives them), with a browser's storage: the
 *  root element's marks after it. `storage` null: the browser blocks storage, so that each read throws. */
function marks(address: string, storage: Record<string, string> | null = {}, root = { dataset: {} as Record<string, string> }) {
  const blocked = new Proxy({}, { get() { throw new Error("SecurityError"); } });
  const localStorage = storage ? { getItem: (key: string) => storage[key] ?? null } : blocked;
  const script = new Function("document", "location", "localStorage", REVIEW_PAGE_SCRIPT);
  script({ documentElement: root }, at(address), localStorage);
  return root.dataset;
}

/** Whether the page's code finds a game in the address: a way in that the review takes (reviewArrives), or a kept
 *  game's id after the `#` or in an older address's query (+page.svelte, gameInAddress). The script must agree with
 *  it. */
function namesGame(address: string) {
  const url = at(address);
  return reviewArrives(url.hash) || !!new URLSearchParams(url.hash.slice(1)).get("game")
    || !!url.searchParams.get("game");
}

test("an address that names a game marks the page, in each of its forms", () => {
  for (const address of [
    "/review#game=g1", "/review#game=g1&at=3", "/review#game=g1&game=",
    `/review#${new URLSearchParams({ tool: "userscript", v: "old", site: "strategyjam.org", record })}`, // an old tool
    "/review#packed=AbC", `/review#${new URLSearchParams({ from: "https://www.enclosuregame.com" })}`,
    "/review?game=g1", // an older address, which the page moves after the `#`
  ]) {
    assert.ok(namesGame(address), address);
    assert.deepEqual(marks(address), { reviewGame: "" }, address);
  }
});

test("an address that names no game leaves the page unmarked: the Review tab shows", () => {
  // The page reads the first `game` (+page.svelte, gameInAddress): `#game=&game=g1` names none. A record, a link's or
  // an older tool's bare one, belongs to the import page (design 22).
  for (const address of ["/review", "/review#", "/review#at=3", "/review#game=", "/review#game=&game=g1",
                         "/review?game=", `/review#${new URLSearchParams({ record })}`,
                         `/review#${new URLSearchParams({ record, save: "https://www.enclosuregame.com/s" })}`,
                         `/review#${encodeURIComponent(record)}`]) {
    assert.ok(!namesGame(address), address);
    assert.deepEqual(marks(address), {}, address);
  }
});

test("a last review that the store keeps marks the page, and a mark that no longer holds goes", () => {
  const root = { dataset: {} as Record<string, string> };
  assert.deepEqual(marks("/review#game=g1", { [LAST_REVIEW]: "g1" }, root), { reviewGame: "", reviewLast: "" });
  // The page's code runs the script again for an address that a navigation in the page opened.
  assert.deepEqual(marks("/review", {}, root), {});
});

test("blocked storage keeps no room for the last review, and the address still marks the page", () => {
  assert.deepEqual(marks("/review#game=g1", null), { reviewGame: "" });
  assert.deepEqual(marks("/review", null), {});
});
