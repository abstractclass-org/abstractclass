// The measuring with PostHog (design 11 and 17), on both sites' builds of check:all: Hedge School's has a made-up
// PostHog key (scripts/check-all.mjs), and Cyanotype's has none (its design 33, "Analytics", when CYANOTYPE_BASE_URL
// gives its preview). No request reaches PostHog: the browser resolves none of its addresses (playwright.config.ts),
// and here Playwright's route answers them in PostHog's place, and keeps what the page sent.
import { gunzipSync } from "node:zlib";
import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;
const POSTHOG = /(^|\.)posthog\.com$/;

// posthog-js sends nothing from a browser that looks like a bot (its isLikelyBot): a name or a brand that says
// "HeadlessChrome", or `navigator.webdriver`, which Playwright sets. These pages take a desktop Chrome's name, no
// brands and no webdriver flag, as a visitor's browser has.
test.use({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36" });
test.beforeEach(({ context }) => context.addInitScript(() => {
  Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
  Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
}));

interface Sent { path: string; event: string; properties: Record<string, unknown> }

/** A body that posthog-js sent: gzip, or a form's `data=` with base64 or plain JSON, or plain JSON. */
function decode(body: Buffer): unknown[] {
  let text = body[0] === 0x1f && body[1] === 0x8b ? gunzipSync(body).toString("utf8") : body.toString("utf8");
  if (text.startsWith("data=")) {
    text = decodeURIComponent(text.slice(5));
    if (!text.trimStart().startsWith("{") && !text.trimStart().startsWith("[")) text = Buffer.from(text, "base64").toString("utf8");
  }
  const json = JSON.parse(text);
  return Array.isArray(json) ? json : json.batch ?? [json];
}

/** Answers every request to PostHog in PostHog's place, and returns the events that the pages sent, with each
 *  request's path. */
async function answerPostHog(context: BrowserContext): Promise<Sent[]> {
  const sent: Sent[] = [];
  await context.route(url => POSTHOG.test(url.hostname), async (route, request) => {
    const path = new URL(request.url()).pathname;
    const body = request.postDataBuffer();
    for (const e of body ? decode(body) : []) {
      const { event, properties } = e as { event: string; properties: Record<string, unknown> };
      sent.push({ path, event, properties });
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: 1 }) });
  });
  return sent;
}

/** What this site keeps in the browser: its cookies, and the keys of its local and session storage. */
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
  expect(keys.filter(k => /^ph_|posthog/i.test(k))).toEqual([]);
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
  expect(await page.evaluate(() => localStorage.getItem("hedge-school:consent:2"))).toBe(JSON.stringify({ games: "granted" }));
});

test("Cyanotype, a build without PostHog's key: no PostHog code, nothing sent, and no consent asked", async ({ context }) => {
  test.skip(CYANOTYPE === undefined, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
  const at = (path: string) => new URL(path, CYANOTYPE).href;
  const sent = await answerPostHog(context);
  const requests: string[] = [];
  const scripts: Promise<string>[] = [];
  context.on("request", r => requests.push(r.url()));
  context.on("response", r => { if (r.request().resourceType() === "script") scripts.push(r.text().catch(() => "")); });
  const page = await context.newPage();
  for (const path of ["/?internal=on", "/review", "/privacy"]) {
    await page.goto(at(path));
    await page.waitForLoadState("networkidle");
  }
  expect(requests.filter(u => POSTHOG.test(new URL(u).hostname))).toEqual([]);
  expect(sent).toEqual([]);
  // PostHog's client names its address and its extensions' global: no script of the build holds either.
  const bodies = await Promise.all(scripts);
  expect(bodies.length).toBeGreaterThan(0);
  expect(bodies.filter(b => /i\.posthog\.com|__PosthogExtensions__/.test(b))).toEqual([]);

  // No consent: no banner, no choices on the privacy page, and no choice kept.
  await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your choices" })).toHaveCount(0);
  await expect(page.getByRole("switch")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Help Cyanotype get better" })).toHaveCount(0);
  const { cookies, keys } = await kept(page);
  expect(cookies).toBe("");
  expect(keys.filter(k => /consent|^ph_|posthog/i.test(k))).toEqual([]);
});
