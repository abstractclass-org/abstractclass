// The book in the review (design 32, item 4; journey 1, A1): the Report's opening row and trap rows, and the move list's
// mark on each book move, on reviewed games through the test book (scripts/test-fixture.mjs). A click on a row goes to
// the position before the move that the row names, a click on a mark to the position before its move, and each shows
// the book's table there, for this review only. Outside the book the column shows the candidates alone. A book that
// does not load shows neither.
// The engine is off, so that nothing searches. The test book is served by the dev and preview servers only, and the
// review shows the book in the early edition only: elsewhere the test is skipped.
import { test, expect, type Locator, type Page } from "@playwright/test";
import { loadReviewFile } from "./review-file.ts";

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
  await loadReviewFile(page, `tests/fixtures/${fixture}`);
  await page.getByText("Accuracy").first().waitFor({ timeout: 60_000 });
}

/** The review's display settings that the browser keeps (review/display.ts), and `display` sets before the page loads. */
const DISPLAY_KEY = "learn-enclosure:review-display:1";
const display = (page: Page, d: Record<string, string>) =>
  page.addInitScript(([k, v]) => localStorage.setItem(k, v), [DISPLAY_KEY, JSON.stringify(d)]);
/** The move list's book moves' marks (their title and name: "Book move · Best: +0.6% · +2.0 · Lead: Blue +14.9 · Equal
 *  position after it"). */
const bookMarks = (page: Page) => page.getByRole("img", { name: /^Book move · / });
/** The move on screen in the move list, or null at the start. */
const here = async (page: Page) => ((await page.locator(".mv.here").count()) ? (await page.locator(".mv.here").innerText()).trim() : null);
const row = (page: Page, text: string | RegExp) => page.getByRole("button", { name: text });
/** A quality label's badge, which shows no word: its word is its name. */
const LABEL_WORDS = /^(Best|Great|Excellent|Good|Inaccuracy|Mistake|Blunder)$/;
/** A position symbol's name (symbols.ts, SYMBOL_NAME). */
const SYMBOL_WORDS = /^(Equal position|Unclear position|(Blue|Red) is (slightly better|better|winning))$/;
/** The book's table. */
const table = (page: Page) => page.getByRole("region", { name: "Opening book" });
/** "Review by" edge, before the page loads: the book's table and the opening row judge each edge. By turn, the
 *  default, they judge whole turns. */
const byEdge = (page: Page) =>
  page.addInitScript(() => localStorage.setItem("learn-enclosure:review-display:1", JSON.stringify({ judge: "edge" })));

/** The opening row of book-left-review.json, by edge and by turn: O11-Q10 with the book's label. */
const LEFT_BY_EDGE = "The game left the book at turn 3: Blue, D9-G11, Blunder. Before that, at turn 2, Red played O11-Q10, "
  + "a book move and an Inaccuracy. Show the position";
const LEFT_BY_TURN = "The game left the book at turn 3: Blue, D9-G11 D10-G9, Blunder. Before that, at turn 2, Red played "
  + "N11-Q10 O11-Q10, a book turn and an Inaccuracy. Show the position";

test.describe("desktop", () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test("a game that leaves the book after a book move worse than Good: the row names it, and the clicks", async ({ page }) => {
    await byEdge(page);
    await open(page, "book-left-review.json");
    const opening = row(page, LEFT_BY_EDGE);
    await expect(opening).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Traps", { exact: true })).toHaveCount(0);
    await opening.click();
    expect(await here(page)).toMatch(/^O11-Q10/);
    await page.keyboard.press("ArrowRight");
    expect(await here(page)).toMatch(/^D9-G11/);
  });

  test("a row's click shows the book for this review, and keeps no choice", async ({ page }) => {
    await byEdge(page);
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
    // The rows show their quality labels' badges and their line ends' position symbols with no words, each symbol in a
    // shade of its side's colour by its strength. The title row keeps the symbol's words.
    const rows = table(page).locator("tbody");
    await expect(rows.getByRole("img", { name: LABEL_WORDS }).first()).toBeVisible();
    await expect(rows.getByText(LABEL_WORDS)).toHaveCount(0);
    await expect(rows.getByRole("img", { name: SYMBOL_WORDS }).first()).toBeVisible();
    await expect(rows.getByText(SYMBOL_WORDS)).toHaveCount(0);
    expect(await rows.getByRole("img", { name: /^(Blue|Red) is / }).count()).toBeGreaterThan(0);
    // Each symbol's colour against its token's ("Red is slightly better": --red-slightly-better, = and ∞ the text's):
    // those that differ
    expect(await rows.getByRole("img", { name: SYMBOL_WORDS }).evaluateAll(all => all.flatMap(e => {
      const name = e.getAttribute("aria-label")!, side = /^(Blue|Red) is (.+)$/.exec(name);
      const probe = document.body.appendChild(document.createElement("span"));
      probe.style.color = side ? `var(--${side[1].toLowerCase()}-${side[2].replace(" ", "-")})` : "var(--text)";
      const want = getComputedStyle(probe).color, got = getComputedStyle(e).color;
      probe.remove();
      return got === want ? [] : [`${name}: ${got}, not ${want}`];
    }))).toEqual([]);
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

  test("the opening row gives the edge's own quality label: none for the player that Review for leaves out", async ({ page }) => {
    await display(page, { reviewFor: "red", judge: "edge" });
    await open(page, "book-left-review.json");
    await expect(row(page, "The game left the book at turn 3: Blue, D9-G11. Before that, at turn 2, Red played O11-Q10, a book "
      + "move and an Inaccuracy. Show the position")).toBeVisible({ timeout: 30_000 });
  });

  // In book-turn-label-review.json, Red leaves the book with N8-Q10, an Inaccuracy edge (the book's value before it,
  // the search's after it), and ends its turn with N9-Q10: the turn as a whole is a Blunder
  for (const [judge, text] of [["edge", "N8-Q10, Inaccuracy"], ["turn", "N8-Q10 N9-Q10, Blunder"]]) {
    test(`the opening row gives the label of the move that left the book: by ${judge}, its ${judge}'s`, async ({ page }) => {
      await display(page, { judge });
      await open(page, "book-turn-label-review.json");
      await expect(row(page, `The game left the book at turn 2: Red, ${text}. Show the position`))
        .toBeVisible({ timeout: 30_000 });
    });
  }

  test("a game that follows the book to its end", async ({ page }) => {
    await open(page, "hedgefund-review.json");
    await expect(row(page, "The game followed the book to its end, at turn 3. Blue is slightly better. Show the position"))
      .toBeVisible({ timeout: 30_000 });
  });

  test("a game not in the book from the first move, which comes back to it by another move order", async ({ page }) => {
    await open(page, "book-never-review.json");
    const opening = row(page, "The game was not in the book from the first move. Show the position");
    await expect(opening).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("End");
    await opening.click();
    expect(await here(page)).toBeNull();
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
    await expect(bookMarks(page)).toHaveCount(0);
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

// The move list's mark on each book move (design 32, item 4), in the quality label's slot whatever the label: by edge on
// each book move, by turn on each turn of book moves only. In book-left-review.json, Blue's A10-D9 and Red's N11-Q10
// O11-Q10 are book moves, and Blue's D9-G11 leaves the book. Each display setting's form, as a badge and as a mark
// alone: the label on the book's brown (the default), or an open book in the label's colour.
test.describe("book moves in the move list", () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  const TOKEN = "(best|great|excellent|good|inaccuracy|mistake|blunder)";
  /** A mark's title and name: its move's tooltip (by turn, its turn's), between "Book move" and the position symbol's
   *  words after its move. */
  const named = (tip: string | null, after: string) => `Book move · ${tip} · ${after} after it`;
  const moveOf = (page: Page, move: string) => page.locator(".mv", { hasText: move });
  const markOf = (page: Page, move: string) => moveOf(page, move).getByRole("img", { name: /^Book move · / });
  /** Its title and name are the tooltip that the mark covers: its move's, or its turn's label cell's. */
  async function namedAfter(mark: Locator, after: string) {
    const name = named(await mark.locator("xpath=ancestor::*[@title][1]").getAttribute("title"), after);
    await expect(mark).toHaveAccessibleName(name);
    await expect(mark).toHaveAttribute("title", name);
  }
  const BOOK_PATH = 'path[d^="M12 7v13"]'; // the open book, from its spine (Icon.svelte, BOOK_PATH)

  test("by edge: a mark on each book move, with the move's tooltip, and a click goes to the position before it", async ({ page }) => {
    await display(page, { judge: "edge" });
    await open(page, "book-left-review.json");
    await expect(bookMarks(page)).toHaveCount(3, { timeout: 30_000 });
    // The move's own tooltip, with its numbers: the book's values before and after it
    await expect(markOf(page, "A10-D9")).toHaveAccessibleName("Book move · Best: 0.0% · 0.0 · Lead: Blue +2.0 · Equal position after it");
    await expect(moveOf(page, "A10-D9")).toHaveAttribute("title", "Best: 0.0% · 0.0 · Lead: Blue +2.0");
    await namedAfter(markOf(page, "A10-D9"), "Equal position");
    await namedAfter(markOf(page, "N11-Q10"), "Equal position");
    await namedAfter(markOf(page, "O11-Q10"), "Blue is better");
    await expect(markOf(page, "D9-G11")).toHaveCount(0);
    await markOf(page, "O11-Q10").click();
    expect(await here(page)).toMatch(/^N11-Q10/);
    await expect(table(page)).toBeVisible();
    // A click on the move itself still goes to the position after it
    await moveOf(page, "O11-Q10").getByText("O11-Q10").click();
    expect(await here(page)).toMatch(/^O11-Q10/);
  });

  test("by turn: a mark on each turn of book moves only, with the turn's tooltip, and a click goes to the position before the turn", async ({ page }) => {
    await open(page, "book-left-review.json");
    await expect(bookMarks(page)).toHaveCount(2, { timeout: 30_000 });
    // The turn's tooltip, and the position after its end, O11-Q10
    await expect(bookMarks(page).nth(1)).toHaveAccessibleName("Book move · Inaccuracy: −7.7% · −17.9 (0.0, −17.9) · Blue is better after it");
    await namedAfter(bookMarks(page).nth(0), "Equal position");
    await namedAfter(bookMarks(page).nth(1), "Blue is better");
    await page.keyboard.press("End");
    await bookMarks(page).nth(1).click();
    expect(await here(page)).toMatch(/^A10-D9/);
    await expect(table(page)).toBeVisible();
  });

  // The review takes a book position's values from the book (design 32, "A book position's values"): O11-Q10 has the
  // book's label and loss, an Inaccuracy and 7.7% (by turn, N11-Q10 O11-Q10), in the Report's opening row, in the
  // move list, on its book mark and in the book's table.
  test("by edge: O11-Q10 has one label and one loss, the book's, in the opening row, the move list, its mark and the table", async ({ page }) => {
    await display(page, { judge: "edge" });
    await open(page, "book-left-review.json");
    await expect(row(page, LEFT_BY_EDGE)).toBeVisible({ timeout: 30_000 });
    await expect(moveOf(page, "O11-Q10")).toHaveAttribute("title", "Inaccuracy: −7.7% · −17.9 · Lead: Blue +19.9");
    await expect(markOf(page, "O11-Q10"))
      .toHaveAccessibleName("Book move · Inaccuracy: −7.7% · −17.9 · Lead: Blue +19.9 · Blue is better after it");
    await markOf(page, "O11-Q10").click(); // the position before it, with the book's table
    await expect(table(page).locator('tbody tr[data-move="O11-Q10"]').getByRole("img", { name: LABEL_WORDS }))
      .toHaveAccessibleName("Inaccuracy");
  });

  test("by turn: N11-Q10 O11-Q10 has one label and one loss, the book's, in the opening row, the move list, its mark and the table", async ({ page }) => {
    await open(page, "book-left-review.json");
    await expect(row(page, LEFT_BY_TURN)).toBeVisible({ timeout: 30_000 });
    const mark = bookMarks(page).nth(1);
    await expect(mark).toHaveAccessibleName("Book move · Inaccuracy: −7.7% · −17.9 (0.0, −17.9) · Blue is better after it");
    await namedAfter(mark, "Blue is better"); // the turn's label cell gives the same label and loss
    await page.keyboard.press("End");
    await mark.click(); // the turn's start, with the book's whole turns
    await table(page).getByRole("button", { name: /^Show \d+ more turns$/ }).click();
    await expect(table(page).locator('tbody tr[data-move="N11-Q10 O11-Q10"]').getByRole("img", { name: LABEL_WORDS }))
      .toHaveAccessibleName("Inaccuracy");
  });

  // Each form's drawing: the badge's disc and what it holds, or the mark alone's colour and what it is
  const FORMS: [string, Record<string, string>, (mark: Locator) => Promise<void>][] = [
    ["the label on the brown, as a badge (the default)", {}, async mark => {
      await expect(mark.locator("circle")).toHaveAttribute("fill", "var(--book)");
      // The token: #a4835e in the light theme
      expect(await mark.locator("circle").evaluate(c => getComputedStyle(c).fill)).toBe("rgb(164, 131, 94)");
      await expect(mark.locator(BOOK_PATH)).toHaveCount(0);
    }],
    ["the book in the label's colour, as a badge", { bookMoves: "book" }, async mark => {
      await expect(mark.locator("circle")).toHaveAttribute("fill", new RegExp(`^var\\(--${TOKEN}-fill\\)$`));
      await expect(mark.locator(BOOK_PATH)).toHaveCount(1);
    }],
    ["the label on the brown, as a mark alone", { marks: "text" }, async mark => {
      await expect(mark.locator("circle")).toHaveCount(0);
      await expect(mark.locator("span")).toHaveAttribute("style", /color: var\(--book\)/);
    }],
    ["the book in the label's colour, as a mark alone", { marks: "text", bookMoves: "book" }, async mark => {
      await expect(mark.locator("circle")).toHaveCount(0);
      await expect(mark.locator("span")).toHaveAttribute("style", new RegExp(`color: var\\(--${TOKEN}\\)`));
      await expect(mark.locator(BOOK_PATH)).toHaveCount(1);
    }],
  ];
  for (const [name, form, check] of FORMS) {
    for (const judge of ["edge", "turn"]) {
      test(`${name}, by ${judge}`, async ({ page }) => {
        await display(page, { ...form, judge });
        await open(page, "book-left-review.json");
        await expect(bookMarks(page)).toHaveCount(judge === "edge" ? 3 : 2, { timeout: 30_000 });
        for (const mark of await bookMarks(page).all()) await check(mark);
      });
    }
  }

  test("the display setting changes the form, and the browser keeps it", async ({ page }) => {
    await open(page, "book-left-review.json");
    await expect(bookMarks(page)).toHaveCount(2, { timeout: 30_000 });
    await page.getByRole("button", { name: "Display settings" }).click();
    const choice = page.getByRole("region", { name: "Display settings" }).getByRole("radiogroup", { name: "Book moves" });
    await expect(choice.getByRole("radio", { name: "Brown" })).toHaveAttribute("aria-checked", "true");
    await choice.getByRole("radio", { name: "Book" }).click();
    await page.getByRole("button", { name: "Done" }).click(); // the settings take the move list's place
    await expect(bookMarks(page).first().locator(BOOK_PATH)).toHaveCount(1);
    await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? "{}").bookMoves, DISPLAY_KEY))
      .toBe("book");
  });
});

// "Review by" turn, the default (design 32, item 3, "One edge at a time"): at a turn's start the table's rows are whole
// turns, one a position that they reach, and the Report's opening row names whole turns. After Blue's first edge
// A10-D9, Red's turn 2 has 19 whole turns in the book (8 fine, 11 others) and a best turn outside the book.
/** Turns the table to the book, and goes to the position after the game's first edge, turn 2's start. */
async function turnTwo(page: Page) {
  await page.getByRole("group", { name: "The table shows" }).getByRole("button", { name: "Book" }).click();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  expect(await here(page)).toMatch(/^A10-D9/);
}
/** The table's rows that name moves, not the group titles, the refutations or "Show more". */
const moveRows = (page: Page) => table(page).locator("tbody tr[data-move]");

test.describe("by turn", () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test("the opening row names whole turns, and goes to the turn's start, where two orders are one row", async ({ page }) => {
    await open(page, "book-left-review.json");
    const opening = row(page, LEFT_BY_TURN);
    await expect(opening).toBeVisible({ timeout: 30_000 });
    await opening.click();
    expect(await here(page)).toMatch(/^O11-Q10/);
    await expect(table(page).getByRole("columnheader")).toHaveText(["#", "Turn", /^Blue wins$/, "Line ends"]);
    await expect(table(page).getByRole("rowheader", { name: "Fine turns" })).toBeVisible();
    // D9-G10 D10-G9 and D10-G9 D9-G10 reach one position: one row, the book's order, with one label
    await expect(table(page).locator('tbody tr[data-move="D9-G10 D10-G9"]')).toHaveCount(1);
    await expect(table(page).locator('tbody tr[data-move="D10-G9 D9-G10"]')).toHaveCount(0);
  });

  test("at a turn's start: whole turns, the best 8 and Show more, and a click plays both edges", async ({ page }) => {
    await open(page, "book-left-review.json");
    await expect(row(page, /^The game left the book/)).toBeVisible({ timeout: 30_000 });
    await turnTwo(page);
    await expect(table(page).getByText(/^Turn 2 · Red to play, edge 1 of 2/)).toBeVisible();
    await expect(table(page).getByRole("columnheader").nth(1)).toHaveText("Turn");
    // The best 8 book turns and the best turn outside the book, each with two edges but the outside one at most
    await expect(moveRows(page)).toHaveCount(9);
    const names = await moveRows(page).evaluateAll(rows => rows.map(r => r.getAttribute("data-move")!));
    expect(names.slice(0, 8).every(n => /^\S+ \S+$/.test(n))).toBe(true);
    await expect(table(page).getByRole("rowheader", { name: "Best turn outside the book" })).toBeVisible();
    await table(page).getByRole("button", { name: "Show 11 more turns" }).click();
    await expect(moveRows(page)).toHaveCount(20);
    await expect(table(page).getByRole("button", { name: /^Show \d+ more turns$/ })).toHaveCount(0);
    // A click on a row plays its two edges: Red's turn ends, and Blue's turn 3 starts
    await moveRows(page).first().click();
    await expect(table(page).getByText(/^Turn 3 · Blue to play, edge 1 of 2/)).toBeVisible();
  });

  test("in a turn's middle the rows are single edges", async ({ page }) => {
    await open(page, "book-left-review.json");
    await expect(row(page, /^The game left the book/)).toBeVisible({ timeout: 30_000 });
    await turnTwo(page);
    await page.keyboard.press("ArrowRight");
    await expect(table(page).getByText(/^Turn 2 · Red to play, edge 2 of 2/)).toBeVisible();
    await expect(table(page).getByRole("columnheader").nth(1)).toHaveText("Edge");
    expect(await moveRows(page).evaluateAll(rows => rows.every(r => !r.getAttribute("data-move")!.includes(" ")))).toBe(true);
  });

  test("by edge, a turn's start has single edges, and no Show more", async ({ page }) => {
    await byEdge(page);
    await open(page, "book-left-review.json");
    await expect(row(page, /^The game left the book at turn 3: Blue, D9-G11(, \w+)?\. /)).toBeVisible({ timeout: 30_000 });
    await turnTwo(page);
    await expect(table(page).getByRole("columnheader").nth(1)).toHaveText("Edge");
    expect(await moveRows(page).evaluateAll(rows => rows.every(r => !r.getAttribute("data-move")!.includes(" ")))).toBe(true);
    await expect(table(page).getByRole("button", { name: /^Show \d+ more turns$/ })).toHaveCount(0);
  });
});

test.describe("by turn on a phone", () => {
  test.use({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });

  for (const unit of ["turn", "edge"]) {
    test(`by ${unit}: each head on one line, the badges line up, and the table stays in its column`, async ({ page }) => {
      if (unit === "edge") await byEdge(page);
      await open(page, "book-left-review.json");
      await expect(row(page, /^The game left the book/)).toBeVisible({ timeout: 30_000 });
      await page.getByRole("tab", { name: "Analysis" }).click();
      await turnTwo(page);
      const badges = table(page).locator("tbody").getByRole("img", { name: LABEL_WORDS });
      await expect(badges.first()).toBeVisible();
      const lefts = await badges.evaluateAll(all => all.map(e => Math.round(e.getBoundingClientRect().left * 10) / 10));
      expect(lefts.length).toBeGreaterThan(2);
      expect(new Set(lefts).size, `the badges' left edges: ${lefts}`).toBe(1);
      // The table fits its box with no sideways scroll, and the box fits the page
      const fit = await table(page).locator("table").evaluate(t => {
        const box = t.parentElement!;
        return { table: t.scrollWidth, box: box.clientWidth, right: box.getBoundingClientRect().right, page: innerWidth };
      });
      expect(fit.table).toBeLessThanOrEqual(fit.box);
      expect(fit.right).toBeLessThanOrEqual(fit.page);
      // Each head's words take one line: by turn, a turn's second edge goes under its first in place
      const lines = await table(page).getByRole("columnheader").evaluateAll(heads => heads.map(h => {
        const range = document.createRange();
        range.selectNodeContents(h);
        return new Set([...range.getClientRects()].map(r => Math.round(r.top))).size;
      }));
      expect(lines).toEqual([1, 1, 1, 1]);
    });
  }
});

// Every book move of the games through the test book has one quality label and one loss, the book's (design 32, "The
// book's values rule a book position"): the move list's tooltip, the move's book mark, the book's table at the
// position before it, and the Report's opening row where it names the move. By turn, each turn of book moves, with the
// table's row of the whole turn. "Review by" changes how the moves are grouped, never what the parts give.
test.describe("one label and one loss on each book move", () => {
  test.use({ viewport: { width: 1366, height: 900 } });
  /** A mark's quality label and loss of win chance in percent: "Book move · Inaccuracy: −7.7% · …" gives 7.7, and
   *  "+0.6%" gives −0.6, a gain. */
  const judged = (name: string) => {
    const [, label, sign, loss] = /^Book move · (\w+): ([+−]?)([\d.]+)%/.exec(name)!;
    return { label, loss: (sign === "+" ? -1 : 1) * Number(loss) };
  };
  /** A book move or turn that the opening row names: its edges and its label. */
  const namedIn = (text: string) =>
    /Before that, at turn \d+, \w+ played ([^,]+), a book (?:move|turn) and an? (\w+)\./.exec(text)
    ?? /The last book (?:move|turn), ([^,]+), is an? (\w+)\./.exec(text);
  const sorted = (edges: string[]) => [...edges].sort().join(" ");

  for (const unit of ["edge", "turn"] as const)
    for (const game of ["book-left-review.json", "hedgefund-review.json", "book-trap-review.json"])
      test(`by ${unit}, ${game}: the move list, the mark, the table and the opening row agree`, async ({ page }) => {
        await display(page, { judge: unit });
        await open(page, game);
        await expect(bookMarks(page).first()).toBeVisible({ timeout: 30_000 });
        const labels = new Map<string, string>(); // each book move's or turn's edges, with its mark's label
        const count = await bookMarks(page).count();
        for (let k = 0; k < count; k++) {
          const mark = bookMarks(page).nth(k), name = (await mark.getAttribute("title"))!, { label, loss } = judged(name);
          // The mark's name holds the tooltip of its move in the move list, or by turn of its turn's label cell
          const tip = await mark.locator("xpath=ancestor::*[@title][1]").getAttribute("title");
          expect(name.startsWith(`Book move · ${tip} · `), `${name} | ${tip}`).toBe(true);
          const moves = unit === "edge" ? mark.locator("xpath=ancestor::button[@data-path][1]")
            : mark.locator("xpath=ancestor::div[.//button[@data-path]][1]").locator("button[data-path]");
          const edges = (await moves.evaluateAll(all => all.map(m => m.getAttribute("data-path")!))).map(p => p.split(" ").at(-1)!);
          labels.set(edges.join(" "), label);
          await page.keyboard.press("End");
          await mark.click(); // the position before the move, or by turn the turn's start, with the book's table
          await expect(table(page)).toBeVisible();
          const more = table(page).getByRole("button", { name: /^Show \d+ more turns$/ });
          if (await more.count()) await more.click();
          const rows = table(page).locator("tbody tr[data-move]");
          const listed = await rows.evaluateAll(all => all.map(r => r.getAttribute("data-move")!));
          const at = listed.findIndex(m => sorted(m.split(" ")) === sorted(edges)); // a turn's row holds both orders
          expect(at, `${edges.join(" ")} in the table: ${listed.join(", ")}`).toBeGreaterThanOrEqual(0);
          await expect(rows.nth(at).getByRole("img", { name: LABEL_WORDS })).toHaveAccessibleName(label);
          // The loss: the table's best win chance for the mover, less the row's, to 0.1% each
          const wins = await rows.evaluateAll(all => all.map(r => Number(/([\d.]+)%/.exec((r as HTMLTableRowElement).cells[2].textContent!)![1])));
          expect(Math.abs(Math.max(...wins) - wins[at] - loss), `${edges.join(" ")}: ${name}, the table ${wins.join(", ")}`)
            .toBeLessThan(0.16);
        }
        const opening = (await row(page, /^The game /).first().textContent())!, named = namedIn(opening);
        if (named) expect(labels.get(named[1]), opening).toBe(named[2]);
      });
});
