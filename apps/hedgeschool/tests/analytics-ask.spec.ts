// The ask to allow Google Analytics in a blocker (design 27), on a build with a made-up measurement ID
// (VITE_GA_ID=G-TEST000000): a build without the Google tag skips it. The tag's script is stopped, as a blocker stops
// it, or replaced by a blocker's stand-in, or loaded from Google. Every other request to Google stops here, so that no
// hit leaves the machine.
import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const BANNER = "Help the school get better";
const ASK = "Could you allow this site in your blocker?";
const CONSENT_KEY = "hedge-school:consent:2";
const ASK_KEY = "hedge-school:analytics-ask:1";
// uBlock Origin's stand-in for the tag (its resource googletagmanager_gtm.js), shortened: it replaces the queue's
// push, and defines ga but no google_tag_manager.
const STAND_IN = `(() => {
  window.ga = window.ga || (() => {});
  const dl = window.dataLayer;
  if (dl instanceof Object && typeof dl.push === "function") dl.push = o => { if (typeof o?.eventCallback === "function") setTimeout(o.eventCallback, 1); };
})();`;

const GOOGLE = /(^|\.)(google-analytics|googletagmanager|doubleclick|google)\.(com|net)$/;
const isScript = (url: URL) => url.hostname === "www.googletagmanager.com" && url.pathname === "/gtag/js";

// The requests to Google, other than the tag's script, that reached the network in a test: none should.
let leaked: string[] = [];
test.afterEach(() => expect(leaked).toEqual([]));

/** A page whose tag's script is blocked, replaced or loaded, at the privacy page. Its switch for Google Analytics'
 *  cookies shows once the page has mounted, in a build with the Google tag only: a build without it skips the test. */
async function open(context: BrowserContext, script: "blocked" | "stand-in" | "loads") {
  leaked = [];
  await context.route(url => GOOGLE.test(url.hostname), (route, request) => {
    if (!isScript(new URL(request.url())) || script === "blocked") return route.abort("blockedbyclient");
    if (script === "stand-in") return route.fulfill({ contentType: "text/javascript", body: STAND_IN });
    return route.continue();
  });
  context.on("requestfinished", r => { const url = new URL(r.url()); if (GOOGLE.test(url.hostname) && !isScript(url)) leaked.push(r.url()); });
  // Each page marks the script's load or error event before the site's own handler takes it: a listener on the
  // document's capture phase runs first.
  await context.addInitScript(() => {
    const mark = (e: Event) => { if (e.target instanceof HTMLScriptElement && e.target.src.includes("/gtag/js")) Object.assign(window, { tagAnswered: true }); };
    document.addEventListener("load", mark, true);
    document.addEventListener("error", mark, true);
  });
  const page = await context.newPage();
  await page.goto("/privacy");
  if (await page.getByRole("heading", { name: "Your choices" }).count()) await expect(page.getByRole("switch").first()).toBeVisible();
  test.skip(!(await page.getByRole("switch", { name: /Google Analytics/ }).count()), "this build has no Google tag");
  return page;
}

/** Opens `path`, and waits until the tag's script has loaded or failed, and the page has taken the answer: the check
 *  runs in a later task than the event, after the site's handler and its render. */
async function load(page: Page, path: string) {
  await page.goto(path);
  await page.waitForFunction(() => "tagAnswered" in window, null, { polling: 50, timeout: 10_000 });
}

/** The visitor's choice for every purpose, as the banner's Accept or Decline keeps it. */
const choose = (page: Page, choice: "granted" | "denied") =>
  page.evaluate(([key, c]) => localStorage.setItem(key, JSON.stringify({ analytics: c, games: c })), [CONSENT_KEY, choice]);

test("a blocked tag: after Accept, the ask shows in the banner's place, and Close keeps it closed", async ({ context }) => {
  const page = await open(context, "blocked");
  await load(page, "/");
  const banner = page.getByRole("region", { name: BANNER });
  const ask = page.getByRole("region", { name: ASK });
  await expect(banner).toBeVisible();
  await expect(ask).toHaveCount(0); // never over the banner
  const place = await banner.boundingBox();

  await banner.getByRole("button", { name: "Accept" }).click();
  await expect(ask).toBeVisible();
  await expect(banner).toHaveCount(0);
  const card = await ask.boundingBox();
  expect(card!.x).toBeCloseTo(place!.x, 0);
  expect(card!.y + card!.height).toBeCloseTo(place!.y + place!.height, 0);
  await expect(ask.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");

  // It stays on the next page until it is closed.
  await page.getByRole("link", { name: "Notation" }).first().click();
  await page.waitForURL("**/notation");
  await expect(ask).toBeVisible();

  await ask.getByRole("button", { name: "Close" }).click();
  await expect(ask).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), ASK_KEY)).toBe("closed");
  await load(page, "/");
  await expect(ask).toHaveCount(0);
  await expect(banner).toHaveCount(0);
});

test("a blocked tag: a Decline on the privacy page takes the ask away, and a Close in another tab closes it here", async ({ context }) => {
  const page = await open(context, "blocked");
  await choose(page, "granted");
  await load(page, "/privacy");
  const ask = page.getByRole("region", { name: ASK });
  await expect(ask).toBeVisible();
  const cookies = page.getByRole("switch", { name: /Google Analytics/ });
  await cookies.click();
  await expect(cookies).not.toBeChecked();
  await expect(ask).toHaveCount(0);
  await cookies.click(); // an Accept again: the tag still did not run in this page
  await expect(ask).toBeVisible();

  const other = await context.newPage();
  await load(other, "/");
  await other.getByRole("region", { name: ASK }).getByRole("button", { name: "Close" }).click();
  await expect(ask).toHaveCount(0);
});

test("a blocker's stand-in script: the ask shows, and fits a phone's width", async ({ context }) => {
  const page = await open(context, "stand-in");
  await page.setViewportSize({ width: 360, height: 700 });
  await choose(page, "granted");
  await load(page, "/review");
  const ask = page.getByRole("region", { name: ASK });
  await expect(ask).toBeVisible();
  const box = (await ask.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(360);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test("a tag that loads: no ask", async ({ context }) => {
  const page = await open(context, "loads");
  await choose(page, "granted");
  await load(page, "/");
  expect(await page.evaluate(() => "google_tag_manager" in window)).toBe(true);
  await expect(page.getByRole("region", { name: ASK })).toHaveCount(0);
});

test("a blocked tag after a Decline: no ask", async ({ context }) => {
  const page = await open(context, "blocked");
  await choose(page, "denied");
  await load(page, "/");
  await expect(page.getByRole("region", { name: ASK })).toHaveCount(0);
  await expect(page.getByRole("region", { name: BANNER })).toHaveCount(0);
});
