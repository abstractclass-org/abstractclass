// The Review tab's "Load a review file" (ReviewHome.svelte), with the layout test's game
// (tests/fixtures/hedgefund-review.json) and the engine's search off, so that nothing searches:
// - a review file chosen before the page's code runs: the prerendered Review tab shows "Load a review file" before
//   Svelte attaches its handler. When the tab opens, it reads the input's file. The test holds every script of the page
//   until it has set the file, on the preview and on the dev server.
// - a file's game comes in as a pasted record does (design 13, src/lib/game/import.ts): the engine's rules check its
//   moves, its record gets its cut marks, and a browser that cannot keep games says so in the paste's words.
import { readFileSync } from "node:fs";
import { test, expect, type Page } from "./page-log.ts";
import { NAME, STORES } from "../../../packages/storage/src/db.ts";
import { fileInput, loadReviewFile } from "./review-file.ts";

const FIXTURE = "tests/fixtures/hedgefund-review.json";
const fixture: { record: string } = JSON.parse(readFileSync(FIXTURE, "utf8"));

/** The fixture as a file, with the record `record`. */
const withRecord = (record: string) =>
  ({ name: "changed-review.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ ...fixture, record })) });

/** The browser's store (@abstractclass/storage/db.ts): one store's keys, or one value. */
const stored = (page: Page, store: string, key?: string) => page.evaluate(([name, store, key]) => new Promise(resolve => {
  const open = indexedDB.open(name);
  open.onsuccess = () => {
    const names = open.result.objectStoreNames;
    if (!names.contains(store)) { open.result.close(); resolve(key ? undefined : []); return; }
    const s = open.result.transaction(store).objectStore(store), get = key ? s.get(key) : s.getAllKeys();
    get.onsuccess = () => { open.result.close(); resolve(get.result); };
  };
}), [NAME, store, key] as const);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false })));
});

test("a review file chosen before the page's code runs loads once the tab opens", async ({ page }) => {
  let release!: () => void;
  const released = new Promise<void>(resolve => (release = resolve));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await released;
    await route.continue();
  });
  // On the dev server, the held scripts stop DOMContentLoaded (Vite's client is a module script). So the test does not
  // wait for it: setInputFiles waits until the input is in the page.
  await page.goto("/review", { waitUntil: "commit" });
  const input = fileInput(page);
  await input.setInputFiles(FIXTURE);
  await expect(input).not.toHaveAttribute("data-ready"); // the tab has not opened: its code waits
  release();
  await page.waitForURL(/#game=/, { timeout: 60_000 });
});

test("a review file's game gets the cut marks of the moves that cut, as a pasted record does", async ({ page }) => {
  await page.goto("/review");
  await loadReviewFile(page, FIXTURE); // its record has no cut mark
  await page.waitForURL(/#game=/, { timeout: 60_000 });
  // The tab then loads the page again to review the game: the test reads the store once the review shows
  await expect(page.locator("main.review")).not.toHaveAttribute("aria-busy", { timeout: 120_000 });
  const id = new URL(page.url()).hash.slice("#game=".length);
  const kept = (await stored(page, STORES.games, id) as { record: string }).record;
  const cutEdge = /[A-T]\d+-[A-T]\d+x/g;
  expect(kept.match(cutEdge)?.length ?? 0).toBeGreaterThan(0);
  // The marks alone are added
  expect(kept.replace(cutEdge, edge => edge.slice(0, -1))).toBe(fixture.record);
});

test("a review file with an illegal move: the page says why, as for a pasted record, and keeps nothing", async ({ page }) => {
  await page.goto("/review");
  // The fourth edge is the first's again
  await loadReviewFile(page, withRecord("1. A10-D9 2. N11-Q10 K9-N11 3. A10-D9 *"));
  await expect(page.getByRole("alert")).toHaveText("Hedge School could not load this file: Edge 4 (A10-D9) is not legal "
                                                   + "in its position. Check the record from there.", { timeout: 60_000 });
  await expect(page).toHaveURL(url => url.pathname === "/review" && !url.hash);
  // No game, no variations and no results
  for (const store of Object.values(STORES)) expect(await stored(page, store), store).toEqual([]);
});

test("a review file in a browser that cannot keep games: the page says so, in the paste's words", async ({ page }) => {
  // Blocked site data: the browser opens no database. The engine's check, in its worker, passes before the store refuses.
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => { throw new DOMException("blocked", "SecurityError"); };
  });
  await page.goto("/review");
  await loadReviewFile(page, FIXTURE);
  await expect(page.getByRole("alert")).toHaveText("Hedge School could not load this file: This browser does not let the "
                                                   + "site keep games (a private window, or blocked site data).",
                                                   { timeout: 60_000 });
  await expect(page).toHaveURL(url => url.pathname === "/review" && !url.hash);
});
