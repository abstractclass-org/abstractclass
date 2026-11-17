// A practice bot that starts in no form (@abstractclass/practice, page.svelte.ts's play), on both sites: the game stops
// as on a later failure. The status line says, in the site's words, that the bot did not start and to load the page
// again, the line under the heading names no place where the bot runs, Abort ends the game, and the error goes to
// PostHog once, with the code's message, which the page does not show. The game sends no practice_start and no
// practice_end (Hedge School's design 17). Two faults make the start fail, with no GPU and no fault of the engine: the
// bot's worker script does not load (a 404 for it), and the practice library does not load in the worker, so that the
// worker refuses the start. The worker's script fails before the page sends its first request, which waited for good
// before (the engine's channel.ts).
// A game kept from an earlier visit, whose bot does not start, has its moves from the rules alone, and Abort keeps them:
// in Your games, unfinished, and in the stored game, which names no form (Hedge School's design 25). The stored game
// goes from a build that stores practice games, as check:all's and CI's do.
// The context's routes answer PostHog (tests/posthog.ts) and the site's store of practice games. The cases skip when a
// preview has no practice bot, and fail in CI. Run: npm run test:layout -- tests/practice-bot-start.spec.ts
// --project=chromium, with BASE_URL and CYANOTYPE_BASE_URL.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "./page-log.ts";
import { answerPostHog, keepBeacons, lookLikeAVisitor, withBeacons, type Sent } from "./posthog.ts";
import { declineGames } from "./cyanotype-consent.ts";
import { keepBefore } from "./keep-before.ts";
import { NAME, STORES } from "../../../packages/storage/src/db.ts";
import { CONSENT_KEY, PRACTICE_GAME_KEY } from "../src/lib/keys.ts";

const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;

/** The first moves of a fixture's record, with no number of a turn and no capture or cut among them. */
const firstMoves = (fixture: string, word: RegExp, count: number) =>
  (JSON.parse(readFileSync(`tests/fixtures/${fixture}`, "utf8")).record as string)
    .replace(/\[[^\]]*\]/g, "").split(/\s+/).filter(t => word.test(t)).slice(0, count);

const SITES = [
  { site: "Hedge School", base: () => test.info().project.use.baseURL!, starting: "Starting HedgeFund…",
    stopped: "HedgeFund did not start. Load the page again.", key: PRACTICE_GAME_KEY,
    moves: firstMoves("hedgefund-review.json", /^[A-T]\d+-[A-T]\d+$/, 6) },
  { site: "Cyanotype", base: () => CYANOTYPE!, starting: "Stamp Duty starts…",
    stopped: "Stamp Duty did not start. Load the page again.", key: "cyanotype:practice-game:1",
    moves: firstMoves("cyanotype-review.json", /^\d:-?\d+,-?\d+>\d:-?\d+,-?\d+$/, 3) },
];

/** The faults that stop the bot's start: each routes the page's requests. `library` is the practice library's
 *  address, from the site's manifest. */
const FAULTS = [
  { fault: "its worker's script does not load",
    route: (page: Page) => page.route(/\/botFormsWorker-[^/]*\.js(\?|$)/, r => r.fulfill({ status: 404, body: "" })) },
  { fault: "the worker refuses its start: the practice library does not load",
    route: (page: Page, library: string) => page.route(library, r => r.fulfill({ status: 404, body: "" })) },
];

/** The practice library's address and the first network in the site's manifest. The case skips when the site has no
 *  practice bot. */
async function practiceBot(page: Page, base: string): Promise<{ library: string; network: string }> {
  const manifest = await page.request.get(new URL("/engine/manifest.json", base).href).then(r => r.json()).catch(() => null);
  const artifacts = (manifest?.artifacts ?? []) as { kind: string; url: string; id: string }[];
  const library = artifacts.find(a => a.kind === "practice-library"), model = artifacts.find(a => a.kind === "model");
  const why = "the preview has no practice bot: run `npm run engine` in the site's folder before its build";
  if ((!library || !model) && process.env.CI) throw new Error(why);
  test.skip(!library || !model, why);
  return { library: new URL(library!.url, base).href, network: model!.id };
}

/** A page of the site whose consent banner does not cover it: the visitor's Decline of the practice games' link,
 *  Cyanotype's and Hedge School's, before any page loads. Its uncaught errors go into `errors`. */
async function sitePage(page: Page, errors: string[]) {
  await declineGames(page.context());
  await keepBefore(page, CONSENT_KEY, { games: "denied" });
  page.on("pageerror", e => errors.push(String(e)));
}

/** The reports of the practice's errors: the event engine_error, and PostHog's exception. */
const practiceErrors = (sent: Sent[]) => sent.filter(e => (e.event === "engine_error" || e.event === "$exception")
  && e.properties.error_kind === "practice").map(e => e.event).sort();

/** The events of a game's start and end. */
const gameEvents = (sent: Sent[]) => sent.map(e => e.event).filter(e => e === "practice_start" || e === "practice_end");

/** Every event of the tab, once its page has gone for the site's Privacy page: PostHog's client sends the events that
 *  it holds as the page goes, so they have all come once the page leave has (as cyanotype-events.spec.ts leaves). */
async function allEvents(page: Page, base: string, sent: Sent[]): Promise<Sent[]> {
  const leaves = async () => (await withBeacons(page, sent)).filter(e => e.event === "$pageleave").length;
  const before = await leaves();
  await page.goto(new URL("/privacy", base).href);
  await expect.poll(leaves, { timeout: 15_000 }).toBeGreaterThan(before);
  return withBeacons(page, sent);
}

/** Abort, confirmed. */
async function abort(page: Page) {
  await page.getByRole("button", { name: "Abort", exact: true }).click();
  await page.getByRole("alertdialog", { name: "Abort" }).getByRole("button", { name: "Abort", exact: true }).click();
}

/** The records of the games in the site's store (Your games). */
const storedRecords = (page: Page) => page.evaluate(([name, store]) => new Promise<string[]>((resolve, reject) => {
  const open = indexedDB.open(name);
  open.onerror = () => reject(open.error);
  open.onsuccess = () => {
    if (!open.result.objectStoreNames.contains(store)) { open.result.close(); resolve([]); return; }
    const all = open.result.transaction(store, "readonly").objectStore(store).getAll();
    all.onsuccess = () => { open.result.close(); resolve(all.result.map(g => String((g as { record: string }).record))); };
  };
}), [NAME, STORES.games] as const);

/** A record's text that holds `moves` in their order. */
const inOrder = (moves: string[]) => new RegExp(moves.map(m => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^]*"));

lookLikeAVisitor();

for (const { site, base, starting, stopped, key, moves } of SITES) {
  test.describe(site, () => {
    test.skip(site === "Cyanotype" && CYANOTYPE === undefined, "CYANOTYPE_BASE_URL gives no Cyanotype preview");

    for (const { fault, route } of FAULTS) {
      test(`a bot whose start fails (${fault}) stops the game, and Abort ends it`, async ({ context }) => {
        const sent = await answerPostHog(context);
        await keepBeacons(context);
        const page = await context.newPage(), errors: string[] = [];
        await sitePage(page, errors);
        await route(page, (await practiceBot(page, base())).library);
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
        await abort(page);
        await expect(blue).toBeVisible();
        // One failure, one report, and no event of a game's start or end: the bot never had the game.
        const all = await allEvents(page, base(), sent);
        expect(practiceErrors(all)).toEqual(["$exception", "engine_error"]);
        expect(gameEvents(all)).toEqual([]);
        expect(errors).toEqual([]);
      });
    }

    test("a game kept from an earlier visit, whose bot does not start, keeps its moves through Abort", async ({ context }) => {
      const sent = await answerPostHog(context);
      await keepBeacons(context);
      const stored: { bot: { form: string | null }; record: string; outcome: string }[] = [];
      await context.route("**/api/practice-games", async r => {
        if (r.request().method() === "POST") stored.push(JSON.parse(r.request().postData()!));
        await r.fulfill({ status: 201, contentType: "application/json", body: "{}" });
      });
      const page = await context.newPage(), errors: string[] = [];
      await sitePage(page, errors);
      const { library, network } = await practiceBot(page, base());
      await keepBefore(page, key, { version: 1, bot: { network, visits: 8, variety: "low" }, human: 0, name: "", seed: 1,
                                    moves, builds: [], started: new Date().toISOString(), form: "gpu" });
      await FAULTS[0].route(page, library);
      await page.goto(new URL("/practice", base()).href);
      await expect(page.getByRole("status").filter({ hasText: stopped })).toBeVisible({ timeout: 120_000 });
      await abort(page);
      await expect(page.getByRole("status").filter({ hasText: "The game you aborted is in Your games, unfinished." }))
        .toBeVisible();
      // Your games holds the game with its moves, and the stored game too, with no form: the bot never ran.
      const records = await storedRecords(page);
      expect(records).toHaveLength(1);
      expect(records[0]).toMatch(inOrder(moves));
      await expect.poll(() => stored.length, { timeout: 15_000 }).toBe(1);
      expect(stored[0].bot.form).toBeNull();
      expect(stored[0].outcome).toBe("aborted");
      expect(stored[0].record).toMatch(inOrder(moves));
      const all = await allEvents(page, base(), sent);
      expect(practiceErrors(all)).toEqual(["$exception", "engine_error"]);
      expect(gameEvents(all)).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}
