// Cyanotype's events of its review files and its review snapshot (its design 33, "Analytics and consent", with Hedge
// School's names and parameters of its design 17): a review file loaded and a file that cannot load, the exports of the
// review file and of the annotated record from the review and from the Review tab, and the review snapshot opened and
// Review again. Each runs on a build with a made-up measurement ID (VITE_GA_ID=G-TEST000000), as analytics-ask.spec.ts
// does: a build without the Google tag skips it. Every request to Google stops here, so the tag never runs: the test
// reads the commands that the site gives the tag's queue (window.dataLayer), kept in the tab's session storage across
// the page's loads.
import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { EDGE_RANGES, range } from "../../../packages/site/src/measure.ts";
import { parseRecord } from "../../cyanotype/src/lib/game/record.ts";
import { EARLIER_REVIEWED, earlierReview, fileInput } from "./review-file.ts";
import { CYANOTYPE, STORED, loadStoredFile, noReview, openReviewTab } from "./cyanotype-review.ts";

const GOOGLE = /(^|\.)(google-analytics|googletagmanager|doubleclick|google)\.(com|net)$/;
const LOG = "test:gtag-commands";

/** The events that the site gave the tag's queue in this tab so far: each one's name and parameters. */
const events = (page: Page) => page.evaluate(key => JSON.parse(sessionStorage.getItem(key) ?? "[]") as unknown[][], LOG)
  .then(commands => commands.filter(c => c[0] === "event").map(c => [c[1], c[2]] as [string, Record<string, unknown>]));

/** The events named `name`, by their parameters. */
const named = async (page: Page, name: string) => (await events(page)).filter(([n]) => n === name).map(([, p]) => p);

/** The game's length as the events give it. */
const EDGES = range(parseRecord(JSON.parse(readFileSync(STORED, "utf8")).record).moves.length, EDGE_RANGES);

test.beforeEach(async ({ page, context }) => {
  const skip = await noReview(page);
  test.skip(!!skip, skip);
  await context.route(url => GOOGLE.test(url.hostname), route => route.abort("blockedbyclient"));
  // The tag's queue, made before the site's: each command it takes also goes into the tab's session storage. The
  // visitor's choice is kept already, so that no banner covers the page.
  await context.addInitScript(([key]) => {
    localStorage.setItem("cyanotype:consent:1", JSON.stringify({ analytics: "denied" }));
    const layer: unknown[] = [];
    layer.push = (...commands: unknown[]) => {
      const log = JSON.parse(sessionStorage.getItem(key) ?? "[]");
      log.push(...commands.map(c => Array.from(c as ArrayLike<unknown>)));
      sessionStorage.setItem(key, JSON.stringify(log));
      return Array.prototype.push.apply(layer, commands);
    };
    Object.assign(window, { dataLayer: layer });
  }, [LOG]);
});

/** Skips the test in a build without the Google tag: its analytics give the queue no command. */
async function needsTag(page: Page) {
  const commands = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key) ?? "[]") as unknown[][], LOG);
  test.skip(!commands.some(c => c[0] === "config"), "this build has no Google tag");
}

/** Chooses the entry `entry` of the first Export menu, and waits for its file. */
async function exportFile(page: Page, entry: RegExp) {
  await page.getByRole("button", { name: "Export" }).first().click();
  await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: entry }).click()]);
}

test("a review file's load and its exports, from the review and from the Review tab, are counted", async ({ page }) => {
  test.setTimeout(240_000);
  await loadStoredFile(page);
  await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: 120_000 });
  await needsTag(page);
  expect(await named(page, "load_saved")).toEqual([{ load_source: "review_file", edges: EDGES, with_results: true }]);
  await exportFile(page, /^Review file/);
  await exportFile(page, /^Annotated record as a file/);
  await page.goto(new URL("/review", CYANOTYPE).href);
  await expect(page.getByRole("heading", { name: "Your games" })).toBeVisible({ timeout: 60_000 });
  await exportFile(page, /^Review file/);
  await exportFile(page, /^Annotated record as a file/);
  await expect.poll(() => named(page, "export")).toEqual([
    { export_kind: "review_file" }, { export_kind: "record_file" }, { export_kind: "review_file" }, { export_kind: "record_file" },
  ]);
});

test("a review file that cannot load is counted", async ({ page }) => {
  await openReviewTab(page);
  await needsTag(page);
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
  await needsTag(page);
  const opens = await named(page, "review_open");
  expect(opens).toEqual([expect.objectContaining({ done_before: true, edges: EDGES })]);
  expect(await named(page, "feature")).toEqual([{ feature_name: "snapshot opened" }]);
  await page.getByRole("button", { name: "Review again" }).click();
  await expect.poll(() => named(page, "feature")).toEqual([{ feature_name: "snapshot opened" }, { feature_name: "review again" }]);
  expect(await named(page, "review_open")).toEqual(opens); // the review snapshot counted the open
});
