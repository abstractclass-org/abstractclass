// Cyanotype's image of a line (Hedge School's design 07, item 17; Cyanotype's design 33), on its preview
// (CYANOTYPE_BASE_URL): the checks of Hedge School's line-image-theme.spec.ts (line-image.ts), in a review of the test
// game (StampDuty against itself, from its stored results) and on the Analysis board. The move menu's "Copy static",
// "Save static" and "Save animated" each give an image in the theme that the page shows, light then dark, also after a
// refused copy and a change of theme while the site makes the animated image. The saved files have Cyanotype's names.
// The board's colour shows in the field, under the hand above it. An image of the position after a turn's second move
// marks both moves of the turn, as the page does, and so does the start's frame of the animated image of a line from
// there. The engine is off. Without the engine's files the tests skip, with a message. With LINE_IMAGE_DIR set, the
// spec also saves each image there, for a look. Run: npx playwright test tests/cyanotype-line-image.spec.ts
// --project=chromium, with CYANOTYPE_BASE_URL.
import { join } from "node:path";
import { declineGames } from "./cyanotype-consent.ts";
import { analysisAt } from "./cyanotype-notes.ts";
import { noReview, reviewTestGame } from "./cyanotype-review.ts";
import { expectThemedImages, type ImageChecks } from "./line-image.ts";
import { expect, test, type Page } from "./page-log.ts";

/** Where the board's colour shows in Cyanotype's image: the field's top left corner, under Blue's hand. The board is
 *  square, at the image's width, with a hand above the field and one below it (apps/cyanotype/src/lib/board/image.ts). */
const BOARD_AT: ImageChecks["boardAt"] = [0.01, 0.26];

test.beforeEach(async ({ page, context }) => {
  const skip = await noReview(page);
  test.skip(!!skip, skip);
  await declineGames(context);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 1376, height: 952 });
});

test("a review's images follow the theme that the page shows", async ({ page }) => {
  await reviewTestGame(page);
  await page.keyboard.press("Home");
  // The line of the game's first 10 moves
  await expectThemedImages(page, "cyanotype-review", 9, { boardAt: BOARD_AT, name: "cyanotype-start-line-10.png" });
});

/** Keeps, for each board that the site draws for an image from now on, the number of the turn's outlines in it
 *  (Board.svelte's last-move outlines, each clipped to its `…-last-N`). The site draws each board as an SVG image and
 *  decodes it (@abstractclass/review/boardImage.ts): one board for a static image, one for each frame of an animated
 *  one. `outlineCounts` gives them, in order, and starts a new list. */
const countOutlines = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { outlines: Promise<number>[] };
  w.outlines = [];
  const decode = HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode = function () {
    w.outlines.push(fetch(this.src).then(r => r.text())
      .then(t => t.match(/clip-path="url\(#[^"]*-last-\d+\)"/g)?.length ?? 0));
    return decode.call(this);
  };
});
const outlineCounts = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { outlines: Promise<number>[] };
  const counts = Promise.all(w.outlines);
  w.outlines = [];
  return counts;
});

/** Goes to the position after the move `move`, and moves the pointer off the move list: a move under the pointer
 *  shows its preview on the board. */
async function goTo(page: Page, move: number) {
  await page.locator(".mv").nth(move).click();
  await page.mouse.move(0, 0);
}

/** Chooses `item` in the Generate image submenu of the move `move`, and gives the saved file. */
async function saveImage(page: Page, move: number, item: string) {
  const [file] = await Promise.all([page.waitForEvent("download"), (async () => {
    await page.locator(".mv").nth(move).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Generate image" }).click();
    await page.getByRole("menuitem", { name: item }).click();
  })()]);
  return file;
}

test("an image marks the moves of the turn where its line starts, as the page does", async ({ page }) => {
  await reviewTestGame(page);
  const pageMarks = page.locator(".board-wrap .last-move-outline");
  await countOutlines(page);
  // The first turn has one move, each other turn two. Turn 4 places two cards: the move list's sixth move (index 5) is
  // its first, and its seventh (index 6) its second. Each placement of the turn so far has its outline on the field:
  // after move `marks` of 2, `marks` outlines.
  for (const [at, marks] of [[6, 2], [5, 1]]) {
    const turn = `move ${marks} of 2`;
    // The page at the move, then the static image of it: the position after the move, with no line
    await goTo(page, at);
    await expect(pageMarks, `the page after ${turn}`).toHaveCount(marks);
    await saveImage(page, at, "Save static");
    expect.soft(await outlineCounts(page), `the static image after ${turn}`).toEqual([marks]);
    // The animated image of the line of two moves from there: the whole line, the start, then each move of the line.
    // The turn's moves before the line are marked while no move of the line is drawn.
    await saveImage(page, at + 2, "Save animated");
    expect.soft(await outlineCounts(page), `the animated image of the line after ${turn}`).toEqual([0, marks, 0, 0]);
  }
  // For a look, in each theme: the board on the page after the second move of turn 4, and its static image
  const look = process.env.LINE_IMAGE_DIR;
  if (look) for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await goTo(page, 6);
    // The board shows the move list's preview of the move under the pointer until a moment after the pointer leaves
    // (ReviewView's PREVIEW_END_MS): the shot waits for the position after the move, with both of the turn's outlines.
    await expect(pageMarks, `the page after move 2 of 2, ${theme}`).toHaveCount(2);
    await page.locator(".board-wrap").screenshot({ path: join(look, `cyanotype-turn-marks-${theme}-page.png`) });
    await (await saveImage(page, 6, "Save static")).saveAs(join(look, `cyanotype-turn-marks-${theme}-image.png`));
  }
});

test("the Analysis board's images follow the theme that the page shows", async ({ page }) => {
  await analysisAt(page, 0);
  // The line of the record's first 3 moves
  await expectThemedImages(page, "cyanotype-analysis", 2, { boardAt: BOARD_AT, name: "cyanotype-start-line-3.png" });
});
