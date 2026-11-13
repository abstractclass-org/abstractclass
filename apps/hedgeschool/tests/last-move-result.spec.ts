// The word before the number in a move's tooltip in the move list, by move (Hedge School's edge) and by turn, on both
// sites (the shared review, packages/review/src/ReviewView.svelte, leadOrResult; design 06, item 8). After a game's
// last move, when the rules ended the game, the number is the game's result: the tooltip says "Result:", with the same
// words as the chart's note on that position. Every other move's tooltip, and the last move's of a record that ends
// before the rules end the game, says "Lead:": there the number is the engine's estimate. By turn, a move's tooltip
// gives its lead only: the turn's label and loss are in the turn's own tooltip, which has no lead. The games: Hedge
// School's layout game (tests/fixtures/hedgefund-review.json, which the rules end at r+377.651497) and a record that
// ends after turn 7 (tests/fixtures/twin-turn-review.json); Cyanotype's test game, whole (the results of
// tests/fixtures/cyanotype-whole-review.json, which the rules end at r+730) and up to turn 20 (STORED). The engine is
// off: the tooltips take the stored results. Without Cyanotype's preview or its engine's files, its tests skip, with a
// message.
// The chart at the end of a record that ends before the rules end the game (ReviewView.svelte, chartSettled and
// chartRough; design 06, item 3). The sweep and the label stage search that end, as any position
// (analysis.svelte.ts, passCount). While the end has only the sweep's result, the note there says " · first
// estimate", and the legend shows "Win chance, first estimate". These cases take the same games that end early, with
// the sweep's result at the end: Hedge School's review file with its end's result at the sweep's visits, and
// Cyanotype's stored results without the end's result at the review's depth. Every result of the other cases' games
// has the review's depth (512 visits), so there the legend has no first estimate.
// Run: npx playwright test tests/last-move-result.spec.ts, with BASE_URL and CYANOTYPE_BASE_URL.
import { readFileSync } from "node:fs";
import { SWEEP_VISITS, analysisKey, keyMoves, readAnalysisKey } from "../../../packages/analysis/src/cache.ts";
import { parseRecord } from "../src/lib/game/record.ts";
import { expect, type Page, test } from "./page-log.ts";
import { type ReviewFileInput, openReviewFile } from "./review-file.ts";
import { MOVES, TURNS, WHOLE_STORED, noReview, pasteRecord, readStored, reviewTestGame, storeReview, storedResults,
         testRecord } from "./cyanotype-review.ts";

const ENDED = "tests/fixtures/hedgefund-review.json";
const CUT = "tests/fixtures/twin-turn-review.json";
/** The tooltip of the legend's first estimate, shown while a position has only the sweep's result (chartRough). */
const ROUGH = "Refined as the review runs";

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

/** Waits until every move's tooltip has its lead (or the game's result): the review has read the results. The last
 *  move and one more at least: an empty list, before the list draws its rows, has no move to check. Cyanotype's paste
 *  goes on to the review's page: a read that the navigation stops counts as not yet, since expect.poll does not retry
 *  an error. */
async function waitForLeads(page: Page) {
  await expect.poll(async () => {
    const tips = await moveTips(page).catch(() => []);
    return tips.length > 1 && tips.every(tip => /(^| · )(Lead|Result): /.test(tip));
  }, { message: "every move's tooltip has its lead", timeout: 120_000 }).toBe(true);
}

/** Checks the moves' tooltips once the review has given each a lead: the last move's holds the chart's words at the
 *  game's end, which start with `end`, and no other move's says "Result:". Every result of these games has the
 *  review's depth, so the legend has no first estimate. */
async function checkTips(page: Page, end: "Result:" | "Lead:") {
  await waitForLeads(page);
  const tips = await moveTips(page);
  expect(tips.slice(0, -1).flatMap((tip, i) => tip.includes("Result:") ? [`move ${i + 1}: ${tip}`] : []),
         "the other moves' tooltips that say Result:").toEqual([]);
  const words = await chartEnd(page);
  expect(words, "the chart's note at the end")
    .toMatch(end === "Result:" ? /^Result: ((Blue|Red) \+[\d.]+|even)$/ : /^Lead: /);
  expect(tips.at(-1)!.split(" · "), "the last move's tooltip, with the chart's words").toContain(words);
  await expect(page.getByTitle(ROUGH), "the legend's first estimate").toHaveCount(0);
}

/** The review file at `path`, of a record that ends before the rules end the game, with the sweep's result at the
 *  record's end: the end's result at the review's depth becomes one at the sweep's visits (SWEEP_VISITS). So the end
 *  is as it is before the label stage searches it. The file holds results at the review's depth only. Cyanotype's
 *  stored results hold the sweep's too: there sweptEndResults drops the end's result at the review's depth instead. */
function sweptEnd(path: string): ReviewFileInput {
  const file = JSON.parse(readFileSync(path, "utf8"));
  const record = parseRecord(file.record), moves = keyMoves(null, record.moves, record.komi);
  let ends = 0;
  file.analyses = file.analyses.map(([key, value]: [string, Record<string, unknown>]) => {
    const k = readAnalysisKey(key);
    if (k.map || k.moves !== moves.join(" ")) return [key, value];
    ends++;
    return [analysisKey(k.search, k.model, moves, SWEEP_VISITS, k.shape), { ...value, visits: SWEEP_VISITS }];
  });
  if (ends !== 1) throw new Error(`${path} has ${ends} results of its record's end, not 1`);
  return { name: "swept-end.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) };
}

/** Cyanotype's stored results (STORED) without the result of the end of the test game's first TURNS turns at the
 *  review's depth: the end keeps the sweep's result only. */
function sweptEndResults(): [string, unknown][] {
  const deep = storedResults(TURNS).filter(([key]) => {
    const k = readAnalysisKey(key);
    return k.moves.split(" ").length === MOVES && k.visits > SWEEP_VISITS;
  }).map(([key]) => key);
  if (deep.length !== 1) throw new Error(`the stored review has ${deep.length} results of the end at its depth, not 1`);
  return readStored().analyses.filter(([key]) => key !== deep[0]);
}

/** Checks the chart at the end of a record that ends early, while the end has the sweep's result only: the note there
 *  says " · first estimate", and the legend shows "Win chance, first estimate". */
async function checkFirstEstimateAtEnd(page: Page) {
  await waitForLeads(page);
  expect(await chartEnd(page), "the chart's note at the end").toMatch(/^Lead: .+ · first estimate$/);
  await expect(page.getByTitle(ROUGH), "the legend's first estimate").toBeVisible();
}

/** Opens the review file `file` on Hedge School, with the engine off and the labels judging `judge`, and waits for the
 *  review. */
const reviewOnHedgeSchool = (page: Page, file: ReviewFileInput, judge: "edge" | "turn") =>
  openReviewFile(page, file, { engine: { on: false }, display: { judge }, consent: { games: "denied" } });

// The setting "Review by", by its stored value: "edge" is "Edge" on Hedge School and "Move" on Cyanotype.
for (const judge of ["edge", "turn"] as const) {
  test.describe(`the last move's tooltip on Hedge School, by ${judge}`, () => {
    test("says Result: when the rules ended the game", async ({ page }) => {
      await reviewOnHedgeSchool(page, ENDED, judge);
      await checkTips(page, "Result:");
    });

    test("says Lead: when the record ends before the rules end the game", async ({ page }) => {
      await reviewOnHedgeSchool(page, CUT, judge);
      await checkTips(page, "Lead:");
    });
  });

  test.describe(`the last move's tooltip on Cyanotype, by ${judge === "edge" ? "move" : judge}`, () => {
    test.beforeEach(async ({ page }) => {
      const why = await noReview(page);
      test.skip(why !== "", why);
    });

    test("says Result: when the rules ended the game", async ({ page }) => {
      await reviewTestGame(page, { judge }, { turns: Infinity, results: readStored(WHOLE_STORED).analyses });
      await checkTips(page, "Result:");
    });

    test("says Lead: when the record ends before the rules end the game", async ({ page }) => {
      await reviewTestGame(page, { judge });
      await checkTips(page, "Lead:");
    });
  });

  test.describe(`the chart's note at the end of a record that ends early, by ${judge}`, () => {
    test("says first estimate on Hedge School while the end has the sweep's result only", async ({ page }) => {
      await reviewOnHedgeSchool(page, sweptEnd(CUT), judge);
      await checkFirstEstimateAtEnd(page);
    });

    test("says first estimate on Cyanotype while the end has the sweep's result only", async ({ page }) => {
      const why = await noReview(page);
      test.skip(why !== "", why);
      await storeReview(page, { judge }, { results: sweptEndResults() });
      await pasteRecord(page, testRecord(TURNS));
      await checkFirstEstimateAtEnd(page);
    });
  });
}
