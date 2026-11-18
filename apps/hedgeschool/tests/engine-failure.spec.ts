// The engine's failure on each page that runs it, on both sites: Practice, the Board editor, the review and the Analysis
// board, and Hedge School's Openings. Each page shows the site's line (engineLine in packages/site, UNMADE_LINE in packages/practice): what failed,
// then what the player can do. The error's message is the code's: it goes into the error report only, and the page
// never shows it. The engine's worker fails one request (engine-fault.ts), as practice-stop.spec.ts fails the bot's.
import { expect, test, type Page } from "./page-log.ts";
import { answerPostHog, keepBeacons, lookLikeAVisitor, withBeacons, type Sent } from "./posthog.ts";
import { declineGames } from "./cyanotype-consent.ts";
import { keepBefore } from "./keep-before.ts";
import { armFault, failOnce, FAULT_MESSAGE } from "./engine-fault.ts";
import { loadReviewFile } from "./review-file.ts";
import { chooseReviewFile, keepSettings, LITE } from "./cyanotype-review.ts";
import { CONSENT_KEY, ENGINE_KEY, PRACTICE_GAME_KEY } from "../src/lib/keys.ts";
import { ENGINE_KEY as CYANOTYPE_ENGINE_KEY } from "../../cyanotype/src/lib/site.ts";

const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;

const SITES = [
  { site: "Hedge School", base: () => test.info().project.use.baseURL!, engine: "The engine", key: PRACTICE_GAME_KEY,
    engineKey: ENGINE_KEY },
  { site: "Cyanotype", base: () => CYANOTYPE!, engine: "Stamp Duty", key: "cyanotype:practice-game:1",
    engineKey: CYANOTYPE_ENGINE_KEY },
];

const UNSTARTED = (engine: string) => `${engine} did not start. Load the page again.`;
const ERROR = (engine: string) => `${engine} has an error. Load the page again.`;
const UNMADE = "The page has an error. Start a new game.";

/** The reports of the engine's errors of one kind: the event engine_error, and PostHog's exception. */
const reports = (sent: Sent[], kind: string) => sent.filter(e => (e.event === "engine_error" || e.event === "$exception")
  && e.properties.error_kind === kind).map(e => e.event).sort();
/** The messages of the error reports of one kind: the code's, which the page does not show. */
const messages = (sent: Sent[], kind: string) => sent.filter(e => e.event === "$exception" && e.properties.error_kind === kind)
  .flatMap(e => (e.properties.$exception_list as { value: string }[]).map(x => x.value));

/** Every event of the tab, once its page has gone for the site's Privacy page (as practice-stop.spec.ts reads them). */
async function allEvents(page: Page, base: string, sent: Sent[]): Promise<Sent[]> {
  const leaves = async () => (await withBeacons(page, sent)).filter(e => e.event === "$pageleave").length;
  const before = await leaves();
  await page.goto(new URL("/privacy", base).href);
  await expect.poll(leaves, { timeout: 15_000 }).toBeGreaterThan(before);
  return withBeacons(page, sent);
}

/** The site's red line `line`, alone: no line holds the error's message. */
async function shows(page: Page, line: string) {
  await expect(page.getByText(line, { exact: true })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(FAULT_MESSAGE)).toHaveCount(0);
}

lookLikeAVisitor();

for (const { site, base, engine, key, engineKey } of SITES) {
  test.describe(site, () => {
    test.skip(site === "Cyanotype" && CYANOTYPE === undefined, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
    let sent: Sent[];
    let page: Page;
    test.beforeEach(async ({ context }) => {
      sent = await answerPostHog(context);
      await keepBeacons(context);
      page = await context.newPage();
      await declineGames(context);
      await keepBefore(page, CONSENT_KEY, { games: "denied" });
      await keepBefore(page, engineKey, { on: true, review: "lite", gpu: "off" });
    });

    test("Practice's rules engine that does not start: the line, one report, and a new load plays", async () => {
      await failOnce(page, "init");
      await page.goto(new URL("/practice", base()).href);
      await shows(page, UNSTARTED(engine));
      await expect(page.getByRole("button", { name: "Play as Blue" })).toHaveCount(0);
      await expect.poll(() => reports(sent, "practice"), { timeout: 15_000 }).toEqual(["$exception", "engine_error"]);
      expect(messages(sent, "practice")).toEqual([FAULT_MESSAGE]); // the report has the code's message
      // The way out: the fault came once, so the page loaded again starts its engine
      await page.reload();
      await expect(page.getByRole("button", { name: "Play as Blue" })).toBeEnabled({ timeout: 120_000 });
      await expect(page.getByText(UNSTARTED(engine))).toHaveCount(0);
      expect(reports(await allEvents(page, base(), sent), "practice")).toEqual(["$exception", "engine_error"]);
    });

    test("a kept game that the page cannot make: the settings card's line, one report, and a new game", async () => {
      const manifest = await page.request.get(new URL("/engine/manifest.json", base()).href).then(r => r.json());
      const network = (manifest.artifacts as { kind: string; id: string }[]).find(a => a.kind === "model")!.id;
      // A game kept with a field that the site's code cannot read: the page resumes it at each load
      await keepBefore(page, key, { version: 1, bot: { network, visits: 8, variety: "low" }, human: 0, name: "",
                                    seed: 1, moves: [], builds: null, started: new Date().toISOString() });
      await page.goto(new URL("/practice", base()).href);
      await shows(page, UNMADE);
      await expect(page.getByText(/is not iterable/)).toHaveCount(0); // the code's message
      await expect.poll(() => reports(sent, "practice"), { timeout: 15_000 }).toEqual(["$exception", "engine_error"]);
      const [message] = messages(sent, "practice"); // the report has the code's message, and the page does not show it
      expect(message).toBeTruthy();
      await expect(page.getByText(message)).toHaveCount(0);
      // The way out: a new game replaces the game kept
      await page.getByRole("button", { name: "Play as Blue" }).click();
      await expect(page.getByText(UNMADE)).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Play as Blue" })).toHaveCount(0, { timeout: 60_000 });
    });

    test("the Board editor's engine that does not start: the line and one report", async () => {
      await failOnce(page, "init");
      await page.goto(new URL("/editor", base()).href);
      await shows(page, UNSTARTED(engine));
      await expect.poll(() => reports(sent, "load"), { timeout: 15_000 }).toEqual(["$exception", "engine_error"]);
      expect(messages(sent, "load")).toEqual([FAULT_MESSAGE]); // the report has the code's message
    });

    test("the Analysis board's engine that does not start: the line and its report", async () => {
      await failOnce(page, "init");
      await page.goto(new URL("/analysis", base()).href);
      await shows(page, UNSTARTED(engine));
      await expect.poll(() => reports(sent, "load"), { timeout: 15_000 }).toContain("engine_error");
    });

    // Openings is Hedge School's page only. It starts its engine as the Analysis board does.
    if (site === "Hedge School") test("Openings' engine that does not start: the line and its report", async () => {
      await failOnce(page, "init");
      await page.goto(new URL("/openings", base()).href);
      await shows(page, UNSTARTED(engine));
      await expect.poll(() => reports(sent, "load"), { timeout: 15_000 }).toContain("engine_error");
    });

    test("a search that fails: the engine panel's line, and a new load clears it", async () => {
      await failOnce(page, "search");
      await page.goto(new URL("/analysis", base()).href);
      await shows(page, ERROR(engine));
      // The way out: the fault came once, so the page loaded again searches with no failure. The position's candidates
      // show its search's result.
      await page.reload();
      const candidates = page.locator("table").filter({ hasText: "Visits" }).first().locator("[data-name]");
      await expect(candidates.first()).toBeAttached({ timeout: 120_000 });
      await expect(page.getByText(ERROR(engine))).toHaveCount(0);
    });

    test("the review's engine that does not start: the line and its report", async () => {
      test.setTimeout(240_000);
      await failOnce(page, "init", false);
      if (site === "Hedge School") {
        await page.goto(new URL("/review", base()).href);
        await loadReviewFile(page, "tests/fixtures/hedgefund-review.json");
      } else {
        await keepSettings(page, { on: false, ...LITE }, {});
        await chooseReviewFile(page, "tests/fixtures/cyanotype-review.json");
      }
      await page.waitForURL(/#game=/, { timeout: 60_000 });
      // The tab then loads again by itself to review the game (the page's otherGame). Arm the fault once that review
      // shows (main.review, not its busy skeleton), so that it comes at the test's own load and not at the page's.
      await expect(page.locator("main.review:not([aria-busy])")).toBeVisible({ timeout: 120_000 });
      await armFault(page);
      await page.reload();
      await shows(page, UNSTARTED(engine));
      await expect.poll(() => reports(sent, "load"), { timeout: 15_000 }).toContain("engine_error");
    });
  });
}
