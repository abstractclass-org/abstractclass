// Cyanotype's player's games (its design 33, "The player's games"), as Hedge School's (its designs 11 and 22), on its
// preview (CYANOTYPE_BASE_URL): the Review tab with games kept in this browser, a pasted record that the engine's rules
// check before the list keeps it, the records that the review refuses, a game's Delete with its question, the request
// to keep the games, one tab for each game's review, and a shared review that keeps the sender's network and depth.
// The games are the review's test game (cyanotype-review.ts, Stamp Duty against itself) cut at three turns, with
// players' names made by hand. Each test opens a fresh browser context, so its store starts empty, and loads the
// stored review with the engine off (storeReview): nothing searches here. The tests skip, with a message, when the
// preview has no engine files. Run: npx playwright test tests/cyanotype-games.spec.ts, with CYANOTYPE_BASE_URL.
import { expect, test, type Page } from "./page-log.ts";
import { modelOf, moduleOf, type Manifest } from "../../../packages/engine/src/client.ts";
import { NAME, STORES } from "../../../packages/storage/src/db.ts";
import { reviewLink } from "../../cyanotype/src/lib/game/share.ts";
import { parseRecord } from "../../cyanotype/src/lib/game/record.ts";
import { STANDARD_START } from "../../cyanotype/src/lib/game/position.ts";
import { ENGINE_KEY, LAST_REVIEW_KEY } from "../../cyanotype/src/lib/site.ts";
import { CYANOTYPE, REFUSED, keptGame, noReview, openReviewTab, pasteRecord, readStored, storeReview,
         testRecord } from "./cyanotype-review.ts";

/** The test game up to the end of turn `turns`, with the players `blue` and `red`. */
const game = (blue: string, red: string, turns: number) => testRecord(turns)
  .replace(/^\[Blue "[^"]*"\]/m, `[Blue "${blue}"]`).replace(/^\[Red "[^"]*"\]/m, `[Red "${red}"]`);
/** Three games, in the order that the tests paste them. */
const GAMES = [
  { title: "Ann against Bo", record: game("Ann", "Bo", 4), moves: 7 },
  { title: "Cy against Dee", record: game("Cy", "Dee", 8), moves: 15 },
  { title: "Ed against Flo", record: game("Ed", "Flo", 12), moves: 23 },
];

const local = (page: Page, key: string) => page.evaluate(k => localStorage.getItem(k), key);
/** Pastes `record` in the Review tab and reviews it: the engine's rules check it, the list keeps it, and its review
 *  opens at its own address. Waits for the review's end, and for the game's mark of it in the store: the engine is
 *  off, and the stored review gives every result. */
async function paste(page: Page, record: string) {
  await pasteRecord(page, record);
  await page.waitForURL(url => url.hash.startsWith("#game=review-"), { timeout: 120_000 });
  await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: 120_000 });
  const id = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("game")!;
  await expect.poll(async () => (await keptGame(page, id))?.reviewed, { timeout: 30_000 }).toBeTruthy();
}
/** The ids of the games in the site's store. */
const keptIds = (page: Page) => page.evaluate(([name, store]) => new Promise<string[]>((resolve, reject) => {
  const open = indexedDB.open(name);
  open.onerror = () => reject(open.error);
  open.onsuccess = () => {
    const keys = open.result.transaction(store, "readonly").objectStore(store).getAllKeys();
    keys.onsuccess = () => { open.result.close(); resolve(keys.result.map(String)); };
  };
}), [NAME, STORES.games] as const);
const rows = (page: Page) => page.getByRole("region", { name: "Review a game" }).locator("li");

test.describe("with the engine's files", () => {
  test.beforeEach(async ({ page }) => {
    const skip = await noReview(page);
    test.skip(!!skip, skip);
    await storeReview(page); // the engine off, and the stored review's results
  });

  test("a pasted record is kept and reviewed, and the Review tab lists the games, newest first", async ({ page }) => {
    test.setTimeout(6 * 60_000); // three games, each checked by the engine's rules and reviewed from the store
    await openReviewTab(page);
    await expect(page.getByRole("heading", { name: "Your games" })).toHaveCount(0);
    await expect(page.getByText("Continue your last review")).toHaveCount(0);
    for (const g of GAMES) await paste(page, g.record);
    await openReviewTab(page);
    await expect(page.getByRole("heading", { name: "Your games" })).toBeVisible();
    const newest = [...GAMES].reverse();
    await expect(rows(page).getByRole("link")).toHaveText(newest.map(g => g.title));
    for (const [i, g] of newest.entries()) {
      await expect(rows(page).nth(i)).toContainText(`${g.moves} moves · added `);
      // Each review ran to its end, so each game's Export opens
      await expect(rows(page).nth(i).getByRole("button", { name: "Export" })).toBeEnabled();
    }
    // "Continue your last review" names the last game reviewed, and opens it
    const last = page.getByRole("link", { name: /^Continue your last review/ });
    await expect(last).toContainText(`${GAMES[2].title}, ${GAMES[2].moves} moves`);
    // The record was kept with its capture marks, as the engine's rules give them
    const id = (await local(page, LAST_REVIEW_KEY))!;
    expect(id).toMatch(/^review-23-/);
    expect(parseRecord(String((await keptGame(page, id)).record)).marked.filter(Boolean).length).toBeGreaterThan(0);
    // A game's link opens its review
    await rows(page).getByRole("link", { name: GAMES[0].title }).click();
    await page.waitForURL(url => url.hash.startsWith("#game=review-7-"));
    await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: 120_000 });
    expect(await local(page, LAST_REVIEW_KEY)).toMatch(/^review-7-/);
  });

  test("the list keeps no game that the review refuses, and the page says why", async ({ page }) => {
    test.setTimeout(4 * 60_000);
    await openReviewTab(page);
    const box = page.getByLabel("A game record"), review = page.getByRole("button", { name: "Review", exact: true });
    // A capture mark that the engine's rules do not confirm
    await box.fill(REFUSED);
    await review.click();
    await expect(page.getByRole("alert")).toHaveText("Cyanotype cannot review this game: Move 5 (2@1,-5x) has the mark x, "
                                                     + "but the move captures no opponent cells.", { timeout: 120_000 });
    // A game from a set-up start
    const start = STANDARD_START.replace(/ b1 0\/0 0$/, " r1 0/0 22");
    await box.fill(`[Position "${start}"]\n\n12... 2@5,-2 *\n`);
    await review.click();
    await expect(page.getByRole("alert")).toHaveText("This game starts from another position. Cyanotype reviews games from "
                                                     + "the standard start only: open it on the Analysis board.");
    // A text that is not a record
    await box.fill("1. 9@0,0 *");
    await review.click();
    await expect(page.getByRole("alert")).toBeVisible();
    // A record after the review's `#`, which only the import page takes: the Review tab, as on Hedge School, and
    // nothing kept. From another page: over the Review tab, a change of the `#` alone loads nothing
    await page.goto("about:blank");
    await page.goto(new URL(`/review#record=${encodeURIComponent(REFUSED)}`, CYANOTYPE).href);
    await expect(page.getByRole("heading", { name: "Review your Blueprints game" })).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("footer")).toBeVisible(); // the tab has read its games
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(await keptIds(page)).toEqual([]);
    expect(await local(page, LAST_REVIEW_KEY)).toBeNull();
    await expect(page.getByRole("heading", { name: "Your games" })).toHaveCount(0);
  });

  test("a game's Delete asks first: Cancel keeps the game, and Delete deletes it and its row", async ({ page }) => {
    test.setTimeout(4 * 60_000);
    for (const g of GAMES.slice(0, 2)) await paste(page, g.record);
    await openReviewTab(page);
    await expect(rows(page)).toHaveCount(2);
    const question = page.getByRole("alertdialog", { name: "Delete this game?" });
    await page.getByRole("button", { name: `Delete ${GAMES[1].title}` }).click();
    await expect(question).toBeVisible();
    await expect(question).toContainText(`Cyanotype will delete the game ${GAMES[1].title} from this browser. You cannot undo this action.`);
    await expect(question.getByRole("button", { name: "Cancel" })).toBeFocused();
    await question.getByRole("button", { name: "Cancel" }).click();
    await expect(question).toHaveCount(0);
    await expect(rows(page)).toHaveCount(2);
    // The second game was the last one reviewed: its delete takes "Continue your last review" with it
    await page.getByRole("button", { name: `Delete ${GAMES[1].title}` }).click();
    await expect(question.getByRole("button", { name: "Delete" })).toBeEnabled(); // after the double-click time
    await question.getByRole("button", { name: "Delete" }).click();
    await expect(question).toHaveCount(0);
    await expect(rows(page).getByRole("link")).toHaveText([GAMES[0].title]);
    await expect(page.getByText("Continue your last review")).toHaveCount(0);
    expect(await keptIds(page)).toEqual([expect.stringMatching(/^review-7-/)]);
    expect(await local(page, LAST_REVIEW_KEY)).toBeNull();
    await page.reload();
    await expect(rows(page).getByRole("link")).toHaveText([GAMES[0].title]);
  });

  for (const [answer, line] of [[true, "Kept in this browser until you delete them."],
                                [false, "Kept in this browser only, which may clear them when its disk is almost full"]] as const)
    test(`the request to keep the games: the browser ${answer ? "keeps" : "does not keep"} them, and the tab says so`, async ({ page }) => {
      test.setTimeout(3 * 60_000);
      // The browser's Storage API, which counts each request: it keeps the data only when `answer`
      await page.addInitScript(keeps => {
        Object.defineProperty(navigator, "storage", { configurable: true, value: {
          persisted: async () => localStorage.getItem("test:persisted") === "1",
          persist: async () => {
            localStorage.setItem("test:asked", String(Number(localStorage.getItem("test:asked") ?? 0) + 1));
            if (keeps) localStorage.setItem("test:persisted", "1");
            return keeps;
          } } });
      }, answer);
      await paste(page, GAMES[0].record);
      expect(await local(page, "test:asked")).toBe("1"); // when the game was kept
      await openReviewTab(page);
      await expect(page.getByText(line)).toBeVisible();
      // The Review tab asks again only when the browser does not keep the games
      await expect.poll(() => local(page, "test:asked")).toBe(answer ? "1" : "2");
    });

  test("one tab reviews a game at a time: another tab waits, and Review here takes the game", async ({ page, context }) => {
    test.setTimeout(4 * 60_000);
    await paste(page, GAMES[0].record);
    const other = await context.newPage();
    await other.goto(page.url());
    await expect(other.getByText("This game is open in another tab.")).toBeVisible({ timeout: 60_000 });
    await expect(other.getByText(/^Review done/)).toHaveCount(0);
    await other.getByRole("button", { name: "Review here" }).click();
    await expect(other.getByText(/^Review done/)).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText("This game is now open in another tab, so its review here stopped.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Review here" })).toBeVisible();
  });

  test("a shared review keeps the sender's network and depth for its game, and other games review as before", async ({ page }) => {
    test.setTimeout(3 * 60_000);
    const manifest: Manifest = await page.request.get(new URL("/engine/manifest.json", CYANOTYPE).href).then(r => r.json());
    const network = readStored().network;
    const run = { module: moduleOf(manifest)!.sha256, model: modelOf(manifest, network)!.sha256, visits: 1024 };
    const link = reviewLink(CYANOTYPE!, parseRecord(GAMES[1].record), [], run);
    await page.goto(link);
    await expect(page.getByRole("heading", { name: "A shared review" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("The game keeps them for its review. Other games review as before.")).toBeVisible();
    await page.getByRole("button", { name: "Review it" }).click();
    await page.waitForURL(url => url.hash.startsWith("#game=review-15-"), { timeout: 120_000 });
    // The page loads again at the review's address: its engine settings show the game's own, its depth per move
    // Standard's 1,024 visits
    const button = page.getByRole("button", { name: "Engine settings" });
    await button.click({ timeout: 120_000 });
    const id = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("game")!;
    expect((await keptGame(page, id)).settings).toEqual({ network, visits: 1024 });
    const panel = page.getByRole("region", { name: "Engine settings" });
    await expect(panel).toContainText("This game came with a network and depth per move, from a review file or a shared link.");
    await expect(panel.getByRole("radio", { name: "Standard" })).toHaveAttribute("aria-checked", "true");
    // The browser's own settings stay Lite's, for every other game
    expect(JSON.parse((await local(page, ENGINE_KEY))!).review).toBe("lite");
  });
});
