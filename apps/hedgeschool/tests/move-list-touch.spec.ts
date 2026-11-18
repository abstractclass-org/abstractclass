// The move list's previews on a touch screen (design 07, item 14; design 33, item 6: a touch screen has no hover), on
// Hedge School and on Cyanotype (CYANOTYPE_BASE_URL), by edge and by turn, with CDP touch events in a touch context
// (hasTouch, 390 x 844). A browser sends mouseenter for a touch and no mouseleave until the next touch elsewhere, so a
// move list that previewed on those events left the preview on the board after a long press's release: the status line
// said "Preview: ... Click to go there." and the board showed another position than the position on screen. The move
// list starts a preview only for a mouse (pointerType "mouse"). The engine is off. A Cyanotype case skips, with a
// message, when its preview has none of the engine's files, and fails in CI. With a mouse, the previews are as before
// (book-review.spec.ts, "a book move's mark, pointed at and clicked").
import { expect, test, type Locator, type Page } from "./page-log.ts";
import { declineGames } from "./cyanotype-consent.ts";
import { noReview, reviewTestGame } from "./cyanotype-review.ts";
import { openReviewFile } from "./review-file.ts";
import { tableBox, toMove } from "./move-header.ts";

const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
/** The game's move that the cases press: the ninth. */
const NINTH = 9;
/** How long the press holds (the move menu opens by 500 ms, design 07, item 12), and how long the cases wait after a
 *  release, which is longer than the preview's end (120 ms, PREVIEW_END_MS) and the double-tap's wait. */
const HOLD_MS = 700, SETTLE_MS = 600;
/** The position, in moves, where the candidates' table has rows to tap. */
const TABLE_AT = 8;

/** What a case needs of a site: how to open its review, with the review's setting "Review by" `judge`. */
type Site = { name: string; open: (page: Page, judge: "edge" | "turn") => Promise<void>; skipped?: (page: Page) => Promise<string> };

const HEDGE_SCHOOL: Site = {
  name: "Hedge School",
  async open(page, judge) {
    await openReviewFile(page, "tests/fixtures/hedgefund-review.json",
                         { engine: { on: false }, display: { judge }, consent: { games: "denied" } });
  },
};
const CYANOTYPE: Site = {
  name: "Cyanotype",
  skipped: noReview,
  async open(page, judge) {
    await declineGames(page.context()); // the consent banner would cover the page (cyanotype-consent.ts)
    await reviewTestGame(page, { judge }, { on: false });
  },
};

/** The move list of the review on a phone: in the Analysis tab. */
async function openMoveList(page: Page, site: Site, judge: "edge" | "turn") {
  await site.open(page, judge);
  await page.getByRole("tab", { name: "Analysis", exact: true }).tap();
  await expect(page.locator(".movelist")).toBeVisible();
  // The setup's mouse clicks left the mouse pointer somewhere. A phone has none: put it at the page's corner, where the
  // move list is not, so that the cases show what a touch does and a mouse over a move does not.
  await page.mouse.move(1, 1);
}

/** The game's move `n` (1 is the first) in the move list: its button, found by the key of its path (`data-path`: the
 *  names of the moves up to it), which has n names. A variation's key has more names than the game's moves before the
 *  variation, so the test game's first moves have one key each here. */
async function moveButton(page: Page, n: number): Promise<{ key: string; button: Locator }> {
  const keys = await page.locator(".movelist button.mv[data-path]").evaluateAll(bs => bs.map(b => (b as HTMLElement).dataset.path!));
  const key = keys.find(k => k.split(" ").length === n);
  if (!key) throw new Error(`no move ${n} in the move list: ${keys.join(", ")}`);
  return { key, button: page.locator(`.movelist button.mv[data-path="${key}"]`) };
}

/** What the page shows of the position on screen: the board's markup, which a preview changes (it hides the candidates
 *  and the notes, and draws the move's position). */
const boardMarkup = (page: Page) => page.locator(".board-wrap").first().innerHTML();
/** The status line of a preview ("Preview: the position after ..." or "Variation preview: ..."). */
const previewStatus = (page: Page) => page.getByText(/^(Variation preview|Preview): /);
/** Watches the page from now on for a preview's status line, at any moment: a flag that the page keeps. A browser sends
 *  the mouse events of a touch after its release, and a move list that previews on them shows the preview then. Where a
 *  later mouseleave comes (a menu that opened makes the pointer leave the move), the preview ends within a moment, so
 *  a check of the status line after a wait would miss it. */
const watchPreview = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { __previewShown: boolean };
  w.__previewShown = false;
  const look = () => { if (/Preview: the position|Variation preview: /.test(document.body.textContent ?? "")) w.__previewShown = true; };
  new MutationObserver(look).observe(document.body, { subtree: true, childList: true, characterData: true });
  look();
});
/** Whether a preview showed since watchPreview. */
const previewShown = (page: Page) => page.evaluate(() => (window as unknown as { __previewShown: boolean }).__previewShown);
/** The place on screen in the move list: the key of the move with the "here" look, or null at the start. */
const hereKey = (page: Page) => page.locator(".movelist .mv.here").first().getAttribute("data-path", { timeout: 1000 }).catch(() => null);

/** A long press on the middle of `target`, with CDP touch events: touchStart, `HOLD_MS`, touchEnd. */
async function longPress(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await page.waitForTimeout(HOLD_MS);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } finally { await cdp.detach(); }
}

/** The menu of a move, which a long press opens. */
const moveMenu = (page: Page) => page.getByRole("menu");

for (const site of [HEDGE_SCHOOL, CYANOTYPE]) test.describe(`${site.name}: the move list on a touch screen`, () => {
  test.use(PHONE);
  test.beforeEach(async ({ page }) => {
    test.setTimeout(5 * 60_000);
    const why = await site.skipped?.(page);
    test.skip(!!why, why);
  });

  // The other hover of the analysis that the board shows: the table's row under the pointer is outlined (`lit`) and its
  // move is drawn on the board. The row starts its hover only for a mouse too (design 07, item 14). In headless Chromium
  // a tap left no hover on the row before this change either (this case passes on the earlier code): the case guards
  // the pin and the tap's result.
  test("a tap on a candidate's row pins its line, and leaves no hover on the row", async ({ page }) => {
    await openMoveList(page, site, "edge");
    await toMove(page, TABLE_AT);
    const rows = tableBox(page).locator("tbody tr");
    await expect(rows.nth(1)).toBeVisible();
    const row = rows.nth(1);
    await row.locator("td").nth(1).tap();
    await expect(row).toHaveClass(/inset_3px/);
    await page.waitForTimeout(SETTLE_MS);
    await expect(row).not.toHaveClass(/lit/);
    // A second tap unpins it, and the row has still no hover
    await row.locator("td").nth(1).tap();
    await expect(row).not.toHaveClass(/inset_3px/);
    await page.waitForTimeout(SETTLE_MS);
    await expect(row).not.toHaveClass(/lit/);
  });

  for (const judge of ["edge", "turn"] as const) {
    /** The parts of move 9 that a press lands on, by their name: the move's button, and its judgement: by edge the
     *  button's loss figure (the label slot's neighbour), by turn the turn's judgement cell, a button of its own. */
    const parts = async (page: Page): Promise<[string, Locator][]> => {
      const { key, button } = await moveButton(page, NINTH);
      const judgement = judge === "edge" ? button.locator("span.tabular-nums")
        : page.locator(`.movelist button[data-path="${key}"]:not(.mv)`);
      return [["the move", button], ["its judgement cell", judgement]];
    };

    test(`by ${judge}: a long press on a move and on its judgement cell opens the menu and leaves no preview`, async ({ page }) => {
      await openMoveList(page, site, judge);
      await toMove(page, 0);
      const screen = await boardMarkup(page), place = await hereKey(page);
      for (const [name, part] of await parts(page)) await test.step(name, async () => {
        await watchPreview(page);
        await longPress(page, part);
        await expect(moveMenu(page)).toBeVisible();
        await page.waitForTimeout(SETTLE_MS);
        expect(await previewShown(page), "a preview showed after the release").toBe(false);
        await expect(previewStatus(page)).toHaveCount(0);
        expect(await boardMarkup(page), "the board shows the position on screen").toBe(screen);
        expect(await hereKey(page), "the position on screen stays").toBe(place);
        await page.keyboard.press("Escape");
        await expect(moveMenu(page)).toHaveCount(0);
      });
    });

    test(`by ${judge}: a tap on a move goes to it, and leaves no preview`, async ({ page }) => {
      await openMoveList(page, site, judge);
      await toMove(page, 0);
      const { key, button } = await moveButton(page, NINTH);
      await button.scrollIntoViewIfNeeded();
      await watchPreview(page);
      await button.tap();
      await expect(page.locator(`.movelist .mv.here[data-path="${key}"]`)).toHaveCount(1);
      await page.waitForTimeout(SETTLE_MS);
      await expect(previewStatus(page)).toHaveCount(0);
      expect(await previewShown(page), "a preview showed after the tap").toBe(false);
      // The board shows the position that the keys reach too, the position after move 9
      const tapped = await boardMarkup(page);
      await toMove(page, NINTH);
      expect(await boardMarkup(page), "the board shows the position on screen").toBe(tapped);
    });
  }
});
