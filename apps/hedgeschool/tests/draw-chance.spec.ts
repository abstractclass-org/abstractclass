// The draw chance in the shared view (design 34, "Draws"): in the tooltip of the win-chance bar and of the gauge, and in
// a column of the analysis table, where the results have one. On a phone, where the column has no room, the moves keep
// theirs and the table scrolls sideways. On the layout test's game with a draw chance written into its stored results
// (Enclosure's engine gives none), and on the game as it is, which shows no draw chance. And the loss of a move with no
// lead after it, as the last move's of a game with its own result: in the win chance. With the engine off, so that the
// page shows the stored results. Run: npx playwright test tests/draw-chance.spec.ts --project=chromium.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "./page-log.ts";
import { openReviewFile, type ReviewFileInput } from "./review-file.ts";
import { readTable, tableBox, toMove } from "./move-header.ts";

const FIXTURE = "tests/fixtures/hedgefund-review.json";

/** A stored result, as these tests change it. A map's has no candidates. */
interface Values { draw?: number; lead?: number }
interface Stored extends Values { candidates?: Values[] }

/** The fixture, each of its results but the maps changed by `change`, and each result's candidates with their place. */
function changed(name: string, change: (value: Values, place?: number) => void): ReviewFileInput {
  const file: { analyses: [string, Stored][] } = JSON.parse(readFileSync(FIXTURE, "utf8"));
  for (const [, value] of file.analyses) {
    if (!value.candidates) continue;
    change(value);
    value.candidates.forEach((c, k) => change(c, k));
  }
  return { name, mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) };
}

/** The fixture with a draw chance in each result, and in each of its candidates: 0.9996 for the first, which
 *  reads as the widest text. */
const withDraws = () => changed("draws-review.json", (value, place) => {
  value.draw = place === undefined ? 0.125 : place ? 0.0625 : 0.9996;
});

const open = async (page: Page, file: ReviewFileInput, win: "bar" | "gauge", [width, height] = [1376, 952]) => {
  await page.setViewportSize({ width, height });
  await openReviewFile(page, file, { engine: { on: false }, consent: { games: "denied" }, display: { win } });
  await toMove(page, 10);
  await expect(page.locator("section.side")).toContainText("Edge 11 of ");
};
/** The width of the Move column, and the box's height with no scroll bar under its rows, in px. */
const moveColumn = (page: Page) => tableBox(page).locator("[data-move-head]").evaluate(el => el.getBoundingClientRect().width);
const rowsRoom = (page: Page) => tableBox(page).evaluate(el => el.clientHeight);
const headers = (page: Page) => tableBox(page).locator("th").allTextContents();
/** Whether the Draw column's header and its widest text, the first row's ">99.9%", have room. */
async function drawColumnFits(page: Page) {
  for (const cell of [tableBox(page).locator("th").nth(4), tableBox(page).locator("tr[data-rank] td:nth-child(5)").first()])
    expect(await cell.evaluate(el => el.scrollWidth <= el.clientWidth), await cell.innerText()).toBe(true);
}

test("results with a draw chance: the bar's tooltip and the table's column show it", async ({ page }) => {
  await open(page, withDraws(), "bar");
  await expect(page.locator(`[title="Win chance from the engine's search · Draw chance 12.5%"]`)).toHaveCount(1);
  expect(await headers(page)).toEqual(["#", expect.stringMatching(/^Edge/), expect.stringMatching(/ wins$/), "Lead", "Draw", "Visits"]);
  const cells = tableBox(page).locator("tr[data-rank] td:nth-child(5)");
  expect((await cells.allTextContents()).slice(0, 2)).toEqual([">99.9%", "6.3%"]);
  await drawColumnFits(page);
});

test("results with a draw chance: the gauge's name and tooltip show it", async ({ page }) => {
  await open(page, withDraws(), "gauge");
  const gauge = page.locator('[role="img"][aria-label^="Blue\'s win chance"]');
  await expect(gauge).toHaveAttribute("aria-label", /^Blue's win chance \d+\.\d% · Draw chance 12\.5%$/);
  expect(await gauge.getAttribute("title")).toBe(await gauge.getAttribute("aria-label"));
});

// The box of a phone's table is narrower than the columns with the Draw column (264 px at 360 px, where the moves have
// 40 px of it without that column). At 430 px it has room (334 px). The table keeps its place in the page from 430 to
// 360 px, so a window made narrow there measures the scroll bar again (ReviewView.svelte, boxWidth). In Linux's font
// (CI's), a phone's two widest names are cut without the Draw column too, so the names are compared with those.
for (const from of [360, 430])
  test(`on a phone, the moves keep their column beside the Draw column, and the table scrolls sideways: opened at ${from} px`, async ({ page }) => {
    const analysis = page.getByRole("tab", { name: "Analysis" });
    await open(page, FIXTURE, "bar", [360, 780]);
    await analysis.click();
    const without = { move: await moveColumn(page), rows: await rowsRoom(page), names: (await readTable(tableBox(page))).names };
    await open(page, withDraws(), "bar", [from, 780]);
    await analysis.click();
    await expect.poll(() => readTable(tableBox(page)).then(t => t.sideways), { message: "scrolls where it has no room" }).toBe(from === 360);
    await page.setViewportSize({ width: 360, height: 780 });
    await expect.poll(() => readTable(tableBox(page)).then(t => t.sideways)).toBe(true);
    await expect.poll(() => rowsRoom(page), { message: "the box takes in the scroll bar's height" }).toBe(without.rows);
    expect(await moveColumn(page)).toBeGreaterThanOrEqual(without.move - 0.5); // subpixel widths
    expect((await readTable(tableBox(page))).names, "the names' sizes and cuts").toEqual(without.names);
    await drawColumnFits(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), "the page's own overflow").toBe(0);
    // The column that the box cuts is in view at the scroll's end, but for less than a pixel: a width in ch is not whole
    await tableBox(page).evaluate(el => { el.scrollLeft = el.scrollWidth; });
    await expect(tableBox(page).locator("th").last()).toBeInViewport({ ratio: 0.95 });
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

test("the loss of a move with no lead: in the win chance, and 0 for no loss", async ({ page }) => {
  await open(page, changed("no-lead-review.json", value => { delete value.lead; }), "bar");
  const losses = (await page.locator("section.side").getByText(/^(0|−\d+%)$/).allTextContents()).map(t => t.trim());
  expect(losses, "some moves lose win chance").toContainEqual(expect.stringMatching(/^−[1-9]\d*%$/));
  expect(losses, "some moves lose none").toContain("0");
  expect(losses).not.toContain("−0%");
});
