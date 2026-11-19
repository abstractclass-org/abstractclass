// Practice's start (design 24; the practice's page, @abstractclass/practice/page.svelte.ts): the page resumes a kept
// game only when it found one as it mounted. A game that another tab keeps while this tab's engine loads does not
// replace the settings card that the player sees, and a game that another tab ends meanwhile gives way to the card.
// The engine's manifest waits here until the other tab has kept or ended its game.
// Cyanotype's Practice has the same case (cyanotype-practice.spec.ts). A record brought that the page refuses while a
// game is in progress keeps its notice beside the game, which goes on. A kept game's set-up start that no game reaches
// stops the game before the bot gets anything, as Cyanotype's does. Run:
// npm run test:layout -- tests/practice-start.spec.ts --project=chromium, with BASE_URL.
import { keepBefore } from "./keep-before.ts";
import { expect, test } from "./page-log.ts";
import { CONSENT_KEY, PRACTICE_GAME_KEY as GAME } from "../src/lib/keys.ts";

/** A kept game (hedgefund.ts, KeptPractice) with no moves, the player Blue, and `more`. */
const keptPractice = (more: object = {}) => ({
  version: 1, bot: { network: "b10c128-s89066368-d17827487", visits: 1, variety: "low" }, human: 0, name: "", seed: 1,
  moves: [], builds: [], started: new Date().toISOString(), ...more,
});

test("a game kept after the page mounts, while the engine loads, does not open: the settings card stays", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));
  await keepBefore(page, CONSENT_KEY, { games: "denied" });
  let keptElsewhere = () => {};
  const kept = new Promise<void>(r => (keptElsewhere = r));
  await page.route("**/engine/manifest.json", async route => { await kept; await route.continue(); });
  await page.goto("/practice");
  const blue = page.getByRole("button", { name: "Play as Blue" });
  await expect(blue).toBeDisabled({ timeout: 60_000 }); // the settings card, before the rules are loaded
  // Another tab starts a game now.
  await page.evaluate(([key, game]) => localStorage.setItem(key, JSON.stringify(game)), [GAME, keptPractice()] as const);
  keptElsewhere();
  await expect(blue).toBeEnabled({ timeout: 120_000 }); // the rules are loaded, and the card stays
  await expect(page.getByRole("button", { name: "Abort" })).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), GAME)).not.toBeNull(); // the other tab's game stays kept
  expect(errors).toEqual([]);
});

// The other way round: the page found a game as it mounted, and another tab ends it while the engine loads. The page
// shows the settings card, not a game that never starts.
test("a game that another tab ends while the engine loads gives way to the settings card", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));
  await keepBefore(page, CONSENT_KEY, { games: "denied" });
  await keepBefore(page, GAME, keptPractice());
  let endedElsewhere = () => {};
  const ended = new Promise<void>(r => (endedElsewhere = r));
  await page.route("**/engine/manifest.json", async route => { await ended; await route.continue(); });
  await page.goto("/practice");
  await expect(page.getByRole("button", { name: "Abort" })).toBeVisible({ timeout: 60_000 }); // the game found
  await page.evaluate(key => localStorage.removeItem(key), GAME); // another tab ends it
  endedElsewhere();
  await expect(page.getByRole("button", { name: "Play as Blue" })).toBeEnabled({ timeout: 120_000 });
  await expect(page.getByRole("button", { name: "Abort" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

// A kept game whose start the engine cannot read stops before its first position: the bot refuses the start. The
// status line says why, in the site's words (practice.ts, stoppedLine), as on Cyanotype's Practice (one order for both
// sites, page.svelte.ts's PracticeLine), and not that the bot starts. The bot's message goes into the report only.
test("a game that fails before its first position says why it stopped", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));
  await keepBefore(page, CONSENT_KEY, { games: "denied" });
  await keepBefore(page, GAME, keptPractice({ start: "no position" }));
  await page.goto("/practice");
  const stopped = "HedgeFund cannot continue this game. Abort the game. Then start a new game.";
  await expect(page.getByRole("status").filter({ hasText: stopped })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("The game stopped")).toHaveCount(0);
  await expect(page.getByText("Starting HedgeFund…")).toHaveCount(0);
  expect(errors).toEqual([]);
});

// A record brought that the page refuses (here, a game of other rules: import.ts, variantProblem) starts nothing. The
// game in progress goes on, and the notice says why, beside it, until a new game starts.
test("a record refused while a game is in progress keeps its notice beside the game, which goes on", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));
  await keepBefore(page, CONSENT_KEY, { games: "denied" });
  await keepBefore(page, GAME, keptPractice()); // the player Blue, to move
  await page.goto(`/practice#${new URLSearchParams({ record: '[Rules "Other"]\n\n1. A10-B10' })}`);
  await expect(page.getByRole("status").filter({ hasText: /^Your turn/ })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole("alert")).toHaveText(
    "Practice cannot start from this record: This game uses other rules (Other). Practice plays games of the online rules only.");
  await expect(page.getByRole("button", { name: "Abort" })).toBeVisible();
  expect(errors).toEqual([]);
});

/** A set-up start that no game reaches: Blue has two edges, and no edge has been played (the engine's position check,
 *  its reason `start`). Blue, the bot, is to move. */
const UNREACHED = "A1-B2,A10-D10 Q10-T10 b1 0/0 0";

// The page checks a record brought, not a game kept in this browser: the game checks its own start with the rules
// before the bot gets it (game/check.ts, startProblem). The status line gives the bot's refusal in the site's words, and
// the check's words go into the report only. The bot gets no command, so it plays no move.
test("a kept game from a start that no game reaches stops before the bot gets it", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));
  await keepBefore(page, CONSENT_KEY, { games: "denied" });
  await keepBefore(page, GAME, keptPractice({ human: 1, start: UNREACHED }));
  await page.addInitScript(() => { // each command that goes to the bot's worker (botWorker.ts's form)
    const sent: string[] = ((window as unknown as { botCommands: string[] }).botCommands = []);
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (this: Worker, ...args: Parameters<Worker["postMessage"]>) {
      const m = args[0] as { type?: string; line?: string } | null;
      if (m?.type === "command" && m.line) sent.push(m.line);
      return (post as (...a: unknown[]) => void).apply(this, args);
    } as Worker["postMessage"];
  });
  await page.goto("/practice");
  const stopped = "HedgeFund cannot continue this game. Abort the game. Then start a new game.";
  await expect(page.getByRole("status").filter({ hasText: stopped })).toBeVisible({ timeout: 120_000 });
  expect(await page.evaluate(() => (window as unknown as { botCommands: string[] }).botCommands)).toEqual([]);
  const kept = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), GAME);
  expect(kept).toMatchObject({ start: UNREACHED, moves: [] });
  expect(errors).toEqual([]);
});
