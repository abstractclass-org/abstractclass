// The Review tab's "Load a review file", for the browser tests that open a game from its file.
import type { Page } from "@playwright/test";

/** The Review tab's file input. */
export const fileInput = (page: Page) => page.locator('input[type="file"][accept*="json"]');

/** A review file: its path, or a file that a test makes (its name, type and contents). */
export type ReviewFileInput = string | { name: string; mimeType: string; buffer: Buffer };

/** Chooses the review file `file` in the Review tab, once the tab has opened (ReviewHome.svelte, `data-ready`). The
 *  page stores the game, names it in the address, then reloads to review it. */
export async function loadReviewFile(page: Page, file: ReviewFileInput) {
  await fileInput(page).and(page.locator("[data-ready]")).setInputFiles(file);
}
