// The review snapshot (design 20): a game whose last review ran with an earlier engine opens as that review was, from
// the stored results alone (src/routes/review/+page.svelte, openSnapshot, with startWithBook of
// src/lib/review/storedReview.ts). The game is the layout test's (tests/fixtures/hedgefund-review.json). The test gives
// its review file an engine module that no site ships, and its results a search that is not the site's. The import
// then keeps the file's review as an earlier engine's (src/lib/game/reviewFile.ts, importReview). The review snapshot
// must show the same move list, with the quality labels by edge and by turn, as the review of the unchanged file.
// Two marks:
// - A mark that names its search. Where the site gives the test book, its file holds no result of the positions that
//   the book holds, as a review with the book searched none of them (design 32, "A book position's values"): the
//   review snapshot must take the book's values before it chooses the search.
// - An older mark, which names no search. Its review is older than the book and searched every position.
// The engine is off, so that nothing searches. Run: npm run test:layout (the site running first).
import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { loadReviewFile, type ReviewFileInput } from "./review-file.ts";

const FIXTURE = "tests/fixtures/hedgefund-review.json";
/** The earlier engine's search: not the site's, which a review snapshot of an earlier engine leaves out. */
const EARLIER = "earlier-search";
/** The positions of the game that the test book holds, by their number of edges: the label snapshot's record. */
const BOOK_POSITIONS = (() => {
  const text = readFileSync("tests/snapshots/review-labels/hedgefund.txt", "utf8");
  const line = /^# Positions that take the book's values: ([\d ]+)$/m.exec(text);
  if (!line) throw new Error("hedgefund.txt names no positions that take the book's values");
  return new Set(line[1].split(" ").map(Number));
})();

/** The review file with an earlier engine's review: its results under the search EARLIER. `named`: the review names
 *  that search. Else it names none, as an older file's does. `book`: the file holds no result of the book's
 *  positions. */
function earlierFile(named: boolean, book: boolean): ReviewFileInput {
  const file = JSON.parse(readFileSync(FIXTURE, "utf8"));
  file.review = { ...file.review, module: "0".repeat(64), ...(named ? { search: EARLIER } : {}) };
  // A result's key: shape|search|model|visits|moves, and an added map's has "map|" before it
  // (@abstractclass/analysis/cache.ts, analysisKey and mapKey)
  file.analyses = file.analyses.flatMap(([key, value]: [string, unknown]) => {
    const parts = key.split("|"), at = key.startsWith("map|") ? 1 : 0, moves = parts[at + 4];
    if (book && BOOK_POSITIONS.has(moves ? moves.split(" ").length : 0)) return [];
    parts[at + 1] = EARLIER;
    return [[parts.join("|"), value]];
  });
  return { name: "earlier-review.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) };
}

/** Opens the Review tab, with the engine off and the labels by `judge`. Whether the review takes the test book's
 *  values: the site serves the book, and the review shows it in the early edition only. */
async function openTab(page: Page, judge: string) {
  // The visitor has answered the consent notice, which covers the page until they choose: a build that stores
  // practice games, as CI's, asks for it
  await page.addInitScript(j => {
    localStorage.setItem("hedge-school:consent:2", JSON.stringify({ analytics: "denied", games: "denied" }));
    localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false }));
    localStorage.setItem("learn-enclosure:review-display:1", JSON.stringify({ judge: j }));
  }, judge);
  const served = await page.request.get("/test-book/prototype/index.json");
  await page.goto("/review");
  return served.ok() && (served.headers()["content-type"] ?? "").includes("json")
    && (await page.getByRole("link", { name: "Early Access" }).count()) > 0;
}

/** Opens a review file in the Review tab: the page stores the game, then reloads to open its review. Answers the move
 *  list once it holds still: each button's text and title, the moves' and the turns' own (by turn, a turn's quality
 *  label is on its own button). */
async function open(page: Page, file: ReviewFileInput) {
  let books = 0, last = Date.now(); // the test book's loads (its index and parts) that are open, and the last change
  const count = (step: number) => (r: { url(): string }) => {
    if (r.url().includes("/test-book/")) { books += step; last = Date.now(); }
  };
  page.on("request", count(1));
  page.on("requestfinished", count(-1));
  page.on("requestfailed", count(-1));
  await loadReviewFile(page, file);
  await page.getByText("Accuracy").first().waitFor({ timeout: 60_000 });
  // The review takes the book's values once the book's parts load (src/lib/book/reviewBook.ts, giveBook): the list
  // holds still once no load of the book is open, and nothing changed for a second
  let list = "";
  await expect.poll(async () => {
    const now = JSON.stringify(await page.locator("button[data-path]").evaluateAll(buttons =>
      buttons.map(b => `${b.textContent?.trim()} | ${b.getAttribute("title") ?? ""}`)));
    const still = now === list && books === 0 && Date.now() - last >= 1_000;
    list = now;
    return still;
  }, { intervals: [1_000], timeout: 60_000 }).toBe(true);
  return JSON.parse(list) as string[];
}

for (const judge of ["edge", "turn"]) {
  for (const named of [true, false]) {
    test(`by ${judge}: a review by an earlier engine, with ${named ? "a mark that names its search" : "an older mark"},`
         + " opens with the move list of its review", async ({ page, browser }) => {
      test.setTimeout(240_000);
      const reviewed = await browser.newPage({ baseURL: test.info().project.use.baseURL });
      await openTab(reviewed, judge);
      const expected = await open(reviewed, FIXTURE);
      await reviewed.close();
      expect(expected.length).toBeGreaterThan(0); // the list has loaded: two empty lists are the same
      const book = await openTab(page, judge);
      const shown = await open(page, earlierFile(named, named && book));
      await expect(page.getByText(/^Reviewed on .+ with an earlier version of the engine\.$/)).toBeVisible();
      expect(shown).toEqual(expected);
    });
  }
}
