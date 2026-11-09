// Cyanotype's events of its review files and its review snapshot (its design 33, "Analytics", with Hedge School's
// names and parameters of its design 17): a review file loaded and a file that cannot load, the exports of the review
// file and of the annotated record from the review and from the Review tab, and the review snapshot opened and Review
// again. Each runs on check:all's build of Cyanotype, which has a made-up PostHog key, as analytics.spec.ts does. No
// request reaches PostHog: the context's route (tests/posthog.ts) answers in its place and keeps the events that the
// pages sent, across the pages' loads, with the beacons that a page sends as it goes. The Review tab loads the page
// again once it keeps a review file, so its event load_saved goes in such a beacon.
import { test, expect, type Page } from "@playwright/test";
import { EDGE_RANGES, range } from "../../../packages/site/src/measure.ts";
import { EARLIER_REVIEWED, earlierReview, fileInput } from "./review-file.ts";
import { CYANOTYPE, MOVES, STORED, exportedFile, loadStoredFile, noReview, openReviewTab, reviewStoredFile }
  from "./cyanotype-review.ts";
import { answerPostHog, keepBeacons, lookLikeAVisitor, named, withBeacons, type Sent } from "./posthog.ts";

/** The game's length as the events give it: the stored review's game has MOVES moves. */
const EDGES = range(MOVES, EDGE_RANGES);

lookLikeAVisitor();

let sent: Sent[];
test.beforeEach(async ({ page, context }) => {
  const skip = await noReview(page);
  test.skip(!!skip, skip);
  sent = await answerPostHog(context);
  await keepBeacons(context);
  await openReviewTab(page);
  // The Review tab's page view: the build measures. A build without the key sends none, and the case fails here.
  await expect.poll(() => sent.some(e => e.event === "$pageview"), { timeout: 15_000 }).toBe(true);
});

/** The site's parameters of each event named `name` that the pages in the tab of `page` sent so far. */
const events = async (page: Page, name: string) => named(await withBeacons(page, sent), name);

/** Leaves the page for another of the site's, and waits for its page leave: PostHog's client sends the events that
 *  it holds as the page goes, so every event of the page has come once the page leave has. */
async function leave(page: Page) {
  const leaves = async () => (await withBeacons(page, sent)).filter(e => e.event === "$pageleave").length;
  const before = await leaves();
  await page.goto(new URL("/about", CYANOTYPE).href);
  await expect.poll(leaves, { timeout: 15_000 }).toBeGreaterThan(before);
}

test("a review file's load and its exports, from the review and from the Review tab, are counted", async ({ page }) => {
  test.setTimeout(240_000);
  await reviewStoredFile(page);
  await expect.poll(() => events(page, "load_saved")).toEqual([{ load_source: "review_file", edges: EDGES, with_results: true }]);
  await exportedFile(page, /^Review file/);
  await exportedFile(page, /^Annotated record as a file/);
  await openReviewTab(page);
  await exportedFile(page, /^Review file/);
  await exportedFile(page, /^Annotated record as a file/);
  await expect.poll(() => events(page, "export")).toEqual([
    { export_kind: "review_file" }, { export_kind: "record_file" }, { export_kind: "review_file" }, { export_kind: "record_file" },
  ]);
});

test("a review file that cannot load is counted", async ({ page }) => {
  await fileInput(page).setInputFiles(
    { name: "review.json", mimeType: "application/json", buffer: Buffer.from('{"format":"cyanotype-review"}') });
  await expect(page.getByText(/^Cyanotype could not load this file/)).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => events(page, "load_failed")).toEqual([{ load_source: "review_file", load_failure: "file" }]);
  expect(await events(page, "load_saved")).toEqual([]);
});

test("a review snapshot's open and its Review again are counted", async ({ page }) => {
  test.setTimeout(240_000);
  await loadStoredFile(page, earlierReview(STORED));
  await expect(page.getByText(EARLIER_REVIEWED)).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => events(page, "review_open")).toEqual([expect.objectContaining({ done_before: true, edges: EDGES })]);
  await expect.poll(() => events(page, "feature")).toEqual([{ feature_name: "snapshot opened" }]);
  const opens = await events(page, "review_open");
  await page.getByRole("button", { name: "Review again" }).click();
  // The new review's line, with the engine off: its sweep has started, after the page's check that sends no second
  // review_open (the review snapshot counted the open)
  await expect(page.getByText("Engine off. The review is paused.")).toBeVisible({ timeout: 60_000 });
  // The page's leave sends every event that the client still holds: then a second review_open would be here.
  await leave(page);
  expect(await events(page, "feature")).toEqual([{ feature_name: "snapshot opened" }, { feature_name: "review again" }]);
  expect(await events(page, "review_open")).toEqual(opens);
});
