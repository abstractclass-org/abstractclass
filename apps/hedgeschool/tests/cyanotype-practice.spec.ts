// Cyanotype's Practice (its design 33, "Practice against Stamp Duty"), on its preview (CYANOTYPE_BASE_URL): whole games
// against Stamp Duty's practice bot, one with each side to start. The player's moves are clicks on the page: a
// blueprint in the hand, then a marked anchor hex on the board, chosen at random, or a cell and a marked new place
// when no blueprint has a legal placement. Each game goes to its end with no page error and no stop. The page checks
// each of the bot's moves against the rules' legal moves, and stops the game when one is not legal. A reload in the
// middle keeps the game: the same moves, and the game goes on. The bot's visits are 32, so that a game takes minutes:
// the bot at 1 and 2 visits has its own test (apps/cyanotype/src/lib/practice/bot.engine.test.ts). The tests skip,
// with a message, when the preview has no practice bot: run `npm run engine` in apps/cyanotype before its build, as the
// Tests workflow does (design 33, "The engine's files"). In CI, they fail instead. A last test keeps a game whose
// network the site does not ship: the page drops it and shows the settings card. In a game, the confirm button of
// Abort and Resign has the blunder's red in both themes. A test with no bot checks the utility itself (`btn-danger`),
// so that it runs without the engine's files too. Run:
// npm run test:layout -- tests/cyanotype-practice.spec.ts, with CYANOTYPE_BASE_URL.
import { expect, test, type Page } from "@playwright/test";

const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;
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
  (JSON.parse(localStorage.getItem("cyanotype:practice-game:1") ?? "null") as { moves: string[] } | null)?.moves ?? null);
const listed = (page: Page) => page.locator(".movelist .mv").allTextContents();

/** The preview's engine manifest. Skips the test when there is no preview, or when it has no practice bot. In CI, a
 *  preview with no practice bot is an error: the Tests workflow builds Cyanotype with its engine's files. */
async function botManifest(page: Page) {
  test.skip(!CYANOTYPE, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
  const manifest = await page.request.get(new URL("/engine/manifest.json", CYANOTYPE).href).then(r => r.json()).catch(() => null);
  const why = "Cyanotype's preview has no practice bot: run `npm run engine` in apps/cyanotype before its build";
  const bot = manifest?.artifacts?.some((a: { kind: string }) => a.kind === "practice-module");
  if (!bot && process.env.CI) throw new Error(why);
  test.skip(!bot, why);
  return manifest;
}

/** Starts a game against the practice bot at 32 visits, the player on a side. */
async function startGame(page: Page, manifest: { artifacts: { kind: string; id: string }[] }, side: "Blue" | "Red") {
  await page.setViewportSize({ width: 1376, height: 952 });
  await page.goto(new URL("/practice", CYANOTYPE).href);
  await page.evaluate(network => localStorage.setItem("cyanotype:practice-choices:1",
                        JSON.stringify({ bot: { network, visits: 32, variety: "low" }, side: "random", name: "" })),
                      manifest.artifacts.find(a => a.kind === "model")!.id);
  await page.reload();
  await page.getByRole("button", { name: `Play as ${side}` }).click({ timeout: 60_000 });
}

for (const side of ["Blue", "Red"] as const) {
  test(`a whole game against Stamp Duty on Cyanotype, the player ${side}`, async ({ page }) => {
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
    await startGame(page, manifest, side);
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
  await page.goto(new URL("/practice", CYANOTYPE).href);
  await page.evaluate(() => localStorage.setItem("cyanotype:practice-game:1", JSON.stringify({
    version: 1, bot: { network: "no-such-network", visits: 32, variety: "low" }, human: 0, name: "", seed: 1,
    moves: ["1@-13,-1"], builds: [], started: new Date().toISOString(),
  })));
  await page.reload();
  await expect(page.getByRole("status").filter({ hasText: "does not have the network of your last game" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play as Blue" })).toBeEnabled({ timeout: 60_000 });
  expect(await keptMoves(page)).toBeNull();
  expect(errors).toEqual([]);
});

// The blunder's fill (--blunder-fill, review.css) in each theme: the fill of Hedge School's confirm button.
const DANGER_FILL = { light: "rgb(212, 58, 58)", dark: "rgb(226, 72, 69)" } as const;

/** Waits until a button has the confirm button's colours in each theme: the fill, the border and the white text. */
async function expectDangerStyle(button: ReturnType<Page["locator"]>) {
  for (const theme of ["light", "dark"] as const) {
    await button.page().evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
    await expect(button).toHaveCSS("background-color", DANGER_FILL[theme]);
    await expect(button).toHaveCSS("border-top-color", DANGER_FILL[theme]);
    await expect(button).toHaveCSS("color", "rgb(255, 255, 255)");
  }
}

test("the confirm button of Abort and Resign has the blunder's red on Cyanotype, in both themes", async ({ page }) => {
  const manifest = await botManifest(page);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));
  await startGame(page, manifest, "Blue");
  // One game for both: a click on Resign while Abort's step is open opens Resign's step.
  for (const action of ["Abort", "Resign"]) {
    const opener = page.getByRole("button", { name: action, exact: true });
    await expect(opener).toBeEnabled({ timeout: 60_000 });
    await opener.click();
    await expectDangerStyle(page.getByRole("alertdialog", { name: action }).getByRole("button", { name: action, exact: true }));
  }
  expect(errors).toEqual([]);
});

test("btn-danger has the blunder's red in Cyanotype's style, in both themes", async ({ page }) => {
  test.skip(!CYANOTYPE, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
  await page.goto(new URL("/about", CYANOTYPE).href); // a page with no engine: the site's style is the same
  await page.evaluate(() => document.body.append(Object.assign(document.createElement("button"),
                                                               { className: "btn-danger", textContent: "Resign" })));
  await expectDangerStyle(page.locator("body > button.btn-danger"));
});
