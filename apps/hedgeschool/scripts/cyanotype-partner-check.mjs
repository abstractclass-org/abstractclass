// The check of a partner's whole exchange with Cyanotype (its design 33, "Partner sites", items 1 to 7), on Cyanotype's
// partners' test build: Cyanotype's list of partners is empty, so only that build takes a partner's pages (the local
// test site, on localhost). A partner's game page links to /import#record=…&save=…: the review opens with no choice,
// and the game keeps the save page. Export, "Save to the local test site", opens the save page, which gets the review
// file in one cyanotype:review message and answers cyanotype:saved. The review opens from the stored review's results
// (tests/cyanotype-review.ts, storeReview), with the engine off. Then the partner sends that file back (item 7), in a
// new browser context with no game: its page opens /review#from=…&save=… with window.open, waits for cyanotype:ready,
// and sends the file. The review opens with the file's results, with the engine on at Lite on the CPU, and asks the
// engine for no search. The game keeps the save page again. A partner's page that answers cyanotype:failed, or that
// does not answer in a minute, gets its message. Playwright's routes serve the partner's pages on http://localhost:
// nothing listens there, and no request goes to an outside site. Run it in apps/hedgeschool, on a build of Cyanotype
// made with VITE_PARTNER_TEST=1:
//
//   CYANOTYPE_BASE_URL=http://127.0.0.1:4174 node scripts/cyanotype-partner-check.mjs
//
// It runs headless, with the layout test's launch options (playwright.config.ts): off the GPU.
import { chromium } from "@playwright/test";
import { checkLaunch } from "./edge.mjs";
import config from "../playwright.config.ts";
import { ENGINE_KEY, LAST_REVIEW_KEY } from "../../cyanotype/src/lib/site.ts";
import { CYANOTYPE, LITE, MOVES, countEngineWork, keptGame, storeReview,
         testRecord } from "../tests/cyanotype-review.ts";

if (!CYANOTYPE) throw new Error("CYANOTYPE_BASE_URL gives no Cyanotype preview");
const SITE = new URL(CYANOTYPE).origin;
const PARTNER = "http://localhost"; // the local test site: Playwright's routes answer it
const SAVE = `${PARTNER}/partner/save?game=1`;
const LINK = new URL(`/import#${new URLSearchParams({ record: testRecord(), save: SAVE })}`, SITE).href;
/** The review's address that a partner's page opens to send back a review that it kept. */
const OPEN = new URL(`/review#${new URLSearchParams({ from: PARTNER, save: SAVE })}`, SITE).href;

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
/** The partner's page of a kept review (window.kept, the file that the save page got): its button opens the review on
 *  Cyanotype with window.open. When the review posts cyanotype:ready, the page answers as its address says
 *  (`answer`): the file in cyanotype:review, cyanotype:failed, or nothing. */
const openPage = `<!doctype html><title>A partner's kept review</title><button>Open in Cyanotype</button><script>
  const answer = new URLSearchParams(location.search).get("answer");
  document.querySelector("button").onclick = () => {
    const win = window.open(${JSON.stringify(OPEN)}, "_blank");
    window.addEventListener("message", event => {
      if (event.source !== win || event.origin !== ${JSON.stringify(SITE)}) return;
      if (event.data?.type !== "cyanotype:ready") return;
      const reply = answer === "review" ? { type: "cyanotype:review", protocol: 1, ...window.kept }
        : answer === "failed" ? { type: "cyanotype:failed", message: "the review is gone" } : null;
      if (reply) win.postMessage(reply, event.origin);
    });
  };
</script>`;
const PAGES = { "/partner/save": savePage, "/partner/open": openPage };

const failures = [];
/** Records a check: `ok`, else its failure. */
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };

const options = config.projects.find(p => p.name === "chromium").use.launchOptions;
checkLaunch(options);
const browser = await chromium.launch(options);
try {
  const outside = [];
  /** A new browser context whose requests to the partner get its pages, and to another site nothing. */
  const newContext = async () => {
    const context = await browser.newContext();
    await context.route(url => new URL(url).origin !== SITE, route => {
      const url = new URL(route.request().url());
      if (url.origin !== PARTNER) { outside.push(url.href); return route.abort(); }
      return route.fulfill({ contentType: "text/html", body: PAGES[url.pathname] ?? gamePage });
    });
    return context;
  };
  const context = await newContext();
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

  // The kept review sent back (item 7), in a new browser context with no game: the engine on, at Lite on the CPU
  const fresh = await newContext();
  await fresh.addInitScript(countEngineWork);
  const partnerPage = await fresh.newPage();
  await partnerPage.goto(new URL("/about", SITE).href);
  await partnerPage.evaluate(([key, settings]) => localStorage.setItem(key, JSON.stringify(settings)),
                             [ENGINE_KEY, { on: true, ...LITE }]);
  /** Opens the partner's page of a kept review, which answers as `answer` says, clicks its button, and answers the
   *  review's tab. */
  const openKept = async answer => {
    await partnerPage.goto(`${PARTNER}/partner/open?answer=${answer}`);
    await partnerPage.evaluate(kept => { window.kept = kept; }, { name: review?.name, review: review?.review });
    const [tab] = await Promise.all([fresh.waitForEvent("page"),
                                     partnerPage.getByRole("button", { name: "Open in Cyanotype" }).click()]);
    return tab;
  };
  const tab = await openKept("review");
  await tab.waitForURL(url => url.pathname === "/review" && url.hash.startsWith("#game="), { timeout: 120_000 });
  check(true, "the partner's page opens the kept review");
  await tab.getByText(/^Review done/).waitFor({ timeout: 120_000 });
  const work = await tab.evaluate(() => window.engineWork);
  check(work?.messages > 0 && work?.searches === 0,
        `the review takes the file's results, and asks the engine for no search (${JSON.stringify(work)})`);
  const back = (await keptGame(tab, new URLSearchParams(new URL(tab.url()).hash.slice(1)).get("game"))).partner;
  check(back?.name === "the local test site" && back?.save === SAVE,
        `the game keeps the partner's save page again (${JSON.stringify(back)})`);
  await tab.close();

  // A partner's page that answers cyanotype:failed, then one that does not answer: each gets its message
  for (const [answer, message, timeout] of [["failed", "the local test site: the review is gone.", 30_000],
                                            ["none", "the local test site did not send the review.", 90_000]]) {
    const failed = await openKept(answer);
    if (answer === "none") {
      const waiting = await failed.getByText("Waiting for the local test site to send the review…")
        .waitFor({ timeout: 30_000 }).then(() => true, () => false);
      check(waiting, "while the review waits, it says \"Waiting for the local test site to send the review…\"");
    }
    const alert = failed.getByRole("alert");
    const said = await alert.waitFor({ timeout }).then(() => alert.textContent(), () => null);
    check(said === `Cyanotype could not load the review: ${message}`,
          `a partner's page that answers ${answer} gets its message ("${said}")`);
    await failed.close();
  }
  check(outside.length === 0, `no request went to another site (${outside.join(", ") || "none"})`);
} finally {
  await browser.close();
}
console.log(failures.length ? `FAIL: ${failures.length} checks failed` : "PASS: every check");
process.exit(failures.length ? 1 : 0);
