// The error reports to PostHog (design 17, "Error reports"; Cyanotype's design 33, "Analytics"), on both sites' builds
// of check:all, each with a made-up PostHog key. No request reaches PostHog: the context's route (tests/posthog.ts)
// answers in its place and keeps what the pages sent. Each case gives a page a game: a record with a typed name in its
// tags, in the page's address or in an error's message. Each report reaches the route, and no event holds the game.
import { readFileSync } from "node:fs";
import { test, expect, type Page } from "./page-log.ts";
import { answerPostHog, lookLikeAVisitor, type Sent } from "./posthog.ts";
import { firstTurns } from "./records.ts";

const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;

/** A name that a player typed, in the record's tag of Blue. */
const TYPED = "Wren Typedname";

/** A test game's record, its first turns, with the typed name for Blue. */
const record = (fixture: string) => {
  const { record } = JSON.parse(readFileSync(new URL(`fixtures/${fixture}`, import.meta.url), "utf8")) as { record: string };
  return firstTurns(record, 4).replace(/^\[Blue "[^"]*"\]$/m, `[Blue "${TYPED}"]`);
};

const SITES = [
  { site: "Hedge School", base: () => test.info().project.use.baseURL!, record: record("hedgefund-review.json") },
  { site: "Cyanotype", base: () => CYANOTYPE!, record: record("cyanotype-review.json") },
];

/** The words that no event may hold: the typed name, and each move of the record, as text and as an address holds it. */
function secrets(text: string) {
  const moves = text.split(/\r?\n\r?\n/)[1].trim().split(/\s+/).filter(w => !/^\d+\.$/.test(w));
  return [TYPED, "Typedname", ...moves.flatMap(m => [m, encodeURIComponent(m)])];
}

/** The secrets that the events hold, which must be none. */
const leaked = (sent: Sent[], text: string) => {
  const all = JSON.stringify(sent);
  return secrets(text).filter(s => all.includes(s));
};

const reports = (sent: Sent[]) => sent.filter(e => e.event === "$exception");

/** An exception's message and type, as PostHog's client sent them. */
const exceptions = (sent: Sent[]) => reports(sent).flatMap(e =>
  (e.properties.$exception_list as { type: string; value: string }[]).map(x => ({ type: x.type, value: x.value })));

/** Runs `code` in the page as a script of its own, whose error no one catches. */
const uncaught = (page: Page, code: string) => page.addScriptTag({ content: code }).catch(() => {});

lookLikeAVisitor();

for (const { site, base, record: text } of SITES) {
  test.describe(site, () => {
    test.skip(site === "Cyanotype" && CYANOTYPE === undefined, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
    const at = (path: string) => new URL(path, base()).href;

    /** Opens the site's About page, and waits for its page view: PostHog's client has started. */
    async function open(page: Page, sent: Sent[]) {
      await page.goto(at("/about"));
      await expect.poll(() => sent.some(e => e.event === "$pageview"), { timeout: 15_000 }).toBe(true);
    }

    test("an uncaught error and a rejection, with a record in the page's address, reach PostHog without it", async ({ context }) => {
      const sent = await answerPostHog(context);
      const page = await context.newPage();
      await open(page, sent);
      await page.evaluate(r => history.replaceState(null, "", `#record=${encodeURIComponent(r)}`), text);
      await uncaught(page, "throw new Error('the page failed at ' + location.href)");
      await uncaught(page, "Promise.reject(new TypeError('the promise failed at ' + location.href))");
      await expect.poll(() => reports(sent).length, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
      const errors = exceptions(sent);
      expect(errors).toContainEqual({ type: "Error", value: `the page failed at ${at("/about")}#…` });
      expect(errors).toContainEqual({ type: "TypeError", value: `the promise failed at ${at("/about")}#…` });
      for (const e of reports(sent)) expect(e.properties.$current_url).toBe(at("/about"));
      expect(leaked(sent, text)).toEqual([]);
      expect(JSON.stringify(sent)).not.toContain("record=");
    });

    test("an engine that fails to load, on the Analysis board opened with a record, and an error with a player's name are reported without them", async ({ context }) => {
      const sent = await answerPostHog(context);
      const page = await context.newPage();
      // The engine's network cannot load (packages/engine/src/artifacts.ts: its HTTP status)
      await page.route(/\/engine\/[^/]+\/model[^/]*$/, route => route.fulfill({ status: 404, body: "" }));
      await page.goto(at(`/analysis#record=${encodeURIComponent(text)}`));
      await expect.poll(() => reports(sent).map(e => e.properties.error_kind), { timeout: 60_000 }).toContain("load");
      await expect.poll(() => sent.filter(e => e.event === "engine_error").map(e => e.properties.error_kind)).toContain("load");
      const report = reports(sent).find(e => e.properties.error_kind === "load")!;
      expect(exceptions([report])[0].value).toMatch(/HTTP 404/);
      // A library's message can hold a player's name with no quotes: the page read the record, so its names go too.
      await uncaught(page, `throw new Error(${JSON.stringify(`no rating for ${TYPED} here`)})`);
      await expect.poll(() => exceptions(sent).map(x => x.value)).toContain("no rating for … here");
      expect(leaked(sent, text)).toEqual([]);
    });

    test("an error whose message holds a record, with a typed name, and a file's name reaches PostHog without them", async ({ context }) => {
      const sent = await answerPostHog(context);
      const page = await context.newPage();
      await open(page, sent);
      await uncaught(page, `throw new Error(${JSON.stringify(`the site cannot read "${TYPED}'s game.txt": ${text}`)})`);
      await expect.poll(() => reports(sent).length, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
      const [error] = exceptions(sent);
      expect(error.type).toBe("Error");
      // The message's own words stay, and each tag keeps its name: the report still says what failed.
      expect(error.value).toMatch(/^the site cannot read "…": \[Event "…"\]/);
      expect(leaked(sent, text)).toEqual([]);
    });
  });
}
