// A position that the player types in a board editor's field before the page's code runs (packages/site's
// typedEarly.ts). Cyanotype's page is prerendered with its position field, and its code starts later. Its cases hold
// the page's scripts, type in the field and press Enter, then let the scripts run. A position that reads opens on the
// board, and a text that does not read stays in the field, with the reason. Hedge School's editor shows its field only
// after its code runs. Cyanotype's cases run when CYANOTYPE_BASE_URL gives its preview with the engine files. Run:
// npm run test:layout -- tests/editor-typed-early.spec.ts --project=chromium, with BASE_URL (and CYANOTYPE_BASE_URL).
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { writePosition } from "../../cyanotype/src/lib/game/position.ts";
import type { SitePosition } from "../../cyanotype/src/lib/board/position.ts";
import { CYANOTYPE, noReview } from "./cyanotype-review.ts";

/** Opens the editor at `url` with the page's scripts held, types `text` in the position field and presses Enter, then
 *  lets the scripts run. Returns the field. */
async function typeEarly(page: Page, url: string, text: string) {
  let release!: () => void;
  const held = new Promise<void>(resolve => (release = resolve));
  let heldScripts = 0;
  await page.route(/\/_app\/immutable\/.+\.js$/, async route => {
    heldScripts++;
    await held;
    await route.continue();
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const field = page.getByLabel("Position, in the notation");
  await field.fill(text);
  await field.press("Enter");
  expect(heldScripts, "the page's scripts are held while the player types").toBeGreaterThan(0);
  release();
  return field;
}

test.describe("Hedge School", () => {
  // Its editor shows the field only once the engine has drawn the position: no key reaches it before the page's code
  // runs. If the field comes into the prerendered page, its editor reads the typed text as Cyanotype's does.
  test("the editor shows no position field before its code runs", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>(resolve => (release = resolve));
    await page.route(/\/_app\/immutable\/.+\.js$/, async route => { await held; await route.continue(); });
    await page.goto("/editor", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Setting up the board with the engine's rules…")).toBeVisible();
    await expect(page.getByLabel("Position, in the notation")).toHaveCount(0);
    release();
    await expect(page.getByLabel("Position, in the notation")).toBeVisible({ timeout: 120_000 });
  });
});

test.describe("Cyanotype", () => {
  const fixtures = JSON.parse(readFileSync("../cyanotype/src/lib/board/fixtures.json", "utf8")).fixtures as
    { name: string; position: SitePosition }[];
  const MIDDLE = writePosition(fixtures.find(f => f.name === "A middle game")!.position); // after 9 moves
  const editor = () => new URL("/editor", CYANOTYPE).href;

  test.beforeEach(async ({ page }) => {
    const skip = await noReview(page);
    test.skip(!!skip, skip);
  });

  test("the editor reads a position typed before its code ran", async ({ page }) => {
    const field = await typeEarly(page, editor(), MIDDLE);
    await expect(page.getByLabel("Moves played")).toHaveValue("9", { timeout: 120_000 });
    await expect(field).toHaveValue(MIDDLE);
    await expect(page.getByRole("status").filter({ hasText: "position" }))
      .toHaveText("A game can reach this position.", { timeout: 120_000 });
  });

  test("the editor keeps a text typed before its code ran that is no position, and says why", async ({ page }) => {
    const field = await typeEarly(page, editor(), "not a position");
    await expect(page.getByRole("alert")).toHaveText(/^a position has seven fields/, { timeout: 120_000 });
    await expect(field).toHaveValue("not a position");
    await expect(page.getByLabel("Moves played")).toHaveValue("0");
  });
});
