// A position that the player types in a board editor's field before the page's code runs (Cyanotype's design 33, "The
// position in the notation"). Cyanotype's page is prerendered with its position field, and its code starts later. Its
// cases hold the page's scripts, type in the field and press Enter, then let the scripts run. The page reads the typed
// text after the position that the browser kept or the address brought. A position that reads opens on the board in
// place of that one. A text that does not read stays in the field, with the reason, also after the engine has loaded,
// and the board keeps that position. Hedge School's editor shows its field only after its code runs. Cyanotype's cases
// run when CYANOTYPE_BASE_URL gives its preview with the engine files. Run, with BASE_URL (and CYANOTYPE_BASE_URL):
//   npm run test:layout -- tests/editor-typed-early.spec.ts --project=chromium
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { writePosition } from "../../cyanotype/src/lib/game/position.ts";
import type { SitePosition } from "../../cyanotype/src/lib/board/position.ts";
import { EDITOR_KEY } from "../../cyanotype/src/lib/site.ts";
import { CYANOTYPE, noReview } from "./cyanotype-review.ts";

/** Opens `url` with every script of the page held, as review-file.spec.ts holds them: the server-rendered page shows,
 *  and its code does not start. Returns the release, which lets the scripts run. The release fails when the hold
 *  stopped no script, as then the code could have run before. */
async function openHeld(page: Page, url: string) {
  let release!: () => void, heldScripts = 0;
  const released = new Promise<void>(resolve => (release = resolve));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") {
      heldScripts++;
      await released;
    }
    await route.continue();
  });
  // On the dev server, the held scripts stop DOMContentLoaded (Vite's client is a module script). So the case does not
  // wait for it: the locators wait until the page has the element.
  await page.goto(url, { waitUntil: "commit" });
  return () => {
    expect(heldScripts, "the page's scripts are held").toBeGreaterThan(0);
    release();
  };
}

const positionField = (page: Page) => page.getByLabel("Position, in the notation");

test.describe("Hedge School", () => {
  // Its editor shows the field only once the engine has drawn the position: no key reaches it before the page's code
  // runs. If the field comes into the prerendered page, this case fails: the editor must then read the typed text, as
  // Cyanotype's does.
  test("the editor shows no position field before its code runs", async ({ page }) => {
    const release = await openHeld(page, "/editor");
    await expect(page.getByText("Setting up the board with the engine's rules…")).toBeVisible();
    await expect(positionField(page)).toHaveCount(0);
    release();
    await expect(positionField(page)).toBeVisible({ timeout: 120_000 });
  });
});

test.describe("Cyanotype", () => {
  const fixtures = JSON.parse(readFileSync("../cyanotype/src/lib/board/fixtures.json", "utf8")).fixtures as
    { name: string; position: SitePosition }[];
  const position = (name: string) => writePosition(fixtures.find(f => f.name === name)!.position);
  const MIDDLE = position("A middle game"), CAPTURE = position("A capture"); // after 9 moves, and after 10
  const status = (page: Page) => page.getByRole("status").filter({ hasText: "position" });

  /** Opens the editor at `path` with its scripts held, types `text` in the position field and presses Enter, then
   *  lets the scripts run. */
  async function typeEarly(page: Page, path: string, text: string) {
    const release = await openHeld(page, new URL(path, CYANOTYPE).href);
    await positionField(page).fill(text);
    await positionField(page).press("Enter");
    release();
  }

  test.beforeEach(async ({ page }) => {
    const skip = await noReview(page);
    test.skip(!!skip, skip);
  });

  test("the editor reads a position typed before its code ran, over the one the browser kept", async ({ page }) => {
    await page.addInitScript(([key, kept]) => localStorage.setItem(key, kept), [EDITOR_KEY, CAPTURE]);
    await typeEarly(page, "/editor", MIDDLE);
    await expect(status(page)).toHaveText("A game can reach this position.", { timeout: 120_000 });
    await expect(page.getByLabel("Moves played")).toHaveValue("9");
    await expect(positionField(page)).toHaveValue(MIDDLE);
    expect(await page.evaluate(k => localStorage.getItem(k), EDITOR_KEY)).toBe(MIDDLE);
  });

  test("the editor keeps a text typed before its code ran that is no position, and says why", async ({ page }) => {
    await typeEarly(page, `/editor#${new URLSearchParams({ position: CAPTURE })}`, "not a position");
    const reason = page.getByRole("alert");
    await expect(reason).toHaveText(/^a position has seven fields/, { timeout: 120_000 });
    // The engine loads after the page has read the text, and reads the position that the address brought: the text
    // and its reason stay
    await expect(status(page)).toHaveText("A game can reach this position.", { timeout: 120_000 });
    await expect(page.getByLabel("Moves played")).toHaveValue("10");
    await expect(positionField(page)).toHaveValue("not a position");
    await expect(reason).toHaveText(/^a position has seven fields/);
  });
});
