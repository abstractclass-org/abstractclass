// The word before the number in a move's tooltip in the move list, by edge, on both sites (the shared review,
// packages/review/src/ReviewView.svelte, leadLine; design 06, item 8). After a game's last move, when the rules ended
// the game, the number is the game's result: the tooltip says "Result:", with the same words as the chart's note on
// that position. Every other move's tooltip, and the last move's of a record that ends before the rules end the game,
// says "Lead:": there the number is the engine's estimate. The games: Hedge School's layout game
// (tests/fixtures/hedgefund-review.json, which the rules end at r+377.651497) and a record that ends after turn 7
// (tests/fixtures/twin-turn-review.json); Cyanotype's test game, whole (its stored review
// tests/fixtures/cyanotype-whole-review.json, which the rules end at r+730) and up to turn 20 (STORED). The engine is
// off: the tooltips take the stored results. Without Cyanotype's preview or its engine's files, its tests skip, with a
// message.
// Run: npx playwright test tests/last-move-result.spec.ts, with BASE_URL and CYANOTYPE_BASE_URL.
import { expect, type Page, test } from "./page-log.ts";
import { loadReviewFile } from "./review-file.ts";
import { OTHER_STORED, noReview, pasteRecord, putResults, readStored, reviewTestGame, storeReview, testRecord }
  from "./cyanotype-review.ts";

const ENDED = "tests/fixtures/hedgefund-review.json";
const CUT = "tests/fixtures/twin-turn-review.json";
/** Cyanotype's stored review of its whole test game. */
const WHOLE = OTHER_STORED.find(s => s.turns === Infinity)!.file;

/** The moves of the move list's main line, in their order, each with its tooltip (its title). By edge, each edge is
 *  one button, whose `data-path` is its path from the start: the moves joined by spaces. */
async function moveTips(page: Page): Promise<{ path: string; tip: string }[]> {
  const moves = await page.locator("button.mv[data-path]").evaluateAll(buttons =>
    buttons.map(b => ({ path: b.getAttribute("data-path") ?? "", tip: b.getAttribute("title") ?? "" })));
  return moves.sort((a, b) => a.path.split(" ").length - b.path.split(" ").length);
}

/** The line with the lead or the result in the advantage chart's note, with the pointer over the chart's last
 *  position. */
async function chartEnd(page: Page): Promise<string> {
  const chart = page.getByRole("figure", { name: "Advantage chart" });
  const svg = chart.locator("svg");
  const box = (await svg.boundingBox())!;
  await svg.hover({ position: { x: box.width - 1, y: box.height / 2 } });
  return (await chart.locator("span", { hasText: /^(Result|Lead): / }).innerText()).trim();
}

/** Checks the tooltips of the main line's moves once the review has given each a lead: the last move's says
 *  "Result:" when `ended`, with the chart's words at the end, and every other move's says "Lead:". */
async function checkTips(page: Page, ended: boolean) {
  await expect.poll(async () => (await moveTips(page)).every(m => /(^| · )(Lead|Result): /.test(m.tip)),
                    { message: "every move's tooltip has its lead", timeout: 120_000 }).toBe(true);
  const moves = await moveTips(page), last = moves.at(-1)!;
  expect(moves.length).toBeGreaterThan(10);
  for (const m of moves.slice(0, -1)) {
    expect(m.tip, `the tooltip of the move ${m.path.split(" ").length}`).toMatch(/(^| · )Lead: /);
    expect(m.tip, `the tooltip of the move ${m.path.split(" ").length}`).not.toContain("Result:");
  }
  if (ended) {
    expect(last.tip, "the last move's tooltip").not.toContain("Lead:");
    const words = await chartEnd(page);
    expect(words).toMatch(/^Result: (Blue|Red) \+[\d.]+$|^Result: even$/);
    expect(last.tip.split(" · "), "the last move's tooltip, with the chart's words").toContain(words);
  } else {
    expect(last.tip, "the last move's tooltip").toMatch(/(^| · )Lead: /);
    expect(last.tip, "the last move's tooltip").not.toContain("Result:");
    expect(await chartEnd(page)).toMatch(/^Lead: /);
  }
}

/** Opens the review file `file` on Hedge School, by edge and with the engine off, and waits for the review. */
async function reviewOnHedgeSchool(page: Page, file: string) {
  await page.addInitScript(() => {
    localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false }));
    localStorage.setItem("learn-enclosure:review-display:1", JSON.stringify({ judge: "edge" }));
    localStorage.setItem("hedge-school:consent:2", JSON.stringify({ games: "denied" }));
  });
  await page.goto("/review");
  await loadReviewFile(page, file);
  await page.waitForURL(/#game=/);
  await expect(page.locator("main.review")).not.toHaveAttribute("aria-busy", { timeout: 120_000 });
}

test.describe("the last move's tooltip on Hedge School", () => {
  test("says Result: when the rules ended the game", async ({ page }) => {
    await reviewOnHedgeSchool(page, ENDED);
    await checkTips(page, true);
  });

  test("says Lead: when the record ends before the rules end the game", async ({ page }) => {
    await reviewOnHedgeSchool(page, CUT);
    await checkTips(page, false);
  });
});

test.describe("the last move's tooltip on Cyanotype", () => {
  test.beforeEach(async ({ page }) => {
    const why = await noReview(page);
    test.skip(why !== "", why);
  });

  test("says Result: when the rules ended the game", async ({ page }) => {
    await storeReview(page, { judge: "edge" });
    await putResults(page, readStored(WHOLE).analyses);
    await pasteRecord(page, testRecord(Infinity));
    await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: 120_000 });
    await checkTips(page, true);
  });

  test("says Lead: when the record ends before the rules end the game", async ({ page }) => {
    await reviewTestGame(page, { judge: "edge" });
    await checkTips(page, false);
  });
});
