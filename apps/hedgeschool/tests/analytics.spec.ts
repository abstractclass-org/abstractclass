// The measuring with PostHog (design 11 and 17), on both sites' builds of check:all, each with a made-up PostHog key
// (scripts/check-all.mjs). No request reaches PostHog: tests/posthog.ts answers its addresses in its place, and keeps
// what the pages sent. That a build without the key holds none of PostHog's code is check:all's step
// `cyanotype-no-posthog`, on a build of Cyanotype without the key.
import { test, expect, type Page } from "./page-log.ts";
import { answerPostHog, lookLikeAVisitor } from "./posthog.ts";
import { CONSENT_KEY } from "../src/lib/keys.ts";

const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;

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

  // Only events: no feature flags, no remote settings, no script from PostHog.
  expect([...new Set(sent.map(e => e.path))]).toEqual(["/e/"]);
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
  expect([...new Set(sent.map(e => e.path))]).toEqual(["/e/"]);

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
