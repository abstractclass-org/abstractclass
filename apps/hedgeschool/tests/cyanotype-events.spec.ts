// Cyanotype's events of its review files and its review snapshot (its design 33, "Analytics and consent", with Hedge
// School's names and parameters of its design 17): a review file loaded and a file that cannot load, the exports of the
// review file and of the annotated record from the review and from the Review tab, and the review snapshot opened and
// Review again. Each runs on a build with a made-up measurement ID (VITE_GA_ID=G-TEST000000), as analytics-ask.spec.ts
// does: a build without the Google tag skips it. Every request to Google stops here, so the tag never runs: the test
// reads the commands that the site gives the tag's queue (window.dataLayer), kept in the tab's session storage across
// the page's loads. The Google tag's part of the test is GOOGLE, LOG, commands and the beforeEach.
import { test, expect, type Page } from "@playwright/test";
import { EDGE_RANGES, range } from "../../../packages/site/src/measure.ts";
import { EARLIER_REVIEWED, earlierReview, fileInput } from "./review-file.ts";
import { MOVES, STORED, exportedFile, loadStoredFile, noReview, openReviewTab, reviewStoredFile }
  from "./cyanotype-review.ts";

const GOOGLE = /(^|\.)(google-analytics|googletagmanager|doubleclick|google)\.(com|net)$/;
const LOG = "test:gtag-commands";

/** The commands that the site gave the tag's queue in this tab so far. */
const commands = (page: Page) =>
  page.evaluate(key => JSON.parse(sessionStorage.getItem(key) ?? "[]") as unknown[][], LOG);

/** The parameters of each event named `name` that the site gave the queue. */
const named = async (page: Page, name: string) =>
  (await commands(page)).filter(c => c[0] === "event" && c[1] === name).map(c => c[2]);

/** The game's length as the events give it: the stored review's game has MOVES moves. */
const EDGES = range(MOVES, EDGE_RANGES);

test.beforeEach(async ({ page, context }) => {
  const skip = await noReview(page);
  test.skip(!!skip, skip);
  await context.route(url => GOOGLE.test(url.hostname), route => route.abort("blockedbyclient"));
  // The tag's queue, made before the site's: each command it takes also goes into the tab's session storage. The
  // visitor's choice is kept already, so that no banner covers the page.
  await context.addInitScript(key => {
    localStorage.setItem("cyanotype:consent:1", JSON.stringify({ analytics: "denied" }));
    const layer: unknown[] = [];
    layer.push = (...pushed: unknown[]) => {
      const log = JSON.parse(sessionStorage.getItem(key) ?? "[]");
      log.push(...pushed.map(c => Array.from(c as ArrayLike<unknown>)));
      sessionStorage.setItem(key, JSON.stringify(log));
      return Array.prototype.push.apply(layer, pushed);
    };
    Object.assign(window, { dataLayer: layer });
  }, LOG);
  // A build without the Google tag gives the queue no command: the test skips before it loads the stored review.
  await openReviewTab(page);
  test.skip(!(await commands(page)).some(c => c[0] === "config"), "this build has no Google tag");
});

test("a review file's load and its exports, from the review and from the Review tab, are counted", async ({ page }) => {
  test.setTimeout(240_000);
  await reviewStoredFile(page);
  expect(await named(page, "load_saved")).toEqual([{ load_source: "review_file", edges: EDGES, with_results: true }]);
  await exportedFile(page, /^Review file/);
  await exportedFile(page, /^Annotated record as a file/);
  await openReviewTab(page);
  await exportedFile(page, /^Review file/);
  await exportedFile(page, /^Annotated record as a file/);
  await expect.poll(() => named(page, "export")).toEqual([
    { export_kind: "review_file" }, { export_kind: "record_file" }, { export_kind: "review_file" }, { export_kind: "record_file" },
  ]);
});

test("a review file that cannot load is counted", async ({ page }) => {
  await fileInput(page).setInputFiles(
    { name: "review.json", mimeType: "application/json", buffer: Buffer.from('{"format":"cyanotype-review"}') });
  await expect(page.getByText(/^Cyanotype could not load this file/)).toBeVisible({ timeout: 60_000 });
  expect(await named(page, "load_failed")).toEqual([{ load_source: "review_file", load_failure: "file" }]);
  expect(await named(page, "load_saved")).toEqual([]);
});

test("a review snapshot's open and its Review again are counted", async ({ page }) => {
  test.setTimeout(240_000);
  await loadStoredFile(page, earlierReview(STORED));
  await expect(page.getByText(EARLIER_REVIEWED)).toBeVisible({ timeout: 60_000 });
  const opens = await named(page, "review_open");
  expect(opens).toEqual([expect.objectContaining({ done_before: true, edges: EDGES })]);
  expect(await named(page, "feature")).toEqual([{ feature_name: "snapshot opened" }]);
  await page.getByRole("button", { name: "Review again" }).click();
  // The new review's line, with the engine off: its sweep has started, after the page's check that sends no second
  // review_open (the review snapshot counted the open)
  await expect(page.getByText("Engine off. The review is paused.")).toBeVisible({ timeout: 60_000 });
  expect(await named(page, "feature")).toEqual([{ feature_name: "snapshot opened" }, { feature_name: "review again" }]);
  expect(await named(page, "review_open")).toEqual(opens);
});
