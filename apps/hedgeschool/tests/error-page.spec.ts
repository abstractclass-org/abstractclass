// The error page of each site (@abstractclass/site's ErrorPage.svelte and pageError.ts), on Hedge School and on
// Cyanotype (CYANOTYPE_BASE_URL). A link to a page whose code does not load is the failure that the load notice
// (tests/load-notice.spec.ts) cannot see: SvelteKit catches the failure of the page's node, and shows the site's error
// page with the notice's words and button. An address that the site does not have shows the site's own line. Run:
// npm run test:layout -- tests/error-page.spec.ts, with CYANOTYPE_BASE_URL for Cyanotype's cases.
import { expect, test, type Page } from "./page-log.ts";
import { CYANOTYPE } from "./cyanotype-review.ts";
import { LOAD_NOTICE } from "../../../packages/site/src/loadNotice.ts";
import { HOME_ACTION, NOT_FOUND_LINE } from "../../../packages/site/src/pageError.ts";

const SITES = [{ site: "Hedge School", base: "" }, { site: "Cyanotype", base: CYANOTYPE }];

/** Each route's node but the root layout's (nodes/0) and the error page's (nodes/1). */
const PAGE_NODES = /\/_app\/immutable\/nodes\/(?![01]\.)[^/]+\.js$/;

const errorPage = (page: Page) => page.locator("[data-error-page]");

/** The address of a page on the site whose preview is `base` (Hedge School's: the tests' baseURL). */
const at = (base: string | undefined, path: string) => (base ? new URL(path, base).href : path);

for (const { site, base } of SITES) {
  test.describe(site, () => {
    test.skip(base === undefined, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
    test.beforeEach(({ context }) => context.route(/^https:\/\/([^/]+\.)?posthog\.com\//, route => route.abort()));

    test("a link to a page whose code does not load shows the error page, and its button loads the page",
      async ({ page }) => {
        // The About page has started (its code, and the router, have loaded): the link is the router's.
        await page.goto(at(base, "/about"), { waitUntil: "networkidle" });
        const documents: string[] = [];
        page.on("request", r => { if (r.resourceType() === "document") documents.push(r.url()); });
        await page.route(PAGE_NODES, route => route.abort());
        await page.getByRole("banner").getByRole("link", { name: "Notation", exact: true }).click();
        await expect(page).toHaveURL(/\/notation$/);
        await expect(errorPage(page).getByRole("heading", { level: 1 })).toHaveText(LOAD_NOTICE.text);
        await expect(page).toHaveTitle(new RegExp(`^Page did not load · ${site}$`));
        expect(documents).toEqual([]); // the router opened it, not the browser
        await expect(page.locator("[data-load-notice]")).toHaveCount(0);

        await page.unroute(PAGE_NODES);
        await Promise.all([page.waitForEvent("load"),
                           errorPage(page).getByRole("button", { name: LOAD_NOTICE.action }).click()]);
        await page.waitForLoadState("networkidle");
        await expect(page.getByRole("heading", { level: 1, name: /^The notation of / })).toBeVisible();
        await expect(errorPage(page)).toHaveCount(0);
      });

    test("an address that the site does not have shows the site's line and a link to the home page",
      async ({ page }) => {
        await page.goto(at(base, "/no-such-page"));
        await expect(errorPage(page).getByRole("heading", { level: 1 })).toHaveText(NOT_FOUND_LINE.text);
        await expect(page).toHaveTitle(new RegExp(`^Page not found · ${site}$`));
        await errorPage(page).getByRole("link", { name: HOME_ACTION }).click();
        await expect(page).toHaveURL(/^https?:\/\/[^/]+\/$/);
        await expect(errorPage(page)).toHaveCount(0);
      });
  });
}
