// Drawing Board's Practice (its design 33, "Practice against Stamp Duty"), on its preview (DB_BASE_URL): whole games
// against Stamp Duty's practice bot, one with each side to start. The player's moves are clicks on the page: a
// blueprint in the hand, then a marked anchor hex on the board, chosen at random, or a cell and a marked new place
// when no blueprint has a legal placement. Each game goes to its end with no page error and no stop. The page checks
// each of the bot's moves against the rules' legal moves, and stops the game when one is not legal. A reload in the
// middle keeps the game: the same moves, and the game goes on. The bot's visits are 32, so that a game takes minutes:
// the bot at 1 and 2 visits has its own test (apps/drawingboard/src/lib/practice/bot.engine.test.ts). The site's
// build and the Tests workflow have no engine files (design 33, "The engine's files"), so the tests skip, with a
// message, when the preview has no practice bot: run `npm run engine` in apps/drawingboard before its build. A last
// test keeps a game whose network the site does not ship: the page drops it and shows the settings card. Run:
// npm run test:layout -- tests/drawingboard-practice.spec.ts, with DB_BASE_URL.
import { expect, test, type Page } from "@playwright/test";

const DRAWING_BOARD = process.env.DB_BASE_URL;
const STATUS = '[data-testid="practice-status"]';

/** The player's move, as a click on a blueprint, then on one of its marked anchor hexes, at random. A blueprint with
 *  no legal placement gives way to the next. With none, an edit: a cell, then one of its marked new places. */
async function humanMove(page: Page, player: 0 | 1, random: () => number): Promise<string> {
  const pick = async (dots: ReturnType<Page["locator"]>) => {
    const n = await dots.count();
    if (!n) return false;
    const box = (await dots.nth(Math.floor(random() * n)).boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    return true;
  };
  const cell = async (k: number) => {
    const c = page.locator(`svg.hand.p${player} > svg:nth-of-type(${k}) g.cell`).first();
    if (!(await c.count())) return false;
    const box = (await c.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    return true;
  };
  for (let k = 1; k <= 3; k++) if ((await cell(k)) && (await pick(page.locator("g.input circle.dot")))) return "placement";
  for (let k = 1; k <= 3; k++) if ((await cell(k)) && (await pick(page.locator(`svg.hand.p${player} circle.dot`)))) return "edit";
  throw new Error("the player has no legal move on the page");
}

/** Waits for the player's turn or the game's end: the status line's text. */
async function turn(page: Page): Promise<string> {
  await page.waitForFunction(s => /^(Your turn|The game is over|You resigned|The game stopped)/.test(document.querySelector(s)?.textContent ?? ""),
                             STATUS, { timeout: 300_000 });
  return (await page.locator(STATUS).textContent())!;
}

const keptMoves = (page: Page) => page.evaluate(() =>
  (JSON.parse(localStorage.getItem("drawing-board:practice-game:1") ?? "null") as { moves: string[] } | null)?.moves ?? null);
const listed = (page: Page) => page.locator(".movelist .mv").allTextContents();

/** The preview's engine manifest. Skips the test when there is no preview, or when it has no practice bot. */
async function botManifest(page: Page) {
  test.skip(!DRAWING_BOARD, "DB_BASE_URL gives no Drawing Board preview");
  const manifest = await page.request.get(new URL("/engine/manifest.json", DRAWING_BOARD).href).then(r => r.json()).catch(() => null);
  test.skip(!manifest?.artifacts?.some((a: { kind: string }) => a.kind === "practice-module"),
            "Drawing Board's preview has no practice bot: run `npm run engine` in apps/drawingboard before its build");
  return manifest;
}

for (const side of ["Blue", "Red"] as const) {
  test(`a whole game against Stamp Duty on Drawing Board, the player ${side}`, async ({ page }) => {
    const manifest = await botManifest(page);
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(String(e)));
    let seed = side === "Blue" ? 1 : 2; // the player's clicks: the same for each run of a side (mulberry32)
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
    };
    await page.setViewportSize({ width: 1376, height: 952 });
    await page.goto(new URL("/practice", DRAWING_BOARD).href);
    await page.evaluate(network => {
      localStorage.removeItem("drawing-board:practice-game:1");
      localStorage.setItem("drawing-board:practice-choices:1",
                           JSON.stringify({ bot: { network, visits: 32, variety: "low" }, side: "random", name: "" }));
    }, manifest.artifacts.find((a: { kind: string }) => a.kind === "model").id);
    await page.reload();
    await page.getByRole("button", { name: `Play as ${side}` }).click({ timeout: 60_000 });
    const player = side === "Blue" ? 0 : 1;
    let status = await turn(page), reloaded = false, moves = 0;
    while (status.startsWith("Your turn")) {
      if (!reloaded && (await keptMoves(page))!.length >= 40) {
        // A reload keeps the game: the same moves, kept and listed, and the player's turn again.
        const kept = await keptMoves(page), before = await listed(page);
        await page.reload();
        status = await turn(page);
        expect(await keptMoves(page)).toEqual(kept);
        expect(await listed(page)).toEqual(before);
        reloaded = true;
        continue;
      }
      await humanMove(page, player, random);
      moves++;
      status = await turn(page);
    }
    const kept = await keptMoves(page), all = await listed(page);
    const points = await page.locator('[aria-label="Players and scores"] > div > div:first-child strong').allTextContents();
    console.log(`${side}: ${all.length} moves, ${moves} of them the player's; ${status} The cards' points: ${points.join(", ")}.`);
    console.log(`${side}'s moves: ${all.join(" ")}`);
    expect(status, `the game's moves: ${all.join(" ")}`).toMatch(/^The game is over/);
    expect(all.length).toBe(120);
    expect(kept).toBeNull(); // an ended game is no longer kept
    expect(reloaded).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("a kept game whose network the site does not ship gives way to the settings card", async ({ page }) => {
  await botManifest(page);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(new URL("/practice", DRAWING_BOARD).href);
  await page.evaluate(() => localStorage.setItem("drawing-board:practice-game:1", JSON.stringify({
    version: 1, bot: { network: "no-such-network", visits: 32, variety: "low" }, human: 0, name: "", seed: 1,
    moves: ["1@-13,-1"], builds: [], started: new Date().toISOString(),
  })));
  await page.reload();
  await expect(page.getByRole("status").filter({ hasText: "does not have the network of your last game" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play as Blue" })).toBeEnabled({ timeout: 60_000 });
  expect(await keptMoves(page)).toBeNull();
  expect(errors).toEqual([]);
});
