// The hovers of the charts and the board on a touch screen (design 07, item 14; design 33, item 6: a touch screen has no
// hover). A browser sends mouseenter and mousemove for a touch after its release, and no mouseleave until the next
// touch elsewhere, so a hover that listened to those events left its line, popup or tooltip on screen after a tap or a
// long press. A hover now starts only for a mouse (pointerType "mouse", byMouse.ts). The cases use CDP touch events in a
// touch context (hasTouch, 390 x 844), as move-list-touch.spec.ts does. The charts are one part that both sites share,
// so their cases run on Hedge School and on Cyanotype (CYANOTYPE_BASE_URL, which skips with a message when its preview
// has none of the engine's files). The board is Hedge School's own: its candidates, its marks and its points. A
// Cyanotype board and hand start a hover only for a mouse already (Board.svelte, Hand.svelte). The engine is off.
import { expect, test, type Locator, type Page } from "./page-log.ts";
import { declineGames } from "./cyanotype-consent.ts";
import { noReview, reviewTestGame } from "./cyanotype-review.ts";
import { openReviewFile } from "./review-file.ts";
import { toMove } from "./move-header.ts";

const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
/** How long a tap and a long press hold, and how long the cases wait after a release, which is longer than the
 *  double-tap's wait. */
const TAP_MS = 60, HOLD_MS = 700, SETTLE_MS = 600;

/** A touch on the point (x, y) of the page, with CDP touch events: touchStart, `hold` ms, touchEnd. */
async function touch(page: Page, x: number, y: number, hold: number) {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await page.waitForTimeout(hold);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } finally { await cdp.detach(); }
}
/** A touch on the middle of `target`, or on a place in it (a share of its width and height). */
async function touchOn(page: Page, target: Locator, hold: number, at: { x: number; y: number } = { x: 0.5, y: 0.5 }) {
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  await touch(page, box.x + box.width * at.x, box.y + box.height * at.y, hold);
}

/** Watches the page from now on for any element that `selector` matches, at any moment: a flag that the page keeps. A
 *  browser sends the mouse events of a touch after its release, and a part that listens to them shows its hover then;
 *  where a later mouseleave comes, the hover ends within a moment, so a look after a wait would miss it. */
const watch = (page: Page, selector: string) => page.evaluate(sel => {
  const w = window as unknown as { __seen: boolean; __watch?: MutationObserver };
  const look = () => { if (document.querySelector(sel)) w.__seen = true; };
  w.__seen = false;
  w.__watch?.disconnect();
  w.__watch = new MutationObserver(look);
  w.__watch.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  look();
}, selector);
/** Whether the watched element showed since `watch`. */
const seen = (page: Page) => page.evaluate(() => (window as unknown as { __seen: boolean }).__seen);

/** What a case needs of a site: how to open its review. */
type Site = { name: string; open: (page: Page) => Promise<void>; skipped?: (page: Page) => Promise<string> };
const HEDGE_SCHOOL: Site = {
  name: "Hedge School",
  async open(page) {
    await openReviewFile(page, "tests/fixtures/hedgefund-review.json",
                         { engine: { on: false }, display: { judge: "edge" }, consent: { games: "denied" } });
  },
};
const CYANOTYPE: Site = {
  name: "Cyanotype",
  skipped: noReview,
  async open(page) {
    await declineGames(page.context()); // the consent banner would cover the page (cyanotype-consent.ts)
    await reviewTestGame(page, { judge: "edge" }, { on: false });
  },
};

for (const site of [HEDGE_SCHOOL, CYANOTYPE]) test.describe(`${site.name}: the charts on a touch screen`, () => {
  test.use(PHONE);
  test.beforeEach(async ({ page }) => {
    test.setTimeout(5 * 60_000);
    const why = await site.skipped?.(page);
    test.skip(!!why, why);
  });

  for (const name of ["Advantage", "Difficulty"] as const) {
    const figure = (page: Page) => page.getByRole("figure", { name: `${name} chart` });
    /** The chart's note (its title in bold) and, for the Advantage chart, its line at the pointer. */
    const hover = `[role="figure"][aria-label="${name} chart"] :is(strong, line.pointer-events-none)`;
    /** The chart's mark of the position on screen: its x. */
    const here = (page: Page) => figure(page).locator("svg line.stroke-last").getAttribute("x1");

    async function open(page: Page) {
      await site.open(page);
      if (name === "Difficulty") await page.getByRole("group", { name: "Chart" }).getByRole("button", { name }).tap();
      await expect(figure(page)).toBeVisible();
    }

    test(`${name}: a tap on the chart goes to that position, and leaves no note`, async ({ page }) => {
      await open(page);
      const start = await here(page);
      await watch(page, hover);
      await touchOn(page, figure(page).locator("svg"), TAP_MS, { x: 0.6, y: 0.5 });
      await expect.poll(() => here(page), { message: "the tap goes to a position" }).not.toBe(start);
      await page.waitForTimeout(SETTLE_MS);
      expect(await seen(page), "the chart's note or line showed after the tap").toBe(false);
    });

    test(`${name}: a long press on the chart leaves no note`, async ({ page }) => {
      await open(page);
      await watch(page, hover);
      await touchOn(page, figure(page).locator("svg"), HOLD_MS, { x: 0.3, y: 0.5 });
      await page.waitForTimeout(SETTLE_MS);
      expect(await seen(page), "the chart's note or line showed after the long press").toBe(false);
    });

    test(`${name}: with a mouse, the chart shows its note and takes it away`, async ({ page }) => {
      await open(page);
      await figure(page).locator("svg").scrollIntoViewIfNeeded();
      const box = (await figure(page).locator("svg").boundingBox())!;
      await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2);
      await expect(figure(page).locator("strong")).toBeVisible();
      await page.mouse.move(1, 1);
      await expect(figure(page).locator("strong")).toHaveCount(0);
    });
  }
});

test.describe("Hedge School: the board on a touch screen", () => {
  test.use(PHONE);
  test.beforeEach(() => { test.setTimeout(5 * 60_000); });

  const board = (page: Page) => page.locator("svg.board").first();

  async function openReview(page: Page, move: number) {
    await HEDGE_SCHOOL.open(page);
    await toMove(page, move);
    await expect(board(page)).toBeVisible();
  }

  // A tap on a candidate pins its line, and a second tap unpins it (design 07). A hover that a tap started would stay
  // after the second tap: the candidate stays lit, and the board shows its line.
  test("a tap on a candidate pins its line, a second tap unpins it, and no hover stays", async ({ page }) => {
    await openReview(page, 0);
    const candidate = board(page).locator("g.candidate:not(.top)").first();
    await touchOn(page, candidate.locator("rect.cand-badge"), TAP_MS);
    await expect(board(page).locator("g.line"), "the tap pins the line").toBeVisible();
    await page.waitForTimeout(SETTLE_MS);
    await touchOn(page, board(page).locator("g.candidate rect.cand-badge").first(), TAP_MS);
    await page.waitForTimeout(SETTLE_MS);
    await expect(board(page).locator("g.line"), "the second tap unpins the line").toHaveCount(0);
    await expect(board(page).locator("g.candidate.top"), "no candidate stays lit").toHaveCount(0);
  });

  // A tap or a long press on a label's badge has no action, and shows no note.
  for (const [how, hold] of [["a tap", TAP_MS], ["a long press", HOLD_MS]] as const) {
    test(`${how} on a label's badge leaves no note and no light`, async ({ page }) => {
      await openReview(page, 3);
      const badge = board(page).locator("g.mark-group g[role=img]").first();
      await expect(badge).toBeVisible();
      await watch(page, "svg.board g.mark-group.lit, svg.board g.cand-note");
      await touchOn(page, badge, hold);
      await page.waitForTimeout(SETTLE_MS);
      expect(await seen(page), "a note or a light showed after the touch").toBe(false);
    });
  }

  // The editor draws an edge from a first point to the point under the pointer, as a dashed ghost, while a mouse is on a
  // legal end. A touch has no pointer to follow: the taps begin an edge and end it, and no ghost shows between them.
  test("taps on points begin and end edges, and no ghost edge follows a touch", async ({ page }) => {
    await page.goto("/editor");
    const points = page.locator("svg.board circle.hit");
    await expect(points).toHaveCount(361, { timeout: 30_000 });
    const edges = () => page.locator("svg.board line.edge").count();
    const before = await edges();
    await watch(page, "svg.board line.preview");
    const [a, b, c] = [points.nth(180), points.nth(181), points.nth(183)];
    await touchOn(page, a, TAP_MS);
    await page.waitForTimeout(SETTLE_MS);
    await touchOn(page, b, TAP_MS);
    await expect.poll(edges, { message: "the second tap ends the edge" }).toBe(before + 1);
    await page.waitForTimeout(SETTLE_MS);
    await touchOn(page, c, TAP_MS);
    await expect.poll(edges, { message: "the third tap ends the next edge of the chain" }).toBe(before + 2);
    await page.waitForTimeout(SETTLE_MS);
    expect(await seen(page), "a ghost edge showed after a tap").toBe(false);
  });

  test("with a mouse, a point shows the ghost edge from the first point", async ({ page }) => {
    await page.goto("/editor");
    const points = page.locator("svg.board circle.hit");
    await expect(points).toHaveCount(361, { timeout: 30_000 });
    await points.nth(180).click();
    await points.nth(181).hover();
    await expect(page.locator("svg.board line.preview")).toHaveCount(1);
    await page.mouse.move(1, 1);
    await expect(page.locator("svg.board line.preview")).toHaveCount(0);
  });

  test("with a mouse, a label's badge lights its group and shows its note", async ({ page }) => {
    await openReview(page, 3);
    const badge = board(page).locator("g.mark-group g[role=img]").first();
    await badge.hover();
    await expect(board(page).locator("g.mark-group.lit")).toHaveCount(1);
    await expect(board(page).locator("g.cand-note")).toHaveCount(1);
    await page.mouse.move(1, 1);
    await expect(board(page).locator("g.cand-note")).toHaveCount(0);
  });
});
