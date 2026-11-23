// The draw chance in the shared view (design 34, "Draws"): in the tooltip of the win-chance bar and of the gauge, and in
// a column of the analysis table, where the results have one. On the layout test's game with a draw chance written into
// its stored results (Enclosure's engine gives none), and on the game as it is, which shows no draw chance. With the
// engine off, so that the page shows the stored results. Run:
// npx playwright test tests/draw-chance.spec.ts --project=chromium.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "./page-log.ts";
import { openReviewFile, type ReviewFileInput } from "./review-file.ts";
import { tableBox, toMove } from "./move-header.ts";

const FIXTURE = "tests/fixtures/hedgefund-review.json";

/** The fixture with a draw chance in each result, and in each of its candidates: 100% for the first, the widest text. */
function withDraws(): ReviewFileInput {
  const file = JSON.parse(readFileSync(FIXTURE, "utf8"));
  for (const [, value] of file.analyses) {
    if (!value.candidates) continue;
    value.draw = 0.125;
    value.candidates.forEach((c: { draw?: number }, k: number) => { c.draw = k ? 0.0625 : 1; });
  }
  return { name: "draws-review.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) };
}

const open = async (page: Page, file: ReviewFileInput, win: "bar" | "gauge") => {
  await page.setViewportSize({ width: 1376, height: 952 });
  await openReviewFile(page, file, { engine: { on: false }, consent: { games: "denied" }, display: { win } });
  await toMove(page, 10);
  await expect(page.locator("section.side")).toContainText("Edge 11 of ");
};
const headers = (page: Page) => tableBox(page).locator("th").allTextContents();

test("results with a draw chance: the bar's tooltip and the table's column show it", async ({ page }) => {
  await open(page, withDraws(), "bar");
  await expect(page.locator(`[title="Win chance from the engine's search · Draw chance 12.5%"]`)).toHaveCount(1);
  expect(await headers(page)).toEqual(["#", expect.stringMatching(/^Edge/), expect.stringMatching(/ wins$/), "Lead", "Draw", "Visits"]);
  const cells = tableBox(page).locator("tr[data-rank] td:nth-child(5)");
  expect((await cells.allTextContents()).slice(0, 2)).toEqual(["100.0%", "6.3%"]);
  // Neither the header nor the widest text is cut.
  for (const cell of [tableBox(page).locator("th").nth(4), cells.first()])
    expect(await cell.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test("results with a draw chance: the gauge's name and tooltip show it", async ({ page }) => {
  await open(page, withDraws(), "gauge");
  const gauge = page.locator('[role="img"][aria-label^="Blue\'s win chance"]');
  await expect(gauge).toHaveAttribute("aria-label", /^Blue's win chance \d+\.\d% · Draw chance 12\.5%$/);
  expect(await gauge.getAttribute("title")).toBe(await gauge.getAttribute("aria-label"));
});

test("results without a draw chance: the bar, the gauge and the table are as before", async ({ page }) => {
  await open(page, FIXTURE, "bar");
  await expect(page.locator(`[title="Win chance from the engine's search"]`)).toHaveCount(1);
  expect(await headers(page)).toEqual(["#", expect.stringMatching(/^Edge/), expect.stringMatching(/ wins$/), "Lead", "Visits"]);
  await expect(page.locator("[title*='Draw chance']")).toHaveCount(0);
  await open(page, FIXTURE, "gauge");
  const gauge = page.locator('[role="img"][aria-label^="Blue\'s win chance"]');
  await expect(gauge).toHaveAttribute("aria-label", /^Blue's win chance \d+\.\d%$/);
  await expect(gauge).not.toHaveAttribute("title");
});
