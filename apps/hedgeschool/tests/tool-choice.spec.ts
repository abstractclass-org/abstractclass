// The import page takes every game from outside (design 22). A game from the bookmarklet or the userscript asks where
// it goes (design 21, item 5): the review, which keeps the game, or the Analysis board at the position that the game's
// page showed, which keeps none. A way that the site refuses for the game (a set-up start, other rules) is off before
// the click, with its reason. A tool from before the import page opens the review, which asks too. A partner's link
// goes straight to the review (design 18). On the review, a link's record gets the Review tab. Each test opens a
// fresh browser context, so its store starts empty.
import { test, expect, type Page } from "./page-log.ts";
import { BOARD_AT_KEY } from "../src/lib/keys.ts";

const record = '[Event "meaf.us game"]\n[Site "meaf.us"]\n[Blue "Ann"]\n[Red "Bo"]\n[Result "*"]\n\n1. D10-E13 2. Q10-R8 O11-Q10 *\n';
/** The link that the bookmarklet opens on meaf.us for `game` (by default the record above): `at` is the position that
 *  the page showed, when it said. */
const toolLink = (at?: number, game = record) =>
  "/import#" + new URLSearchParams({ tool: "bookmarklet", v: "1", site: "meaf.us", ...(at === undefined ? {} : { at: String(at) }), record: game });

/** The browser's store: one store's keys, or one value (@abstractclass/storage/db.ts). */
const stored = (page: Page, store: string, key?: string) => page.evaluate(([store, key]) => new Promise(resolve => {
  const open = indexedDB.open("learn-enclosure");
  open.onsuccess = () => {
    const names = open.result.objectStoreNames;
    if (!names.contains(store)) { open.result.close(); resolve(key ? undefined : []); return; }
    const s = open.result.transaction(store).objectStore(store), get = key ? s.get(key) : s.getAllKeys();
    get.onsuccess = () => { open.result.close(); resolve(get.result); };
  };
}), [store, key] as const);

/** The board's position on screen, which it keeps for the next visit, once it has one: its edges from the start. */
const boardAt = (page: Page) =>
  expect.poll(() => page.evaluate(k => localStorage.getItem(k), BOARD_AT_KEY), { timeout: 60_000 });

test("Analyze on the board: the game's moves as the main line, at the page's position, and no game kept", async ({ page }) => {
  await page.goto(toolLink(1));
  await expect(page.getByRole("heading", { name: "A game from meaf.us" })).toBeVisible();
  await expect(page.getByText("Ann against Bo")).toBeVisible();
  await expect(page.getByText("The Analysis board shows the position that you saw on meaf.us.")).toBeVisible();
  await page.getByRole("button", { name: "Analyze on the board" }).click();
  await page.waitForURL(url => url.pathname === "/analysis" && !url.hash);
  // The position on screen, which the board keeps for the next visit, is the page's: one move from the start.
  await boardAt(page).toBe("D10-E13");
  expect(((await stored(page, "branches", "board")) as { main: string[] }).main).toEqual(["D10-E13", "Q10-R8", "O11-Q10"]);
  expect(await stored(page, "games")).toEqual([]);
  // A second game, over the board that now has moves: the board asks before it replaces them.
  await page.goto(toolLink(2));
  await page.getByRole("button", { name: "Analyze on the board" }).click();
  await expect(page.getByRole("dialog", { name: "Replace your analysis?" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Replace it" }).click();
  await boardAt(page).toBe("D10-E13 Q10-R8");
});

for (const [name, at] of [["sends no position", undefined], ["sends a position past the game's end", 9]] as const)
  test(`a tool that ${name}: the board opens at the game's last move`, async ({ page }) => {
    await page.goto(toolLink(at));
    if (at === undefined)
      await expect(page.getByText("The Analysis board shows the position after the last move of the game.")).toBeVisible();
    await page.getByRole("button", { name: "Analyze on the board" }).click();
    await page.waitForURL(url => url.pathname === "/analysis" && !url.hash);
    await boardAt(page).toBe("D10-E13 Q10-R8 O11-Q10");
  });

test("Review the game: the game kept, then reviewed", async ({ page }) => {
  await page.goto(toolLink(1));
  await page.getByRole("button", { name: "Review the game" }).click();
  await page.waitForURL(url => url.pathname === "/review" && url.hash.startsWith("#game="), { timeout: 60_000 });
  // The review loads its own address once the game is kept: read the store after that.
  await expect.poll(() => stored(page, "games").catch(() => null), { timeout: 60_000 }).toHaveLength(1);
});

test("a game from a set-up start: the review is off before the click, and the Analysis board takes the game", async ({ page }) => {
  // The game above after its first move, as a start of its own: Red's first turn
  const setUp = '[Blue "Ann"]\n[Red "Bo"]\n[Position "A10-D10,D10-E13* Q10-T10 r2 0/0 1"]\n\n2. Q10-R8 O11-Q10 *\n';
  await page.goto(toolLink(undefined, setUp));
  const review = page.getByRole("button", { name: "Review the game" }), board = page.getByRole("button", { name: "Analyze on the board" });
  await expect(board).toBeVisible();
  await expect(review).toBeDisabled();
  await expect(page.getByText("This game starts from another position. Hedge School reviews games from the standard start "
                              + "only: open it on the Analysis board.")).toBeVisible();
  await expect(page.getByText("The engine examines all the moves of the game.")).toHaveCount(0); // the reason in its place
  await expect(board).toHaveAttribute("autofocus", ""); // the board takes the review's autofocus
  // No import was tried: the review's click would replace the choice with "Importing the game…" at once
  await review.click({ force: true });
  await expect(page.getByText("Importing the game…")).toHaveCount(0);
  await expect(board).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(await stored(page, "games")).toEqual([]);
  await board.click();
  await page.waitForURL(url => url.pathname === "/analysis" && !url.hash);
  // The board takes the game from its set-up start, at the game's end, with no refusal
  await boardAt(page).toBe("Q10-R8 O11-Q10");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(await stored(page, "games")).toEqual([]); // the forced click kept no game, also later
});

test("a game of other rules: both ways are off before the click, each with its own reason", async ({ page }) => {
  await page.goto(toolLink(undefined, '[Rules "Race to 2000"]\n' + record));
  await expect(page.getByRole("button", { name: "Review the game" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Analyze on the board" })).toBeDisabled();
  await expect(page.getByText("This game uses other rules (Race to 2000). Hedge School reviews games of the online rules "
                              + "only.")).toBeVisible();
  await expect(page.getByText("This game uses other rules (Race to 2000). The Analysis board shows games of the online "
                              + "rules only.")).toBeVisible();
  await expect(page.getByText("The Analysis board shows the position")).toHaveCount(0); // the reasons in their place
});

test("a userscript that Tampermonkey has not updated: the review asks too, and says to update it", async ({ page }) => {
  await page.goto("/review#" + new URLSearchParams({ tool: "userscript", v: "old", site: "strategyjam.org", record }));
  await expect(page.getByText("Your userscript is older than this site's.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "A game from strategyjam.org" })).toBeVisible();
  await page.getByRole("button", { name: "Review the game" }).click();
  await page.waitForURL(url => url.pathname === "/review" && url.hash.startsWith("#game="), { timeout: 60_000 });
});

test("a partner's link: the game kept, and its review at once, with no choice", async ({ page }) => {
  await page.goto("/import#" + new URLSearchParams({ record }));
  // The review opens with no click, so the page asked nothing.
  await page.waitForURL(url => url.pathname === "/review" && url.hash.startsWith("#game="), { timeout: 60_000 });
  await expect.poll(() => stored(page, "games").catch(() => null), { timeout: 60_000 }).toHaveLength(1);
});

test("a partner's link with its save page: the review, with Save to the partner, and no choice", async ({ page }) => {
  const save = "https://www.enclosuregame.com/hedge-school/save?game=abc123";
  await page.goto("/import#" + new URLSearchParams({ record, save }));
  await page.waitForURL(url => url.pathname === "/review" && url.hash.startsWith("#game="), { timeout: 60_000 });
  await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: 300_000 }); // Export waits for the review
  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByRole("menuitem", { name: /^Save to enclosuregame\.com/ })).toBeVisible();
});

test("a link's record on the review: the Review tab, and no game kept", async ({ page }) => {
  // Only the import page takes a record (design 22).
  await page.goto("/review#" + new URLSearchParams({ record }));
  await page.waitForLoadState("networkidle"); // the page's code has run
  await expect(page.getByRole("heading", { name: "Review your Enclosure game" })).toBeVisible();
  expect(new URL(page.url()).hash).not.toContain("game=");
  expect(await stored(page, "games")).toEqual([]);
});

test("the import page alone goes to the tools", async ({ page }) => {
  await page.goto("/import");
  await page.waitForURL(url => url.pathname === "/tools");
});
