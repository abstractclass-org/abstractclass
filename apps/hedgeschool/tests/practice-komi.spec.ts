// Practice's komi (design 24). The card's setting gives a head start to the player or to the bot. A game at a komi
// counts it in the points from the first position, and its kept game and its record keep it. Its review reads the
// record's Komi tag and takes nothing from the opening book but the Book tab, whose "Study in Openings" carries the
// komi to Openings' note. The Analysis board's record and analysis file at a komi go out and come back in. The bot
// runs on the CPU (the engine settings' GPU off, and playwright.config's switches), at 1 visit a move. The review's
// engine is off: the review shows the game's positions and its stored results, and searches nothing. Run:
// npm run test:layout -- tests/practice-komi.spec.ts --project=chromium, with BASE_URL.
import { readFileSync } from "node:fs";
import { expect, test, type Page, type Request } from "./page-log.ts";
import { loadReviewFile } from "./review-file.ts";

const FIXTURE = "tests/fixtures/hedgefund-review.json";
const GAME = "hedge-school:practice-game:1";
const NETWORK = "b10c128-s89066368-d17827487"; // HedgeFund 0.2 Lite, the card's first network

/** The fixture game's edges: its first `count`, or all 120. */
const fixtureMoves = (count?: number) => (JSON.parse(readFileSync(FIXTURE, "utf8")).record as string)
  .replace(/\[[^\]]*\]/g, "").split(/\s+/).filter(t => /^[A-T]\d+-[A-T]\d+$/.test(t)).slice(0, count);

/** Keeps a game of `moves` in Practice, as from an earlier visit, then reloads the page, which goes on with it: the
 *  player Blue, the bot at 1 visit a move, and Red's komi `komi`. It waits first for the settings card: the first
 *  load's code, when it starts after the write, plays the game too, and can end a whole game before the reload
 *  (docs/working-notes.md, "A page's code runs after page.goto returns"). */
async function keepGame(page: Page, komi: number, moves: string[]) {
  await expect(page.getByRole("button", { name: "Play as Blue" })).toBeVisible({ timeout: 60_000 });
  await page.evaluate(([key, kept]) => localStorage.setItem(key, JSON.stringify(kept)), [GAME, {
    version: 1, bot: { network: NETWORK, visits: 1, variety: "low" }, human: 0, name: "", seed: 1, komi,
    moves, builds: [], started: new Date().toISOString(),
  }] as const);
  await page.reload();
}

/** A context's script before each page: the visitor has answered the consent notice, which covers the page's foot until
 *  they choose. The engine's GPU is off, and so is the review's engine. */
const answeredAndOff = () => {
  localStorage.setItem("hedge-school:consent:2", JSON.stringify({ games: "denied" }));
  localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false, gpu: "off" }));
};
test.beforeEach(({ context }) => context.addInitScript(answeredAndOff));

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
  await page.goto("/practice");
  await keepGame(page, -300, fixtureMoves(20));
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

test("the Analysis board at a komi: its annotated record and its analysis file keep the komi, and each opens at it", async ({ page, browser }) => {
  // A record with Red's komi -300 opens on the board: Blue starts 300 points ahead
  const atKomi = '[Komi "-300"]\n\n1. D10-G10 2. N11-Q10 L10-N11 *';
  /** Waits for the board, and checks that its start gives Blue the komi's 300 points. */
  const atStart = async (p: Page) => {
    await expect(row(p)).toBeVisible({ timeout: 60_000 });
    await p.keyboard.press("Home");
    await expect(row(p)).toContainText(/Blue\s*300\s*points/, { timeout: 60_000 });
  };
  await page.goto(`/analysis#${new URLSearchParams({ record: atKomi })}`);
  await atStart(page);
  /** The file that an entry of the board's Export menu saves, as text. */
  const exported = async (entry: RegExp) => {
    await page.getByRole("button", { name: "Export" }).click();
    const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: entry }).click()]);
    return readFileSync((await file.path())!, "utf8");
  };
  const record = await exported(/^Annotated record as a file/), analysis = await exported(/^Analysis file/);
  expect(record).toContain('[Komi "-300"]');
  expect(JSON.parse(analysis).board.komi).toBe(-300);
  // Back in, in another browser: the record, then the analysis file, each in a new store
  const another = async () => {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    await context.addInitScript(answeredAndOff);
    return { context, page: await context.newPage() };
  };
  const first = await another();
  await first.page.goto(`/analysis#${new URLSearchParams({ record })}`);
  await atStart(first.page);
  await first.context.close();
  const second = await another();
  await second.page.goto("/analysis");
  await expect(row(second.page)).toBeVisible({ timeout: 60_000 });
  await second.page.locator('input[type="file"][accept*="json"]')
    .setInputFiles({ name: "analysis.json", mimeType: "application/json", buffer: Buffer.from(analysis) });
  await atStart(second.page); // the page reloads at the file's lines
  await second.context.close();
});

// The review of a game at a komi takes nothing from the opening book but the Book tab (design 24): the book is the
// engine's at komi 0. The fixture's whole game (120 edges, over by the rules), kept with the player Blue at `komi`, and
// its review; and the fixture's review file at a komi, whose moves have their labels. The test book is served by the
// dev and preview servers only, and the review shows the book in the early edition only: elsewhere these tests are
// skipped.
test.describe("the opening book at a komi", () => {
  test.use({ viewport: { width: 1366, height: 900 } }); // three columns: the Report beside the board

  /** The move list's book marks (their names: "Book move · … after it"), the Report's opening row, and the Book tab's
   *  line at a komi. */
  const bookMarks = (page: Page) => page.getByRole("img", { name: /^Book move · / });
  const OPENING = "The game followed the book to its end, at turn 3. Blue is slightly better. Show the position";
  const KOMI_LINE = "The book moves and their values are the engine's at komi 0, not at this game's komi.";
  /** Openings' note on a record with a komi. */
  const KOMI_NOTE = "The opening book is at komi 0. Openings does not use the komi of this record.";
  /** A quality label's badge, whose name is its word. */
  const LABEL_WORDS = /^(Best|Great|Excellent|Good|Inaccuracy|Mistake|Blunder)$/;

  /** Opens `path`, and skips the test where the site serves no test book or the page is not the early edition's. */
  async function openWithBook(page: Page, path: string) {
    test.setTimeout(240_000);
    const served = await page.request.get("/test-book/prototype/index.json");
    test.skip(!served.ok() || !(served.headers()["content-type"] ?? "").includes("json"), "the site serves no test book");
    await page.goto(path);
    test.skip(!(await page.getByRole("link", { name: "Early Access" }).count()), "not the early edition");
  }
  /** Watches the test book's loads from now on: the function that it gives is true once no load is open and none
   *  started or ended for half a second. */
  function bookLoads(page: Page): () => boolean {
    let open = 0, last = Date.now();
    const count = (step: number) => (r: Request) => {
      if (r.url().includes("/test-book/")) { open += step; last = Date.now(); }
    };
    page.on("request", count(1));
    page.on("requestfinished", count(-1));
    page.on("requestfailed", count(-1));
    return () => open === 0 && Date.now() - last >= 500;
  }
  /** Keeps the fixture's whole game in Practice at `komi`, then opens its review from the game's end. It gives
   *  bookLoads' function. */
  async function reviewKept(page: Page, komi: number): Promise<() => boolean> {
    await openWithBook(page, "/practice");
    await keepGame(page, komi, fixtureMoves());
    const review = page.getByRole("link", { name: "Review the game" });
    await expect(review).toBeVisible({ timeout: 120_000 });
    const idle = bookLoads(page);
    await review.click();
    await expect(row(page)).toBeVisible({ timeout: 60_000 });
    return idle;
  }
  /** The display setting "Book moves", with the display settings open. */
  async function bookMovesSetting(page: Page) {
    await page.getByRole("button", { name: "Display settings" }).click();
    const settings = page.getByRole("region", { name: "Display settings" });
    await expect(settings.getByRole("radiogroup", { name: "Quality labels" })).toBeVisible();
    return settings.getByRole("radiogroup", { name: "Book moves" });
  }
  /** "Study in Openings" from the Book tab after the first edge, a book move, then Openings, open there. */
  async function studyAfterFirst(page: Page) {
    await bookAtStart(page);
    await page.keyboard.press("ArrowRight");
    await page.getByRole("link", { name: "Study in Openings" }).click();
    await page.waitForURL(/\/openings$/);
    await expect(page.getByRole("region", { name: "Opening book" }).locator("tbody tr").first()).toBeVisible({ timeout: 60_000 });
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
    // "Study in Openings" carries the komi, so Openings says that its book is at komi 0
    await studyAfterFirst(page);
    await expect(page.getByRole("status").filter({ hasText: KOMI_NOTE })).toBeVisible();
  });

  test("at komi 0: the Opening section and the book marks as before, and no line on the komi", async ({ page }) => {
    await reviewKept(page, 0);
    await expect(page.getByRole("button", { name: OPENING })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Opening", { exact: true })).toBeVisible();
    await expect(bookMarks(page).first()).toBeVisible({ timeout: 30_000 });
    const table = await bookAtStart(page);
    await expect(table.locator("tbody tr").first()).toBeVisible();
    await expect(table.getByText(KOMI_LINE)).toHaveCount(0);
    await expect(await bookMovesSetting(page)).toBeVisible();
  });

  test("a reviewed game at a komi: its moves have their labels, none a book mark, and no setting Book moves", async ({ page }) => {
    // The fixture's review file with its game at Red's komi -400: the record's Komi tag, and each stored result's key
    // with the komi's word before the moves (cache.ts, keyMoves). Its values are the file's at komi 0, so each move has
    // its label, and a book move would have its mark there, as the same file shows at komi 0 (book-review.spec.ts).
    const file = JSON.parse(readFileSync(FIXTURE, "utf8"));
    file.record = (file.record as string).replace("\n\n", '\n[Komi "-400"]\n\n');
    file.analyses = (file.analyses as [string, unknown][]).map(([key, value]) => {
      const at = key.lastIndexOf("|") + 1, moves = key.slice(at);
      return [`${key.slice(0, at)}komi=-400${moves ? ` ${moves}` : ""}`, value];
    });
    // "Review by" edge: each edge has its label in its own button in the move list
    await page.addInitScript(() => localStorage.setItem("learn-enclosure:review-display:1", JSON.stringify({ judge: "edge" })));
    await openWithBook(page, "/review");
    const idle = bookLoads(page);
    await loadReviewFile(page, { name: "komi-review.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) });
    await page.getByText("Accuracy").first().waitFor({ timeout: 60_000 });
    await page.keyboard.press("Home");
    await expect(row(page)).toContainText(/Blue\s*400\s*points/); // the review is at the komi
    // The moves are judged: the badges show (G9-G10's Inaccuracy, for one), and the first edge, A10-D9, a book move at
    // komi 0, has its loss, where a judged book move has its book mark at komi 0. None has a mark once each load of the
    // book has ended.
    await expect(page.locator(".mv").getByRole("img", { name: LABEL_WORDS }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".mv", { hasText: "A10-D9" }).first()).toHaveText(/^A10-D9\s*0$/);
    await expect.poll(idle, { timeout: 30_000 }).toBe(true);
    await expect(bookMarks(page)).toHaveCount(0);
    await expect(page.getByText("Opening", { exact: true })).toHaveCount(0);
    await expect(await bookMovesSetting(page)).toHaveCount(0);
  });
});
