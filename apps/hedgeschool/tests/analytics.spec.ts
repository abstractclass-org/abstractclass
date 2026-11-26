// The measuring with PostHog (design 11 and 17), on the sites' builds of check:all, each with a made-up PostHog key
// (scripts/check-all.mjs). The pages send PostHog's requests to the site's own path (design 27, item 6), whose
// Function the previews do not run. No request reaches PostHog: tests/posthog.ts answers the path and PostHog's
// addresses in PostHog's place, and keeps what the pages sent. That a build without the key holds none of PostHog's
// code is check:all's steps `cyanotype-no-posthog` and `mistak-no-posthog`, each on a build without the key. Mistak's
// consent banner waits for its practice games (abscls-shfz.18.22).
import { test, expect, type Page } from "./page-log.ts";
import { answerPostHog, lookLikeAVisitor } from "./posthog.ts";
import { CONSENT_KEY } from "../src/lib/keys.ts";
import { POSTHOG_PATH } from "../../../packages/site/src/posthogProxy.ts";

const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;
const MISTAK = process.env.MISTAK_BASE_URL;

lookLikeAVisitor();

/** What this site keeps in the browser: its cookies, and the keys of its local and session storage. PostHog's own keys
 *  start with `ph_`, or `__ph_` for its consent (`__ph_opt_in_out_` and the project's key). */
const kept = (page: Page) => page.evaluate(() => ({
  cookies: document.cookie,
  keys: [...Object.keys(localStorage), ...Object.keys(sessionStorage)],
}));

test("Hedge School, a build with PostHog's key: after ?internal=on, its page views carry internal: true, and no `#` part", async ({ context, baseURL }) => {
  const sent = await answerPostHog(context);
  const page = await context.newPage();
  // A review's address names its game's id after the `#` (design 22): PostHog must not receive it.
  await page.goto("/notation?internal=on#game=test-id");
  const views = () => sent.filter(e => e.event === "$pageview");
  await expect.poll(() => views().length, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
  expect(views()[0].properties).toMatchObject({ internal: true, $current_url: `${baseURL}/notation`, $pathname: "/notation" });

  // The next page, by the site's router: a page view of its own, still internal.
  await page.getByRole("link", { name: "About" }).first().click();
  await page.waitForURL("**/about");
  await expect.poll(() => views().map(e => e.properties.$pathname), { timeout: 15_000 }).toContain("/about");
  expect(views().every(e => e.properties.internal === true)).toBe(true);
  for (const e of sent) expect(String(e.properties.$current_url ?? "")).not.toContain("#");

  // Only events, to the site's own address and its path for PostHog: none to PostHog's hosts, no feature flags, no
  // remote settings, no script from PostHog.
  expect([...new Set(sent.map(e => e.origin))]).toEqual([new URL(baseURL!).origin]);
  expect([...new Set(sent.map(e => e.path))]).toEqual([`${POSTHOG_PATH}/e/`]);
  expect(sent.map(e => e.event).filter(e => !["$pageview", "$pageleave"].includes(e))).toEqual([]);
});

test("Hedge School, a build with PostHog's key: without the flag, no `internal`, and PostHog keeps nothing in the browser", async ({ context }) => {
  const sent = await answerPostHog(context);
  const page = await context.newPage();
  await page.goto("/about?internal=off");
  await expect.poll(() => sent.filter(e => e.event === "$pageview").length, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
  const view = sent.find(e => e.event === "$pageview")!;
  expect(view.properties.internal).toBeUndefined();
  expect(view.properties.$cookieless_mode).toBe(true);
  const { cookies, keys } = await kept(page);
  expect(cookies).toBe("");
  expect(keys.filter(k => /(^|_)ph_|posthog/i.test(k))).toEqual([]);
});

test("Hedge School: the consent banner asks only about the practice games' random ID", async ({ context }) => {
  await answerPostHog(context);
  const page = await context.newPage();
  await page.goto("/");
  const banner = page.getByRole("region", { name: "Help the school get better" });
  await expect(banner).toBeVisible();
  await expect(banner.getByRole("listitem")).toHaveCount(1);
  await expect(banner.getByRole("listitem")).toContainText("A random ID in this browser groups your games against bots");
  await expect(banner).not.toContainText(/cookie|Google|PostHog/i);
  await banner.getByRole("button", { name: "Accept" }).click();
  await expect(banner).toHaveCount(0);
  expect(await page.evaluate(k => localStorage.getItem(k), CONSENT_KEY)).toBe(JSON.stringify({ games: "granted" }));
});

test("Cyanotype, a build with PostHog's key: its page views carry internal: true after ?internal=on, it asks only for the games' link, and keeps nothing for PostHog", async ({ context }) => {
  test.skip(CYANOTYPE === undefined, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
  const at = (path: string) => new URL(path, CYANOTYPE).href;
  const sent = await answerPostHog(context);
  const page = await context.newPage();
  await page.goto(at("/?internal=on"));
  const views = () => sent.filter(e => e.event === "$pageview");
  await expect.poll(() => views().length, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
  expect(views()[0].properties).toMatchObject({ internal: true, $host: new URL(CYANOTYPE!).host, $pathname: "/" });
  // The next page, by the site's router: a page view of its own, still internal.
  await page.getByRole("link", { name: "About" }).first().click();
  await page.waitForURL("**/about");
  await expect.poll(() => views().map(e => e.properties.$pathname), { timeout: 15_000 }).toContain("/about");
  expect(views().every(e => e.properties.internal === true && e.properties.$cookieless_mode === true)).toBe(true);
  // Only events, to Cyanotype's own address and its path for PostHog.
  expect([...new Set(sent.map(e => e.origin))]).toEqual([new URL(CYANOTYPE!).origin]);
  expect([...new Set(sent.map(e => e.path))]).toEqual([`${POSTHOG_PATH}/e/`]);

  // The consent, in a build that stores practice games (check:all's): the banner asks for the games' link only, as
  // Hedge School's does, and the privacy page holds the same choice. Nothing of PostHog's in the browser, and no cookie.
  await page.goto(at("/privacy"));
  await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
  const banner = page.getByRole("region", { name: "Help Cyanotype get better" });
  await expect(banner.getByRole("listitem")).toHaveCount(1);
  await expect(banner.getByRole("listitem")).toContainText("A random ID in this browser groups your games against bots");
  await expect(banner).not.toContainText(/cookie|Google|PostHog/i);
  await expect(page.getByRole("heading", { name: "Your choices" })).toBeVisible();
  const link = page.getByRole("switch", { name: /Group my games/ });
  await expect(link).not.toBeChecked();
  await banner.getByRole("button", { name: "Decline" }).click();
  await expect(banner).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("cyanotype:consent:1"))).toBe(JSON.stringify({ games: "denied" }));
  const { cookies, keys } = await kept(page);
  expect(cookies).toBe("");
  expect(keys.filter(k => /(^|_)ph_|posthog/i.test(k))).toEqual([]);
});

test("Mistak, a build with PostHog's key: its page views carry internal: true after ?internal=on, it asks for nothing, and keeps nothing for PostHog", async ({ context }) => {
  test.skip(MISTAK === undefined, "MISTAK_BASE_URL gives no Mistak preview");
  const at = (path: string) => new URL(path, MISTAK).href;
  const sent = await answerPostHog(context);
  const page = await context.newPage();
  await page.goto(at("/?internal=on"));
  const views = () => sent.filter(e => e.event === "$pageview");
  await expect.poll(() => views().length, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
  expect(views()[0].properties).toMatchObject({ internal: true, $host: new URL(MISTAK!).host, $pathname: "/" });
  // The next page, by the site's router: a page view of its own, still internal.
  await page.getByRole("link", { name: "About" }).first().click();
  await page.waitForURL("**/about");
  await expect.poll(() => views().map(e => e.properties.$pathname), { timeout: 15_000 }).toContain("/about");
  expect(views().every(e => e.properties.internal === true && e.properties.$cookieless_mode === true)).toBe(true);
  // Only events, to Mistak's own address and its path for PostHog.
  expect([...new Set(sent.map(e => e.origin))]).toEqual([new URL(MISTAK!).origin]);
  expect([...new Set(sent.map(e => e.path))]).toEqual([`${POSTHOG_PATH}/e/`]);

  // Mistak stores no practice games: no consent banner and no choice on the privacy page. Nothing of PostHog's in the
  // browser, and no cookie.
  await page.goto(at("/privacy"));
  await expect(page.getByRole("heading", { name: "Privacy", level: 1 })).toBeVisible();
  await expect.poll(() => views().map(e => e.properties.$pathname), { timeout: 15_000 }).toContain("/privacy");
  await expect(page.getByRole("region", { name: /get better/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Your choices" })).toHaveCount(0);
  const { cookies, keys } = await kept(page);
  expect(cookies).toBe("");
  expect(keys.filter(k => /(^|_)ph_|posthog/i.test(k))).toEqual([]);
});

// A game that a link brings to Mistak travels in its address's `#` part (its import page: `#record=`, `#playtak=`). An
// event that kept that part would send the game to PostHog. The record is written by hand for this test.
const MISTAK_RECORD = `[Player1 "Ann Example"]\n[Player2 "Bob Example"]\n[Size "6"]\n[Komi "2"]\n\n`
  + "1. a1 f6\n2. c3 d4 *\n";

test("Mistak, a build with PostHog's key: without the flag, no `internal`, and no `#` part after a link with a game", async ({ context }) => {
  test.skip(MISTAK === undefined, "MISTAK_BASE_URL gives no Mistak preview");
  const at = (path: string) => new URL(path, MISTAK).href;
  const sent = await answerPostHog(context);
  const page = await context.newPage();
  await page.goto(at(`/import#${new URLSearchParams({ record: MISTAK_RECORD })}`));
  await expect(page.getByRole("link", { name: "Open in PTN Ninja" })).toBeVisible();
  const views = () => sent.filter(e => e.event === "$pageview");
  await expect.poll(() => views().length, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
  expect(views()[0].properties).toMatchObject({ $current_url: at("/import"), $pathname: "/import" });

  // The next page, by the site's router: a page view of its own, which names the import page as the one before.
  await page.getByRole("link", { name: "Review another game" }).click();
  await page.waitForURL("**/review");
  await expect.poll(() => views().map(e => e.properties.$pathname), { timeout: 15_000 }).toContain("/review");
  for (const e of views()) expect(e.properties.internal, `the page view of ${e.properties.$pathname}`).toBeUndefined();
  // Every address in every event (the page's, the one before it, the referrer's): no `#` part. No other text of an
  // event holds a `#` either.
  for (const e of sent) {
    for (const [name, value] of Object.entries(e.properties)) {
      if (typeof value === "string") expect(value, `${e.event}'s ${name}`).not.toContain("#");
    }
  }
});
