// A chance's text (packages/analysis/src/model.ts, chanceText) reads "100.0%" or "0.0%" only for an exact 1 or 0, a
// decided game. Else a chance that rounds there reads ">99.9%" or "<0.1%". The cases, on the layout test's game:
// - Its 11th position, with Blue's win chance in each stored result near 1 and near 0 (win-review.ts): the bar, the
//   gauge's name, and the candidates table's win column.
// - The game's end, which Red wins by the rules: an exact 0 keeps "100.0%" for Red.
// Run: npm run test:layout -- tests/chance-text.spec.ts --project=chromium, with BASE_URL.
import { expect, test, type Page } from "./page-log.ts";
import { tableBox } from "./move-header.ts";
import { FIXTURE, openAtShare, openReview } from "./win-review.ts";

test.describe.configure({ timeout: 240_000 });

const WIN = "Win chance from the engine's search"; // the bar's tooltip
const bar = (page: Page) => page.locator(`[title^="${WIN}"]`).first();

for (const width of [1376, 390]) {
  for (const [share, mine, theirs] of [[0.9996, ">99.9%", "<0.1%"], [0.0004, "<0.1%", ">99.9%"]] as const) {
    test(`at ${width} px, a stored chance of ${share} reads ${mine} for Blue`, async ({ page }) => {
      await openAtShare(page, share, width);
      // Only the side with room for its text shows it: the winner's
      await expect(bar(page)).toHaveText(share > 0.5 ? mine : theirs);
      if (width === 390) await page.getByRole("tab", { name: "Analysis" }).click();
      const header = await tableBox(page).locator("th").nth(2).innerText();
      const cell = tableBox(page).locator("tr[data-rank] td:nth-child(3)").first();
      await expect(cell).toHaveText(header.startsWith("Blue") ? mine : theirs);
      expect(await cell.evaluate(el => el.scrollWidth <= el.clientWidth), "the cell has room").toBe(true);
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
