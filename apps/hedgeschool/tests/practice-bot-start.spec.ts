// A practice bot that starts in no form (@abstractclass/practice, page.svelte.ts's play), on both sites: the game stops
// before its first position as on a later failure. The status line says, in the site's words, that the bot did not
// start and to load the page again, the line under the heading names no place where the bot runs, Abort ends the
// game, and the error goes to PostHog once, with the code's message, which the page does not show. Two faults make the
// start fail, with no GPU and no fault of the engine: the bot's worker script does not load (a 404 for it), and the
// practice library does not load in the worker, so that the worker refuses the start.
// The worker's script fails before the page sends its first request, which waited for good before (the engine's
// channel.ts). The context's route answers PostHog (tests/posthog.ts). The cases skip when a preview has no practice
// bot, and fail in CI. Run: npm run test:layout -- tests/practice-bot-start.spec.ts --project=chromium, with BASE_URL
// and CYANOTYPE_BASE_URL.
import { expect, test, type BrowserContext, type Page } from "./page-log.ts";
import { answerPostHog, lookLikeAVisitor, type Sent } from "./posthog.ts";
import { CONSENT_KEY } from "../src/lib/keys.ts";

const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;

const SITES = [
  { site: "Hedge School", base: () => test.info().project.use.baseURL!, starting: "Starting HedgeFund…",
    stopped: "HedgeFund did not start. Load the page again." },
  { site: "Cyanotype", base: () => CYANOTYPE!, starting: "Stamp Duty starts…",
    stopped: "Stamp Duty did not start. Load the page again." },
];

/** The faults that stop the bot's start: each routes the page's requests. `library` is the practice library's
 *  address, from the site's manifest. */
const FAULTS = [
  { fault: "its worker's script does not load",
    route: (page: Page) => page.route(/\/botFormsWorker-[^/]*\.js(\?|$)/, r => r.fulfill({ status: 404, body: "" })) },
  { fault: "the worker refuses its start: the practice library does not load",
    route: (page: Page, library: string) => page.route(library, r => r.fulfill({ status: 404, body: "" })) },
];

/** The visitor's Decline of the practice games' link on both sites, before any page loads: the consent banner would
 *  cover the page. */
const declineGames = (context: BrowserContext) => context.addInitScript(keys => {
  for (const key of keys) {
    try {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify({ games: "denied" }));
    } catch { /* about:blank has no storage */ }
  }
}, [CONSENT_KEY, "cyanotype:consent:1"]);

/** The practice library's address in the site's manifest. The case skips when the site has no practice bot. */
async function practiceLibrary(page: Page, base: string): Promise<string> {
  const manifest = await page.request.get(new URL("/engine/manifest.json", base).href).then(r => r.json()).catch(() => null);
  const library = (manifest?.artifacts as { kind: string; url: string }[] | undefined)?.find(a => a.kind === "practice-library");
  const why = "the preview has no practice bot: run `npm run engine` in the site's folder before its build";
  if (!library && process.env.CI) throw new Error(why);
  test.skip(!library, why);
  return new URL(library!.url, base).href;
}

/** The reports of the practice's errors: the event engine_error, and PostHog's exception. */
const practiceErrors = (sent: Sent[]) => sent.filter(e => (e.event === "engine_error" || e.event === "$exception")
  && e.properties.error_kind === "practice").map(e => e.event).sort();

lookLikeAVisitor();

for (const { site, base, starting, stopped } of SITES) {
  test.describe(site, () => {
    test.skip(site === "Cyanotype" && CYANOTYPE === undefined, "CYANOTYPE_BASE_URL gives no Cyanotype preview");

    for (const { fault, route } of FAULTS) {
      test(`a bot whose start fails (${fault}) stops the game, and Abort ends it`, async ({ context }) => {
        const sent = await answerPostHog(context);
        await declineGames(context);
        const page = await context.newPage();
        const errors: string[] = [];
        page.on("pageerror", e => errors.push(String(e)));
        await route(page, await practiceLibrary(page, base()));
        await page.goto(new URL("/practice", base()).href);
        const blue = page.getByRole("button", { name: "Play as Blue" });
        await expect(blue).toBeEnabled({ timeout: 120_000 });
        await blue.click();
        await expect(page.getByRole("status").filter({ hasText: stopped })).toBeVisible({ timeout: 120_000 });
        await expect(page.getByText(starting)).toHaveCount(0);
        await expect(page.getByText(/The game stopped|engine worker|dynamically imported/)).toHaveCount(0); // the code's
        await expect(page.getByText(/on the GPU|on the CPU workers|on one thread/)).toHaveCount(0); // runs nowhere
        await expect.poll(() => practiceErrors(sent), { timeout: 15_000 }).toEqual(["$exception", "engine_error"]);
        // The way out, as after a later failure: Abort, then the settings card for a new game.
        await page.getByRole("button", { name: "Abort", exact: true }).click();
        await page.getByRole("alertdialog", { name: "Abort" }).getByRole("button", { name: "Abort", exact: true }).click();
        await expect(blue).toBeVisible();
        expect(practiceErrors(sent)).toEqual(["$exception", "engine_error"]); // one failure, one report
        expect(errors).toEqual([]);
      });
    }
  });
}
