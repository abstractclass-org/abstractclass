// Practice's komi (design 24): the card's setting, a head start for the player or the bot; a game at a komi, whose
// points count it from the first position and whose kept game and record keep it; and its review, which reads the
// record's Komi tag. The bot runs on the CPU (the engine settings' GPU off, and playwright.config's switches), at 1
// visit a move. The review's engine is off: the review shows the game's positions, and searches nothing. Run:
// npm run test:layout -- tests/practice-komi.spec.ts --project=chromium, with BASE_URL.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const FIXTURE = "tests/fixtures/hedgefund-review.json";
const CHOICES = "hedge-school:practice-choices:1", GAME = "hedge-school:practice-game:1";
const NETWORK = "b10c128-s89066368-d17827487"; // HedgeFund 0.2 Lite, the card's first network

test.beforeEach(async ({ context }) => {
  // The visitor has answered the consent notice, which covers the page's foot until they choose. The engine's GPU is
  // off, and so is the review's engine.
  await context.addInitScript(() => {
    localStorage.setItem("hedge-school:consent:2", JSON.stringify({ analytics: "denied", games: "denied" }));
    localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false, gpu: "off" }));
  });
});

/** The players' row's text: each card's name and numbers. */
const row = (page: Page) => page.getByLabel(/^Players(,| and) scores/).first();

test("the card's komi: a head start for the player or the bot, and a number that the bot does not take", async ({ page }) => {
  await page.goto("/practice");
  const box = page.locator("#komi"), slider = page.getByRole("slider", { name: "Komi" }), help = page.locator("#komi-help");
  const blue = page.getByRole("button", { name: "Play as Blue" });
  await expect(blue).toBeEnabled({ timeout: 60_000 }); // the rules are loaded
  await expect(box).toHaveValue("0");
  await expect(help).toContainText("Neither side starts ahead, as in a game online.");
  await expect(page.getByText("HedgeFund ahead", { exact: true })).toBeVisible();
  await expect(page.getByText("You ahead", { exact: true })).toBeVisible();
  // A head start for the player, then for the bot
  await box.fill("300");
  await box.press("Enter");
  await expect(help).toContainText("You start 300 points ahead.");
  await expect(slider).toHaveValue("300");
  await box.fill("-250");
  await box.press("Enter");
  await expect(help).toContainText("HedgeFund starts 250 points ahead.");
  await expect(slider).toHaveValue("-250");
  // A number between two stops: the slider shows the stop nearest to it, and the komi is the number
  await box.fill("130");
  await box.press("Enter");
  await expect(help).toContainText("You start 130 points ahead.");
  await expect(slider).toHaveValue("150");
  // The slider by its stops of 50
  await slider.focus();
  await slider.press("ArrowLeft");
  await expect(box).toHaveValue("100");
  // A number outside the range, or not whole: the box keeps it with the range, and no side starts a game
  for (const wrong of ["3001", "2.5", "-3050"]) {
    await box.fill(wrong);
    await box.press("Enter");
    await expect(page.getByRole("alert")).toHaveText("Type a whole number from -3,000 to 3,000.");
    await expect(blue).toBeDisabled();
    await expect(help).toContainText("You start 100 points ahead."); // the komi stays as it was
  }
  await box.fill("-3000");
  await box.press("Enter");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(help).toContainText("HedgeFund starts 3,000 points ahead.");
  await expect(blue).toBeEnabled();
});

test("a game at a komi: the points count it from the start, the kept game and the record keep it, and its review reads it", async ({ page }) => {
  // A game kept from an earlier visit, the player Blue with a head start of 300 points: Red's komi is -300. Its 20
  // edges end at Blue's turn, so the page waits for the player.
  const moves = (JSON.parse(readFileSync(FIXTURE, "utf8")).record as string).replace(/\[[^\]]*\]/g, "").split(/\s+/)
    .filter(t => /^[A-T]\d+-[A-T]\d+$/.test(t)).slice(0, 20);
  await page.goto("/practice");
  await page.evaluate(([key, kept]) => localStorage.setItem(key, JSON.stringify(kept)), [GAME, {
    version: 1, bot: { network: NETWORK, visits: 1, variety: "low" }, human: 0, name: "", seed: 1, komi: -300,
    moves, builds: [], started: new Date().toISOString(),
  }] as const);
  await page.reload();
  await expect(page.getByRole("status").filter({ hasText: /^Your turn/ })).toBeVisible({ timeout: 120_000 });
  // The bot's line says who started ahead, and the start shows Blue's 300 points
  await expect(page.getByText(/HedgeFund 0\.2 Lite, 1 visit, Low variety, on .*\. You start 300 points ahead\./)).toBeVisible();
  await page.keyboard.press("Home");
  await expect(row(page)).toContainText(/You\s*300\s*points/);
  await expect(row(page)).toContainText(/HedgeFund 0\.2 Lite\s*0\s*points/);
  await page.keyboard.press("End");
  // The kept game keeps its komi; Resign ends the game, which goes into Your games with its Komi tag
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).komi, GAME)).toBe(-300);
  await page.getByRole("button", { name: "Resign" }).click();
  await page.getByRole("alertdialog", { name: "Resign" }).getByRole("button", { name: "Resign" }).click();
  const review = page.getByRole("link", { name: "Review the game" });
  await expect(review).toBeVisible({ timeout: 60_000 });
  const id = new URLSearchParams(new URL((await review.getAttribute("href"))!, page.url()).hash.slice(1)).get("game")!;
  const record = await page.evaluate(async id => {
    const db = await new Promise<IDBDatabase>((done, fail) => {
      const req = indexedDB.open("learn-enclosure");
      req.onsuccess = () => done(req.result);
      req.onerror = () => fail(req.error);
    });
    const game = await new Promise<{ record: string }>((done, fail) => {
      const req = db.transaction("games").objectStore("games").get(id);
      req.onsuccess = () => done(req.result);
      req.onerror = () => fail(req.error);
    });
    db.close();
    return game.record;
  }, id);
  expect(record).toContain('[Komi "-300"]');
  expect(record).toMatch(/\[Result "r\+R"\]/);
  // The review: the record's komi gives Blue its 300 points at the start, as in the game
  await review.click();
  await expect(row(page)).toBeVisible({ timeout: 60_000 });
  await page.keyboard.press("Home");
  await expect(row(page)).toContainText(/You\s*Blue\s*300\s*points/);
});
