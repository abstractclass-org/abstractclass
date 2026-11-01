// Drawing Board's import page (its design 33, "How a game comes in from strategyjam.org") on its preview
// (DB_BASE_URL), with the review's test game up to turn 20 (drawingboard-review.ts, Stamp Duty against itself), as the
// bookmarklet and the userscript send it. The game leaves the address at once. The engine's rules check the record
// first: a record that they refuse shows why and opens nothing. Else each choice opens its page with the game: the
// review, which keeps it, and the Analysis board at the position that the game's page showed. An out-of-date tool gets
// its notice. Each test opens a fresh browser context, so its store starts empty. The tests that need the engine skip,
// with a message, when the preview has no engine files. Run: npx playwright test tests/drawingboard-import.spec.ts,
// with DB_BASE_URL.
import { expect, test, type Page } from "@playwright/test";
import { BOOKMARK_VERSION } from "../../../packages/import/src/bookmarklet.ts";
import { DRAWING_BOARD, MOVES, noReview, testRecord } from "./drawingboard-review.ts";

const REVIEW_GAME = "drawing-board:review-game:2", BOARD_AT = "drawing-board:board-at:1"; // apps/drawingboard/src/lib/site.ts
const PLAYERS = "Stamp Duty, 4 visits against Stamp Duty, 64 visits";
/** The test game's moves, as the engine names them: the record's words without the turns' numbers and the marks. */
const moves = () => testRecord().split("\n\n")[1].split(/\s+/).filter(w => w && !/^\d+\.$/.test(w)).map(w => w.replace(/x(\+\d+)?$/, ""));

/** The address that a tool opens: `at` is the position that the game's page showed, when it says. */
function toolLink(more: { tool?: string; v?: string; at?: number; record?: string } = {}): string {
  const { tool = "bookmarklet", v = String(BOOKMARK_VERSION), at, record = testRecord() } = more;
  return new URL("/import#" + new URLSearchParams({ tool, v, site: "strategyjam.org", ...(at === undefined ? {} : { at: String(at) }), record }),
                 DRAWING_BOARD).href;
}
const local = (page: Page, key: string) => page.evaluate(k => localStorage.getItem(k), key);
/** The page's address has no game: the import page takes it out at once. */
const noHash = (page: Page) => expect.poll(() => new URL(page.url()).hash).toBe("");

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
  await expect(page.getByText("Move 5 is the second move of turn 3 in the record.")).toBeVisible();
  await page.getByRole("button", { name: "Review the game" }).click();
  await page.waitForURL(url => url.pathname === "/review" && !url.hash, { timeout: 60_000 });
  await expect.poll(() => local(page, REVIEW_GAME), { timeout: 60_000 }).toMatch(new RegExp(`^review-${MOVES}-`));
  await expect(page.getByText("This browser has no game to review.")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

for (const [name, at] of [["the position that the game's page showed", 5], ["the game's end, for a tool that sends no position", undefined]] as const)
  test(`Analyze on the board: the game's moves as the main line, at ${name}`, async ({ page }) => {
    await page.goto(toolLink({ at }));
    await noHash(page);
    if (at === undefined)
      await expect(page.getByText("The Analysis board shows the position after the last move of the game.")).toBeVisible({ timeout: 120_000 });
    else await expect(page.getByText("The Analysis board shows the position that you saw on strategyjam.org.")).toBeVisible({ timeout: 120_000 });
    await page.getByRole("button", { name: "Analyze on the board" }).click();
    await page.waitForURL(url => url.pathname === "/analysis" && !url.hash, { timeout: 60_000 });
    // The position on screen, which the board keeps for the next visit, is the page's
    await expect.poll(() => local(page, BOARD_AT), { timeout: 120_000 }).toBe(moves().slice(0, at ?? MOVES).join(" "));
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

test("a record that the engine refuses: the page says why, and opens nothing", async ({ page }) => {
  // The test game's first three turns, with an x on 2@1,-5, which captures nothing
  const record = '[Blue "Ann"]\n[Red "Bo"]\n\n1. 1:-1,1>2:0,-1 2. 1:-1,1>2:-2,1 1:0,2>2:0,3 3. 1:0,2>2:2,2 2@1,-5x *\n';
  await page.goto(toolLink({ at: 2, record }));
  await noHash(page);
  await expect(page.getByRole("alert")).toHaveText("Drawing Board cannot open this game: Move 5 (2@1,-5x) has the mark x, "
                                                   + "but the move captures no opponent cells.", { timeout: 120_000 });
  for (const name of ["Review the game", "Analyze on the board"]) await expect(page.getByRole("button", { name })).toHaveCount(0);
  await expect(page).toHaveURL(url => url.pathname === "/import");
  expect(await local(page, REVIEW_GAME)).toBeNull();
  expect(await local(page, BOARD_AT)).toBeNull();
});

for (const [tool, v, notice] of [["userscript", "old", "Your userscript is older than the userscript on this site."],
                                 ["bookmarklet", "0", "Your bookmarklet is an old version."]] as const)
  test(`an out-of-date ${tool}: the notice says how to update it, over the choice`, async ({ page }) => {
    await page.goto(toolLink({ tool, v, at: 5 }));
    await expect(page.getByRole("status").filter({ hasText: notice })).toBeVisible();
    await expect(page.getByRole("button", { name: "Review the game" })).toBeVisible({ timeout: 120_000 });
    await expect(page.getByRole("status").filter({ hasText: notice })).toBeVisible();
  });

test("the import page alone goes to the tools", async ({ page }) => {
  await page.goto(new URL("/import", DRAWING_BOARD).href);
  await page.waitForURL(url => url.pathname === "/tools");
});
