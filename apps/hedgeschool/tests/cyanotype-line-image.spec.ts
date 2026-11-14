// Cyanotype's image of a line (Hedge School's design 07, item 17; Cyanotype's design 33), on its preview
// (CYANOTYPE_BASE_URL): the checks of Hedge School's line-image-theme.spec.ts (line-image.ts), in a review of the test
// game (Stamp Duty against itself, from its stored results) and on the Analysis board. The move menu's "Copy static",
// "Save static" and "Save animated" each give an image in the theme that the page shows, light then dark, also after a
// refused copy and a change of theme while the site makes the animated image. The saved files have Cyanotype's names.
// The board's colour shows in the field, under the hand above it. The engine is off. Without the engine's files the
// tests skip, with a message. With LINE_IMAGE_DIR set, the spec also saves each image there, for a look. Run:
// npx playwright test tests/cyanotype-line-image.spec.ts --project=chromium, with CYANOTYPE_BASE_URL.
import { declineGames } from "./cyanotype-consent.ts";
import { analysisAt } from "./cyanotype-notes.ts";
import { noReview, reviewTestGame } from "./cyanotype-review.ts";
import { expectThemedImages, type ImageChecks } from "./line-image.ts";
import { test } from "./page-log.ts";

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

test("the Analysis board's images follow the theme that the page shows", async ({ page }) => {
  await analysisAt(page, 0);
  // The line of the record's first 3 moves
  await expectThemedImages(page, "cyanotype-analysis", 2, { boardAt: BOARD_AT, name: "cyanotype-start-line-3.png" });
});
