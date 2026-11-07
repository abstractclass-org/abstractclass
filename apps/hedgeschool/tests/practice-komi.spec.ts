// Practice's komi (design 24): the card's setting, a head start for the player or the bot; a game at a komi, whose
// points count it from the first position and whose kept game and record keep it; and its review, which reads the
// record's Komi tag and takes nothing from the opening book but the Book tab. The bot runs on the CPU (the engine
// settings' GPU off, and playwright.config's switches), at 1 visit a move. The review's engine is off: the review shows
// the game's positions, and searches nothing. Run:
// npm run test:layout -- tests/practice-komi.spec.ts --project=chromium, with BASE_URL.
import { readFileSync } from "node:fs";
import { expect, test, type Page, type Request } from "@playwright/test";

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

// The review of a game at a komi takes nothing from the opening book but the Book tab (design 24): the book is the
// engine's at komi 0. The fixture's whole game (120 edges, over by the rules), kept with the player Blue at `komi`, and
// its review. The test book is served by the dev and preview servers only, and the review shows the book in the early
// edition only: elsewhere these tests are skipped.
test.describe("the opening book at a komi", () => {
  test.use({ viewport: { width: 1366, height: 900 } }); // three columns: the Report beside the board

  /** The move list's book marks (their names: "Book move · … after it"), the Report's opening row, and the Book tab's
   *  line at a komi. */
  const bookMarks = (page: Page) => page.getByRole("img", { name: /^Book move · / });
  const OPENING = "The game followed the book to its end, at turn 3. Blue is slightly better. Show the position";
  const KOMI_LINE = "The book moves and their values are the engine's at komi 0, not at this game's komi.";

  /** Keeps the fixture's whole game in Practice at `komi`, then opens its review from the game's end. It gives a function
   *  that is true once no load of the test book is open and none started or ended for half a second. */
  async function reviewKept(page: Page, komi: number): Promise<() => boolean> {
    test.setTimeout(240_000);
    const served = await page.request.get("/test-book/prototype/index.json");
    test.skip(!served.ok() || !(served.headers()["content-type"] ?? "").includes("json"), "the site serves no test book");
    const moves = (JSON.parse(readFileSync(FIXTURE, "utf8")).record as string).replace(/\[[^\]]*\]/g, "").split(/\s+/)
      .filter(t => /^[A-T]\d+-[A-T]\d+$/.test(t));
    await page.goto("/practice");
    test.skip(!(await page.getByRole("link", { name: "Early Access" }).count()), "not the early edition");
    await page.evaluate(([key, kept]) => localStorage.setItem(key, JSON.stringify(kept)), [GAME, {
      version: 1, bot: { network: NETWORK, visits: 1, variety: "low" }, human: 0, name: "", seed: 1, komi,
      moves, builds: [], started: new Date().toISOString(),
    }] as const);
    await page.reload();
    const review = page.getByRole("link", { name: "Review the game" });
    await expect(review).toBeVisible({ timeout: 120_000 });
    let open = 0, last = Date.now();
    const count = (step: number) => (r: Request) => {
      if (r.url().includes("/test-book/")) { open += step; last = Date.now(); }
    };
    page.on("request", count(1));
    page.on("requestfinished", count(-1));
    page.on("requestfailed", count(-1));
    await review.click();
    await expect(row(page)).toBeVisible({ timeout: 60_000 });
    return () => open === 0 && Date.now() - last >= 500;
  }
  /** The Book tab at the start, a book position. */
  async function bookAtStart(page: Page) {
    await page.keyboard.press("Home");
    await page.getByRole("group", { name: "The table shows" }).getByRole("button", { name: "Book" }).click({ timeout: 30_000 });
    return page.getByRole("region", { name: "Opening book" });
  }

  test("at komi -400: no Opening section and no book mark, and the Book tab says its values are at komi 0", async ({ page }) => {
    const idle = await reviewKept(page, -400);
    const table = await bookAtStart(page);
    await expect(row(page)).toContainText(/You\s*Blue\s*400\s*points/); // the review is at the komi
    await expect(table.getByText(KOMI_LINE)).toBeVisible();
    await expect(table.locator("tbody tr").first()).toBeVisible(); // the book's rows: the book has loaded
    // Each load of the book has ended: a row or a mark from it would show by now
    await page.keyboard.press("End");
    await expect.poll(idle, { timeout: 30_000 }).toBe(true);
    await expect(page.getByText("Opening", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^The game followed the book/ })).toHaveCount(0);
    await expect(bookMarks(page)).toHaveCount(0);
  });

  test("at komi 0: the Opening section and the book marks as before, and no line on the komi", async ({ page }) => {
    await reviewKept(page, 0);
    await expect(page.getByRole("button", { name: OPENING })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Opening", { exact: true })).toBeVisible();
    await expect(bookMarks(page).first()).toBeVisible({ timeout: 30_000 });
    const table = await bookAtStart(page);
    await expect(table.locator("tbody tr").first()).toBeVisible();
    await expect(table.getByText(KOMI_LINE)).toHaveCount(0);
  });
});
