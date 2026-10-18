// The ask to allow Google Analytics in a blocker (design 27), on a build with a made-up measurement ID
// (VITE_GA_ID=G-TEST000000): a build without the Google tag skips it. The tag's script is stopped, as a blocker stops
// it, or replaced by a blocker's stand-in, or loaded from Google. Every other request to Google stops here, so that no
// hit leaves the machine.
import { test, expect, type BrowserContext, type Page, type Request } from "@playwright/test";

const ASK = "Could you allow this site in your blocker?";
const CONSENT = "hedge-school:consent:2";
// uBlock Origin's stand-in for the tag (its resource googletagmanager_gtm.js), shortened: it replaces the queue's
// push, and defines ga but no google_tag_manager.
const STAND_IN = `(() => {
  window.ga = window.ga || (() => {});
  const dl = window.dataLayer;
  if (dl instanceof Object && typeof dl.push === "function") dl.push = o => { if (typeof o?.eventCallback === "function") setTimeout(o.eventCallback, 1); };
})();`;

const GOOGLE = /(^|\.)(google-analytics|googletagmanager|doubleclick|google)\.(com|net)$/;
const isScript = (url: URL) => url.hostname === "www.googletagmanager.com" && url.pathname === "/gtag/js";

/** A page whose tag's script is blocked, replaced or loaded. `left` gathers the requests to Google, other than the
 *  script, that reached the network: none should. */
async function open(context: BrowserContext, script: "blocked" | "stand-in" | "loads") {
  const left: string[] = [];
  await context.route(url => GOOGLE.test(url.hostname), async (route, request) => {
    const url = new URL(request.url());
    if (!isScript(url)) return route.abort("blockedbyclient");
    if (script === "blocked") return route.abort("blockedbyclient");
    if (script === "stand-in") return route.fulfill({ contentType: "text/javascript", body: STAND_IN });
    return route.continue();
  });
  context.on("requestfinished", r => { const url = new URL(r.url()); if (GOOGLE.test(url.hostname) && !isScript(url)) left.push(r.url()); });
  const page = await context.newPage();
  const tagged = page.waitForRequest(r => isScript(new URL(r.url())), { timeout: 10_000 }).then(() => true, () => false);
  await page.goto("/privacy");
  test.skip(!(await tagged), "this build has no Google tag");
  return { page, left };
}

/** Opens `path`, and waits until the tag's script has loaded or failed, and the page has taken the answer. */
async function load(page: Page, path: string) {
  let on!: (r: Request) => void;
  const answered = new Promise<void>(done => (on = r => { if (isScript(new URL(r.url()))) done(); }));
  page.on("requestfinished", on).on("requestfailed", on);
  await page.goto(path);
  await answered;
  page.off("requestfinished", on).off("requestfailed", on);
  await page.waitForTimeout(500);
}

/** The visitor's choice for every purpose, as the banner's Accept or Decline keeps it. */
const choose = (page: Page, choice: "granted" | "denied") =>
  page.evaluate(([key, c]) => localStorage.setItem(key, JSON.stringify({ analytics: c, games: c })), [CONSENT, choice]);

test("a blocked tag: after Accept, the ask shows in the banner's place, and Close keeps it closed", async ({ context }) => {
  const { page, left } = await open(context, "blocked");
  await load(page, "/");
  const banner = page.getByRole("region", { name: "Help the school get better" });
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
  expect(await page.evaluate(() => localStorage.getItem("hedge-school:analytics-ask:1"))).toBe("closed");
  await load(page, "/");
  await expect(ask).toHaveCount(0);
  await expect(banner).toHaveCount(0);
  expect(left).toEqual([]);
});

test("a blocker's stand-in script: the ask shows, and fits a phone's width", async ({ context }) => {
  const { page, left } = await open(context, "stand-in");
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
  expect(left).toEqual([]);
});

test("a tag that loads: no ask", async ({ context }) => {
  const { page, left } = await open(context, "loads");
  await choose(page, "granted");
  await load(page, "/");
  expect(await page.evaluate(() => "google_tag_manager" in window)).toBe(true);
  await expect(page.getByRole("region", { name: ASK })).toHaveCount(0);
  expect(left).toEqual([]);
});

test("a blocked tag after a Decline: no ask", async ({ context }) => {
  const { page, left } = await open(context, "blocked");
  await choose(page, "denied");
  await load(page, "/");
  await expect(page.getByRole("region", { name: ASK })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Help the school get better" })).toHaveCount(0);
  expect(left).toEqual([]);
});
