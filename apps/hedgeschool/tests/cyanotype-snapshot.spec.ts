// Cyanotype's review files, its review snapshot and its annotated record (its design 33, "The review files", as Hedge
// School's designs 13 and 20), on its preview (CYANOTYPE_BASE_URL), with the review's test game: the stored review
// (cyanotype-review.ts), loaded as a review file in the Review tab, with the engine off, so that nothing searches.
// - The review snapshot: the test gives the stored review an engine module that no site ships, and its results a
//   search that is not the site's (review-file.ts, earlierReview). The import then keeps the file's review as an
//   earlier engine's (apps/cyanotype/src/lib/game/reviewFile.ts), and the review opens as it was, from the stored
//   results alone (src/routes/review/+page.svelte, openSnapshot). Its move list must be the review's, with the
//   quality labels by move and by turn, as Hedge School's test checks (review-snapshot.spec.ts).
// - The exports: the annotated record from the review page and from the store (the Review tab's Export) are one text,
//   and the review file that the review page exports opens the review in a new browser with no search.
// The tests skip, with a message, when the preview has no engine files, and fail in CI.
import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { EARLIER_REVIEWED, earlierReview } from "./review-file.ts";
import { STORED, expectNoSearch, loadStoredFile, noReview, readStored } from "./cyanotype-review.ts";

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

/** The text of the file that an entry of the Export menu that `button` opens saves. */
async function exported(page: Page, button: () => ReturnType<Page["getByRole"]>, entry: RegExp): Promise<string> {
  await button().click();
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: entry }).click()]);
  return readFileSync((await file.path())!, "utf8");
}

test.beforeEach(async ({ page }) => {
  const skip = await noReview(page);
  test.skip(!!skip, skip);
});

for (const judge of ["edge", "turn"]) {
  test(`by ${judge}: a review by an earlier engine opens as it was, with the move list of its review`, async ({ page, browser }) => {
    test.setTimeout(240_000);
    const reviewed = await browser.newPage();
    await loadStoredFile(reviewed, STORED, { judge });
    await expect(reviewed.getByText(/^Review done/)).toBeVisible({ timeout: 120_000 });
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

test("the annotated record from the review and from the store is one text, and the review file opens elsewhere", async ({ page, browser }) => {
  test.setTimeout(240_000);
  await loadStoredFile(page);
  await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: 120_000 });
  const exportButton = () => page.getByRole("button", { name: "Export" });
  const fromReview = await exported(page, () => exportButton().first(), /^Annotated record as a file/);
  const file = JSON.parse(await exported(page, () => exportButton().first(), /^Review file/));
  await page.goto(new URL("/review", process.env.CYANOTYPE_BASE_URL).href);
  await expect(page.getByRole("heading", { name: "Your games" })).toBeVisible({ timeout: 60_000 });
  const fromStore = await exported(page, () => exportButton().first(), /^Annotated record as a file/);
  expect(fromStore).toBe(fromReview);
  const { network } = readStored();
  expect(fromReview).toContain('[Annotator "Cyanotype"]');
  // The record wraps its lines, so the note can span two
  expect(fromReview.replace(/\s+/g, " ")).toContain(`Reviewed by Cyanotype with Stamp Duty 0.2 (the network ${network})`);
  // The review file: Cyanotype's format, the game's mark, and the game's results, as the stored review holds them
  expect(file.format).toBe("cyanotype-review");
  expect(file.review).toMatchObject({ search: readStored().search, network, visits: 512 });
  expect(file.analyses.length).toBe(readStored().analyses.length - 1); // the Analysis board's position left out
  // In a new browser, the file opens its review at once
  const other = await browser.newPage();
  await loadStoredFile(other, { name: "review.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) });
  await expect(other.getByText(/^Review done/)).toBeVisible({ timeout: 120_000 });
  await expectNoSearch(other);
  await other.close();
});
