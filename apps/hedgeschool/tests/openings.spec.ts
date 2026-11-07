// Openings (design 32, items 2, 5, 9 and 10; the study journey S1 to S6 where it agrees with design 32) on the test book:
// the header's fourth tab, the first view (the table and the move list's book tree folded around the path, the book's
// win chance above the board, the area map on), a trap and its refutation, a move order's link, a mirror image, the
// way back, "Open in Analysis" and "Study in Openings", at a desktop's and a phone's sizes, and with the keyboard only.
// The engine is off, so that nothing searches, but in one test: at a book position it waits, and "Candidates" starts
// it, on the CPU only.
// The test book is served by the dev and preview servers only, and Openings is in the early edition's builds that they
// serve (edition.ts, OPENINGS): elsewhere the tests are skipped.
import { test, expect, type Page } from "@playwright/test";

const ENGINE_KEY = "learn-enclosure:engine:2", DISPLAY_KEY = "learn-enclosure:review-display:1";
const WAITS = "The engine waits at a book position. To search, select Candidates.";
/** The test book's main line (sentences.ts, mainLine). */
const MAIN = ["A10-D9", "N11-Q10", "L10-N11", "D10-G12", "G12-J15"];

/** The page's settings before it loads: the consent answered, which covers the page until the visitor chooses, the
 *  engine's (off by default) and the display's. */
async function setUp(page: Page, engine: Record<string, unknown> = { on: false }, display: Record<string, unknown> = {}) {
  await page.addInitScript(([e, d, ek, dk]) => {
    localStorage.setItem("hedge-school:consent:2", JSON.stringify({ analytics: "denied", games: "denied" }));
    localStorage.setItem(ek, e);
    localStorage.setItem(dk, d);
  }, [JSON.stringify(engine), JSON.stringify(display), ENGINE_KEY, DISPLAY_KEY]);
}

/** Opens Openings, at an address after its `#` when given, and waits for the move list's main line. */
async function open(page: Page, hash = "") {
  await page.goto(`/openings${hash ? `#${hash}` : ""}`);
  await expect(page.locator("button.mv").first()).toBeVisible({ timeout: 60_000 });
  await expect(moveAt(page, MAIN.join(" "))).toBeVisible({ timeout: 30_000 });
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(180_000);
  const served = await page.request.get("/test-book/prototype/index.json");
  test.skip(!served.ok() || !(served.headers()["content-type"] ?? "").includes("json"), "the site serves no test book");
  await page.goto("/about");
  // The header's tab, in the site's menu on a phone
  test.skip(!(await page.locator('header a[href="/openings"]').count()), "a build without Openings");
});

/** A move's button in the move list by its path from the start. */
const moveAt = (page: Page, path: string) => page.locator(`button.mv[data-path="${path}"]`);
/** The move list's current item: the path of the position on screen. */
const here = (page: Page) => page.locator('button.mv[aria-current="location"]');
const table = (page: Page) => page.getByRole("region", { name: "Opening book" });
/** A fold's chevron button by its words. */
const fold = (page: Page, words: string | RegExp) => page.locator("button[aria-expanded]", { hasText: words });
/** The table's row of a move or a turn, by its edges. */
const row = (page: Page, edges: string) => table(page).locator(`tr[data-move="${edges}"]`);

test.describe("desktop", () => {
  test.use({ viewport: { width: 1400, height: 900 } });

  test("the header's fourth tab and the first view: the table, the folded tree, the book's win chance", async ({ page }) => {
    await setUp(page);
    await open(page);
    // The tabs, Openings after Analysis
    const nav = page.locator("header nav").first();
    await expect(nav.getByRole("link")).toHaveText(["Practice", "Review", "Analysis", "Openings"]);
    // The table, on "Book", with no box of the main line: the move list's main line is the line to learn
    await expect(table(page).getByRole("button", { name: "Book" })).toHaveAttribute("aria-pressed", "true");
    await expect(table(page).getByText("Fine moves")).toBeVisible();
    await expect(page.getByRole("region", { name: "The main line" })).toHaveCount(0);
    // The engine is off, so the engine header does not say that it waits
    await expect(page.getByText(WAITS)).toHaveCount(0);
    // The bar above the board gives the book's win chance, as the table's title row does
    const win = (await table(page).locator("p").first().textContent())?.match(/Blue (\d+\.\d%)/)?.[1];
    expect(win).toBeTruthy();
    const bar = page.locator(`[title="Win chance from the engine's search"]`).first();
    await expect(bar).toContainText(win!);
    await expect(bar).not.toContainText("not analyzed yet");
    // The move list: the main line, and the other book moves folded under each move
    for (let k = 1; k <= MAIN.length; k++) await expect(moveAt(page, MAIN.slice(0, k).join(" "))).toBeVisible();
    const first = fold(page, /book moves? instead of A10-D9$/);
    await expect(first).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("button[aria-expanded]")).not.toHaveCount(0);
    await expect(page.locator('button[aria-expanded="true"]')).toHaveCount(0);
    // At the start, no move is the current item
    await expect(here(page)).toHaveCount(0);
  });

  test("S3 and S5: a fold opens and closes, a book move played opens its line, and the path stays open", async ({ page }) => {
    await setUp(page);
    await open(page);
    const first = fold(page, "2 other book moves instead of A10-D9");
    await first.click();
    await expect(first).toHaveAttribute("aria-expanded", "true");
    await expect(moveAt(page, "D10-G9")).toBeVisible();
    await expect(moveAt(page, "D10-F9")).toBeVisible();
    await first.click();
    await expect(first).toHaveAttribute("aria-expanded", "false");
    await expect(moveAt(page, "D10-G9")).toHaveCount(0);
    // A book move played from the table: its line to the end of its main line, open while it is the path
    await row(page, "D10-G9").click();
    await expect(here(page)).toHaveAttribute("data-path", "D10-G9");
    await expect(page.locator('button.mv[data-path^="D10-G9 "]')).not.toHaveCount(0);
    await expect(first).toHaveAttribute("aria-expanded", "false");
    // Off the path again, the fold hides it
    await moveAt(page, "A10-D9").click();
    await expect(moveAt(page, "D10-G9")).toHaveCount(0);
  });

  test("S4: a trap and its refutation", async ({ page }) => {
    await setUp(page, { on: false }, { judge: "edge" });
    await open(page, "record=D10-G9");
    await expect(here(page)).toHaveAttribute("data-path", "D10-G9");
    await expect(table(page).getByText("Traps")).toBeVisible();
    const trap = row(page, "Q11-T10");
    await expect(trap).toContainText("a trap");
    await expect(trap).toContainText(/Seems good: Red \d+\.\d%\. Is not: Red \d+\.\d%\./);
    await table(page).getByText(/^Play the refutation: 2\.\.\. N11-Q10 3\. G9-K10 K10-M7$/).click();
    // Edge by edge, at the engine's line's pace
    await expect(here(page)).toHaveAttribute("data-path", "D10-G9 Q11-T10 N11-Q10 G9-K10 K10-M7", { timeout: 10_000 });
  });

  test("S5: a move order's link goes to the canonical line", async ({ page }) => {
    await setUp(page, { on: false }, { judge: "edge" });
    await open(page, "record=A10-D9 O11-Q10");
    await row(page, "N11-Q10").click();
    await expect(here(page)).toHaveAttribute("data-path", "A10-D9 O11-Q10 N11-Q10");
    const link = page.getByRole("button", { name: "Continues in 2. N11-Q10 O11-Q10" });
    await expect(link).toBeVisible();
    await link.click();
    await expect(here(page)).toHaveAttribute("data-path", "A10-D9 N11-Q10 O11-Q10");
  });

  test("a record with a komi: its line opens, and a line says that the book is at komi 0 (design 24)", async ({ page }) => {
    const KOMI_NOTE = "The opening book is at komi 0. Openings does not use the komi of this record.";
    await setUp(page, { on: false }, { judge: "edge" });
    await open(page, new URLSearchParams({ record: '[Komi "-300"]\n\n1. A10-D9 2. N11-Q10 *' }).toString());
    await expect(here(page)).toHaveAttribute("data-path", "A10-D9 N11-Q10");
    await expect(page.getByRole("status").filter({ hasText: KOMI_NOTE })).toBeVisible();
    // A record at komi 0 has no such line. The page first: an address that differs only after its `#` would not load
    await page.goto("/about");
    await open(page, "record=A10-D9 N11-Q10");
    await expect(here(page)).toHaveAttribute("data-path", "A10-D9 N11-Q10");
    await expect(page.getByText(KOMI_NOTE)).toHaveCount(0);
  });

  test("a mirror image: the book's moves in the player's orientation", async ({ page }) => {
    await setUp(page, { on: false }, { judge: "edge" });
    // A10-D11 is the mirror image of the book's A10-D9: the book's line after it comes mirrored
    await open(page, "record=A10-D11");
    await expect(here(page)).toHaveAttribute("data-path", "A10-D11");
    await expect(moveAt(page, "A10-D11 N9-Q10 L10-N9 D10-G8 G8-J5")).toBeVisible();
    await expect(table(page).locator("tbody tr[data-move]").first()).toHaveAttribute("data-move", "N9-Q10");
    // The path's own edges count: the mirror image left the main line at its first edge
    await page.getByRole("button", { name: "Back to the main line" }).click();
    await expect(here(page)).toHaveCount(0);
  });

  test("S5: the way back: Back to the main line goes where the path left it; a move of the path, the first step", async ({ page }) => {
    await setUp(page);
    await open(page, "record=A10-D9 O11-Q10 N11-Q10");
    await expect(here(page)).toHaveAttribute("data-path", "A10-D9 O11-Q10 N11-Q10");
    // A move of the path
    await moveAt(page, "A10-D9 O11-Q10").click();
    await expect(here(page)).toHaveAttribute("data-path", "A10-D9 O11-Q10");
    await moveAt(page, "A10-D9 O11-Q10 N11-Q10").click();
    // Back to the main line: where the path left it, and the fold that held the path closes again
    const back = page.getByRole("button", { name: "Back to the main line" });
    await back.click();
    await expect(here(page)).toHaveAttribute("data-path", "A10-D9");
    await expect(back).toBeDisabled();
    await expect(moveAt(page, "A10-D9 O11-Q10")).toHaveCount(0);
    // The first step
    await page.getByRole("button", { name: "First" }).click();
    await expect(here(page)).toHaveCount(0);
    // A line that leaves the main line at its first move goes back to the start, and its fold closes again
    await row(page, "D10-G9").click();
    await expect(here(page)).toHaveAttribute("data-path", "D10-G9");
    await back.click();
    await expect(here(page)).toHaveCount(0);
    await expect(moveAt(page, "D10-G9")).toHaveCount(0);
  });

  test("the main line ends where the book's main line ends: a move played after it is a variation", async ({ page }) => {
    await setUp(page);
    await open(page, `record=${MAIN.join(" ")}`);
    await expect(here(page)).toHaveAttribute("data-path", MAIN.join(" "));
    // The end of the book: its row is the best move outside the book
    await table(page).locator("tbody tr[data-move]").first().click();
    await expect(here(page)).toHaveAttribute("data-path", new RegExp(`^${MAIN.join(" ")} \\S+$`));
    const back = page.getByRole("button", { name: "Back to the main line" });
    await expect(back).toBeEnabled();
    await back.click();
    await expect(here(page)).toHaveAttribute("data-path", MAIN.join(" "));
  });

  test("the area map is on at each visit, whatever the Analysis board keeps", async ({ page }) => {
    await setUp(page, { on: false }, { areaMap: { review: false, board: false } });
    await open(page);
    const off = page.getByRole("radio", { name: "Area map off" });
    await expect(off).toHaveAttribute("aria-checked", "false");
    // Openings' map stays apart: the Analysis board's choice does not change
    await off.click();
    await expect(off).toHaveAttribute("aria-checked", "true");
    await page.getByRole("radio", { name: "Forecast", exact: true }).click();
    await expect(off).toHaveAttribute("aria-checked", "false");
    const kept = await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? "{}"), DISPLAY_KEY);
    expect(kept.areaMap?.board).toBe(false);
  });

  test("Open in Analysis, then Study in Openings from the Analysis board", async ({ page }) => {
    await setUp(page);
    await open(page, "record=A10-D9 N11-Q10");
    await page.getByRole("link", { name: "Open in Analysis" }).click();
    await page.waitForURL(/\/analysis$/);
    await expect(here(page)).toHaveAttribute("data-path", "A10-D9 N11-Q10", { timeout: 60_000 });
    // The book's table on the Analysis board, turned on, has "Study in Openings"
    await table(page).getByRole("button", { name: "Book" }).click();
    await page.getByRole("link", { name: "Study in Openings" }).click();
    await page.waitForURL(/\/openings$/);
    await expect(here(page)).toHaveAttribute("data-path", "A10-D9 N11-Q10", { timeout: 60_000 });
  });

  test("with the keyboard only", async ({ page }) => {
    await setUp(page);
    await open(page);
    // The arrow keys step
    await page.keyboard.press("ArrowRight");
    await expect(here(page)).toHaveAttribute("data-path", "A10-D9");
    await page.keyboard.press("ArrowLeft");
    await expect(here(page)).toHaveCount(0);
    /** Presses Tab until the focus is on an element that matches `is`, at most 80 times. */
    const tabTo = async (is: string) => {
      for (let k = 0; k < 80; k++) {
        await page.keyboard.press("Tab");
        if (await page.evaluate(sel => !!document.activeElement?.matches(sel), is)) return;
      }
      throw new Error(`Tab never reached ${is}`);
    };
    // Tab into the table: the down key moves to the second row, Enter plays it
    await tabTo('[aria-label="Opening book"] tr[data-item]');
    await page.keyboard.press("ArrowDown");
    await expect(page.locator('[aria-label="Opening book"] tr[data-item]:focus')).toHaveAttribute("data-move", "D10-G9");
    await page.keyboard.press("Enter");
    await expect(here(page)).toHaveAttribute("data-path", "D10-G9");
    // Escape gives the keys back to the page
    await page.keyboard.press("Escape");
    await page.keyboard.press("ArrowLeft");
    await expect(here(page)).toHaveCount(0);
    // A fold opens with Enter, and says so
    await tabTo("button[aria-expanded]");
    await expect(page.locator("button[aria-expanded]:focus")).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Enter");
    await expect(page.locator("button[aria-expanded]:focus")).toHaveAttribute("aria-expanded", "true");
  });

  test("the live engine waits at a book position, and Candidates starts it (CPU)", async ({ page }) => {
    await setUp(page, { on: true, gpu: "off", workers: 1 });
    await open(page);
    await expect(page.getByText("The engine waits at a book position. To search, select Candidates.")).toBeVisible();
    await expect(page.getByText(/ visits/)).toHaveCount(0);
    await table(page).getByRole("button", { name: "Candidates" }).click();
    await expect(page.getByText(/^[\d,]+( of [\d,]+)? visits/).first()).toBeVisible({ timeout: 120_000 });
    // Back on "Book" it waits again at a book position that it has not searched
    await table(page).getByRole("button", { name: "Book" }).click();
    await row(page, "A10-D9").click();
    await expect(here(page)).toHaveAttribute("data-path", "A10-D9");
    await expect(page.getByText(WAITS)).toBeVisible();
    // With the switch off, the header says what it says on the other boards with the engine off
    await page.getByRole("switch", { name: "Engine" }).click();
    await expect(page.getByText(WAITS)).toHaveCount(0);
    await expect(page.getByText("Not analyzed yet", { exact: true }).first()).toBeVisible();
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

  test("the board, the table, the move list, then the step bar at the window's foot; a tap plays a row", async ({ page }) => {
    await setUp(page);
    await open(page);
    const box = async (selector: string) => (await page.locator(selector).first().boundingBox())!;
    const board = await box("svg.board"), book = await box('[aria-label="Opening book"]');
    const list = await box("button.mv"), dock = await box(".step-dock");
    expect(board.y + board.height).toBeLessThanOrEqual(book.y);
    expect(book.y + book.height).toBeLessThanOrEqual(list.y);
    expect(Math.abs(dock.y + dock.height - 740)).toBeLessThanOrEqual(1);
    await row(page, "D10-G9").tap();
    await expect(here(page)).toHaveAttribute("data-path", "D10-G9");
    // The way back is in the bar at the window's foot
    const back = page.getByRole("button", { name: "Back to the main line" });
    await expect(back).toBeInViewport();
    await back.tap();
    await expect(here(page)).toHaveCount(0);
  });
});
