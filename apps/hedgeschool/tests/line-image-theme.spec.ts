// The image of a line (design 07, item 17) has the look of the theme that the page shows when the player asks for it.
// In a review of tests/fixtures/hedgefund-review.json and on the Analysis board, the move menu's "Copy static", "Save
// static" and "Save animated" each give an image whose caption's background is the theme's panel colour and whose
// board is the theme's board colour, in the light theme, then in the dark theme on the same page (the theme "System",
// which follows the system's). The copied and the saved image have the same pixels. Where the browser refuses the
// copy, the note's "Save image" saves the copy's image, also after a change of theme. A change of theme while the site
// makes the animated image starts it again: each of its frames has the new theme. The engine is off. With
// LINE_IMAGE_DIR set, the spec also saves each image there, for a look. The checks are line-image.ts's, which
// Cyanotype's spec (cyanotype-line-image.spec.ts) shares. Run:
// npx playwright test tests/line-image-theme.spec.ts --project=chromium.
import { keepBefore } from "./keep-before.ts";
import { expectThemedImages } from "./line-image.ts";
import { expect, test } from "./page-log.ts";
import { loadReviewFile } from "./review-file.ts";
import { CONSENT_KEY, ENGINE_KEY } from "../src/lib/keys.ts";

test.beforeEach(async ({ page, context }) => {
  await keepBefore(page, CONSENT_KEY, { games: "denied" });
  await keepBefore(page, ENGINE_KEY, { on: false, gpu: "off" });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 1376, height: 952 });
});

test("a review's images follow the theme that the page shows", async ({ page }) => {
  await page.goto("/review");
  await loadReviewFile(page, "tests/fixtures/hedgefund-review.json");
  await page.waitForURL(/#game=/);
  await expect(page.locator("main.review")).not.toHaveAttribute("aria-busy", { timeout: 120_000 });
  await page.keyboard.press("Home");
  await expectThemedImages(page, "review", 9); // the line of the game's first 10 edges
});

test("the Analysis board's images follow the theme that the page shows", async ({ page }) => {
  await page.goto(`/analysis#${new URLSearchParams({ record: "1. D10-G10 2. N11-Q10 L10-N11 *" })}`);
  await expect(page.getByRole("button", { name: "Export" }).first()).toBeEnabled({ timeout: 120_000 });
  await page.keyboard.press("Home");
  await expectThemedImages(page, "analysis", 2); // the line of the record's 3 edges
});
