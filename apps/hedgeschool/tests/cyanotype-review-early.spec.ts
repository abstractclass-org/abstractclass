// Cyanotype's review page before its code runs, as Hedge School's (its design 22, "Its first paint", and
// review-file.spec.ts), on its preview (CYANOTYPE_BASE_URL). Each test holds every script of the page, so the
// prerendered page and the script in its head (apps/cyanotype/src/lib/review/pageMarks.ts) act alone:
// - the marks before the first paint: an address that names a game shows the line "Reading the game with the engine's
//   rules…" in place of the Review tab, any other shows the Review tab, and a last review kept in this browser keeps
//   the room of "Continue your last review".
// - a review file chosen before the page's code runs: the Review tab reads it once it opens. This test needs the
//   engine's files, and skips, with a message, when the preview has none.
// One case lets the code run: an address with an empty game id (`#game=`) names no game, so the Review tab shows.
// Run: npx playwright test tests/cyanotype-review-early.spec.ts, with CYANOTYPE_BASE_URL.
import { expect, test, type Page } from "./page-log.ts";
import { declineGames } from "./cyanotype-consent.ts";
import { keepBefore } from "./keep-before.ts";
import { fileInput } from "./review-file.ts";
import { LAST_REVIEW_KEY } from "../../cyanotype/src/lib/site.ts";
import { CYANOTYPE, LITE, STORED, keepSettings, noReview } from "./cyanotype-review.ts";

/** Holds every script that `page` asks for from now on, until the call that it answers. On the preview, the held
 *  scripts stop DOMContentLoaded (the page's code is in module scripts), so the tests wait only for the response. */
async function holdScripts(page: Page): Promise<() => void> {
  let release!: () => void;
  const released = new Promise<void>(resolve => (release = resolve));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await released;
    await route.continue();
  });
  return release;
}

/** Opens `address` on Cyanotype as a new page load, with its scripts held: a change of the `#` alone would not load the
 *  page again. Waits until the prerendered page holds the Review tab's file input, which comes after the line and the
 *  tab's heading. */
async function openHeld(page: Page, address: string) {
  await page.goto("about:blank");
  await page.goto(new URL(address, CYANOTYPE).href, { waitUntil: "commit" });
  await expect(fileInput(page)).toBeAttached();
}

const heading = (page: Page) => page.getByRole("heading", { name: "Review your Blueprints game" });
const reading = (page: Page) => page.getByText("Reading the game with the engine's rules…");
/** The room of "Continue your last review": its text, in a row that keeps its height and shows nothing. */
const lastRoom = (page: Page) => page.locator("strong", { hasText: "Continue your last review" });

// The visitor's Decline of the practice games' link: the consent banner would cover the page (cyanotype-consent.ts).
test.beforeEach(async ({ context }) => { await declineGames(context); });

test("before the page's code runs, an address that names a game shows the line, and any other the Review tab",
     async ({ page }) => {
  test.skip(!CYANOTYPE, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
  await holdScripts(page); // never released: the page's code does not run
  for (const address of ["/review#game=g1", "/review#packed=AbC",
                         `/review#${new URLSearchParams({ from: "https://www.example.org" })}`]) {
    await openHeld(page, address);
    await expect(reading(page), address).toBeVisible();
    await expect(heading(page), address).toBeHidden();
  }
  for (const address of ["/review", "/review#game=", `/review#${new URLSearchParams({ record: "1. 2@1,-5 *" })}`]) {
    await openHeld(page, address);
    await expect(heading(page), address).toBeVisible();
    await expect(reading(page), address).toBeHidden();
    await expect(lastRoom(page), address).toBeHidden(); // no last review kept: no room
  }
});

test("before the page's code runs, a last review kept in this browser keeps the room of its link", async ({ page }) => {
  test.skip(!CYANOTYPE, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
  await keepBefore(page, LAST_REVIEW_KEY, { id: "g1" }); // the head's script reads only whether the key holds a value
  await holdScripts(page);
  await openHeld(page, "/review");
  await expect(heading(page)).toBeVisible();
  // The row keeps its height and shows nothing (`invisible`): its text has a box, above the heading
  const room = await lastRoom(page).boundingBox(), top = await heading(page).boundingBox();
  expect(room?.height).toBeGreaterThan(0);
  expect(room!.y).toBeLessThan(top!.y);
  await expect(lastRoom(page)).not.toBeVisible();
});

test("an address with an empty game id gets the Review tab once the page's code runs, as on Hedge School",
     async ({ page }) => {
  test.skip(!CYANOTYPE, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
  await page.goto(new URL("/review#game=", CYANOTYPE).href);
  await expect(heading(page)).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("footer")).toBeVisible(); // the tab has read the browser's games
  await expect(reading(page)).toBeHidden();
});

test("a review file chosen before the page's code runs loads once the tab opens", async ({ page }) => {
  const skip = await noReview(page);
  test.skip(!!skip, skip);
  await keepSettings(page, { on: false, ...LITE }, {}); // the engine off: nothing searches
  const release = await holdScripts(page);
  await page.goto(new URL("/review", CYANOTYPE).href, { waitUntil: "commit" });
  const input = fileInput(page);
  await input.setInputFiles(STORED);
  await expect(input).not.toHaveAttribute("data-ready"); // the tab has not opened: its code waits
  release();
  await page.waitForURL(/#game=/, { timeout: 60_000 });
});
