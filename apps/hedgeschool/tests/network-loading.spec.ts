// The engine's panel while the network loads (design 06, item 7): the engine header's line says "Loading the engine's
// network…" in the place of the visits, on the review and on the Analysis board, and the visits come back once the
// network is loaded. The test holds the network's files until it has read the header. The layout test's game
// (tests/fixtures/hedgefund-review.json, with its results), with the engine off, so that nothing searches.
import { test, expect, type Page } from "@playwright/test";
import { loadReviewFile } from "./review-file.ts";

const FIXTURE = "tests/fixtures/hedgefund-review.json", WORDS = "Loading the engine's network…";

/** Holds each request for a network's file (client.ts, checked) until `release` runs. A later hold comes first: the
 *  route added last answers first. */
async function holdNetworks(page: Page) {
  let release!: () => void;
  const released = new Promise<void>(resolve => (release = resolve));
  await page.route(/\/engine\/[^/]+\/model[^/]*$/, async route => { await released; await route.continue(); });
  return release;
}

/** The engine header's line: the engine's switch, the position's search bar, the visits and the gear. It waits for the
 *  page to show the line, which can take long on a busy machine. */
async function headerLine(page: Page) {
  const bar = page.getByRole("progressbar", { name: "This position's search" });
  await bar.waitFor({ timeout: 60_000 });
  return bar.locator("..");
}

test("the engine header says that the network loads, on the review and on the Analysis board", async ({ page }) => {
  let release = await holdNetworks(page);
  await page.goto("/review");
  await page.evaluate(() => localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false })));
  // The file's load stores the game with every step's results and names it in the address. The Review tab then reloads
  // to review it (src/routes/review/+page.svelte, otherGame), from the browser's store.
  await loadReviewFile(page, FIXTURE);
  let line = await headerLine(page);
  await expect(line).toContainText(WORDS);
  await expect(line).not.toContainText("visits");
  release();
  await expect(line).toContainText("visits", { timeout: 120_000 });

  // The board is a new document, which fetches the network again (client.ts, checkedFiles).
  release = await holdNetworks(page);
  await page.goto("/analysis");
  line = await headerLine(page);
  await expect(line).toContainText(WORDS);
  release();
  await expect(line).not.toContainText(WORDS, { timeout: 120_000 });
});
