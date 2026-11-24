// A chance's text (packages/analysis/src/model.ts, chancePct) reads "100.0%" or "0.0%" only for an exact 1 or 0, a
// decided game. Else a chance that rounds there reads ">99.9%" or "<0.1%". The cases, on the layout test's game:
// - Its 11th position, with Blue's win chance in each stored result near 1 and near 0 (win-review.ts): the bar, the
//   gauge's name, and the candidates table's win column.
// - The game's end, which Red wins by the rules: an exact 0 keeps "100.0%" for Red.
// Run: npm run test:layout -- tests/chance-text.spec.ts --project=chromium, with BASE_URL.
import { expect, test, type Page } from "./page-log.ts";
import { tableBox } from "./move-header.ts";
import { fits, FIXTURE, openAtShare, openReview } from "./win-review.ts";

test.describe.configure({ timeout: 240_000 });

const WIN = "Win chance from the engine's search"; // the bar's tooltip
const bar = (page: Page) => page.locator(`[title^="${WIN}"]`).first();

// The 11th edge is Red's, so the table gives Red's chance. The bar shows only the winner's text: its side has the room.
for (const width of [1376, 390]) {
  for (const [share, red] of [[0.9996, "<0.1%"], [0.0004, ">99.9%"]] as const) {
    test(`at ${width} px, Blue's stored win chance ${share}: the bar reads >99.9% and the table ${red}`, async ({ page }) => {
      await openAtShare(page, share, width);
      await expect(bar(page)).toHaveText(">99.9%");
      if (width === 390) await page.getByRole("tab", { name: "Analysis" }).click();
      await expect(tableBox(page).locator("th").nth(2)).toHaveText("Red wins");
      const cell = tableBox(page).locator("tr[data-rank] td:nth-child(3)").first();
      await expect(cell).toHaveText(red);
      expect(await fits(cell), "the cell has room").toBe(true);
    });
  }
}

test("the gauge's name gives the chance by the same rule", async ({ page }) => {
  await openAtShare(page, 0.9996, 1376, "gauge");
  await expect(page.locator('[role="img"][aria-label^="Blue\'s win chance"]')).toHaveAttribute("aria-label", "Blue's win chance >99.9%");
});

test("a decided game keeps 100.0%", async ({ page }) => {
  await openReview(page, FIXTURE, 1376);
  await page.keyboard.press("End");
  await expect(page.getByText(/^Game over/).first()).toBeVisible();
  await expect(bar(page)).toHaveText("100.0%");
});
