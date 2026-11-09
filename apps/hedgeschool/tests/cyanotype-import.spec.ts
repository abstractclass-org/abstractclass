// Cyanotype's import page (its design 33, "How a game comes in from strategyjam.org") on its preview
// (CYANOTYPE_BASE_URL), with the review's test game up to turn 20 (cyanotype-review.ts, Stamp Duty against itself), as
// the bookmarklet and the userscript send it. The game leaves the address at once. The engine's rules check the record
// first: a record that they refuse shows why and opens nothing. Else the review's choice keeps the game on the import
// page, as Hedge School's does, and opens its review by the game's id: a game that the browser cannot keep stays on
// the import page, with why. The Analysis board opens at the position that the game's page showed, and asks before the
// game replaces an analysis kept there. An out-of-date tool gets its notice. Each test opens a fresh browser context,
// so its store starts empty. The tests that need the engine skip, with a message, when the preview has no engine files.
// Run: npx playwright test tests/cyanotype-import.spec.ts, with CYANOTYPE_BASE_URL.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { writePosition } from "../../cyanotype/src/lib/game/position.ts";
import { parseRecord } from "../../cyanotype/src/lib/game/record.ts";
import type { SitePosition } from "../../cyanotype/src/lib/board/position.ts";
import { BOARD_AT_KEY, LAST_REVIEW_KEY } from "../../cyanotype/src/lib/site.ts";
import { CYANOTYPE, MOVES, REFUSED, keptGame, noReview, testRecord, toolLink } from "./cyanotype-review.ts";

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

  test("Review the game: the game leaves the address, the engine checks it, and the import page keeps it", async ({ page }) => {
    // Each address of the tab: after the import page, none holds the record
    const addresses: string[] = [];
    page.on("framenavigated", frame => { if (frame === page.mainFrame()) addresses.push(frame.url()); });
    // The workers that each page starts, counted in the tab's session storage, which the review's reload keeps
    await page.addInitScript(() => {
      const Base = window.Worker;
      window.Worker = class extends Base {
        constructor(...args: ConstructorParameters<typeof Worker>) {
          super(...args);
          const key = `test-workers:${location.pathname}`;
          sessionStorage.setItem(key, String(Number(sessionStorage.getItem(key) ?? 0) + 1));
        }
      };
    });
    // The test game without its capture marks: the import page's check gives them, and the game keeps them
    await page.goto(toolLink({ at: 5, record: testRecord().replace(/(?<=\d)x(\+\d+)?(?=\s)/g, "") }));
    await noHash(page);
    await expect(page.getByRole("heading", { name: "A game from strategyjam.org" })).toBeVisible();
    await expect(page.getByText(PLAYERS)).toBeVisible();
    await expect(page.getByText(`${MOVES} moves`)).toBeVisible();
    await expect(page.getByText("Move 5 is the second move of turn 3 in the record.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Review the game" })).toBeVisible({ timeout: 120_000 });
    // The game's lines stay when the choice comes after the check
    await expect(page.getByText("Move 5 is the second move of turn 3 in the record.")).toBeVisible();
    await page.getByRole("button", { name: "Review the game" }).click();
    // The import page keeps the record in the player's games with its check, then the review opens it by its id
    await page.waitForURL(url => url.pathname === "/review" && url.hash.startsWith(`#game=review-${MOVES}-`), { timeout: 120_000 });
    // The review's address comes first, then the page loads: a read during the load answers nothing
    await expect.poll(() => local(page, LAST_REVIEW_KEY).catch(() => null), { timeout: 60_000 })
      .toMatch(new RegExp(`^review-${MOVES}-`));
    await expect(page.getByRole("alert")).toHaveCount(0);
    const holdsRecord = (address: string) => {
      const url = new URL(address);
      return url.pathname !== "/import" && url.hash.includes("record=");
    };
    expect(addresses.filter(holdsRecord), "no address after the import page holds the record").toEqual([]);
    // The rules checked the game once on the import page, in one worker, and the kept record has the check's marks
    const workers = await page.evaluate(() => sessionStorage.getItem("test-workers:/import"));
    expect(workers, "the import page's workers").toBe("1");
    const id = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("game")!;
    expect(parseRecord(String((await keptGame(page, id)).record)).marked).toEqual(parseRecord(testRecord()).marked);
    // The game is in the Review tab's list of the player's games, once, as on Hedge School
    await page.goto(new URL("/review", CYANOTYPE).href);
    const games = page.getByRole("region", { name: "Review a game" }).locator("li");
    await expect(games.getByRole("link", { name: PLAYERS })).toBeVisible({ timeout: 60_000 });
    await expect(games).toHaveCount(1);
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
    await expect(page.getByRole("alert")).toHaveText("Cyanotype cannot open this game: Move 5 (2@1,-5x) has the mark x, "
                                                     + "but the move captures no opponent cells.", { timeout: 120_000 });
    // An old tool can send such a record: the page offers the newest
    await expect(page.getByText("The newest bookmarklet and userscript")).toBeVisible();
    for (const name of ["Review the game", "Analyze on the board"]) await expect(page.getByRole("button", { name })).toHaveCount(0);
    await expect(page).toHaveURL(url => url.pathname === "/import");
    expect(await local(page, LAST_REVIEW_KEY)).toBeNull();
    expect(await local(page, BOARD_AT_KEY)).toBeNull();
  });

  test("a game that this browser cannot keep: the page says why, and offers no tools", async ({ page }) => {
    // Blocked site data: the browser opens no database (the engine's check runs in its worker, as before)
    await page.addInitScript(() => {
      IDBFactory.prototype.open = () => { throw new DOMException("blocked", "SecurityError"); };
    });
    await page.goto(toolLink({ at: 5 }));
    await page.getByRole("button", { name: "Review the game" }).click({ timeout: 120_000 });
    await expect(page.getByRole("alert")).toHaveText("Cyanotype could not import the game: This browser does not let "
                                                     + "the site keep games (a private window, or blocked site data).",
                                                     { timeout: 60_000 });
    // Newer tools do not help a browser that keeps no games
    await expect(page.getByText("The newest bookmarklet and userscript")).toHaveCount(0);
    await expect(page).toHaveURL(url => url.pathname === "/import" && !url.hash);
    expect(await local(page, LAST_REVIEW_KEY)).toBeNull();
  });

  test("a game from a set-up start: the review is off before the click, and the Analysis board takes the game", async ({ page }) => {
    // The editor's test position (Red's first move of turn 6, after 9 moves) with a legal move from the engine
    const fixtures = JSON.parse(readFileSync("../cyanotype/src/lib/board/fixtures.json", "utf8")).fixtures as
      { name: string; position: SitePosition; legal: string[] }[];
    const middle = fixtures.find(f => f.name === "A middle game")!;
    const record = `[Blue "Ann"]
[Red "Bo"]
[Position "${writePosition(middle.position)}"]

6. ${middle.legal[0]} *
`;
    await page.goto(toolLink({ record }));
    await noHash(page);
    const review = page.getByRole("button", { name: "Review the game" }), board = page.getByRole("button", { name: "Analyze on the board" });
    await expect(board).toBeVisible({ timeout: 120_000 });
    await expect(review).toBeDisabled();
    await expect(page.getByText("This game starts from another position. Cyanotype reviews games from the standard start only: "
                                + "open it on the Analysis board.")).toBeVisible();
    await expect(board).toHaveAttribute("autofocus", ""); // where the review is refused, the board takes the review's autofocus
    await board.click();
    await page.waitForURL(url => url.pathname === "/analysis" && !url.hash, { timeout: 60_000 });
    // The board takes the game from its set-up start: at the game's end, and with no refusal
    await expect.poll(() => local(page, BOARD_AT_KEY), { timeout: 120_000 }).toBe(boardAt(undefined, record));
    await expect(page.getByRole("alert")).toHaveCount(0);
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
  test.skip(!CYANOTYPE, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
  await page.goto(new URL("/import", CYANOTYPE).href);
  await page.waitForURL(url => url.pathname === "/tools");
});
