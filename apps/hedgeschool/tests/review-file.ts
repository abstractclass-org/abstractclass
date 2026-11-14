// The Review tab's "Load a review file", for the browser tests that open a game from its file, and a review file as an
// earlier engine's review, which opens as a review snapshot.
import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import { MAP_PREFIX, analysisKey, readAnalysisKey } from "../../../packages/analysis/src/cache.ts";
import { keepBefore } from "./keep-before.ts";
import { CONSENT_KEY, DISPLAY_KEY, ENGINE_KEY } from "../src/lib/keys.ts";

/** The Review tab's file input. */
export const fileInput = (page: Page) => page.locator('input[type="file"][accept*="json"]');

/** A review file: its path, or a file that a test makes (its name, type and contents). */
export type ReviewFileInput = string | { name: string; mimeType: string; buffer: Buffer };

/** Chooses the review file `file` in the Review tab, once the tab has opened (ReviewHome.svelte, `data-ready`). The
 *  page stores the game, names it in the address, then reloads to review it. */
export async function loadReviewFile(page: Page, file: ReviewFileInput) {
  await fileInput(page).and(page.locator("[data-ready]")).setInputFiles(file);
}

/** What openReviewFile does before and after the file's load. Each setting that it gives is kept before each load of
 *  the page (keepBefore), and a setting that it leaves out stays as it is: `engine`, the engine's settings
 *  (src/lib/analysis/engineSettings.ts), `display`, the review's display settings (src/lib/review/display.ts), and
 *  `consent`, the consent's answer (src/lib/analytics.svelte.ts). `ready`: the longest wait, in ms, for the review to
 *  be ready (main.review with no aria-busy), or false for no wait. Its default is 120 s. */
type OpenReview = { engine?: object; display?: object; consent?: object; ready?: number | false };

/** Opens the review file `file` on Hedge School: keeps the settings that it is given, opens the Review tab, chooses
 *  the file (loadReviewFile) and waits up to 60 s until the page names its game in the address. The tab then loads
 *  again to review the game, and the call waits until the review is ready, as `ready` says. */
export async function openReviewFile(page: Page, file: ReviewFileInput,
                                     { engine, display, consent, ready = 120_000 }: OpenReview = {}) {
  if (engine) await keepBefore(page, ENGINE_KEY, engine);
  if (display) await keepBefore(page, DISPLAY_KEY, display);
  if (consent) await keepBefore(page, CONSENT_KEY, consent);
  await page.goto("/review");
  await loadReviewFile(page, file);
  await page.waitForURL(/#game=/, { timeout: 60_000 });
  if (ready !== false) await expect(page.locator("main.review")).not.toHaveAttribute("aria-busy", { timeout: ready });
}

/** The search of an earlier engine: not the site's. A review snapshot of an earlier engine leaves it out. */
const EARLIER_SEARCH = "earlier-search";

/** The review file at `path` as a review by an earlier engine: its review names a CPU module that no site ships,
 *  and its results are of the search EARLIER_SEARCH. The import then keeps the file's review as an earlier engine's
 *  (src/lib/game/reviewFile.ts, importReview), and the review opens as a review snapshot (design 20). `named`: the
 *  review names that search, else it names none, as an older file's does. `keep`: the results that stay, by the
 *  number of edges of their position (all by default). `maps`: the results keep their maps (true by default). */
export function earlierReview(path: string, { named = true, keep = () => true, maps = true }:
                                { named?: boolean; keep?: (edges: number) => boolean; maps?: boolean } = {}): ReviewFileInput {
  const file = JSON.parse(readFileSync(path, "utf8"));
  file.review = { ...file.review, module: "0".repeat(64), ...(named ? { search: EARLIER_SEARCH } : {}) };
  file.analyses = file.analyses.flatMap(([key, value]: [string, Record<string, unknown>]) => {
    const result = readAnalysisKey(key), moves = result.moves ? result.moves.split(" ") : [];
    if (!keep(moves.length)) return [];
    const earlier = analysisKey(EARLIER_SEARCH, result.model, moves, result.visits, result.shape);
    // JSON leaves out undefined
    return [[(result.map ? MAP_PREFIX : "") + earlier, maps ? value : { ...value, ownership: undefined }]];
  });
  return { name: "earlier-review.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) };
}

/** The review snapshot's line for such a review (design 20). */
export const EARLIER_REVIEWED = /^Reviewed on .+ with an earlier version of the engine\.$/;
