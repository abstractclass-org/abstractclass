// The notice when a page's scripts do not load (@abstractclass/site's loadNotice.ts), on Hedge School and on Cyanotype
// (CYANOTYPE_BASE_URL). Each case fails one request of the page's code. start.js fails in SvelteKit's start script,
// which no bundler wraps: the script sees an unhandled rejection. The page's own chunk fails in the router's import,
// which SvelteKit catches: the script sees Vite's `vite:preloadError`. A page that loads shows no notice. Run:
// npm run test:layout -- tests/load-notice.spec.ts, with CYANOTYPE_BASE_URL for Cyanotype's cases.
import { expect, test, type Page } from "./page-log.ts";
import { CYANOTYPE } from "./cyanotype-review.ts";
import { LOAD_NOTICE } from "../../../packages/site/src/loadNotice.ts";

const START = "**/_app/immutable/entry/start.*.js";
const SITES = [{ site: "Hedge School", base: "" }, { site: "Cyanotype", base: CYANOTYPE }];

const notice = (page: Page) => page.locator("[data-load-notice]");

/** The address of a page on the site whose preview is `base` (Hedge School's: the tests' baseURL). */
const at = (base: string | undefined, path: string) => (base ? new URL(path, base).href : path);

/** The page's own chunk: the last chunk of a route (`nodes/`) that the page's HTML preloads. The others are its
 *  layouts'. */
async function ownChunk(page: Page, address: string): Promise<string> {
  const html = await (await page.request.get(address)).text();
  const nodes = [...html.matchAll(/href="([^"]*\/_app\/immutable\/nodes\/[^"]+\.js)"/g)].map(m => m[1]);
  if (!nodes.length) throw new Error(`${address} preloads no chunk of a route`);
  return nodes.at(-1)!.split("/").pop()!;
}

for (const { site, base } of SITES) {
  test.describe(site, () => {
    test.skip(base === undefined, "CYANOTYPE_BASE_URL gives no Cyanotype preview");

    test("a page whose start.js does not load says to load it again, and its button does", async ({ page }) => {
      await page.route(START, route => route.abort());
      await page.goto(at(base, "/review"));
      await expect(notice(page)).toBeVisible();
      await expect(notice(page)).toHaveRole("alert");
      await expect(notice(page)).toContainText(LOAD_NOTICE.text);
      await page.unroute(START);
      await notice(page).getByRole("button", { name: LOAD_NOTICE.action }).click();
      // The page loads now: the Review tab opens (ReviewHome.svelte, data-ready), and no notice shows.
      await expect(page.locator("[data-ready]")).toHaveCount(1, { timeout: 60_000 });
      await expect(notice(page)).toHaveCount(0);
    });

    test("a page whose own chunk does not load says to load it again", async ({ page }) => {
      const address = at(base, "/practice");
      const chunk = await ownChunk(page, address);
      await page.route(url => url.pathname.endsWith(`/${chunk}`), route => route.abort());
      await page.goto(address);
      await expect(notice(page)).toBeVisible();
      await expect(notice(page).getByRole("button", { name: LOAD_NOTICE.action })).toBeVisible();
    });
  });
}
