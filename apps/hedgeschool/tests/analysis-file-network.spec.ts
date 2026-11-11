// The Analysis board's own network from an analysis file (design 21, item 11), in a real browser, on both sites. A
// file of one network opens with that network while the browser's setting is another, so its results show with no
// search, and the engine panel says so. A reload keeps the board's network, and the settings kept in the browser keep
// theirs for every other page. A network chosen in the panel is the board's only. A file of several networks, or of
// a network that the site does not have, asks first, and Cancel keeps the board.
// The files come from the review fixtures. Hedge School's: tests/fixtures/hedgefund-review.json, whose results are of
// HedgeFund 0.1 Lite, an earlier network that the site still ships, with the engine field that the board writes.
// Cyanotype's: its stored review (STORED, cyanotype-fixture.ts), with no engine field, as a file written before the
// field. Cyanotype ships one network, so the browser's setting cannot be another, and no file can hold two of its
// networks: its cases are a file of its network and a file of a network that it does not have. A file of one network
// opens at a desktop's width and at a phone's, the board's two layouts. The engine runs on the CPU, and searches only
// where the cases check that it does not. Cyanotype's cases run when CYANOTYPE_BASE_URL gives its preview with the
// engine's files. Run: npm run test:layout -- tests/analysis-file-network.spec.ts --project=chromium, with BASE_URL (and
// CYANOTYPE_BASE_URL).
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { ANALYSIS_FILE_VERSION } from "../../../packages/analysis/src/files.ts";
import { readAnalysisKey } from "../../../packages/analysis/src/cache.ts";
import { BOARD_ID, boardOfLine, type KeptBoard } from "../../../packages/analysis/src/kept.ts";
import { NAME, STORES } from "../../../packages/storage/src/db.ts";
import { boardLink } from "../src/lib/game/board.ts";
import { parseRecord } from "../src/lib/game/record.ts";
import { parseRecord as parseCyanotypeRecord } from "../../cyanotype/src/lib/game/record.ts";
import { ENGINE_KEY as CYANOTYPE_ENGINE } from "../../cyanotype/src/lib/site.ts";
import { CYANOTYPE, LITE, expectNoSearch, keptResults, noReview, readStored, testRecord } from "./cyanotype-review.ts";
import { fileInput } from "./review-file.ts";

/** Hedge School's keys in local storage: the engine's settings, the display settings, and the consent notice's
 *  answer. */
const ENGINE = "learn-enclosure:engine:2", DISPLAY = "learn-enclosure:review-display:1", CONSENT = "hedge-school:consent:2";
/** The layout test's reviewed game, with its review's network and results (HedgeFund 0.1 Lite's). */
const FIXTURE = JSON.parse(readFileSync(new URL("fixtures/hedgefund-review.json", import.meta.url), "utf8")) as
  { record: string; review: { network: string; networkName: string; model: string }; analyses: [string, unknown][] };
/** Hedge School's networks, from its engine lock. */
const LOCK = JSON.parse(readFileSync(new URL("../engine.lock.json", import.meta.url), "utf8")) as
  { artifacts: { id: string; kind: string; sha256: string; displayName?: string }[] };
const network = (name: string) => LOCK.artifacts.find(a => a.kind === "model" && a.displayName === name)!;
const FULL = network("HedgeFund 0.2"), LITE_02 = network("HedgeFund 0.2 Lite");
/** HedgeFund 0.2 Lite's choice in the Network setting: its name, then its download, with no-break spaces. */
const LITE_02_RADIO = /^HedgeFund\s0\.2\sLite\s\(/;
/** The name of Cyanotype's network `id`, from its engine lock: it ships one network. */
const CYANOTYPE_LOCK = JSON.parse(readFileSync(new URL("../../cyanotype/engine.lock.json", import.meta.url), "utf8")) as
  typeof LOCK;
const cyanotypeName = (id: string) => CYANOTYPE_LOCK.artifacts.find(a => a.id === id)!.displayName!;
/** The widths of a desktop and of a phone. */
const WIDTHS = [{ width: 1376, height: 900 }, { width: 390, height: 844 }];

/** An analysis file of the site's `format`, as the board's Load takes it: the board `board`, the results `analyses`,
 *  and the engine field `engine` when given. */
function analysisFile(format: string, board: KeptBoard, analyses: [string, unknown][], engine?: object) {
  const file = { format, version: ANALYSIS_FILE_VERSION, exported: "", site: "x", ...(engine ? { engine } : {}), board, analyses };
  return { name: "analysis.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) };
}
/** The results `analyses` as another network's, whose file's SHA-256 is `model`: the keys name it in their place. */
const asModel = (analyses: [string, unknown][], model: string) => analyses.map(([key, value]): [string, unknown] => {
  const k = readAnalysisKey(key);
  return [key.replace(`|${k.model}|`, `|${model}|`), value];
});

/** Hedge School's file of the reviewed game's line with its results, which names their network, as the board writes
 *  it (files.ts, fileEngine). */
const HS_BOARD = boardOfLine(parseRecord(FIXTURE.record).moves);
const HS_FILE = analysisFile("hedge-school-analysis", HS_BOARD, FIXTURE.analyses, {
  network: FIXTURE.review.network, networkName: FIXTURE.review.networkName, model: FIXTURE.review.model,
  search: readAnalysisKey(FIXTURE.analyses[0][0]).search });

/** Counts what a page asks of the engine's workers, as cyanotype-review.ts counts it for expectNoSearch: every
 *  message, and the searches among them (a message `search`, or a `call` whose request is an analysis). */
function countEngineWork() {
  const work = { messages: 0, searches: 0 };
  (window as unknown as { engineWork: typeof work }).engineWork = work;
  const post = Worker.prototype.postMessage as (this: Worker, ...args: unknown[]) => void;
  Worker.prototype.postMessage = function (this: Worker, ...args: unknown[]) {
    const { type, request } = (args[0] ?? {}) as { type?: string; request?: { id?: string } };
    work.messages++;
    if (type === "search" || (type === "call" && request?.id === "a")) work.searches++;
    post.apply(this, args);
  };
}

/** Keeps `settings` (keys and values) in the local storage of the site at `origin`, once, from its About page: a
 *  change that a page makes later stays. Each page that opens next counts what it asks of the engine's workers. */
async function keep(page: Page, origin: string, settings: Record<string, object>) {
  await page.addInitScript(countEngineWork);
  await page.goto(new URL("/about", origin).href);
  await page.evaluate(s => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, settings);
}
/** The network of the engine's settings kept in the browser, read on the site's About page at `origin`: another page. */
async function browserNetwork(page: Page, origin: string, key: string): Promise<string> {
  await page.goto(new URL("/about", origin).href);
  return page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? "{}").network, key);
}
/** The network that the Analysis board keeps with its tree (KeptBoard's `network`). */
const keptNetwork = (page: Page) => page.evaluate(([name, store, id]) => new Promise<string | undefined>((resolve, reject) => {
  const open = indexedDB.open(name);
  open.onerror = () => reject(open.error);
  open.onsuccess = () => {
    const get = open.result.transaction(store).objectStore(store).get(id);
    get.onsuccess = () => { open.result.close(); resolve(get.result?.network); };
    get.onerror = () => reject(get.error);
  };
}), [NAME, STORES.branches, BOARD_ID] as const);

/** Waits until the Analysis board shows: its view, no longer its skeleton. A page that opens a board it has loaded
 *  before (a file's, a reload) takes the rules' worker alone, and shows the board within `timeout`. A board that stays
 *  on its skeleton, or an error page, fails. */
const boardShows = (page: Page, timeout = 90_000) =>
  expect(page.locator("main.review:not([aria-busy])")).toBeVisible({ timeout });
/** Opens the Analysis board of the site at `origin`, then loads `file` with its New menu's Load. The page loads again
 *  with the file's lines and network. */
async function loadOnBoard(page: Page, origin: string, file: ReturnType<typeof analysisFile>) {
  await page.goto(new URL("/analysis", origin).href);
  await boardShows(page, 180_000); // the page's first load in the browser
  await Promise.all([page.waitForEvent("load", { timeout: 60_000 }), fileInput(page).setInputFiles(file)]);
}
/** Checks that the board shows the result of its position from the store and asks the engine for no search: the
 *  engine has its network, the position's candidates show, and the count saw no search a moment later. */
async function resultsWithNoSearch(page: Page) {
  await boardShows(page);
  const line = page.getByRole("progressbar", { name: "This position's search" }).locator("..");
  await expect(line).toContainText("visits", { timeout: 180_000 }); // the engine's network is loaded
  await expect(page.locator("table").filter({ hasText: "Visits" }).first().locator("[data-name]").first()).toBeAttached();
  await page.waitForTimeout(2000); // a search of the position would start meanwhile
  await expectNoSearch(page);
}
/** Opens the engine settings: their panel. */
async function settingsPanel(page: Page) {
  const button = page.getByRole("button", { name: "Engine settings" }), panel = page.getByRole("region", { name: "Engine settings" });
  if (!(await panel.isVisible())) await button.click();
  await expect(panel).toBeVisible();
  return panel;
}
/** The panel's note of a board that keeps its own network, `name`. */
const note = (name: string) => `This board came from an analysis file. It keeps its own network, ${name}. At first this is ` +
  "the file's network, so that the file's results show at once. A network chosen here applies to this board only.";
/** The moves in the board's move list. */
const moves = (page: Page) => page.locator("button.mv[data-path]");

test.describe("Hedge School", () => {
  // The engine at the file's depth, on the CPU. The area map off: on the board it is on by default, and the file holds
  // no map, so the engine would search one.
  test.beforeEach(({ page, baseURL }) => keep(page, baseURL!, {
    [CONSENT]: { games: "denied" }, [ENGINE]: { on: true, visits: 512, review: "lite", network: FULL.id, gpu: "off" },
    [DISPLAY]: { areaMap: { review: false, board: false } } }));

  for (const size of WIDTHS) {
    test(`a file of HedgeFund 0.1 Lite, with the browser on HedgeFund 0.2, shows its results with no search, at ${size.width} pixels`, async ({ page, baseURL }) => {
      await page.setViewportSize(size);
      await loadOnBoard(page, baseURL!, HS_FILE);
      await resultsWithNoSearch(page);
      const panel = await settingsPanel(page);
      await expect(panel).toContainText(note(FIXTURE.review.networkName));
      await expect(panel).toContainText(`Its network, ${FIXTURE.review.networkName}, is an earlier one, and the Network ` +
        "setting does not offer it. Choose a network there to search the board again with it.");
      // A reload keeps the board's network: the file's results, with no search
      await page.reload();
      await resultsWithNoSearch(page);
      await expect(await settingsPanel(page)).toContainText(note(FIXTURE.review.networkName));
      // The settings kept in the browser keep their network for every other page
      expect(await browserNetwork(page, baseURL!, ENGINE)).toBe(FULL.id);
    });
  }

  test("a network chosen in the panel is the board's, which a reload keeps, and the browser keeps its own", async ({ page, baseURL }) => {
    await page.setViewportSize(WIDTHS[0]);
    await loadOnBoard(page, baseURL!, HS_FILE);
    await boardShows(page);
    const panel = await settingsPanel(page);
    await panel.getByRole("radiogroup", { name: "Network" }).getByRole("radio", { name: LITE_02_RADIO }).click();
    await expect(panel).toContainText(note("HedgeFund 0.2 Lite"));
    await expect.poll(() => keptNetwork(page)).toBe(LITE_02.id);
    await page.reload();
    await boardShows(page);
    const after = await settingsPanel(page);
    await expect(after).toContainText(note("HedgeFund 0.2 Lite"));
    await expect(after.getByRole("radiogroup", { name: "Network" }).getByRole("radio", { name: LITE_02_RADIO }))
      .toHaveAttribute("aria-checked", "true");
    expect(await browserNetwork(page, baseURL!, ENGINE)).toBe(FULL.id);
  });

  test("a file of two networks asks which one the board uses, and Cancel keeps the board and none of the file's results", async ({ page, baseURL }) => {
    // The engine off: nothing searches, so the store holds only what the file would put there
    await page.evaluate(([key, network]) => localStorage.setItem(key, JSON.stringify({ on: false, network, gpu: "off" })),
                        [ENGINE, FULL.id] as const);
    await page.goto(boardLink("", boardOfLine(["D10-G10"]), 0));
    await expect(moves(page)).toHaveCount(1, { timeout: 180_000 });
    // A file written before the engine field: its results are of two networks that the site ships
    const two = analysisFile("hedge-school-analysis", HS_BOARD, [...FIXTURE.analyses, ...asModel(FIXTURE.analyses.slice(0, 40), FULL.sha256)]);
    await fileInput(page).setInputFiles(two);
    const dialog = page.getByRole("dialog", { name: "Choose a network for this analysis" });
    await expect(dialog).toBeVisible({ timeout: 60_000 });
    await expect(dialog).toContainText(`This analysis file has results from 2 networks: ${FIXTURE.review.networkName}`);
    for (const name of [`Use ${FIXTURE.review.networkName}`, "Use HedgeFund 0.2", "Cancel"])
      await expect(dialog.getByRole("button", { name, exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await expect(moves(page)).toHaveCount(1);
    expect(new URL(page.url()).hash).toBe("");
    expect((await keptResults(page)).filter(([key]) => key.includes(FIXTURE.review.model) || key.includes(FULL.sha256))).toEqual([]);
    await page.reload();
    await expect(moves(page)).toHaveCount(1, { timeout: 180_000 });
    // The file again, and a choice: the board asks before it replaces its own, then keeps the network chosen
    await fileInput(page).setInputFiles(two);
    await expect(dialog).toBeVisible({ timeout: 60_000 });
    await Promise.all([page.waitForEvent("load", { timeout: 60_000 }),
                       dialog.getByRole("button", { name: "Use HedgeFund 0.2", exact: true }).click()]);
    await page.getByRole("dialog", { name: "Replace your analysis?" }).getByRole("button", { name: "Replace it" }).click({ timeout: 90_000 });
    await expect(moves(page)).toHaveCount(HS_BOARD.main.length, { timeout: 90_000 });
    await expect(await settingsPanel(page)).toContainText(note("HedgeFund 0.2"));
    await expect.poll(() => keptNetwork(page)).toBe(FULL.id);
  });
});

test.describe("Cyanotype", () => {
  /** Cyanotype's file of the review's test game up to its stored review's turns, with the review's results, and no
   *  engine field: its results' keys give the network. */
  const file = () => analysisFile("cyanotype-analysis", boardOfLine(parseCyanotypeRecord(testRecord()).moves), readStored().analyses);

  for (const size of WIDTHS) {
    test(`a file of Cyanotype's network shows its results with no search, and a reload keeps the board's network, at ${size.width} pixels`, async ({ page }) => {
      const skip = await noReview(page);
      test.skip(!!skip, skip);
      await keep(page, CYANOTYPE!, { [CYANOTYPE_ENGINE]: { on: true, ...LITE } });
      await page.setViewportSize(size);
      const stored = readStored(), name = cyanotypeName(stored.network);
      await loadOnBoard(page, CYANOTYPE!, file());
      await resultsWithNoSearch(page);
      await expect(await settingsPanel(page)).toContainText(note(name));
      await page.reload();
      await resultsWithNoSearch(page);
      await expect(await settingsPanel(page)).toContainText(note(name));
      expect(await browserNetwork(page, CYANOTYPE!, CYANOTYPE_ENGINE)).toBe(stored.network);
    });
  }

  test("a file of a network that Cyanotype does not have asks first, and Cancel keeps the board and none of its results", async ({ page }) => {
    const skip = await noReview(page);
    test.skip(!!skip, skip);
    await keep(page, CYANOTYPE!, { [CYANOTYPE_ENGINE]: { on: false, ...LITE } });
    await page.goto(new URL("/analysis#record=" + encodeURIComponent(testRecord(3)), CYANOTYPE).href);
    await expect(moves(page)).toHaveCount(5, { timeout: 180_000 }); // turn 1 has one move, each other turn two
    const stored = readStored(), gone = "ab".repeat(32);
    await fileInput(page).setInputFiles(analysisFile("cyanotype-analysis", boardOfLine(parseCyanotypeRecord(testRecord()).moves),
      asModel(stored.analyses, gone), { network: "b0c0-s0-d0", networkName: "Stamp Duty 0.0", model: gone, search: stored.search }));
    const dialog = page.getByRole("dialog", { name: "The file's network is not available" });
    await expect(dialog).toBeVisible({ timeout: 60_000 });
    await expect(dialog).toContainText("The results in this analysis file are from Stamp Duty 0.0, a network that Cyanotype " +
      "does not have now. The board cannot show these results. Choose a network to search the file's positions again, or " +
      "cancel to keep your board.");
    await expect(dialog.getByRole("button", { name: `Use ${cyanotypeName(stored.network)}` })).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await expect(moves(page)).toHaveCount(5);
    expect((await keptResults(page)).filter(([key]) => key.includes(gone))).toEqual([]);
  });
});
