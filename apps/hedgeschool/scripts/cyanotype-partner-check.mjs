// The check of a partner's whole exchange with Cyanotype (its design 33, "Partner sites", items 1 to 6), on Cyanotype's
// partners' test build: Cyanotype's list of partners is empty, so only that build takes a partner's save page (the
// local test site, on localhost). A partner's game page links to /import#record=…&save=…: the review opens with no
// choice, and the game keeps the save page. Export, "Save to the local test site", opens the save page, which gets
// the review file in one cyanotype:review message and answers cyanotype:saved. Playwright's routes serve the partner's
// pages on http://localhost: nothing listens there, and no request goes to an outside site. The review opens from the
// stored review's results (tests/cyanotype-review.ts, storeReview), with the engine off. Run it in apps/hedgeschool,
// on a build of Cyanotype made with VITE_PARTNER_TEST=1:
//
//   CYANOTYPE_BASE_URL=http://127.0.0.1:4213 node scripts/cyanotype-partner-check.mjs
//
// It runs headless, with the layout test's launch options (playwright.config.ts): off the GPU.
import { chromium } from "@playwright/test";
import { checkLaunch } from "./edge.mjs";
import config from "../playwright.config.ts";
import { LAST_REVIEW_KEY } from "../../cyanotype/src/lib/site.ts";
import { CYANOTYPE, MOVES, keptGame, storeReview, testRecord } from "../tests/cyanotype-review.ts";

if (!CYANOTYPE) throw new Error("CYANOTYPE_BASE_URL gives no Cyanotype preview");
const SITE = new URL(CYANOTYPE).origin;
const PARTNER = "http://localhost"; // the local test site: Playwright's routes answer it
const SAVE = `${PARTNER}/partner/save?game=1`;
const LINK = new URL(`/import#${new URLSearchParams({ record: testRecord(), save: SAVE })}`, SITE).href;

/** The partner's game page: its button opens the game's review on Cyanotype. */
const gamePage = `<!doctype html><title>A partner's game</title><a href="${LINK.replaceAll("&", "&amp;")}">Review on Cyanotype</a>`;
/** The partner's save page, as design 33 (Hedge School's design 18) gives it: it posts cyanotype:ready to the page that
 *  opened it, keeps each message from Cyanotype's origin, and answers a review with cyanotype:saved. */
const savePage = `<!doctype html><title>Save the review</title><script>
  window.got = [];
  window.addEventListener("message", event => {
    if (event.source !== window.opener || event.origin !== ${JSON.stringify(SITE)}) return;
    window.got.push(event.data);
    if (event.data?.type === "cyanotype:review") window.opener.postMessage({ type: "cyanotype:saved" }, event.origin);
  });
  window.opener.postMessage({ type: "cyanotype:ready", protocol: 1 }, ${JSON.stringify(SITE)});
</script>`;

const failures = [];
/** Records a check: `ok`, else its failure. */
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };

const options = config.projects.find(p => p.name === "chromium").use.launchOptions;
checkLaunch(options);
const browser = await chromium.launch(options);
try {
  const context = await browser.newContext();
  const outside = [];
  await context.route(url => new URL(url).origin !== SITE, route => {
    const url = new URL(route.request().url());
    if (url.origin !== PARTNER) { outside.push(url.href); return route.abort(); }
    return route.fulfill({ contentType: "text/html", body: url.pathname === "/partner/save" ? savePage : gamePage });
  });
  const page = await context.newPage();
  await storeReview(page); // the stored review's results, the engine off

  // The partner's game page opens the review: no choice, and the game keeps the save page
  await page.goto(`${PARTNER}/partner/game`);
  await page.getByRole("link", { name: "Review on Cyanotype" }).click();
  await page.waitForURL(url => url.pathname === "/review" && url.hash.startsWith(`#game=review-${MOVES}-`), { timeout: 120_000 });
  check(true, "the link opens the review with no choice");
  const reviewed = () => page.evaluate(k => localStorage.getItem(k), LAST_REVIEW_KEY).catch(() => null);
  for (let i = 0; i < 120 && !(await reviewed()); i++) await page.waitForTimeout(500); // the review reloads once
  const id = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("game");
  const partner = (await keptGame(page, id)).partner;
  check(partner?.name === "the local test site" && partner?.save === SAVE,
        `the game keeps the partner's save page (${JSON.stringify(partner)})`);

  // Export: "Save to the local test site" first, then the exchange
  await page.getByText(/^Review done/).waitFor({ timeout: 120_000 });
  await page.getByRole("button", { name: "Export" }).first().click();
  const first = await page.getByRole("menuitem").first().textContent();
  check(/^Save to the local test site/.test(first ?? ""), `the menu's first entry is "Save to the local test site" (${first})`);
  const [savePageTab] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("menuitem", { name: /^Save to the local test site/ }).click(),
  ]);
  await page.getByText("Saved to the local test site.").waitFor({ timeout: 60_000 });
  check(true, "the review says \"Saved to the local test site.\"");
  const got = await savePageTab.evaluate(() => window.got);
  const review = got[0];
  check(got.length === 1 && review?.type === "cyanotype:review" && review.protocol === 1,
        `the save page gets one cyanotype:review message, protocol 1 (${JSON.stringify(got.map(m => m?.type))})`);
  check(review?.review?.format === "cyanotype-review" && /\.json$/.test(review?.name ?? ""),
        `the message holds a cyanotype-review file (${review?.review?.format}, ${review?.name})`);
  check(outside.length === 0, `no request went to another site (${outside.join(", ") || "none"})`);
} finally {
  await browser.close();
}
console.log(failures.length ? `FAIL: ${failures.length} checks failed` : "PASS: every check");
process.exit(failures.length ? 1 : 0);
