// The layout test's game with one win chance in each stored result, for the browser tests of the win chance (the share
// bar's and the text's). With the engine off, so that the page shows the stored results.
import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import { openReviewFile, type ReviewFileInput } from "./review-file.ts";
import { toMove } from "./move-header.ts";

export const FIXTURE = "tests/fixtures/hedgefund-review.json";

/** The fixture with Blue's win chance `share` in each stored result and in each of its candidates. */
export function withWin(share: number): ReviewFileInput {
  const file: { analyses: [string, { blueWin: number; candidates?: { blueWin: number }[] }][] } =
    JSON.parse(readFileSync(FIXTURE, "utf8"));
  for (const [, result] of file.analyses) {
    result.blueWin = share;
    for (const c of result.candidates ?? []) c.blueWin = share;
  }
  return { name: "win-review.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) };
}

/** The review of `file` in a window `width` px wide, the engine off. `win`: the win chance as a bar or a gauge. */
export async function openReview(page: Page, file: ReviewFileInput, width: number, win: "bar" | "gauge" = "bar") {
  await page.setViewportSize({ width, height: width > 600 ? 952 : 844 });
  await openReviewFile(page, file, { engine: { on: false }, consent: { games: "denied" }, display: { win } });
}

/** The fixture's review after its 10th edge, where Blue's win chance is `share`. */
export async function openAtShare(page: Page, share: number, width: number, win: "bar" | "gauge" = "bar") {
  await openReview(page, withWin(share), width, win);
  await toMove(page, 10);
  await expect(page.locator("section.side")).toContainText("Edge 11 of ");
}
