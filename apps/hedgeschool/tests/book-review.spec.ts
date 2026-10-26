// The book in the review (design 32, item 4; journey 1, A1): the Report's opening row and trap rows, and the move list's
// mark at the game's last book move, on reviewed games through the test book (scripts/test-fixture.mjs). A click on a
// row or on the mark goes to the position before the move that the row names, and shows the book's table there, for
// this review only. Outside the book the column shows the candidates alone. A book that does not load shows neither.
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
/** A label's badge, which shows no word: its word is its name. */
const LABEL_NAME = /^(Best|Great|Excellent|Good|Inaccuracy|Mistake|Blunder)$/;
/** A position symbol's name (symbols.ts, SYMBOL_NAME). */
const SYMBOL_NAME = /^(Equal position|Unclear position|(Blue|Red) is (slightly better|better|winning))$/;
/** The book's table. */
const table = (page: Page) => page.getByRole("region", { name: "Opening book" });

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

  test("a row's click shows the book for this review, and keeps no choice", async ({ page }) => {
    await open(page, "book-left-review.json");
    const opening = row(page, /^The game left the book at turn 3/);
    await expect(opening).toBeVisible({ timeout: 30_000 });
    const book = page.getByRole("group", { name: "The table shows" }).getByRole("button", { name: "Book" });
    await expect(book).toHaveAttribute("aria-pressed", "false");
    await opening.click();
    await expect(book).toHaveAttribute("aria-pressed", "true");
    // No row for the game's move, and no line about the book's source
    await expect(table(page).getByText(/your game|In your review/i)).toHaveCount(0);
    await expect(page.getByText(/not from games that people played/)).toHaveCount(0);
    // The rows show their labels' badges and their line ends' symbols with no words, each symbol in a shade of its
    // side's colour by its strength. The title row keeps the symbol's words.
    const rows = table(page).locator("tbody");
    await expect(rows.getByRole("img", { name: LABEL_NAME }).first()).toBeVisible();
    await expect(rows.getByText(LABEL_NAME)).toHaveCount(0);
    await expect(rows.getByRole("img", { name: SYMBOL_NAME }).first()).toBeVisible();
    await expect(rows.getByText(SYMBOL_NAME)).toHaveCount(0);
    const color = (css: string) => page.evaluate(c => {
      const probe = document.body.appendChild(document.createElement("span"));
      probe.style.color = c;
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    }, css);
    const SHADE: Record<string, string> = { "slightly better": "slightly-better", better: "better", winning: "winning" };
    const symbols = rows.getByRole("img", { name: /^(Blue|Red) is / });
    expect(await symbols.count()).toBeGreaterThan(0);
    for (const symbol of await symbols.all()) {
      const [, side, strength] = /^(Blue|Red) is (.+)$/.exec((await symbol.getAttribute("aria-label"))!)!;
      expect(await symbol.evaluate(e => getComputedStyle(e).color))
        .toBe(await color(`var(--${side.toLowerCase()}-${SHADE[strength]})`));
    }
    // A book move's win chance shows alone, and its bounds are its title
    const chance = rows.locator("td.tabular-nums > span[title]").first();
    await expect(chance).toHaveAttribute("title", /^Between \d+\.\d% and \d+\.\d%\.$/);
    // Its text on screen: the bounds' words for assistive technology are in a child of their own
    expect(await chance.evaluate(e => [...e.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join("").trim()))
      .toMatch(/^\d+\.\d%$/);
    await expect(table(page).getByRole("columnheader")).toHaveText(["#", "Edge", /^(Blue|Red) wins$/, "Line ends"]);
  });

  test("outside the book, the column shows the candidates alone; the table comes back at a book position", async ({ page }) => {
    await open(page, "book-left-review.json");
    const opening = row(page, /^The game left the book at turn 3/);
    await expect(opening).toBeVisible({ timeout: 30_000 });
    await opening.click();
    await expect(table(page).locator("table")).toBeVisible();
    // D9-G11 leaves the book
    await page.keyboard.press("ArrowRight");
    expect(await here(page)).toMatch(/^D9-G11/);
    await expect(table(page)).toHaveCount(0);
    await expect(page.getByRole("group", { name: "The table shows" })).toHaveCount(0);
    await expect(page.getByText(/Not in the book|Last book position/)).toHaveCount(0);
    await page.keyboard.press("ArrowLeft");
    await expect(table(page).locator("table")).toBeVisible();
  });

  test("the opening row gives the edge's own label: none for the player that Review for leaves out", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("learn-enclosure:review-display:1", JSON.stringify({ reviewFor: "red" })));
    await open(page, "book-left-review.json");
    await expect(row(page, /^The game left the book at turn 3: Blue, D9-G11\. Before that, at turn 2, Red played O11-Q10/))
      .toBeVisible({ timeout: 30_000 });
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
    // The game's move is the trap: its row in the traps' group says so, on a line of its own
    await expect(table(page).getByText("a trap", { exact: true }).first()).toBeVisible();
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
