// Each game's komi limit (design 24, item 15): a board's link and an analysis file beyond the komi that a record can
// give do not open on Hedge School's Analysis board, and the notice gives the limit in the record's words. Each site's
// Notation page states the limit in its Komi row. The board's engine is off: the refusal comes before any search.
// Cyanotype's case runs when CYANOTYPE_BASE_URL gives its running preview. Run:
// npm run test:layout -- tests/komi-limit.spec.ts --project=chromium, with BASE_URL (and CYANOTYPE_BASE_URL).
import { expect, test, type Page } from "@playwright/test";
import { boardLink } from "../src/lib/game/board.ts";

const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;

/** A context's script before each page: the visitor has answered the consent notice, and the engine is off. */
test.beforeEach(({ context }) => context.addInitScript(() => {
  localStorage.setItem("hedge-school:consent:2", JSON.stringify({ analytics: "denied", games: "denied" }));
  localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false, gpu: "off" }));
}));

/** A board of one move at `komi`. */
const board = (komi: number) => ({ version: 2 as const, main: ["D10-G10"], nodes: [["D10-G10", -1]] as [string, number][], komi });
/** The board's notice. */
const notice = (page: Page) => page.getByRole("alert");

test("a link at komi 6,000 does not open on the Analysis board, and the notice gives the limit", async ({ page }) => {
  // Before, the board opened it, and the engine refused the komi
  await page.goto(boardLink("", board(6000), 0));
  await expect(notice(page)).toHaveText("The Analysis board cannot load this link: the Komi tag must be from -5,052 " +
    "to 5,052 points: 6000. Your own analysis is here instead.", { timeout: 60_000 });
});

test("an analysis file at komi 6,000 does not open on the Analysis board, and the notice gives the limit", async ({ page }) => {
  await page.goto("/analysis");
  await expect(page.getByRole("button", { name: "Export" })).toBeVisible({ timeout: 60_000 });
  const file = { format: "hedge-school-analysis", version: 1, exported: "", site: "x", board: board(6000), analyses: [] };
  await page.locator('input[type="file"][accept*="json"]')
    .setInputFiles({ name: "analysis.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) });
  await expect(notice(page)).toHaveText("The Analysis board cannot load this file: the analysis file's komi must be " +
    "from -5,052 to 5,052 points: 6000.");
});

for (const [site, url, range] of [
  ["Hedge School", "/notation", "from -5,052 to 5,052 points"],
  ["Cyanotype", CYANOTYPE ? new URL("/notation", CYANOTYPE).href : "", "from -90,980 to 90,980 points"],
]) {
  test(`${site}'s Notation page states the komi's limit in its Komi row`, async ({ page }) => {
    test.skip(!url, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
    await page.goto(url);
    const komi = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "Komi", exact: true }) });
    await expect(komi).toContainText(`The engine takes a komi ${range}, so ${site} does not read a record beyond that.`);
  });
}
