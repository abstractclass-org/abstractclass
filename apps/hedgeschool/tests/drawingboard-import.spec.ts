// Drawing Board's import page (its design 33, "How a game comes in from strategyjam.org") on its preview
// (DB_BASE_URL), with the review's test game up to turn 20 (drawingboard-review.ts, Stamp Duty against itself), as the
// bookmarklet and the userscript send it. The game leaves the address at once. The engine's rules check the record
// first: a record that they refuse shows why and opens nothing. Else each choice opens its page with the game: the
// review, which keeps it, and the Analysis board at the position that the game's page showed, which asks before the
// game replaces an analysis kept there. An out-of-date tool gets its notice. Each test opens a fresh browser context,
// so its store starts empty. The tests that need the engine skip, with a message, when the preview has no engine files.
// Run: npx playwright test tests/drawingboard-import.spec.ts, with DB_BASE_URL.
import { expect, test, type Page } from "@playwright/test";
import { parseRecord } from "../../drawingboard/src/lib/game/record.ts";
import { BOARD_AT_KEY, REVIEW_GAME_KEY } from "../../drawingboard/src/lib/site.ts";
import { DRAWING_BOARD, MOVES, REFUSED, noReview, testRecord, toolLink } from "./drawingboard-review.ts";

const PLAYERS = "Stamp Duty, 4 visits against Stamp Duty, 64 visits";
/** The moves of a record up to `at`, as the board keeps the position on screen (its path's key). */
const boardAt = (at?: number, record = testRecord()) => parseRecord(record).moves.slice(0, at).join(" ");
const local = (page: Page, key: string) => page.evaluate(k => localStorage.getItem(k), key);
/** The page's address has no game: the import page takes it out at once. */
const noHash = (page: Page) => expect.poll(() => new URL(page.url()).hash).toBe("");
/** A tool's game on the Analysis board: the choice once the engine has checked the record, then the board. */
async function analyze(page: Page, link: string) {
  await page.goto(link);
  await page.getByRole("button", { name: "Analyze on the board" }).click({ timeout: 120_000 });
  await page.waitForURL(url => url.pathname === "/analysis" && !url.hash, { timeout: 60_000 });
}

test.describe("with the engine's files", () => {
  test.beforeEach(async ({ page }) => {
    const skip = await noReview(page);
    test.skip(!!skip, skip);
  });

  test("Review the game: the game leaves the address, the engine checks it, and the review keeps it", async ({ page }) => {
    await page.goto(toolLink({ at: 5 }));
    await noHash(page);
    await expect(page.getByRole("heading", { name: "A game from strategyjam.org" })).toBeVisible();
    await expect(page.getByText(PLAYERS)).toBeVisible();
    await expect(page.getByText(`${MOVES} moves`)).toBeVisible();
    await expect(page.getByText("Move 5 is the second move of turn 3 in the record.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Review the game" })).toBeVisible({ timeout: 120_000 });
    // The game's lines stay when the choice comes after the check
    await expect(page.getByText("Move 5 is the second move of turn 3 in the record.")).toBeVisible();
    await page.getByRole("button", { name: "Review the game" }).click();
    await page.waitForURL(url => url.pathname === "/review" && !url.hash, { timeout: 60_000 });
    await expect.poll(() => local(page, REVIEW_GAME_KEY), { timeout: 60_000 }).toMatch(new RegExp(`^review-${MOVES}-`));
    await expect(page.getByText("This browser has no game to review.")).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  for (const [name, at, text] of [
    ["the position that the game's page showed", 5, "The Analysis board shows the position that you saw on strategyjam.org."],
    ["the game's end, for a tool that sends no position", undefined, "The Analysis board shows the position after the last move of the game."],
  ] as const)
    test(`Analyze on the board: the game's moves as the main line, at ${name}`, async ({ page }) => {
      await page.goto(toolLink({ at }));
      await noHash(page);
      await expect(page.getByText(text)).toBeVisible({ timeout: 120_000 });
      await page.getByRole("button", { name: "Analyze on the board" }).click();
      await page.waitForURL(url => url.pathname === "/analysis" && !url.hash, { timeout: 60_000 });
      // The position on screen, which the board keeps for the next visit, is the page's
      await expect.poll(() => local(page, BOARD_AT_KEY), { timeout: 120_000 }).toBe(boardAt(at));
      await expect(page.getByRole("alert")).toHaveCount(0);
    });

  test("Analyze on the board over a kept analysis: the board asks first, and keeps it or replaces it", async ({ page }) => {
    test.setTimeout(5 * 60_000); // three imports, each checked by the engine
    // The player's analysis: another game, the test game's first three turns
    const own = REFUSED.replace("2@1,-5x", "2@1,-5");
    await analyze(page, toolLink({ record: own }));
    await expect.poll(() => local(page, BOARD_AT_KEY), { timeout: 120_000 }).toBe(boardAt(undefined, own));
    const question = page.getByRole("dialog", { name: "Replace your analysis?" });
    const mainLine = page.locator(".movelist button[data-path]");
    // "Keep mine": the board kept here opens, with its moves, at its kept place
    await analyze(page, toolLink({ at: 9 }));
    await expect(question).toBeVisible({ timeout: 120_000 });
    await page.getByRole("button", { name: "Keep mine" }).click();
    await expect(question).toHaveCount(0);
    await expect(mainLine).toHaveCount(parseRecord(own).moves.length, { timeout: 120_000 });
    expect(await local(page, BOARD_AT_KEY)).toBe(boardAt(undefined, own));
    // "Replace it": the game's board opens at the position that the game's page showed
    await analyze(page, toolLink({ at: 9 }));
    await expect(question).toBeVisible({ timeout: 120_000 });
    await page.getByRole("button", { name: "Replace it" }).click();
    await expect(mainLine).toHaveCount(MOVES, { timeout: 120_000 });
    await expect.poll(() => local(page, BOARD_AT_KEY), { timeout: 120_000 }).toBe(boardAt(9));
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  test("a record that the engine refuses: the page says why, and opens nothing", async ({ page }) => {
    await page.goto(toolLink({ at: 2, record: REFUSED }));
    await noHash(page);
    await expect(page.getByRole("alert")).toHaveText("Drawing Board cannot open this game: Move 5 (2@1,-5x) has the mark x, "
                                                     + "but the move captures no opponent cells.", { timeout: 120_000 });
    for (const name of ["Review the game", "Analyze on the board"]) await expect(page.getByRole("button", { name })).toHaveCount(0);
    await expect(page).toHaveURL(url => url.pathname === "/import");
    expect(await local(page, REVIEW_GAME_KEY)).toBeNull();
    expect(await local(page, BOARD_AT_KEY)).toBeNull();
  });

  for (const [tool, v, notice] of [["userscript", "old", "Your userscript is older than the userscript on this site."],
                                   ["bookmarklet", "0", "Your bookmarklet is an old version."]] as const)
    test(`an out-of-date ${tool}: the notice says how to update it, over the choice`, async ({ page }) => {
      await page.goto(toolLink({ tool, v, at: 5 }));
      await expect(page.getByRole("status").filter({ hasText: notice })).toBeVisible();
      await expect(page.getByRole("button", { name: "Review the game" })).toBeVisible({ timeout: 120_000 });
      // The notice stays when the choice comes after the check
      await expect(page.getByRole("status").filter({ hasText: notice })).toBeVisible();
    });
});

// The preview alone: no engine is needed to go to the tools
test("the import page alone goes to the tools", async ({ page }) => {
  test.skip(!DRAWING_BOARD, "DB_BASE_URL gives no Drawing Board preview");
  await page.goto(new URL("/import", DRAWING_BOARD).href);
  await page.waitForURL(url => url.pathname === "/tools");
});
