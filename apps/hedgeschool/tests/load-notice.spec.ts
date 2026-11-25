// The notice when a page's scripts do not load (@abstractclass/site's loadNotice.ts), on Hedge School, on Cyanotype
// (CYANOTYPE_BASE_URL) and on Mistak (MISTAK_BASE_URL). Each case fails requests of the page's code. start.js fails in
// SvelteKit's start script, which no bundler wraps: the script sees an unhandled rejection. The route's nodes fail in
// the router's import, which SvelteKit catches: the script sees Vite's `vite:preloadError`. A part that the page loads
// later (PostHog's client, the home page's replay) that fails leaves the page working, and shows no notice. Mistak's
// home page has no replay until its trained network (abscls-shfz.18.18): its case fails PostHog's client alone. The
// cases run in Chromium and in WebKit (the project webkit), whose message, as Safari's, names no module: there the
// failed links name it. No case reaches PostHog: WebKit takes no switch of Chromium's that resolves none of its
// addresses (playwright.config.ts), so each case stops PostHog's requests. Run: npm run test:layout --
// tests/load-notice.spec.ts, with CYANOTYPE_BASE_URL for Cyanotype's cases and MISTAK_BASE_URL for Mistak's.
import { expect, test, type Page } from "./page-log.ts";
import { CYANOTYPE } from "./cyanotype-review.ts";
import { LOAD_NOTICE } from "../../../packages/site/src/loadNotice.ts";
import { SITE_NAME as MISTAK_NAME } from "../../mistak/src/lib/site.ts";

const START = "**/_app/immutable/entry/start.*.js";

/** The Review tab has started: Hedge School's and Cyanotype's say so (ReviewHome.svelte, data-ready). */
const tabReady = (page: Page) => expect(page.locator("[data-ready]")).toHaveCount(1, { timeout: 60_000 });
/** Mistak's Review tab has no data-ready. Its button is disabled until the page's code has read the box. */
const boxReady = async (page: Page) => {
  const button = page.getByRole("button", { name: "Review", exact: true });
  await expect(async () => {
    await page.locator("#game").fill("");
    await page.locator("#game").fill("1. a1 f6");
    await expect(button).toBeEnabled({ timeout: 1_000 });
  }).toPass({ timeout: 60_000 });
};

/** Each site's preview, and what its cases open: the page whose route's code fails (Mistak has no Practice until
 *  abscls-shfz.18.22), whether the home page has a replay, and how the Review tab shows that it has started. */
const SITES = [
  { site: "Hedge School", base: "", route: "/practice", replay: true, ready: tabReady, noPreview: "" },
  { site: "Cyanotype", base: CYANOTYPE, route: "/practice", replay: true, ready: tabReady,
    noPreview: "CYANOTYPE_BASE_URL gives no Cyanotype preview" },
  { site: MISTAK_NAME, base: process.env.MISTAK_BASE_URL, route: "/notation", replay: false, ready: boxReady,
    noPreview: "MISTAK_BASE_URL gives no Mistak preview" },
];

const notice = (page: Page) => page.locator("[data-load-notice]");

/** The words of each browser for a module that did not load: Chromium's and Firefox's name it, WebKit's does not. */
const NOT_LOADED = /dynamically imported module|Importing a module script failed/;

/** The address of a page on the site whose preview is `base` (Hedge School's: the tests' baseURL). */
const at = (base: string | undefined, path: string) => (base ? new URL(path, base).href : path);

/** The page's own code: the addresses of the modules that its HTML preloads. */
async function preloads(page: Page, address: string): Promise<Set<string>> {
  const response = await page.request.get(address);
  const links = (await response.text()).matchAll(/<link href="([^"]+)" rel="modulepreload"/g);
  return new Set([...links].map(m => new URL(m[1], response.url()).href));
}

for (const { site, base, route, replay, ready, noPreview } of SITES) {
  test.describe(site, () => {
    test.skip(base === undefined, noPreview);
    test.beforeEach(({ context }) => context.route(/^https:\/\/([^/]+\.)?posthog\.com\//, route => route.abort()));

    test("a page whose start.js does not load says to load it again, and its button does", async ({ page,
      browserName }) => {
      await page.route(START, route => route.abort());
      await page.goto(at(base, "/review"));
      await expect(notice(page)).toBeVisible();
      await expect(notice(page)).toHaveRole("alert");
      await expect(notice(page)).toContainText(LOAD_NOTICE.text);
      await page.unroute(START);
      const button = notice(page).getByRole("button", { name: LOAD_NOTICE.action });
      if (browserName === "webkit") {
        // Playwright's WebKit loads the page again, but does not ask for start.js again in the same page, after a route
        // or a reload: start.js fails again. So in WebKit the case checks only that the button loads the page again.
        await Promise.all([page.waitForEvent("load"), button.click()]);
        return;
      }
      await button.click();
      // The page loads now: the Review tab opens, and no notice shows.
      await ready(page);
      await expect(notice(page)).toHaveCount(0);
    });

    test("a page whose route's code does not load says to load it again", async ({ page }) => {
      await page.route("**/_app/immutable/nodes/**", route => route.abort());
      await page.goto(at(base, route));
      await expect(notice(page)).toBeVisible();
      await expect(notice(page).getByRole("button", { name: LOAD_NOTICE.action })).toBeVisible();
    });

    test("a 404 page whose error page's code does not load says to load it again", async ({ page }) => {
      // The 404.html fallback preloads only the root layout's node (nodes/0), and its start loads the error page's node
      // (nodes/1) with no catch. The preview renders its own 404 page, which preloads both: the case takes the error
      // page's preload out, so that only the unhandled failure of a node can show the notice.
      let preloadsErrorPage = true;
      await page.route("**/no-such-page", async route => {
        const response = await route.fetch(), html = await response.text();
        const body = html.replace(/<link href="[^"]*\/nodes\/1\.[^"]*" rel="modulepreload">/, "");
        preloadsErrorPage = body === html;
        await route.fulfill({ response, body });
      });
      await page.route("**/_app/immutable/nodes/1.*", route => route.abort());
      await page.goto(at(base, "/no-such-page"));
      await expect(notice(page)).toBeVisible();
      expect(preloadsErrorPage).toBe(false);
    });

    test("a page that works shows no notice when a part that it loads later does not load", async ({ page }) => {
      const address = at(base, "/");
      const own = await preloads(page, address);
      const postHogUrls: string[] = [], failed: string[] = [], errors: string[] = [];
      page.on("requestfailed", request => failed.push(request.url()));
      page.on("pageerror", error => errors.push(error.message));
      await page.addInitScript(() => addEventListener("vite:preloadError", () => {
        document.documentElement.dataset.preloadError = "";
      }));
      // PostHog's client and the replay's scenes fail: two modules that the page's HTML does not preload, known by
      // their text. The others load: SvelteKit's preloads leave out some modules of the page's own code too
      // (addressHash.ts).
      await page.route("**/_app/immutable/**/*.js", async route => {
        const url = route.request().url();
        if (own.has(url)) return route.continue();
        const response = await route.fetch(), text = await response.text();
        if (text.includes("posthog")) postHogUrls.push(url);
        else if (!text.includes("scripts/home-replay.mjs")) return route.fulfill({ response });
        await route.abort();
      });
      await page.goto(address);
      // PostHog's client did not load, and its code caught that (analytics.svelte.ts). The page's code ran, since the
      // layout starts PostHog once it has mounted.
      await expect.poll(() => postHogUrls.some(url => failed.includes(url))).toBe(true);
      // Vite's loader told the page (`vite:preloadError`), as it does for the page's own code.
      await expect(page.locator("html[data-preload-error]")).toHaveCount(1);
      // The replay's scenes did not load, and nothing caught that (Replay.svelte): an unhandled rejection.
      if (replay) await expect.poll(() => errors.some(message => NOT_LOADED.test(message))).toBe(true);
      // The app's own rejections with the browsers' words, for a file that is not the page's code: the engine's, a
      // worker's. Safari's words name no file: no link of the page's code failed.
      await page.evaluate(() => {
        for (const path of ["/engine/x/rules.js", "/_app/immutable/workers/worker.js"])
          void Promise.reject(new TypeError(`Failed to fetch dynamically imported module: ${location.origin}${path}`));
        void Promise.reject(new TypeError("Importing a module script failed."));
        return new Promise(resolve => setTimeout(resolve, 100));
      });
      await expect(notice(page)).toHaveCount(0);
    });
  });
}
