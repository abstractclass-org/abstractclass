// The Review tab's "Load a review file", for the browser tests that open a game from its file, and a review file as an
// earlier engine's review, which opens as a review snapshot.
import { readFileSync } from "node:fs";
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

/** The search of an earlier engine: not the site's. A review snapshot of an earlier engine leaves it out. */
export const EARLIER_SEARCH = "earlier-search";

/** The review file at `path` as a review by an earlier engine: its review names an engine module that no site ships,
 *  and its results are of the search EARLIER_SEARCH. The import then keeps the file's review as an earlier engine's
 *  (src/lib/game/reviewFile.ts, importReview), and the review opens as a review snapshot (design 20). `named`: the
 *  review names that search, else it names none, as an older file's does. `keep`: the results that stay, by the
 *  number of edges of their position (all by default). `maps`: the results keep their maps (true by default). */
export function earlierReview(path: string, { named = true, keep = () => true, maps = true }:
                                { named?: boolean; keep?: (edges: number) => boolean; maps?: boolean } = {}): ReviewFileInput {
  const file = JSON.parse(readFileSync(path, "utf8"));
  file.review = { ...file.review, module: "0".repeat(64), ...(named ? { search: EARLIER_SEARCH } : {}) };
  // A result's key: shape|search|model|visits|moves, and an added map's has "map|" before it
  // (@abstractclass/analysis/cache.ts, analysisKey and mapKey)
  file.analyses = file.analyses.flatMap(([key, value]: [string, Record<string, unknown>]) => {
    const parts = key.split("|"), at = key.startsWith("map|") ? 1 : 0, moves = parts[at + 4];
    if (!keep(moves ? moves.split(" ").length : 0)) return [];
    parts[at + 1] = EARLIER_SEARCH;
    return [[parts.join("|"), maps ? value : { ...value, ownership: undefined }]]; // JSON leaves out undefined
  });
  return { name: "earlier-review.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) };
}
