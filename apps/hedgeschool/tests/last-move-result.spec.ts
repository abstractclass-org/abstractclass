// The word before the number in a move's tooltip in the move list, by edge and by turn, on both sites (the shared
// review, packages/review/src/ReviewView.svelte, leadLine; design 06, item 8). After a game's last move, when the rules
// ended the game, the number is the game's result: the tooltip says "Result:", with the same words as the chart's note
// on that position. Every other move's tooltip, and the last move's of a record that ends before the rules end the
// game, says "Lead:": there the number is the engine's estimate. By turn, a move's tooltip gives its lead only: the
// turn's label and loss are in the turn's own tooltip, which has no lead. The games: Hedge School's layout game
// (tests/fixtures/hedgefund-review.json, which the rules end at r+377.651497) and a record that ends after turn 7
// (tests/fixtures/twin-turn-review.json); Cyanotype's test game, whole (the results of
// tests/fixtures/cyanotype-whole-review.json, which the rules end at r+730) and up to turn 20 (STORED). The engine is
// off: the tooltips take the stored results. Without Cyanotype's preview or its engine's files, its tests skip, with a
// message.
// Run: npx playwright test tests/last-move-result.spec.ts, with BASE_URL and CYANOTYPE_BASE_URL.
import { expect, type Page, test } from "./page-log.ts";
import { keepBefore } from "./keep-before.ts";
import { loadReviewFile } from "./review-file.ts";
import { OTHER_STORED, noReview, pasteRecord, putResults, readStored, reviewTestGame, storeReview, testRecord }
  from "./cyanotype-review.ts";

const ENDED = "tests/fixtures/hedgefund-review.json";
const CUT = "tests/fixtures/twin-turn-review.json";
/** Cyanotype's stored review of its whole test game. */
const WHOLE = OTHER_STORED.find(s => s.turns === Infinity)!.file;

/** The tooltips (the titles) of the move list's moves, in the game's order: the list draws the moves in their order,
 *  and these games have no variation. */
const moveTips = (page: Page) =>
  page.locator("button.mv[data-path]").evaluateAll(buttons => buttons.map(b => b.getAttribute("title") ?? ""));

/** The line with the lead or the result in the advantage chart's note, with the pointer over the chart's last
 *  position. */
async function chartEnd(page: Page): Promise<string> {
  const chart = page.getByRole("figure", { name: "Advantage chart" });
  const svg = chart.locator("svg");
  const box = (await svg.boundingBox())!;
  await svg.hover({ position: { x: box.width - 1, y: box.height / 2 } });
  return (await chart.locator("span", { hasText: /^(Result|Lead): / }).innerText()).trim();
}

/** Checks the moves' tooltips once the review has given each a lead: the last move's holds the chart's words at the
 *  game's end, which say "Result:" when `ended` and "Lead:" when not, and no other move's says "Result:". */
async function checkTips(page: Page, ended: boolean) {
  await expect.poll(async () => (await moveTips(page)).every(tip => /(^| · )(Lead|Result): /.test(tip)),
                    { message: "every move's tooltip has its lead", timeout: 120_000 }).toBe(true);
  const tips = await moveTips(page);
  expect(tips.length).toBeGreaterThan(10);
  expect(tips.slice(0, -1).flatMap((tip, i) => tip.includes("Result:") ? [`move ${i + 1}: ${tip}`] : []),
         "the other moves' tooltips that say Result:").toEqual([]);
  const words = await chartEnd(page);
  expect(words, "the chart's note at the end").toMatch(ended ? /^Result: ((Blue|Red) \+[\d.]+|even)$/ : /^Lead: /);
  expect(tips.at(-1)!.split(" · "), "the last move's tooltip, with the chart's words").toContain(words);
}

/** Opens the review file `file` on Hedge School, with the engine off and the labels judging `judge`, and waits for the
 *  review. */
async function reviewOnHedgeSchool(page: Page, file: string, judge: "edge" | "turn") {
  await keepBefore(page, "learn-enclosure:engine:2", { on: false });
  await keepBefore(page, "learn-enclosure:review-display:1", { judge });
  await keepBefore(page, "hedge-school:consent:2", { games: "denied" });
  await page.goto("/review");
  await loadReviewFile(page, file);
  await page.waitForURL(/#game=/);
  await expect(page.locator("main.review")).not.toHaveAttribute("aria-busy", { timeout: 120_000 });
}

for (const judge of ["edge", "turn"] as const) {
  test.describe(`the last move's tooltip on Hedge School, by ${judge}`, () => {
    test("says Result: when the rules ended the game", async ({ page }) => {
      await reviewOnHedgeSchool(page, ENDED, judge);
      await checkTips(page, true);
    });

    test("says Lead: when the record ends before the rules end the game", async ({ page }) => {
      await reviewOnHedgeSchool(page, CUT, judge);
      await checkTips(page, false);
    });
  });

  test.describe(`the last move's tooltip on Cyanotype, by ${judge}`, () => {
    test.beforeEach(async ({ page }) => {
      const why = await noReview(page);
      test.skip(why !== "", why);
    });

    test("says Result: when the rules ended the game", async ({ page }) => {
      await storeReview(page, { judge });
      await putResults(page, readStored(WHOLE).analyses);
      await pasteRecord(page, testRecord(Infinity));
      await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: 120_000 });
      await checkTips(page, true);
    });

    test("says Lead: when the record ends before the rules end the game", async ({ page }) => {
      await reviewTestGame(page, { judge });
      await checkTips(page, false);
    });
  });
}
