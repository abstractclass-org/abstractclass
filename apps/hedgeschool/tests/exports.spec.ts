// The Export menu's results and the Analysis board's refusal of a review file, on both sites (Hedge School's designs
// 13, 17 and 21, Cyanotype's design 33): the shared code (packages/review/src/exports.ts, packages/analysis/src/files.ts)
// with each site's own parts. On the Analysis board: the link and the annotated record copied, the analysis file and
// the record saved, and a review file refused with the board's notice. In the review: the link copied, with the note
// on its length. A shared review's link: its intro (packages/review/src/SharedIntro.svelte) in the site's words.
// Nothing searches: the engine is off, and the review comes from a review file with its results.
// Cyanotype's cases skip, with a message, when CYANOTYPE_BASE_URL gives no preview with the engine's files. Run:
// npx playwright test tests/exports.spec.ts --project=chromium, with BASE_URL and CYANOTYPE_BASE_URL.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "./page-log.ts";
import { shareNote } from "../../../packages/review/src/exports.ts";
import { reviewLink, type ReviewRun } from "../../../packages/analysis/src/share.ts";
import { ENGINE_KEY } from "../../cyanotype/src/lib/site.ts";
import { parseRecord as readBlueprints } from "../../cyanotype/src/lib/game/record.ts";
import { reviewLink as blueprintsLink } from "../../cyanotype/src/lib/game/share.ts";
import { parseRecord } from "../src/lib/game/record.ts";
import { ENCLOSURE_CODE } from "../src/lib/game/share.ts";
import { CYANOTYPE, LITE, noReview, reviewStoredFile, testRecord } from "./cyanotype-review.ts";
import { loadReviewFile } from "./review-file.ts";
import { keepBefore } from "./keep-before.ts";
import { CONSENT_KEY, ENGINE_KEY as HEDGE_SCHOOL_ENGINE } from "../src/lib/keys.ts";

/** A site as these tests use it: its name, an address on it, its files' formats, a record of three moves for the
 *  Analysis board and one of a single move, the link that shares a record's review (its path), what each page needs
 *  first (the engine off), and its review of a game from a review file. */
interface Site {
  name: string;
  at: (path: string) => string;
  analysisFormat: string;
  reviewFormat: string;
  record: string;
  oneMove: string;
  shareLink: (record: string, run: ReviewRun) => string;
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
    oneMove: "1. D10-G10 *",
    shareLink: (record, run) => reviewLink("", run, players(parseRecord(record)), [], ENCLOSURE_CODE),
    // The visitor has answered the consent notice, which covers the page's foot until they choose. The engine is off.
    setUp: async page => {
      await keepBefore(page, CONSENT_KEY, { games: "denied" });
      await keepBefore(page, HEDGE_SCHOOL_ENGINE, { on: false, gpu: "off" });
    },
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
    oneMove: testRecord(1),
    shareLink: (record, run) => blueprintsLink("", players(readBlueprints(record)), [], run),
    setUp: async page => {
      const skip = await noReview(page);
      test.skip(!!skip, skip);
      await page.addInitScript(([key, settings]) => localStorage.setItem(key, settings),
                               [ENGINE_KEY, JSON.stringify({ ...LITE, on: false })]);
    },
    review: page => reviewStoredFile(page),
  },
];

/** The game `game` with the players Ann and Bo. */
const players = <G extends { tags: Record<string, string> }>(game: G): G =>
  ({ ...game, tags: { ...game.tags, Blue: "Ann", Red: "Bo" } });
/** A review that ran with a CPU module and a network that neither site has. */
const UNKNOWN_RUN: ReviewRun = { module: "0".repeat(64), model: "0".repeat(64), visits: 1024 };
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

    // The intro is one component on both sites (packages/review/src/SharedIntro.svelte): the game's length in the
    // game's word for a move, the singular for one, and the rest word for word. The sender's network and engine are
    // ones that the site does not have, so the intro says that the labels can differ.
    for (const [moves, length] of [[1, site.name === "Hedge School" ? "1 edge" : "1 move"],
                                   [3, site.name === "Hedge School" ? "3 edges" : "3 moves"]] as const) {
      test(`a shared review's intro says what the link holds, in the site's words: ${length}`, async ({ page }) => {
        await page.goto(site.at(site.shareLink(moves === 1 ? site.oneMove : site.record, UNKNOWN_RUN)));
        const heading = page.getByRole("heading", { name: "A shared review" });
        await expect(heading).toBeVisible({ timeout: 60_000 });
        await expect(heading.locator("xpath=..").locator("p")).toHaveText([
          `Ann against Bo, ${length}.`,
          "The link carries the game, not the engine's work. Your browser reviews the game again, as it does a game "
            + "that you import. The review shows each result when the engine finds it. With the sender's engine, "
            + "network and depth, your review is the same as the sender's: the same quality labels, lines and accuracy. "
            + "A GPU computes the network a little differently, so on a GPU a close call can rarely give another result.",
          "The sender's review: a network that this site no longer has, at Standard (1,024 visits a position). The "
            + "review uses your network, so its quality labels can differ. This site's engine changed after the sender "
            + "made the link, so some quality labels can differ.",
        ]);
        await expect(page.getByRole("button", { name: "Review it" })).toBeVisible();
      });
    }
  });
}
