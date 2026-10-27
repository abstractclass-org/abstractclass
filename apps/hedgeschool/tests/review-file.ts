// The Review tab's "Load a review file", for the browser tests that open a game from its file.
import type { Page } from "@playwright/test";

/** The Review tab's file input. */
export const fileInput = (page: Page) => page.locator('input[type="file"][accept*="json"]').first();

/** Chooses the review file `path` in the Review tab, once the tab has opened (ReviewHome.svelte, `data-ready`): a file
 *  set before, in the prerendered page, waits until the tab opens. The page stores the game, names it in the address,
 *  then reloads to review it. */
export async function loadReviewFile(page: Page, path: string) {
  await page.locator('input[type="file"][data-ready]').waitFor({ state: "attached" });
  await fileInput(page).setInputFiles(path);
}
