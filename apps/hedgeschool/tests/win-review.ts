// The layout test's game with values changed in its stored results, for the browser tests of the win chance and the
// draw chance (the share bar, the text of a chance, the table's columns). With the engine off, so that the page shows
// the stored results.
import { readFileSync } from "node:fs";
import { expect, type Locator, type Page } from "@playwright/test";
import { openReviewFile, type ReviewFileInput } from "./review-file.ts";
import { toMove } from "./move-header.ts";

export const FIXTURE = "tests/fixtures/hedgefund-review.json";

/** A stored result, as these tests change it. A map's has no candidates. */
interface Values { blueWin?: number; draw?: number; lead?: number }
interface Stored extends Values { candidates?: Values[] }

/** The fixture, each of its results but the maps changed by `change`, and each result's candidates with their place. */
export function changed(name: string, change: (value: Values, place?: number) => void): ReviewFileInput {
  const file: { analyses: [string, Stored][] } = JSON.parse(readFileSync(FIXTURE, "utf8"));
  for (const [, value] of file.analyses) {
    if (!value.candidates) continue;
    change(value);
    value.candidates.forEach((c, k) => change(c, k));
  }
  return { name, mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) };
}

/** The fixture with Blue's win chance `share` in each stored result and in each of its candidates. */
const withWin = (share: number) => changed("win-review.json", value => { value.blueWin = share; });

/** Whether a table cell's text has room in its content box. In fractions of a pixel: scrollWidth and clientWidth are
 *  whole numbers, so a text 0.2 px too wide (">99.9%" in DejaVu Sans, in a column of 6.75ch), which the cell cuts,
 *  passes a check of them. */
export const fits = (cell: Locator) => cell.evaluate(el => {
  const text = document.createRange(), style = getComputedStyle(el);
  text.selectNodeContents(el);
  return text.getBoundingClientRect().width
    <= el.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
});

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
