// Cyanotype's review (its design 33) for the browser tests, on its preview (CYANOTYPE_BASE_URL): the review's test game
// (apps/cyanotype/src/lib/review/fixtures/stamp-duty.txt, Stamp Duty against itself) up to the end of turn TURNS, at
// Lite (512 visits a move): with the release engine-91ab0b7d, its first note is a Mistake at turn 12. The tests load
// the stored review of the game (STORED), the results of a real review in the browser, and search nothing. A review
// of the whole game with the engine takes 10 to 20 minutes on the CI runners. So only one test reviews with the
// engine, on the CPU: the game's first LIVE_TURNS turns. The Tests workflow builds Cyanotype with the engine's files
// (design 33, "The engine's files"). A test skips, with a message, when the preview has none, and fails in CI.
import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { BOOKMARK_VERSION } from "../../../packages/import/src/bookmarklet.ts";
import { modelOf, moduleOf, type Manifest } from "../../../packages/engine/src/client.ts";
import { analysisKey, readAnalysisKey, readable } from "../../../packages/analysis/src/cache.ts";
import { NAME, STORES } from "../../../packages/storage/src/db.ts";
import { parseRecord } from "../../cyanotype/src/lib/game/record.ts";
import { DISPLAY_KEY, ENGINE_KEY } from "../../cyanotype/src/lib/site.ts";

export const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;
/** The turns of the test game that the review's tests review, and STORED holds. */
export const TURNS = 20;
export const MOVES = 1 + 2 * (TURNS - 1); // the first turn has one move, each other turn two
/** The turns that the engine reviews live (reviewFirstTurns), and how long the test waits for the review's
 *  end. Turns 1 to 3 have 5 positions before a move, and the review searches the position after them too (the end of
 *  an unfinished game: analysis.svelte.ts, passCount), each at 32 and at 512 visits. On the owner's machine with 2
 *  threads, the review of the 5 positions before a move took 90 to 118 s, 11 to 15 percent of the whole game's 13.1
 *  minutes. The whole game took 9.6 to 20.0 minutes on the Linux runners, and probably about 22 in one run, so turns 1
 *  to 3 take about 3 minutes on a slow runner. The wait is more than three times that. */
export const LIVE_TURNS = 3, LIVE_WAIT = 10 * 60_000;
/** The key of the review's display settings in local storage (the site's DISPLAY_KEY). */
export const DISPLAY = DISPLAY_KEY;
/** The engine's settings of the review, other than `on`: Lite, and 512 visits for the position on screen, on the CPU
 *  (the GPU off, whatever the browser offers). */
export const LITE = { review: "lite", visits: 512, gpu: "off" } as const;
/** The site's database and its store of analyses. */
const STORE = [NAME, STORES.analysis] as const;
/** The stored review: the results of a real review of the test game, and of the Analysis board's SPREAD_BOARD, with
 *  the engine that made them. scripts/cyanotype-review-fixture.mjs writes it: run it again when Cyanotype's
 *  engine.lock.json takes a new release. */
export const STORED = "tests/fixtures/cyanotype-review.json";
/** The test game's file in apps/cyanotype/src/lib/review/fixtures. */
export const TEST_GAME = "stamp-duty.txt";
/** The other stored reviews: the results of real reviews at the same visits, each with its file, its game (a file in
 *  apps/cyanotype/src/lib/review/fixtures) and the turns that it reviews (Infinity: the whole game). Only Cyanotype's
 *  label snapshot reads them: they reach the kinds of label and the rules that STORED does not reach (the snapshot
 *  test's header names them). So their results hold no ownership, which only the area map reads.
 *  scripts/cyanotype-review-fixture.mjs writes them after STORED. */
export const OTHER_STORED = [
  { file: "tests/fixtures/cyanotype-whole-review.json", game: TEST_GAME, turns: Infinity },
  { file: "tests/fixtures/cyanotype-seed12-review.json", game: "stamp-duty-seed12.txt", turns: 23 },
] as const;
/** A stored review's file (STORED unless `file` gives another): its engine (`search`, `network`, the network's
 *  SHA-256 `model`), the review's depth (`visits`) and its results. Read by the file's place, so that Cyanotype's
 *  label snapshot (apps/cyanotype/src/lib/review/labels.snapshot.engine.test.ts) reads it too. */
export const readStored = (file = STORED):
  { search: string; network: string; model: string; visits: number; analyses: [string, unknown][] } =>
  JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));

/** The record of the test game, or of the game `game` (a file in apps/cyanotype/src/lib/review/fixtures), up to the
 *  end of turn `turns`, or to its end when the game has no later turn: its tags, but not its result, and its moves. */
export function testRecord(turns = TURNS, game: string = TEST_GAME): string {
  const text = readFileSync(new URL(`../../cyanotype/src/lib/review/fixtures/${game}`, import.meta.url), "utf8");
  const [tags, moves] = text.split(/\r?\n\r?\n/);
  const words = moves.trim().split(/\s+/), next = words.indexOf(`${turns + 1}.`);
  // Without a later turn (next is -1), the moves end before the record's last word, its result
  const kept = tags.split(/\r?\n/).filter(t => !/^\[(Result|Scores) /.test(t));
  return `${kept.join("\n")}\n\n${words.slice(0, next).join(" ")}\n`;
}

/** A record that the engine refuses: the test game's first three turns, with an x on 2@1,-5, which captures nothing. */
export const REFUSED = '[Blue "Ann"]\n[Red "Bo"]\n\n1. 1:-1,1>2:0,-1 2. 1:-1,1>2:-2,1 1:0,2>2:0,3 3. 1:0,2>2:2,2 2@1,-5x *\n';

/** The import page's address that a tool opens on strategyjam.org, with the test game unless `record` gives another:
 *  `at` is the position that the game's page showed, when it says. */
export function toolLink(more: { tool?: string; v?: string; at?: number; record?: string } = {}): string {
  const { tool = "bookmarklet", v = String(BOOKMARK_VERSION), at, record = testRecord() } = more;
  return new URL("/import#" + new URLSearchParams({ tool, v, site: "strategyjam.org", ...(at === undefined ? {} : { at: String(at) }), record }),
                 CYANOTYPE).href;
}

/** The Analysis board on a position of more views: the practice bot's test position
 *  (apps/cyanotype/src/lib/practice/bot.engine.test.ts), Blue to move, whose legal placements need two views of the
 *  engine. */
export const SPREAD_BOARD = "/analysis#record=" + encodeURIComponent("1. 1@-13,-1 2. 1:0,0>2:-2,1 2@1,-3 3. 1@-16,-1 1@-19,-1 " +
  "4. 1:0,1>2:2,-1 2@-1,-4 5. 1@-22,-1 1@-25,-1 6. 2@-5,-4 2@-7,0 7. 1@-28,-1 1@-31,-1 8. 2@-3,0 2@-8,-5 9. 1@-34,-1 " +
  "1@-37,-1 10. 2@-12,-5 2@-12,2 11. 1@-40,-1 1@-43,-1 12. 2@-15,1 2@-19,2 13. 1@-46,-1 1@-49,-1 14. 1@-13,-2 2@-23,2 " +
  "15. 1@-52,-1 1@-55,-1 16. 2@-27,2 2@-30,1 17. 1@-58,-1 1@-61,-1 18. 1:-2,2>2:0,2 2@-35,2 19. 1@-64,-1 *") + "&at=36";

/** Why the tests cannot run here, or "" when they can: no preview, or a preview with no engine files. In CI, a preview
 *  with no engine files is an error, not a reason to skip: the Tests workflow builds Cyanotype with them. */
export async function noReview(page: Page): Promise<string> {
  if (!CYANOTYPE) return "CYANOTYPE_BASE_URL gives no Cyanotype preview";
  const manifest = await page.request.get(new URL("/engine/manifest.json", CYANOTYPE).href).then(r => r.json()).catch(() => null);
  if (manifest?.artifacts?.some((a: { kind: string }) => a.kind === "model")) return "";
  const why = "Cyanotype's preview has no engine files: run `npm run engine` in apps/cyanotype before its build";
  if (process.env.CI) throw new Error(why);
  return why;
}

/** Keeps the engine's settings `engine` and the display settings `display` in the page's local storage, on /about.
 *  Each page that opens next in `page` counts what it asks of the engine's workers (engineWork). */
async function keepSettings(page: Page, engine: object, display: object) {
  await page.addInitScript(countEngineWork);
  await page.goto(new URL("/about", CYANOTYPE).href);
  await page.evaluate(([e, d, settings, shown]) => {
    localStorage.setItem(e, JSON.stringify(settings));
    localStorage.setItem(d, JSON.stringify(shown));
  }, [ENGINE_KEY, DISPLAY_KEY, engine, display] as const);
}

/** Reviews the test game in `page` from the stored review (storeReview), with the display settings `display` and the
 *  engine off, or on at Lite with `on`, and waits for the review's end. */
export async function reviewTestGame(page: Page, display: object = {}, { on = false } = {}) {
  await storeReview(page, display, { on });
  await openReview(page, TURNS, 120_000);
}

/** Reviews the test game's first LIVE_TURNS turns in `page` with the engine on at Lite, from no stored result, and
 *  waits for the review's end. */
export async function reviewFirstTurns(page: Page) {
  await keepSettings(page, { on: true, ...LITE }, {});
  await openReview(page, LIVE_TURNS, LIVE_WAIT);
}

/** Opens the review of the test game up to the end of turn `turns`, and waits `timeout` ms for "Review done": the
 *  Review tab's paste keeps the game, then its review opens. */
async function openReview(page: Page, turns: number, timeout: number) {
  await pasteRecord(page, testRecord(turns));
  await expect(page.getByText(/^Review done/)).toBeVisible({ timeout });
}

/** The Review tab, once its games are read: its footer shows then. `timeout`: the longest wait of each step, else
 *  Playwright's own, and 60 s for the tab's heading. */
export async function openReviewTab(page: Page, timeout?: number) {
  await page.goto(new URL("/review", CYANOTYPE).href, { timeout });
  await expect(page.getByRole("heading", { name: "Review your Blueprints game" }))
    .toBeVisible({ timeout: timeout ?? 60_000 });
  await expect(page.locator("footer")).toBeVisible({ timeout });
}

/** Pastes `record` in the Review tab and clicks Review: the import checks the record, and keeps it or says why not.
 *  `timeout` as openReviewTab's. The scripts that review a game on Cyanotype (scripts/cyanotype-*.mjs) bring it in
 *  here too. */
export async function pasteRecord(page: Page, record: string, timeout?: number) {
  await openReviewTab(page, timeout);
  await page.getByLabel("A game record").fill(record, { timeout });
  await page.getByRole("button", { name: "Review", exact: true }).click({ timeout });
}

/** A game in the site's store, by its id. */
export const keptGame = (page: Page, id: string) => page.evaluate(([name, store, key]) =>
  new Promise<Record<string, unknown>>(resolve => {
    const open = indexedDB.open(name);
    open.onsuccess = () => {
      const get = open.result.transaction(store, "readonly").objectStore(store).get(key);
      get.onsuccess = () => { open.result.close(); resolve(get.result); };
    };
  }), [NAME, STORES.games, id] as const);

/** The stored review's results for the test game's first `turns` turns, in the order of their keys: each position
 *  before a move and the position after the last, at each depth of the review. The review of an unfinished game
 *  searches its end (analysis.svelte.ts, passCount). */
export function storedResults(turns: number): [string, unknown][] {
  const played = parseRecord(testRecord(turns)).moves;
  return readStored().analyses.filter(([key]) => {
    const moves = readAnalysisKey(key).moves.split(" ").filter(Boolean);
    return moves.length <= played.length && moves.every((m, i) => m === played[i]);
  }).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/** The entries of the browser's store of analyses on the page's site, in the order of their keys: each key, with its
 *  result when `values`. */
export function keptResults(page: Page, values = false): Promise<[string, unknown][]> {
  return page.evaluate(([[name, store], values]) => new Promise<[string, unknown][]>((resolve, reject) => {
    const open = indexedDB.open(name);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const s = open.result.transaction(store, "readonly").objectStore(store);
      const keys = s.getAllKeys(), all = values ? s.getAll() : null;
      s.transaction.oncomplete = () => {
        open.result.close();
        resolve(keys.result.map((k, i) => [String(k), all?.result[i]]));
      };
      s.transaction.onerror = () => reject(s.transaction.error);
    };
  }), [STORE, values] as const);
}

/** Puts the stored review's results (STORED) in the browser's store of analyses, with the display settings `display`,
 *  and the engine off, or on at Lite with `on`. The test's browser context is new, so the site has no database yet.
 *  This makes the database with the site's stores, so the site's upgrade adds none (db.ts adds only the stores that
 *  are missing). A page that opens next takes the results as its own. With the engine on, a search of a position takes
 *  its stored result (analysis.svelte.ts, search), and asks nothing of the engine. Then expectNoSearch checks that the
 *  page asked the engine for no search. Fails when the preview's engine is not the one that made the results, or when
 *  the site no longer reads their keys (cache.ts, analysisKey and READ_SHAPES). */
export async function storeReview(page: Page, display: object = {}, { on = false } = {}) {
  const fixture = readStored(), analyses = fixture.analyses;
  const manifest: Manifest = await page.request.get(new URL("/engine/manifest.json", CYANOTYPE).href)
    .then(r => r.json());
  const rerun = "run scripts/cyanotype-review-fixture.mjs again (its header says how)";
  if (modelOf(manifest, fixture.network)?.sha256 !== fixture.model || moduleOf(manifest)?.search !== fixture.search)
    throw new Error(`${STORED} holds the results of the search ${fixture.search} with the network ` +
      `${fixture.network}, and Cyanotype's preview serves another engine: ${rerun}`);
  const unread = analyses.filter(([key]) => {
    const k = readAnalysisKey(key);
    return !readable(k.shape) || analysisKey(k.search, k.model, k.moves.split(" "), k.visits, k.shape) !== key;
  });
  if (unread.length)
    throw new Error(`${STORED} has ${unread.length} results whose keys the site no longer reads: ${rerun}`);
  await keepSettings(page, { on, ...LITE }, display);
  await putResults(page, analyses);
}

/** Puts the results `entries` (each key with its result) in the browser's store of analyses on the page's site, and
 *  makes the database with the site's stores when the site has none yet. A page that opens next reads them. */
export function putResults(page: Page, entries: readonly (readonly [string, unknown])[]) {
  return page.evaluate(([[name, store], stores, entries]) => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open(name);
    open.onupgradeneeded = () => { for (const s of stores) open.result.createObjectStore(s); };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(store, "readwrite");
      for (const [key, value] of entries) tx.objectStore(store).put(value, key);
      tx.oncomplete = () => { open.result.close(); resolve(); };
      tx.onerror = tx.onabort = () => reject(tx.error);
    };
  }), [STORE, Object.values(STORES), entries] as const);
}

/** What a page asks of the engine's workers since it opened: every message, and the searches among them. */
type EngineWork = { messages: number; searches: number };
/** What the page asked of the engine's workers since it opened, when its settings came from keepSettings. */
export const engineWork = (page: Page) =>
  page.evaluate(() => (window as unknown as { engineWork?: EngineWork }).engineWork);
/** Counts what the page asks of the engine's workers (keepSettings adds it). A search is a message `search`, or a
 *  `call` whose request is an analysis (packages/engine/src/client.ts, analyse). */
function countEngineWork() {
  const work: EngineWork = { messages: 0, searches: 0 };
  (window as unknown as { engineWork: EngineWork }).engineWork = work;
  const post = Worker.prototype.postMessage as (this: Worker, ...args: unknown[]) => void;
  Worker.prototype.postMessage = function (this: Worker, ...args: unknown[]) {
    const { type, request } = (args[0] ?? {}) as { type?: string; request?: { id?: string } };
    work.messages++;
    if (type === "search" || (type === "call" && request?.id === "a")) work.searches++;
    post.apply(this, args);
  };
}
/** Fails when the page asked the engine for a search since it opened, or when the count saw no message to the
 *  engine's workers (then the count does not work). */
export async function expectNoSearch(page: Page) {
  const work = await engineWork(page);
  expect(work?.messages ?? 0, "the messages to the engine's workers that the count saw").toBeGreaterThan(0);
  expect(work?.searches, "the searches that the page asked of the engine").toBe(0);
}
