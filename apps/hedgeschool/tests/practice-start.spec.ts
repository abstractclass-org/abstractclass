// Practice's start (design 24; the practice's page, @abstractclass/practice/page.svelte.ts): the page resumes a kept
// game only when it found one as it mounted. A game that another tab keeps while this tab's engine loads does not
// replace the settings card that the player sees, and a game that another tab ends meanwhile gives way to the card.
// The engine's manifest waits here until the other tab has kept or ended its game.
// Cyanotype's Practice has the same case (cyanotype-practice.spec.ts). Run:
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

// A kept game whose start the engine cannot read stops before its first position. The status line says why, as on
// Cyanotype's Practice (one order for both sites, page.svelte.ts's PracticeLine), and not that the bot starts.
test("a game that fails before its first position says why it stopped", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));
  await keepBefore(page, CONSENT_KEY, { games: "denied" });
  await keepBefore(page, GAME, keptPractice({ start: "no position" }));
  await page.goto("/practice");
  await expect(page.getByRole("status").filter({ hasText: /^The game stopped: \S/ })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("Starting HedgeFund…")).toHaveCount(0);
  expect(errors).toEqual([]);
});
