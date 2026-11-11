// The Export menu's results and the Analysis board's refusal of a review file, on both sites (Hedge School's designs
// 13, 17 and 21, Cyanotype's design 33): the shared code (packages/review/src/exports.ts, packages/analysis/src/files.ts)
// with each site's own parts. On the Analysis board: the link and the annotated record copied, the analysis file and
// the record saved, and a review file refused with the board's notice. In the review: the link copied, with the note
// on its length. Nothing searches: the engine is off, and the review comes from a review file with its results.
// Cyanotype's cases skip, with a message, when CYANOTYPE_BASE_URL gives no preview with the engine's files. Run:
// npx playwright test tests/exports.spec.ts --project=chromium, with BASE_URL and CYANOTYPE_BASE_URL.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "./page-log.ts";
import { shareNote } from "../../../packages/review/src/exports.ts";
import { ENGINE_KEY } from "../../cyanotype/src/lib/site.ts";
import { CYANOTYPE, LITE, noReview, reviewStoredFile, testRecord } from "./cyanotype-review.ts";
import { loadReviewFile } from "./review-file.ts";

/** A site as these tests use it: its name, an address on it, its files' formats, a record of three moves for the
 *  Analysis board, what each page needs first (the engine off), and its review of a game from a review file. */
interface Site {
  name: string;
  at: (path: string) => string;
  analysisFormat: string;
  reviewFormat: string;
  record: string;
  setUp: (page: Page) => Promise<void>;
  review: (page: Page) => Promise<void>;
}

const SITES: Site[] = [
  {
    name: "Hedge School",
    at: path => path, // the project's baseURL
    analysisFormat: "hedge-school-analysis",
    reviewFormat: "hedge-school-review",
    record: "1. D10-G10 2. N11-Q10 L10-N11 *",
    // The visitor has answered the consent notice, which covers the page's foot until they choose. The engine is off.
    setUp: page => page.addInitScript(() => {
      localStorage.setItem("hedge-school:consent:2", JSON.stringify({ games: "denied" }));
      localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false, gpu: "off" }));
    }),
    review: async page => {
      await page.goto("/review");
      await loadReviewFile(page, "tests/fixtures/hedgefund-review.json");
      await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: 300_000 });
    },
  },
  {
    name: "Cyanotype",
    at: path => new URL(path, CYANOTYPE).href,
    analysisFormat: "cyanotype-analysis",
    reviewFormat: "cyanotype-review",
    record: testRecord(2), // 1 move in the first turn, 2 in the second
    setUp: async page => {
      const skip = await noReview(page);
      test.skip(!!skip, skip);
      await page.addInitScript(([key, settings]) => localStorage.setItem(key, settings),
                               [ENGINE_KEY, JSON.stringify({ ...LITE, on: false })]);
    },
    review: page => reviewStoredFile(page),
  },
];

/** The clipboard's text. Windows' clipboard gives each line end back as CR LF. */
const clipboard = async (page: Page) =>
  (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n");
/** Chooses the entry `entry` of the page's first Export menu. */
async function choose(page: Page, entry: RegExp) {
  await page.getByRole("button", { name: "Export" }).first().click();
  await page.getByRole("menuitem", { name: entry }).click();
}
/** The file that the entry `entry` of the page's first Export menu saves: its name and its text. */
async function saved(page: Page, entry: RegExp): Promise<{ name: string; text: string }> {
  await page.getByRole("button", { name: "Export" }).first().click();
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: entry }).click()]);
  return { name: file.suggestedFilename(), text: readFileSync((await file.path())!, "utf8") };
}
/** A pattern of the text `text`, as it is. */
const literal = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

for (const site of SITES) {
  test.describe(site.name, () => {
    test.beforeEach(async ({ page, context }) => {
      await site.setUp(page);
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    });

    test("the Analysis board's exports: its link and its record copied, its file and its record saved", async ({ page }) => {
      await page.goto(site.at(`/analysis#${new URLSearchParams({ record: site.record })}`));
      await expect(page.getByRole("button", { name: "Export" }).first()).toBeEnabled({ timeout: 120_000 });
      const origin = new URL(page.url()).origin;
      // The board's game and its moves' labels can still be on their way: until then an export makes nothing
      await expect(async () => {
        await choose(page, /^Copy a link to share the analysis/);
        expect(await clipboard(page)).toMatch(new RegExp(`^${literal(origin)}/analysis#packed=[\\w-]+`));
      }).toPass({ timeout: 60_000 });
      await expect(page.getByText("Link copied", { exact: true })).toBeVisible();

      await choose(page, /^Copy the annotated record/);
      await expect(page.getByText("Annotated record copied", { exact: true })).toBeVisible();
      const record = await clipboard(page);
      // The record wraps its note's lines
      expect(record.replace(/\s+/g, " "))
        .toMatch(new RegExp(`\\{ ${literal(site.name)}'s Analysis board, with .+ \\(the network [\\w-]+\\)\\. \\}`));
      expect(await saved(page, /^Annotated record as a file/)).toEqual({ name: "analysis.txt", text: record });

      const file = await saved(page, /^Analysis file/);
      expect(file.name).toMatch(new RegExp(`^${site.analysisFormat}-\\d{8}-\\d{4}\\.json$`));
      expect(JSON.parse(file.text)).toMatchObject({ format: site.analysisFormat, board: { main: expect.any(Array) } });
      expect(JSON.parse(file.text).board.main).toHaveLength(3);
    });

    test("the Analysis board refuses a review file, and says where it loads", async ({ page }) => {
      await page.goto(site.at("/analysis"));
      await page.getByRole("button", { name: "New", exact: true }).click({ timeout: 120_000 });
      const chooser = page.waitForEvent("filechooser");
      await page.getByRole("menuitem", { name: /Load an analysis file/ }).click();
      await (await chooser).setFiles({ name: "review.json", mimeType: "application/json",
                                       buffer: Buffer.from(JSON.stringify({ format: site.reviewFormat })) });
      await expect(page.getByRole("alert"))
        .toHaveText("The Analysis board cannot load this file: this is a review file: load it in the Review tab.");
    });

    test("the review's link is copied, with its length in the note", async ({ page }) => {
      await site.review(page);
      const origin = new URL(page.url()).origin;
      await choose(page, /^Copy a link to share the review/);
      await expect(page.getByRole("status").filter({ hasText: /^Link copied/ })).toBeVisible();
      const link = await clipboard(page);
      expect(link).toMatch(new RegExp(`^${literal(origin)}/review#packed=[\\w-]+`));
      await expect(page.getByText(shareNote(link.length), { exact: true })).toBeVisible();
    });
  });
}
