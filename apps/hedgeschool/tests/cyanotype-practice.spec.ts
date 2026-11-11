// Cyanotype's Practice (its design 33, "Practice against Stamp Duty"), on its preview (CYANOTYPE_BASE_URL): whole games
// against Stamp Duty's practice bot, one with each side to start. The player's moves are clicks on the page: a
// blueprint in the hand, then a marked anchor hex on the board, chosen at random, or a cell and a marked new place
// when no blueprint has a legal placement. Each game goes to its end with no page error and no stop. The page checks
// each of the bot's moves against the rules' legal moves, and stops the game when one is not legal. A reload in the
// middle keeps the game: the same moves, and the game goes on. The bot's visits are 32, so that a game takes minutes:
// the bot at 1 and 2 visits has its own test (apps/cyanotype/src/lib/practice/bot.engine.test.ts). The tests skip,
// with a message, when the preview has no practice bot: run `npm run engine` in apps/cyanotype before its build, as the
// Tests workflow does (design 33, "The engine's files"). In CI, they fail instead. A last test keeps a game whose
// network the site does not ship: the page drops it and shows the settings card. A game that another tab keeps while
// the engine loads does not replace the settings card. In a game, the confirm button of
// Abort and Resign has the blunder's red in both themes. A test with no bot checks the utility itself (`btn-danger`),
// so that it runs without the engine's files too. The last tests start Practice from a position: the Analysis board's
// "Play the bot from here" on a game's position and on a set-up start, a start that no game reaches, and the question
// when a start comes while a game is in progress. Run:
// npm run test:layout -- tests/cyanotype-practice.spec.ts, with CYANOTYPE_BASE_URL.
import { expect, test, type Page } from "./page-log.ts";
import { readFileSync } from "node:fs";
import { boardLink } from "../../cyanotype/src/lib/game/board.ts";
import { STANDARD_START, writePosition } from "../../cyanotype/src/lib/game/position.ts";
import type { SitePosition } from "../../cyanotype/src/lib/board/position.ts";
import { hexKey, parseHex, shift, TOUCHING } from "../../cyanotype/src/lib/board/hex.ts";
import { ENGINE_KEY } from "../../cyanotype/src/lib/site.ts";
import { LITE } from "./cyanotype-review.ts";

const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;
const STATUS = '[data-testid="practice-status"]';
const at = (path: string) => new URL(path, CYANOTYPE).href;

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

/** The game in progress, kept in this browser. */
const keptGame = (page: Page) => page.evaluate(() =>
  JSON.parse(localStorage.getItem("cyanotype:practice-game:1") ?? "null") as
    { moves: string[]; start?: string; brought?: number } | null);
const keptMoves = async (page: Page) => (await keptGame(page))?.moves ?? null;
/** The player's clicks, the same for each run (mulberry32). */
const seeded = (s: number) => () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
};
const listed = (page: Page) => page.locator(".movelist .mv").allTextContents();

type BotManifest = { artifacts: { kind: string; id: string }[] };
/** The practice bot's network in the preview's engine manifest. */
const modelOf = (manifest: BotManifest) => manifest.artifacts.find(a => a.kind === "model")!.id;

/** The preview's engine manifest. Skips the test when there is no preview, or when it has no practice bot. In CI, a
 *  preview with no practice bot is an error: the Tests workflow builds Cyanotype with its engine's files. */
async function botManifest(page: Page): Promise<BotManifest> {
  test.skip(!CYANOTYPE, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
  const manifest = await page.request.get(new URL("/engine/manifest.json", CYANOTYPE).href).then(r => r.json()).catch(() => null);
  const why = "Cyanotype's preview has no practice bot: run `npm run engine` in apps/cyanotype before its build";
  const bot = manifest?.artifacts?.some((a: { kind: string }) => a.kind === "practice-module");
  if (!bot && process.env.CI) throw new Error(why);
  test.skip(!bot, why);
  return manifest;
}

/** Keeps `value` in the browser's storage at `key` before the page's code runs, on each load from now on, as from an
 *  earlier visit. A write after page.goto can come before the first load's code reads the storage (abscls-z0jz):
 *  docs/working-notes.md, "A page's code runs after page.goto returns". */
const keepBefore = (page: Page, key: string, value: object) => page.addInitScript(([k, v]) => {
  try { localStorage.setItem(k, v); } catch { /* about:blank has no storage */ }
}, [key, JSON.stringify(value)]);

/** Opens Practice with the card's choices kept: the bot at 32 visits with the preview's network, and `more`. */
async function openWithChoices(page: Page, manifest: BotManifest, more: object = {}) {
  await page.setViewportSize({ width: 1376, height: 952 });
  await keepBefore(page, "cyanotype:practice-choices:1",
                   { bot: { network: modelOf(manifest), visits: 32, variety: "low" }, side: "random", name: "", ...more });
  await page.goto(at("/practice"));
}

/** Starts a game against the practice bot at 32 visits, the player on a side. */
async function startGame(page: Page, manifest: BotManifest, side: "Blue" | "Red") {
  await openWithChoices(page, manifest);
  await page.getByRole("button", { name: `Play as ${side}` }).click({ timeout: 60_000 });
}

for (const side of ["Blue", "Red"] as const) {
  test(`a whole game against Stamp Duty on Cyanotype, the player ${side}`, async ({ page }) => {
    const manifest = await botManifest(page);
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(String(e)));
    const random = seeded(side === "Blue" ? 1 : 2); // the same clicks for each run of a side
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
  await keepBefore(page, "cyanotype:practice-game:1", {
    version: 1, bot: { network: "no-such-network", visits: 32, variety: "low" }, human: 0, name: "", seed: 1,
    moves: ["1@-13,-1"], builds: [], started: new Date().toISOString(),
  });
  await page.goto(at("/practice"));
  await expect(page.getByRole("status").filter({ hasText: "does not have the network of your last game" }))
    .toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Play as Blue" })).toBeEnabled({ timeout: 60_000 });
  expect(await keptMoves(page)).toBeNull();
  expect(errors).toEqual([]);
});

// The shared start (@abstractclass/practice/page.svelte.ts), as on Hedge School's Practice (its practice-start.spec.ts):
// the page resumes a kept game only when it found one as it mounted. The engine's manifest waits until another tab
// has kept a game.
test("a game kept after the page mounts, while the engine loads, does not open: the settings card stays", async ({ page }) => {
  const network = modelOf(await botManifest(page));
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));
  let keptElsewhere = () => {};
  const kept = new Promise<void>(r => (keptElsewhere = r));
  await page.route("**/engine/manifest.json", async route => { await kept; await route.continue(); });
  await page.goto(at("/practice"));
  const blue = page.getByRole("button", { name: "Play as Blue" });
  await expect(blue).toBeDisabled({ timeout: 60_000 }); // the settings card, before the rules are loaded
  await page.evaluate(game => localStorage.setItem("cyanotype:practice-game:1", JSON.stringify(game)), {
    version: 1, bot: { network, visits: 8, variety: "low" }, human: 0, name: "", seed: 1, moves: [], builds: [],
    started: new Date().toISOString(),
  });
  keptElsewhere();
  await expect(blue).toBeEnabled({ timeout: 120_000 }); // the rules are loaded, and the card stays
  await expect(page.locator(STATUS)).toHaveCount(0);
  expect(await keptGame(page)).not.toBeNull(); // the other tab's game stays kept
  expect(errors).toEqual([]);
});

// The komi (Hedge School's design 24), from the shared card: a head start for the player or the bot, which the game's
// points count from the first position, and which the kept game keeps as Red's komi.
test("the komi on Cyanotype's card, and a game at it: the player's head start in the points from the start", async ({ page }) => {
  const manifest = await botManifest(page);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));
  await openWithChoices(page, manifest, { komi: 300 });
  await expect(page.locator("#komi")).toHaveValue("300", { timeout: 60_000 });
  await expect(page.locator("#komi-help")).toContainText("You start 300 points ahead.");
  await expect(page.getByText("Stamp Duty ahead", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Play as Blue" }).click({ timeout: 60_000 });
  expect(await turn(page)).toMatch(/^Your turn/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("cyanotype:practice-game:1")!).komi)).toBe(-300);
  // The bot's line: where it runs (the first of its forms that this browser runs), then the komi
  await expect(page.getByText(/, on (the GPU|the CPU workers|one thread)\. You start 300 points ahead\./)).toBeVisible();
  await expect(page.getByLabel("Players and scores").first()).toContainText(/You\s*300\s*points/);
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

// Practice from a position (Hedge School's design 24, item 4): the Analysis board's "Play the bot from here" opens
// Practice at the position on screen. A game's position goes to the bot as its moves from the standard start, and a
// set-up start as its own position, with the moves after it played. The moves brought are the game's start: a
// takeback stops there. A start that no game reaches starts no game, and the card gives the engine's reason. The
// positions are Stamp Duty's own (the lab's games, apps/cyanotype/src/lib/board/fixtures.json). The board's engine is
// off, and the bot runs on the CPU (LITE: the GPU off).
const fixtures = JSON.parse(readFileSync("../cyanotype/src/lib/board/fixtures.json", "utf8")).fixtures as
  { name: string; moves: string[]; position: SitePosition; legal: string[] }[];
const middle = fixtures.find(f => f.name === "A middle game")!; // Red's first move of turn 6, after 9 moves
const MIDDLE = writePosition(middle.position);
/** MIDDLE with a Red cell beside a Blue cell that is not a wall: a placement would have captured one of the two, so no
 *  game reaches it (cyanotype-editor.spec.ts makes the same position). */
const UNREACHED = (() => {
  const cells = middle.position.cells;
  const beside = (hex: string) => TOUCHING.map(d => hexKey(shift([parseHex(hex)], d)[0]));
  const blue = (hex: string) => cells[hex]?.[0] === 0 && cells[hex][1] !== "wall";
  for (const hex of Object.keys(cells).filter(blue)) {
    const free = beside(hex).find(h => !cells[h] && beside(h).filter(blue).length === 1);
    if (free) return writePosition({ ...middle.position, cells: { ...cells, [free]: [1, "plain"] } });
  }
  throw new Error("no empty hex beside one Blue cell");
})();
/** Why no game reaches UNREACHED, in the notices' words (checkProblem): the site's lead, then the engine's reason. */
const TOUCH = "Blue's cell on \\S+ touches Red's cell on \\S+, and neither is a wall: a placement captures each cell "
  + "of the opponent that touches it, except walls\\.";
const WHY = { it: `no game can reach it\\. ${TOUCH}`, its: `no game can reach its start\\. ${TOUCH}` };
const PLAY_HERE = { name: "Play the bot from here" };

/** The settings of a test from a position, for each page that opens: the board's engine off, the bot on the CPU, and
 *  the bot's choices at 8 visits, the player Red. Gives the bot's network. */
async function fromPosition(page: Page): Promise<string> {
  const network = modelOf(await botManifest(page));
  await page.setViewportSize({ width: 1376, height: 952 });
  await keepBefore(page, ENGINE_KEY, { ...LITE, on: false });
  await keepBefore(page, "cyanotype:practice-choices:1", { bot: { network, visits: 8, variety: "low" }, side: "red", name: "" });
  return network;
}

/** The player's turn, played whole by the seeded clicks: the moves that the status line gives, each kept before the
 *  next, then the bot's reply. */
async function playTurn(page: Page, player: 0 | 1, random: () => number) {
  const left = Number(/^Your turn: (\d) move/.exec(await turn(page))![1]);
  for (let k = 0; k < left; k++) {
    const n = (await keptGame(page))!.moves.length;
    await humanMove(page, player, random);
    await expect.poll(async () => (await keptGame(page))!.moves.length).toBeGreaterThan(n);
    await turn(page);
  }
}

test("Play the bot from here, on a game's position: its moves are the game's start, and a takeback stops at them", async ({ page }) => {
  await fromPosition(page);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(at(`/analysis#${new URLSearchParams({ record: middle.moves.join(" ") })}`));
  await page.getByRole("button", PLAY_HERE).click({ timeout: 120_000 });
  await expect(page).toHaveURL(/\/practice$/); // the start leaves the address
  await expect(page.getByText("The game starts after the record's 9 moves.")).toBeVisible({ timeout: 120_000 });
  await page.getByRole("button", { name: "Play as Red" }).click({ timeout: 60_000 });
  expect(await turn(page)).toMatch(/^Your turn: 2 moves\./); // Red's turn 6, the position on screen
  expect(await listed(page)).toHaveLength(9); // the record's moves, from the standard start
  expect(await keptGame(page)).toMatchObject({ moves: middle.moves, brought: 9 });
  expect((await keptGame(page))!.start).toBeUndefined();
  await expect(page.getByRole("button", { name: "Take back" })).toBeDisabled(); // nothing of the player's yet
  // The player's turn, then the bot's reply: a takeback undoes both, back to the start, and no further.
  await playTurn(page, 1, seeded(3));
  expect(await turn(page)).toMatch(/^Your turn/);
  expect((await keptGame(page))!.moves).toHaveLength(13);
  await page.getByRole("button", { name: "Take back" }).click();
  await expect.poll(async () => (await keptGame(page))!.moves).toEqual(middle.moves);
  expect(await turn(page)).toMatch(/^Your turn: 2 moves\./);
  await expect(page.getByRole("button", { name: "Take back" })).toBeDisabled();
  expect(errors).toEqual([]);
});

test("Play the bot from here, on a set-up start: the bot starts from it, and the game numbers its turns from it", async ({ page }) => {
  await fromPosition(page);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));
  // The board from the editor's position, with Red's first move of turn 6 played from it
  const move = middle.legal[0];
  await page.goto(boardLink(CYANOTYPE!, { version: 2, main: [move], nodes: [[move, -1]], start: MIDDLE }, 1));
  await page.getByRole("button", PLAY_HERE).click({ timeout: 120_000 });
  await expect(page.getByText("The game starts from the Analysis board's set-up position, after the record's 1 move."))
    .toBeVisible({ timeout: 120_000 });
  await page.getByRole("button", { name: "Play as Red" }).click({ timeout: 60_000 });
  expect(await turn(page)).toMatch(/^Your turn: 1 move\./);
  expect(await keptGame(page)).toMatchObject({ start: MIDDLE, moves: [move], brought: 1 });
  await expect(page.locator(".movelist").getByText("6.", { exact: true })).toBeVisible(); // the start's own turn
  await expect(page.getByRole("button", { name: "Take back" })).toBeDisabled();
  await playTurn(page, 1, seeded(5));
  expect(await turn(page)).toMatch(/^Your turn/);
  expect((await keptGame(page))!.moves).toHaveLength(4); // the move brought, the player's one, and the bot's two
  // A reload keeps the game: the bot starts from the set-up start again, with the moves played after it.
  const before = await listed(page);
  await page.reload();
  expect(await turn(page)).toMatch(/^Your turn/);
  expect(await listed(page)).toEqual(before);
  await page.getByRole("button", { name: "Take back" }).click();
  await expect.poll(async () => (await keptGame(page))!.moves).toEqual([move]);
  expect(await turn(page)).toMatch(/^Your turn: 1 move\./);
  await expect(page.getByRole("button", { name: "Take back" })).toBeDisabled();
  expect(errors).toEqual([]);
});

test("a start that no game reaches starts no practice game, and the card gives the engine's reason", async ({ page }) => {
  await fromPosition(page);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(at(`/practice#${new URLSearchParams({ position: UNREACHED })}`));
  await expect(page.getByRole("alert")).toHaveText(new RegExp(`^Practice cannot start from this position: ${WHY.it}$`),
                                                   { timeout: 120_000 });
  await expect(page.getByText(/^The game starts/)).toHaveCount(0);
  // A record from that start: refused too
  await page.goto("about:blank");
  await page.goto(at(`/practice#${new URLSearchParams({ position: UNREACHED, record: middle.legal[0] })}`));
  await expect(page.getByRole("alert")).toHaveText(new RegExp(`^Practice cannot start from this record: ${WHY.its}$`),
                                                   { timeout: 120_000 });
  expect(await keptGame(page)).toBeNull();
  // The card's game then starts from the standard start.
  await page.getByRole("button", { name: "Play as Red" }).click({ timeout: 60_000 });
  expect(await turn(page)).toMatch(/^Your turn/);
  const game = await keptGame(page);
  expect(game?.start).toBeUndefined();
  expect(game?.brought).toBeUndefined();
  expect(game?.moves).toHaveLength(1); // the bot's first move, as Blue
  expect(errors).toEqual([]);
});

test("a kept game from a start that no game reaches stops before the bot plays, in the card's words", async ({ page }) => {
  const network = await fromPosition(page);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));
  // The page checks a start brought, not a game kept in this browser: the game checks its own start before the bot.
  await keepBefore(page, "cyanotype:practice-game:1", {
    version: 1, bot: { network, visits: 8, variety: "low" }, human: 1, name: "", seed: 1, moves: [], builds: [],
    started: new Date().toISOString(), start: UNREACHED,
  });
  await page.goto(at("/practice"));
  expect(await turn(page)).toMatch(new RegExp(`^The game stopped: ${WHY.its}$`));
  expect((await keptGame(page))?.moves).toEqual([]); // the bot played no move
  expect(errors).toEqual([]);
});

test("the standard start in the address brings nothing, and a kept start that the engine cannot read stops the game", async ({ page }) => {
  const network = await fromPosition(page);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));
  // As on Hedge School's Practice: no line on the start brought, and no notice
  await page.goto(at(`/practice#${new URLSearchParams({ position: STANDARD_START })}`));
  await expect(page.getByRole("button", { name: "Play as Red" })).toBeEnabled({ timeout: 120_000 });
  await expect(page.getByText(/^The game starts/)).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  // The game stops with the engine's refusal, not the page, and Abort ends it
  await keepBefore(page, "cyanotype:practice-game:1", {
    version: 1, bot: { network, visits: 8, variety: "low" }, human: 1, name: "", seed: 1, moves: [], builds: [],
    started: new Date().toISOString(), start: "no position",
  });
  await page.goto(at("/practice"));
  expect(await turn(page)).toMatch(/^The game stopped: \S/);
  await page.getByRole("button", { name: "Abort", exact: true }).click();
  await page.getByRole("alertdialog", { name: "Abort" }).getByRole("button", { name: "Abort", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play as Red" })).toBeEnabled();
  expect(await keptGame(page)).toBeNull();
  expect(errors).toEqual([]);
});

test("a start brought while a game is in progress: the player chooses, and Go on with mine keeps the game", async ({ page }) => {
  await fromPosition(page);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(at("/practice"));
  await page.getByRole("button", { name: "Play as Red" }).click({ timeout: 60_000 });
  expect(await turn(page)).toMatch(/^Your turn/); // after the bot's first move, as Blue
  const inProgress = (await keptGame(page))!.moves;
  const bring = at(`/practice#${new URLSearchParams({ record: middle.moves.join(" ") })}`);
  await page.goto("about:blank");
  await page.goto(bring);
  const question = page.getByRole("dialog", { name: "Play from this position?" });
  await question.getByRole("button", { name: "Go on with mine" }).click({ timeout: 120_000 });
  expect(await turn(page)).toMatch(/^Your turn/);
  expect((await keptGame(page))!.moves).toEqual(inProgress);
  // Again, and Play from the position: the card, with the start brought, and no game in progress
  await page.goto("about:blank");
  await page.goto(bring);
  await question.getByRole("button", { name: "Play from the position" }).click({ timeout: 120_000 });
  await expect(page.getByText("The game starts after the record's 9 moves.")).toBeVisible();
  expect(await keptGame(page)).toBeNull();
  expect(errors).toEqual([]);
});
