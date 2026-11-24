// The share bar at a share of exactly 0 or 1 (packages/review/src/ShareBar.svelte): the bar is all one color. The side
// with no share has a part 0 px wide, not the 6 px of its own padding (a flex item never shrinks below its padding). It
// is the review's win chance here, and Practice's points bar is the same component. Between 0 and 1 the loser keeps its
// part, as the last case shows. The states: the end of the layout test's game, which the rules end with Red's win (a
// share of 0), and the same game at the 11th position with each stored result's win chance set to 0 and to 1 (the
// engine is off, so that the page shows the stored results; no fixture has a game that Blue wins). The parts change
// width over 200 ms, so each case waits for the end of the change. The gauge has no
// padding on its parts: its cases check that it is right too. Nothing here measures text room, so the font does not
// matter. Run: npx playwright test tests/share-bar.spec.ts --project=chromium.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "./page-log.ts";
import { openReviewFile, type ReviewFileInput } from "./review-file.ts";
import { toMove } from "./move-header.ts";

const FIXTURE = "tests/fixtures/hedgefund-review.json";
const TITLE = "Win chance from the engine's search";

/** The fixture with Blue's win chance `win` in each stored result and in each candidate of it. */
function withWin(win: number): ReviewFileInput {
  const file: { analyses: [string, { blueWin: number; candidates?: { blueWin: number }[] }][] } =
    JSON.parse(readFileSync(FIXTURE, "utf8"));
  for (const [, value] of file.analyses) {
    value.blueWin = win;
    for (const c of value.candidates ?? []) c.blueWin = win;
  }
  return { name: `win-${win}-review.json`, mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) };
}

const open = async (page: Page, file: ReviewFileInput, win: "bar" | "gauge", [width, height] = [1376, 952]) => {
  await page.setViewportSize({ width, height });
  await openReviewFile(page, file, { engine: { on: false }, consent: { games: "denied" }, display: { win } });
};

/** Blue's part and Red's part of the flat bar, and the bar, as widths in px. Red's part is the second child. */
const flat = (page: Page) => page.locator(`[title^="${TITLE}"]`).first().locator("> div").first().evaluate(bar => ({
  bar: bar.getBoundingClientRect().width,
  blue: bar.children[0].getBoundingClientRect().width,
  red: bar.children[1].getBoundingClientRect().width,
}));
/** Blue's part of the gauge, and the gauge, as heights in px. The rest of the gauge is Red's. */
const upright = (page: Page) => page.locator('[role="img"][aria-label^="Blue\'s win chance"]').evaluate(gauge => ({
  gauge: gauge.getBoundingClientRect().height,
  blue: gauge.firstElementChild!.getBoundingClientRect().height,
}));

for (const width of [1376, 390]) {
  test.describe(`at ${width} px`, () => {
    const size: [number, number] = [width, width > 600 ? 952 : 844];

    test("at the end of a game that Red wins (a share of 0), Blue's part of the bar is 0 px wide", async ({ page }) => {
      await open(page, FIXTURE, "bar", size);
      await page.keyboard.press("End");
      await expect(page.getByText(/^Game over/).first()).toBeVisible();
      await expect.poll(async () => (await flat(page)).blue, { message: "Blue's part" }).toBe(0);
      const { bar, red } = await flat(page);
      expect(red, "Red's part is the whole bar").toBeCloseTo(bar, 1);
    });

    test("at a share of 0, Blue's part is 0 px wide, and at 1, Red's", async ({ page }) => {
      for (const win of [0, 1] as const) {
        await open(page, withWin(win), "bar", size);
        await toMove(page, 10);
        await expect(page.locator("section.side")).toContainText("Edge 11 of ");
        await expect.poll(async () => (await flat(page))[win ? "red" : "blue"],
                          { message: `${win ? "Red" : "Blue"}'s part, at a share of ${win}` }).toBe(0);
        const { bar, blue, red } = await flat(page);
        expect(win ? blue : red, "the other part is the whole bar").toBeCloseTo(bar, 1);
      }
    });

    test("the gauge at a share of 0 and 1 is all one color too", async ({ page }) => {
      for (const win of [0, 1] as const) {
        await open(page, withWin(win), "gauge", size);
        await toMove(page, 10);
        await expect(page.locator("section.side")).toContainText("Edge 11 of ");
        await expect.poll(async () => { const { gauge, blue } = await upright(page); return Math.abs(blue - win * gauge); },
                          { message: `Blue's part of the gauge, at a share of ${win}` }).toBeLessThan(0.05);
      }
    });
  });
}

test("at a share between 0 and 1 the loser keeps its part, with its padding", async ({ page }) => {
  for (const win of [0.03, 0.97]) {
    await open(page, withWin(win), "bar");
    await toMove(page, 10);
    await expect(page.locator("section.side")).toContainText("Edge 11 of ");
    const { bar, blue, red } = await flat(page);
    expect(win > 0.5 ? red : blue, `the loser's part, at a share of ${win}`).toBeGreaterThanOrEqual(5.9);
    expect(blue + red).toBeCloseTo(bar, 1);
  }
});
