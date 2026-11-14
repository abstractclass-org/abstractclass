// Each game's komi limit (design 24, item 15): a board's link and an analysis file beyond the komi that a record can
// give do not open on Hedge School's Analysis board, and the notice gives the limit in the record's words. A board kept
// in this browser beyond it (kept from a link before the link's check) gives way to a new board, with a notice, as on
// Cyanotype (design 33). A board brought then takes its place, and the notice names no new board. Each site's
// Notation page states the limit in its Komi row. The board's engine is off: the refusal comes before any search, and
// the board's analysis file shows the komi at which the board searches.
// Cyanotype's case runs when CYANOTYPE_BASE_URL gives its running preview. Run:
// npm run test:layout -- tests/komi-limit.spec.ts --project=chromium, with BASE_URL (and CYANOTYPE_BASE_URL).
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "./page-log.ts";
import { ANALYSIS_FILE_VERSION } from "../../../packages/analysis/src/files.ts";
import { BOARD_ID, boardOfLine, type KeptBoard } from "../../../packages/analysis/src/kept.ts";
import { NAME, STORES } from "../../../packages/storage/src/db.ts";
import { boardLink } from "../src/lib/game/board.ts";
import { fileInput } from "./review-file.ts";
import { CONSENT_KEY, ENGINE_KEY } from "../src/lib/keys.ts";

const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;

/** A context's script before each page: the visitor has answered the consent notice, and the engine is off. */
test.beforeEach(({ context }) => context.addInitScript(([consent, engine]) => {
  localStorage.setItem(consent, JSON.stringify({ games: "denied" }));
  localStorage.setItem(engine, JSON.stringify({ on: false, gpu: "off" }));
}, [CONSENT_KEY, ENGINE_KEY]));

/** A board of one move at `komi`. */
const board = (komi: number) => ({ version: 2 as const, main: ["D10-G10"], nodes: [["D10-G10", -1]] as [string, number][], komi });
/** The same board as this browser keeps it (kept.ts). */
const kept = (komi: number) => boardOfLine(["D10-G10"], undefined, komi);
/** The board's notice. */
const notice = (page: Page) => page.getByRole("alert");
/** The limit, in the record's words, with the komi beyond it. */
const LIMIT = "must be from -5,052 to 5,052 points: 6000.";
/** The kept board's notice under a board brought in its place: no new board is on screen. */
const KEPT_GONE = `The Analysis board cannot open your own analysis: its komi ${LIMIT}`;
const KEPT_REFUSED = `${KEPT_GONE} A new board is here instead.`;

/** Keeps `board` as this browser's Analysis board, as the page keeps it (@abstractclass/storage/db.ts). It writes from
 *  a static file of the site's origin, where none of the site's code opens the database meanwhile. */
async function keep(page: Page, board: KeptBoard) {
  await page.goto("/robots.txt");
  await page.evaluate(([name, stores, store, id, board]) => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open(name);
    open.onupgradeneeded = () => { for (const s of stores) open.result.createObjectStore(s); };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(store, "readwrite");
      tx.objectStore(store).put(board, id);
      tx.oncomplete = () => { open.result.close(); resolve(); };
      tx.onerror = tx.onabort = () => reject(tx.error);
    };
  }), [NAME, Object.values(STORES), STORES.branches, BOARD_ID, board] as const);
}
/** The board on screen, as its analysis file keeps it: every search asks at its komi. */
async function savedBoard(page: Page): Promise<{ komi?: number; nodes: unknown[] }> {
  await page.getByRole("button", { name: "Export" }).click();
  const [file] = await Promise.all([page.waitForEvent("download"),
                                    page.getByRole("menuitem", { name: /^Analysis file/ }).click()]);
  return JSON.parse(readFileSync((await file.path())!, "utf8")).board;
}
/** Loads an analysis file of the board at `komi` on the board's page. */
async function loadAnalysisFile(page: Page, komi: number) {
  const file = { format: "hedge-school-analysis", version: ANALYSIS_FILE_VERSION, exported: "", site: "x", board: board(komi), analyses: [] };
  await fileInput(page).setInputFiles({ name: "analysis.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) });
}
/** The moves in the board's move list. */
const moves = (page: Page) => page.locator("button.mv[data-path]");

test("a kept board at komi 6,000 does not open: a new board, with the notice, and no search at that komi", async ({ page }) => {
  // Before, the board opened it, and the engine searched at that komi with no error: its numbers meant nothing
  await keep(page, kept(6000));
  await page.goto("/analysis");
  await expect(notice(page)).toHaveText(KEPT_REFUSED, { timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
  await expect(moves(page)).toHaveCount(0);
  const saved = await savedBoard(page);
  expect(saved.komi).toBeUndefined();
  expect(saved.nodes).toEqual([]);
  // A look changes nothing: the kept board stays in the store until the new board's first change, as on Cyanotype
  await page.reload();
  await expect(notice(page)).toHaveText(KEPT_REFUSED, { timeout: 60_000 });
});

test("a kept board at komi 6,000 and a link within the limit: the link's board opens, with no question", async ({ page }) => {
  // The kept board cannot open, so the board does not ask to replace it, as on Cyanotype. The link's board is on
  // screen, so the notice does not say that a new board is here
  await keep(page, kept(6000));
  await page.goto(boardLink("", board(300), 0));
  await expect(notice(page)).toHaveText(KEPT_GONE, { timeout: 60_000 });
  await expect(moves(page)).toHaveCount(1, { timeout: 60_000 });
  await expect(page.getByRole("dialog", { name: "Replace your analysis?" })).toHaveCount(0);
  expect((await savedBoard(page)).komi).toBe(300);
});

test("a kept board at komi 6,000, then an analysis file within the limit: the file's board, and the short notice", async ({ page }) => {
  await keep(page, kept(6000));
  await page.goto("/analysis");
  await expect(notice(page)).toHaveText(KEPT_REFUSED, { timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
  await loadAnalysisFile(page, 300);
  await expect(moves(page)).toHaveCount(1, { timeout: 60_000 });
  await expect(notice(page)).toHaveText(KEPT_GONE);
  expect((await savedBoard(page)).komi).toBe(300);
});

test("a kept board at komi 6,000 and a link beyond the limit: both notices, the kept board's first", async ({ page }) => {
  await keep(page, kept(6000));
  await page.goto(boardLink("", board(6000), 0));
  await expect(notice(page)).toHaveText(`${KEPT_REFUSED} The Analysis board cannot load this link: the Komi tag ${LIMIT}`,
                                        { timeout: 60_000 });
  await expect(moves(page)).toHaveCount(0);
});

test("a kept board at the limit, komi 5,052, opens as before", async ({ page }) => {
  await keep(page, kept(5052));
  await page.goto("/analysis");
  await expect(moves(page)).toHaveCount(1, { timeout: 60_000 });
  await expect(notice(page)).toHaveCount(0);
  expect((await savedBoard(page)).komi).toBe(5052);
});

test("a link at komi 6,000 does not open on the Analysis board, and the notice gives the limit", async ({ page }) => {
  // Before, the board opened it
  await page.goto(boardLink("", board(6000), 0));
  await expect(notice(page)).toHaveText(`The Analysis board cannot load this link: the Komi tag ${LIMIT} Your own analysis ` +
    "is here instead.", { timeout: 60_000 });
});

test("an analysis file at komi 6,000 does not open on the Analysis board, and the notice gives the limit", async ({ page }) => {
  await page.goto("/analysis");
  await expect(page.getByRole("button", { name: "Export" })).toBeVisible({ timeout: 60_000 });
  await loadAnalysisFile(page, 6000);
  await expect(notice(page)).toHaveText("The Analysis board cannot load this file: the analysis file's komi must be " +
    "from -5,052 to 5,052 points: 6000.");
});

for (const [site, url, range] of [
  ["Hedge School", "/notation", "from -5,052 to 5,052 points"],
  ["Cyanotype", CYANOTYPE ? new URL("/notation", CYANOTYPE).href : "", "from -90,980 to 90,980 points"],
]) {
  test(`${site}'s Notation page states the komi's limit in its Komi row`, async ({ page }) => {
    test.skip(!url, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
    await page.goto(url);
    const komi = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "Komi", exact: true }) });
    await expect(komi).toContainText(`The engine takes a komi ${range}, so ${site} does not read a record beyond that.`);
  });
}
