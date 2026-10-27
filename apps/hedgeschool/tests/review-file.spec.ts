// A review file chosen before the page's code runs (ReviewHome.svelte, open): the prerendered Review tab shows "Load a
// review file" before its handler is attached, and the tab reads the input's file once it opens. The test holds the
// page's scripts until it has set the file. The layout test's game (tests/fixtures/hedgefund-review.json), with the
// engine off, so that nothing searches.
import { test, expect } from "@playwright/test";
import { fileInput } from "./review-file.ts";

test("a review file chosen before the page's code runs loads once the tab opens", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false })));
  let release!: () => void;
  const released = new Promise<void>(resolve => (release = resolve));
  await page.route(/\/_app\/.*\.js$/, async route => { await released; await route.continue(); });
  await page.goto("/review", { waitUntil: "domcontentloaded" });
  const input = fileInput(page);
  await expect(input).not.toHaveAttribute("data-ready"); // the tab has not opened: its code waits
  await input.setInputFiles("tests/fixtures/hedgefund-review.json");
  release();
  await page.waitForURL(/#game=/, { timeout: 60_000 });
});
