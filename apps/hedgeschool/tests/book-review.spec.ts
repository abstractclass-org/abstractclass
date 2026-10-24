// The book in the review (design 32, item 4; journey 1, A1): the Report's opening row and trap rows, and the move list's
// mark at the game's last book move, on reviewed games through the test book (scripts/test-fixture.mjs). A click on a
// row or on the mark goes to the position before the move that the row names. A book that does not load shows neither.
// The engine is off, so that nothing searches. The test book is served by the dev and preview servers only, and the review shows the book in the early
// edition only: elsewhere the test is skipped.
import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  test.setTimeout(120_000);
  const served = await page.request.get("/test-book/prototype/index.json");
  test.skip(!served.ok() || !(served.headers()["content-type"] ?? "").includes("json"), "the site serves no test book");
  // The visitor has answered the consent notice, which covers the page until they choose: a build that stores
  // practice games, as CI's, asks for it. The engine is off.
  await page.addInitScript(() => {
    localStorage.setItem("hedge-school:consent:2", JSON.stringify({ analytics: "denied", games: "denied" }));
    localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false }));
  });
  await page.goto("/review");
  test.skip(!(await page.getByRole("link", { name: "Early Access" }).count()), "not the early edition");
});

/** Loads a reviewed game from its file. The page stores it, then reloads to review it. */
async function open(page: Page, fixture: string) {
  await page.locator('input[type="file"][accept*="json"]').first().setInputFiles(`tests/fixtures/${fixture}`);
  await page.getByText("Accuracy").first().waitFor({ timeout: 60_000 });
}

const marks = (page: Page) => page.getByRole("button", { name: /^Last move in the book: / });
/** The move on screen in the move list, or null at the start. */
const here = async (page: Page) => ((await page.locator(".mv.here").count()) ? (await page.locator(".mv.here").innerText()).trim() : null);
const row = (page: Page, text: string | RegExp) => page.getByRole("button", { name: text });

test.describe("desktop", () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test("a game that leaves the book after a weak book move: the row, the mark, and the clicks", async ({ page }) => {
    await open(page, "book-left-review.json");
    const opening = row(page, /^The game left the book at turn 3: Blue, D9-G11(, \w+)?\. Before that, at turn 2, Red played O11-Q10, a book move and an Inaccuracy\. Show the position$/);
    await expect(opening).toBeVisible({ timeout: 30_000 });
    await expect(marks(page)).toHaveCount(1);
    await expect(page.getByText("Traps", { exact: true })).toHaveCount(0);
    await opening.click();
    expect(await here(page)).toMatch(/^O11-Q10/);
    await page.keyboard.press("ArrowRight");
    expect(await here(page)).toMatch(/^D9-G11/);
    await marks(page).click();
    expect(await here(page)).toMatch(/^O11-Q10/);
  });

  test("a game that follows the book to its end", async ({ page }) => {
    await open(page, "hedgefund-review.json");
    await expect(row(page, "The game followed the book to its end, at turn 3. Blue is slightly better. Show the position"))
      .toBeVisible({ timeout: 30_000 });
    await expect(marks(page)).toHaveCount(1);
    await marks(page).click();
    expect(await here(page)).toMatch(/^D10-G9/);
  });

  test("a game not in the book from the first move, which comes back to it by another move order", async ({ page }) => {
    await open(page, "book-never-review.json");
    const opening = row(page, "The game was not in the book from the first move. Show the position");
    await expect(opening).toBeVisible({ timeout: 30_000 });
    await expect(marks(page)).toHaveCount(1); // the return, at G14-H11
    await page.keyboard.press("End");
    await opening.click();
    expect(await here(page)).toBeNull();
    await marks(page).click();
    expect(await here(page)).toMatch(/^G14-H11/);
  });

  test("a trap and its refutation", async ({ page }) => {
    await open(page, "book-trap-review.json");
    const trap = row(page, "Turn 3: Blue played a trap, G9-K10. Red played its refutation. Show the position");
    await expect(trap).toBeVisible({ timeout: 30_000 });
    await trap.click();
    expect(await here(page)).toMatch(/^K9-N11/);
  });

  test("the book not loaded: no opening row and no mark, and the rest of the review works", async ({ page }) => {
    await page.route("**/test-book/**", route => route.abort());
    const failed = page.waitForEvent("requestfailed", r => r.url().includes("/test-book/"), { timeout: 60_000 });
    await open(page, "book-left-review.json");
    await failed;
    await page.waitForTimeout(500); // the failure reaches the Report
    await expect(page.getByText("Opening", { exact: true })).toHaveCount(0);
    await expect(row(page, /Show the position$/)).toHaveCount(0);
    await expect(marks(page)).toHaveCount(0);
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight");
    expect(await here(page)).toMatch(/^A10-D9/);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });

  test("a tap on the Report's row opens the Analysis tab at the position", async ({ page }) => {
    await open(page, "book-left-review.json");
    const opening = row(page, /^The game left the book at turn 3/);
    await expect(opening).toBeVisible({ timeout: 30_000 });
    await opening.tap();
    await expect(page.getByRole("tab", { name: "Analysis" })).toHaveAttribute("aria-selected", "true");
    expect(await here(page)).toMatch(/^O11-Q10/);
  });
});
