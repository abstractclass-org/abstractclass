// The image of the engine's line (design 07, item 17), on Hedge School and on Cyanotype (CYANOTYPE_BASE_URL), in a
// review from its stored results with the engine off. A right-click on an edge of the engine's line under the
// candidates table opens a menu with the image's items: "Copy static", "Save static" and "Save animated". Each image
// is of the line from the position on screen up to that edge: its file's name gives the start and the number of
// edges, and the static image's caption gives the numbers before the first edge and after the last. On a candidate's
// row the menu gives the candidate's whole line. The click plays nothing. On a touch screen (390 x 844) a long press on an edge opens the same menu, and its release plays nothing.
// A Cyanotype case skips, with a message, when its preview has none of the engine's files. With LINE_IMAGE_DIR set,
// the spec saves there a crop of each menu and the saved images, for a look. Run:
// npx playwright test tests/engine-line-image.spec.ts --project=chromium.
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { declineGames } from "./cyanotype-consent.ts";
import { noReview, reviewTestGame } from "./cyanotype-review.ts";
import { toMove } from "./move-header.ts";
import { expect, test, type Page } from "./page-log.ts";
import { openReviewFile } from "./review-file.ts";

const LOOK_DIR = process.env.LINE_IMAGE_DIR;
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
/** The position on screen: after the game's move AT. The cases use the engine's line up to its third edge. */
const AT = 9, EDGES = 3;
/** How long a long press holds (the menu opens after 700 ms), and how long a case waits after its release. */
const HOLD_MS = 900, SETTLE_MS = 600;

/** What a case needs of a site: how to open its review, the start of its images' names, and its word for a move. */
type Site = { name: string; file: string; move: string; open: (page: Page) => Promise<void>; skipped?: (page: Page) => Promise<string> };
const HEDGE_SCHOOL: Site = {
  name: "Hedge School", file: "hedge-school", move: "edge",
  open: page => openReviewFile(page, "tests/fixtures/hedgefund-review.json", { engine: { on: false }, consent: { games: "denied" } }),
};
const CYANOTYPE: Site = {
  name: "Cyanotype", file: "cyanotype", move: "move", skipped: noReview,
  async open(page) {
    await declineGames(page.context()); // the consent banner would cover the page (cyanotype-consent.ts)
    await reviewTestGame(page, {}, { on: false });
  },
};

/** The edges of the engine's line under the table. */
const lineEdges = (page: Page) => page.getByRole("group", { name: "The engine's line" }).locator("[data-line-edge]");
/** The place on screen in the move list: the key of the move with the "here" look. */
const hereKey = (page: Page) => page.locator(".movelist .mv.here").first().getAttribute("data-path");
/** The moves in the move list, a variation's too: a click that played the line would add some. */
const listed = (page: Page) => page.locator(".movelist .mv[data-path]").count();

/** Keeps each text that the page writes on a canvas from now on: an image's caption is written so
 *  (@abstractclass/review/boardImage.ts). `written` gives them. */
const watchCaptions = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { __written: string[] };
  w.__written = [];
  const fillText = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (text: string, ...rest: [number, number, number?]) {
    w.__written.push(text);
    return fillText.call(this, text, ...rest);
  };
});
const written = (page: Page) => page.evaluate(() => (window as unknown as { __written: string[] }).__written.join("\n"));

/** The file that a download gives, when `act` starts it: its name and where it is. */
async function downloaded(page: Page, act: () => Promise<unknown>) {
  const [file] = await Promise.all([page.waitForEvent("download"), act()]);
  const path = (await file.path())!;
  return { name: file.suggestedFilename(), path };
}

/** With LINE_IMAGE_DIR set: a crop of the open menu and the engine's line, and a copy of a saved file. */
async function lookAt(page: Page, name: string) {
  if (!LOOK_DIR) return;
  mkdirSync(LOOK_DIR, { recursive: true });
  const menu = (await page.getByRole("menu").boundingBox())!, line = (await page.getByRole("group", { name: "The engine's line" }).boundingBox())!;
  const x = Math.max(0, Math.min(menu.x, line.x) - 16), y = Math.max(0, Math.min(menu.y, line.y) - 16);
  const right = Math.min(page.viewportSize()!.width, Math.max(menu.x + menu.width, line.x + line.width) + 16);
  await page.screenshot({ path: join(LOOK_DIR, name), clip: { x, y, width: right - x, height: Math.max(menu.y + menu.height, line.y + line.height) + 16 - y } });
}
function keep(name: string, from: string) {
  if (!LOOK_DIR) return;
  mkdirSync(LOOK_DIR, { recursive: true });
  copyFileSync(from, join(LOOK_DIR, name));
}

for (const site of [HEDGE_SCHOOL, CYANOTYPE]) test.describe(`${site.name}: the image of the engine's line`, () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(5 * 60_000);
    const why = await site.skipped?.(page);
    test.skip(!!why, why);
  });
  const name = (animated: boolean) => `${site.file}-after-${site.move}-${AT}-line-${EDGES}${animated ? "-animated.gif" : ".png"}`;

  test("a right-click on an edge of the engine's line saves the line's image, static and animated", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width: 1280, height: 900 });
    await site.open(page);
    await toMove(page, AT);
    const edge = lineEdges(page).nth(EDGES - 1);
    await expect(edge).toBeVisible({ timeout: 60_000 });
    const place = await hereKey(page), moves = await listed(page);
    await watchCaptions(page);
    await edge.click({ button: "right" });
    await expect(page.getByRole("menuitem")).toHaveText(["Copy static", "Save static", "Save animated"]);
    await lookAt(page, `${site.file}-menu-1280.png`);
    const still = await downloaded(page, () => page.getByRole("menuitem", { name: "Save static" }).click());
    expect.soft(still.name, "the static image's name").toBe(name(false));
    const caption = await written(page);
    expect.soft(caption, "the caption's numbers before the line").toContain(`Before ${site.move} 1:`);
    expect.soft(caption, "the caption's numbers after the line's last edge").toContain(`After ${site.move} ${EDGES}:`);
    await edge.click({ button: "right" });
    const gif = await downloaded(page, () => page.getByRole("menuitem", { name: "Save animated" }).click());
    expect.soft(gif.name, "the animated image's name").toBe(name(true));
    keep(still.name, still.path);
    keep(gif.name, gif.path);
    await edge.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Copy static" }).click();
    await expect(page.getByText("Image copied", { exact: true })).toBeVisible();
    // A candidate's row: the candidate's whole line, as the board draws it while the pointer is on the row. The first
    // row's line is the line under the table (the selected candidate's: rank 1).
    const whole = await lineEdges(page).count();
    await page.locator("tr[data-rank='1']").click({ button: "right" });
    const row = await downloaded(page, () => page.getByRole("menuitem", { name: "Save static" }).click());
    expect.soft(row.name, "the row's image's name").toBe(`${site.file}-after-${site.move}-${AT}-line-${whole}.png`);
    expect(await hereKey(page), "the position on screen stays").toBe(place);
    expect(await listed(page), "the line is not played").toBe(moves);
  });

  test.describe("on a touch screen", () => {
    test.use(PHONE);
    test("a long press on an edge of the engine's line opens the menu, and its release plays nothing", async ({ page }) => {
      await site.open(page);
      await toMove(page, AT);
      await page.getByRole("tab", { name: "Analysis", exact: true }).tap();
      await page.mouse.move(1, 1); // a phone has no mouse pointer (move-list-touch.spec.ts)
      const edge = lineEdges(page).nth(EDGES - 1);
      await expect(edge).toBeVisible({ timeout: 60_000 });
      await edge.scrollIntoViewIfNeeded();
      const place = await hereKey(page), moves = await listed(page);
      const box = (await edge.boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height / 2;
      const cdp = await page.context().newCDPSession(page);
      try {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        await page.waitForTimeout(HOLD_MS);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      } finally { await cdp.detach(); }
      await expect(page.getByRole("menuitem")).toHaveText(["Copy static", "Save static", "Save animated"]);
      await page.waitForTimeout(SETTLE_MS);
      await lookAt(page, `${site.file}-menu-390.png`);
      expect(await hereKey(page), "the position on screen stays").toBe(place);
      expect(await listed(page), "the line is not played").toBe(moves);
      const still = await downloaded(page, () => page.getByRole("menuitem", { name: "Save static" }).tap());
      expect.soft(still.name, "the static image's name").toBe(name(false));
    });
  });
});
