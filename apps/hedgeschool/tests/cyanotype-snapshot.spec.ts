// Cyanotype's review files, its review snapshot and its annotated record (its design 33, "The review files", as Hedge
// School's designs 13 and 20), on its preview (CYANOTYPE_BASE_URL), with the review's test game: the stored review
// (cyanotype-review.ts), loaded as a review file in the Review tab, with the engine off, so that nothing searches.
// - The review snapshot: the test gives the stored review a CPU module that no site ships, and its results a
//   search that is not the site's (review-file.ts, earlierReview). The import then keeps the file's review as an
//   earlier engine's (apps/cyanotype/src/lib/game/reviewFile.ts), and the review opens as it was, from the stored
//   results alone (src/routes/review/+page.svelte, openSnapshot). Its move list must be the review's, with the
//   quality labels by move and by turn, as Hedge School's test checks (review-snapshot.spec.ts). A mark of the site's
//   engine stays over an earlier engine's (Hedge School's designs 13 and 20, item 6): a file of an earlier engine,
//   loaded after the site's review of the same game, opens the site's review, with no review snapshot.
// - The exports: the annotated record from the review page and from the store (the Review tab's Export) are one text,
//   and the review file that the review page exports opens the review in a new browser with no search.
// The tests skip, with a message, when the preview has no engine files, and fail in CI.
import { test, expect, type Page } from "@playwright/test";
import { belongs } from "../../../packages/analysis/src/files.ts";
import { positionKeys } from "../../../packages/analysis/src/kept.ts";
import { parseRecord } from "../../cyanotype/src/lib/game/record.ts";
import { EARLIER_REVIEWED, earlierReview } from "./review-file.ts";
import { STORED, chooseReviewFile, expectNoSearch, exportedFile, loadStoredFile, noReview, openReviewTab, readStored,
         reviewStoredFile } from "./cyanotype-review.ts";

/** The move list once it holds still: each button's text and title (by turn, a turn's quality label is on its own
 *  button). */
async function moveList(page: Page): Promise<string[]> {
  await page.getByText("Accuracy").first().waitFor({ timeout: 60_000 });
  let list = "";
  await expect.poll(async () => {
    const now = JSON.stringify(await page.locator("button[data-path]").evaluateAll(buttons =>
      buttons.map(b => `${b.textContent?.trim()} | ${b.getAttribute("title") ?? ""}`)));
    const still = now === list;
    list = now;
    return still;
  }, { intervals: [1_000], timeout: 60_000 }).toBe(true);
  return JSON.parse(list) as string[];
}

test.beforeEach(async ({ page }) => {
  const skip = await noReview(page);
  test.skip(!!skip, skip);
});

for (const judge of ["edge", "turn"]) {
  test(`by ${judge}: a review by an earlier engine opens as it was, with the move list of its review`, async ({ page, browser }) => {
    test.setTimeout(240_000);
    const reviewed = await browser.newPage();
    await reviewStoredFile(reviewed, STORED, { judge });
    const expected = await moveList(reviewed);
    await reviewed.close();
    expect(expected.length).toBeGreaterThan(0); // the list has loaded: two empty lists are the same
    await loadStoredFile(page, earlierReview(STORED), { judge });
    await expect(page.getByText(EARLIER_REVIEWED)).toBeVisible({ timeout: 60_000 });
    expect(await moveList(page)).toEqual(expected);
    await expect(page.getByRole("button", { name: "Review again" })).toBeVisible();
    await expectNoSearch(page);
  });
}

test("a review file of an earlier engine, loaded after the site's review of the game, keeps the site's review", async ({ page }) => {
  test.setTimeout(240_000);
  await reviewStoredFile(page);
  await chooseReviewFile(page, earlierReview(STORED));
  await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(EARLIER_REVIEWED)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Review again" })).toHaveCount(0);
  await expectNoSearch(page);
});

test("the annotated record from the review and from the store is one text, and the review file opens elsewhere", async ({ page, browser }) => {
  test.setTimeout(240_000);
  await reviewStoredFile(page);
  const fromReview = await exportedFile(page, /^Annotated record as a file/);
  const file = JSON.parse(await exportedFile(page, /^Review file/));
  await openReviewTab(page);
  const fromStore = await exportedFile(page, /^Annotated record as a file/);
  expect(fromStore).toBe(fromReview);
  const { network } = readStored();
  expect(fromReview).toContain('[Annotator "Cyanotype"]');
  // The record wraps its lines, so the note can span two
  expect(fromReview.replace(/\s+/g, " ")).toContain(`Reviewed by Cyanotype with Stamp Duty 0.2 (the network ${network})`);
  // The review file: Cyanotype's format, the game's mark, and the game's results, as the stored review holds them
  expect(file.format).toBe("cyanotype-review");
  expect(file.review).toMatchObject({ search: readStored().search, network, visits: 512 });
  // The stored review's results of the game: the Analysis board's position (SPREAD_BOARD) and its next moves left out
  const { moves, komi } = parseRecord(file.record), positions = positionKeys(moves, file.branches, komi);
  expect(file.analyses.length).toBe(readStored().analyses.filter(([key]) => belongs(key, positions, null)).length);
  // In a new browser, the file opens its review at once
  const other = await browser.newPage();
  await reviewStoredFile(other, { name: "review.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) });
  await expectNoSearch(other);
  await other.close();
});
