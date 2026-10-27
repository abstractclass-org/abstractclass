// A review file chosen before the page's code runs (ReviewHome.svelte, open): the prerendered Review tab shows "Load a
// review file" before Svelte attaches its handler. When the tab opens, it reads the input's file. The test holds every
// script of the page until it has set the file, on the preview and on the dev server. The layout test's game
// (tests/fixtures/hedgefund-review.json), with the engine off, so that nothing searches.
import { test, expect } from "@playwright/test";
import { fileInput } from "./review-file.ts";

test("a review file chosen before the page's code runs loads once the tab opens", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false })));
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
  await input.setInputFiles("tests/fixtures/hedgefund-review.json");
  await expect(input).not.toHaveAttribute("data-ready"); // the tab has not opened: its code waits
  release();
  await page.waitForURL(/#game=/, { timeout: 60_000 });
});
