// Checks Mistak's tools for playtak.com (apps/mistak/src/lib/import/tools.ts) in the browser, on saved pages with the
// state shape of playtak's web client: tests/fixtures/playtak-finished.html (a finished game) and playtak-playing.html
// (a game in progress), each written by hand with made-up players. Playwright's routes serve each page at playtak.com's
// address, and the browser resolves no address of playtak (playwright.config.ts), so nothing goes to playtak. The
// bookmarklet from the tools page and the userscript from /mistak.user.js run on the page, with Tampermonkey's
// functions as stubs, and Mistak's import page shows the game that each opens. Run, with MISTAK_BASE_URL:
// npm run test:layout -- tests/mistak-tools.spec.ts.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "./page-log.ts";

const BASE = process.env.MISTAK_BASE_URL;
test.skip(BASE === undefined, "MISTAK_BASE_URL gives no Mistak preview");

const PLAYTAK = "https://playtak.com/";
const OPEN = "Open this game in Mistak";
const GAMES = [
  { name: "finished", shown: "The playtak.com page showed the position after the last move.", result: "R-0",
    moves: ["1", "e5", "a1"], length: "11 moves" },
  { name: "playing", shown: "The playtak.com page showed the position after Black's move 3.", result: "No result",
    moves: ["1", "a6", "f1"], length: "9 moves" },
] as const;

/** Shows the saved page `name` at playtak.com's address, and keeps each address that the browser asks for from then. */
async function openSaved(page: Page, name: string): Promise<string[]> {
  const asked: string[] = [];
  page.context().on("request", r => { asked.push(r.url()); });
  const html = readFileSync(new URL(`fixtures/playtak-${name}.html`, import.meta.url), "utf8");
  await page.context().route(/^https?:\/\/([^/]*\.)?(playtak\.com|ptn\.ninja|ustak\.org)\//, route =>
    (route.request().url() === PLAYTAK ? route.fulfill({ contentType: "text/html", body: html }) : route.abort()));
  // The bookmark loads its code from the preview on this computer, and Chromium lets a page on a public address
  // reach this computer only with the permission. The live site's address is public, and needs none.
  await page.context().grantPermissions(["local-network-access"], { origin: new URL(PLAYTAK).origin });
  await page.goto(PLAYTAK);
  // The page is in one state: it highlights the ply that led to the position that move_shown names, as playtak-ui's
  // setShownMove does (src/js/game-interface.js).
  const shown = await page.evaluate(() => (0, eval)("gameData").move_shown as number);
  await expect(page.locator("#moveslist .curmove")).toHaveClass(new RegExp(`(^| )moveno${shown - 1}( |$)`));
  return asked;
}

/** Checks the game that the tool opened in a new tab, on Mistak's import page. */
async function checkOpened(tab: Page, game: (typeof GAMES)[number], asked: string[]) {
  await expect(tab.getByRole("heading", { level: 1 })).toHaveText("alder_test against birch_test");
  await expect(tab).toHaveURL(`${BASE}/import`); // the game left the address
  await expect(tab.getByText(game.shown)).toBeVisible();
  await expect(tab.getByRole("definition").filter({ hasText: game.result })).toBeVisible();
  await expect(tab.getByRole("definition").filter({ hasText: game.length })).toBeVisible();
  await expect(tab.getByRole("row").nth(1)).toHaveText(game.moves.join(""));
  await expect(tab.getByText("Your bookmarklet is an old version")).toHaveCount(0);
  await expect(tab.getByText("Your userscript is older")).toHaveCount(0);
  // The saved page was the one address of playtak that the browser asked for, and Playwright's route answered it.
  expect(asked.filter(url => /^https?:\/\/([^/]*\.)?(playtak\.com|ptn\.ninja|ustak\.org)\//.test(url))).toEqual([PLAYTAK]);
}

for (const game of GAMES) {
  test(`the bookmarklet from the tools page opens the ${game.name} game on Mistak's import page`, async ({ page }) => {
    await page.goto(`${BASE}/tools`);
    const href = await page.getByRole("link", { name: "Open in Mistak" }).getAttribute("href");
    expect(href).toMatch(/^javascript:/);
    const asked = await openSaved(page, game.name);
    const tab = page.waitForEvent("popup");
    await page.addScriptTag({ content: decodeURIComponent(href!.slice("javascript:".length)) });
    await checkOpened(await tab, game, asked);
  });

  test(`the userscript's button, under the move list, opens the ${game.name} game on Mistak's import page`, async ({ page }) => {
    const source = await (await page.request.get(`${BASE}/mistak.user.js`)).text();
    expect(source).toMatch(/^\/\/ ==UserScript==/);
    // Tampermonkey's functions that the userscript takes: its menu's entries, and a new tab. The userscript opens the
    // site that built it (the build's SITE_ORIGIN), so the test keeps the address, and opens its path on the preview.
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown> & { menu: [string, () => void][]; tabs: string[] };
      w.menu = [];
      w.tabs = [];
      w.GM_registerMenuCommand = (name: string, run: () => void) => w.menu.push([name, run]);
      w.GM_openInTab = (url: string) => w.tabs.push(url);
    });
    const asked = await openSaved(page, game.name);
    await page.addScriptTag({ content: source });
    expect(await page.evaluate(() => (window as unknown as { menu: [string][] }).menu.map(([name]) => name))).toEqual([OPEN]);
    const button = page.locator("#notationbar + .optlist").getByRole("button", { name: OPEN });
    await expect(button).toBeVisible();
    // It sits on a line of its own under the row of buttons, at the row's middle.
    const [row, last, own] = await Promise.all([page.locator(".optlist").boundingBox(),
      page.locator(".navitem").last().boundingBox(), button.boundingBox()]);
    expect(own!.y).toBeGreaterThanOrEqual(last!.y + last!.height);
    expect(own!.x + own!.width / 2).toBeCloseTo(row!.x + row!.width / 2, 0);
    await button.click();
    const tabs = await page.evaluate(() => (window as unknown as { tabs: string[] }).tabs);
    expect(tabs).toHaveLength(1);
    const url = new URL(tabs[0]);
    expect(url.pathname).toBe("/import");
    const tab = await page.context().newPage();
    await tab.goto(`${BASE}/import${url.hash}`);
    await checkOpened(tab, game, asked);
  });
}

test("a playtak page with no game: the bookmarklet says why, and opens nothing", async ({ page }) => {
  await page.goto(`${BASE}/tools`);
  const href = await page.getByRole("link", { name: "Open in Mistak" }).getAttribute("href");
  await openSaved(page, "finished");
  await page.evaluate(() => { document.querySelector("#moveslist")!.replaceChildren(); });
  const said = page.waitForEvent("dialog");
  let opened = false;
  page.on("popup", () => { opened = true; });
  await page.addScriptTag({ content: decodeURIComponent(href!.slice("javascript:".length)) });
  const dialog = await said;
  expect(dialog.message()).toMatch(/^Mistak: this game has no moves yet\./);
  await dialog.dismiss();
  expect(opened).toBe(false);
});

test("the tools page: the bookmark, the userscript, and the way to it from the header", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE}/`);
  await page.getByRole("banner").getByRole("link", { name: "Tools" }).click();
  await expect(page).toHaveURL(`${BASE}/tools`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bring your games from playtak.com");
  await expect(page.getByRole("link", { name: "the Mistak userscript" })).toHaveAttribute("href", "/mistak.user.js");
  const header = await (await page.request.get(`${BASE}/mistak.meta.js`)).text();
  expect(header).toMatch(/^\/\/ ==UserScript==[^]*\/\/ @match +https:\/\/playtak\.com\/\*[^]*==\/UserScript==\n$/);
});

test("the import page alone goes to the tools page", async ({ page }) => {
  await page.goto(`${BASE}/import`);
  await expect(page).toHaveURL(`${BASE}/tools`);
});

test("an out-of-date userscript: the notice says how to update it, over the game", async ({ page }) => {
  const record = '[Player1 "alder_test"]\n[Player2 "birch_test"]\n[Size "5"]\n\n1. e5 a1 *\n';
  await page.goto(`${BASE}/import#${new URLSearchParams({ tool: "userscript", v: "old", site: "playtak.com", at: "2", record })}`);
  await expect(page.getByText("Your userscript is older than the userscript on this site.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("alder_test against birch_test");
});
