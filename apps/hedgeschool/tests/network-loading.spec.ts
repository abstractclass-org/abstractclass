// The engine's panel while the network loads (design 06, item 7): the engine header's line says "Loading the engine's
// network…" in the place of the visits, on the review and on the Analysis board, and the visits come back once the
// network is loaded. The test holds the network's files until it has read the header. The layout sweep's game
// (tests/fixtures/hedgefund-review.json, with its results), with the engine off, so that nothing searches.
import { test, expect, type Page } from "@playwright/test";

const FIXTURE = "tests/fixtures/hedgefund-review.json", WORDS = "Loading the engine's network…";

/** Holds each request for a network's file (client.ts, checked) until `release` runs. */
async function holdNetworks(page: Page) {
  let release!: () => void;
  const released = new Promise<void>(resolve => (release = resolve));
  await page.route(/\/engine\/[^/]+\/model[^/]*$/, async route => { await released; await route.continue(); });
  return release;
}

/** The engine header's line: the engine's switch, the position's search bar, the visits and the gear. */
const headerLine = (page: Page) => page.getByRole("progressbar", { name: "This position's search" }).locator("..");

test("the engine header says that the network loads, on the review and on the Analysis board", async ({ page }) => {
  await page.goto("/review");
  await page.evaluate(() => localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false })));
  await page.locator('input[type="file"][accept*="json"]').first().setInputFiles(FIXTURE);
  await page.waitForURL(/#game=/);
  const address = page.url(), context = page.context();
  await page.close(); // it holds the game (reviewLock.ts)

  // Each in a new page: a page keeps the network that it checked once (client.ts, checkedFiles).
  const review = await context.newPage();
  let release = await holdNetworks(review);
  await review.goto(address);
  await expect(headerLine(review)).toContainText(WORDS);
  await expect(headerLine(review)).not.toContainText("visits");
  release();
  await expect(headerLine(review)).not.toContainText(WORDS, { timeout: 120_000 });
  await expect(headerLine(review)).toContainText("visits");
  await review.close();

  const board = await context.newPage();
  release = await holdNetworks(board);
  await board.goto("/analysis");
  await expect(headerLine(board)).toContainText(WORDS);
  release();
  await expect(headerLine(board)).not.toContainText(WORDS, { timeout: 120_000 });
});
