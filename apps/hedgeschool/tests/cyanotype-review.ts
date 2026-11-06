// Cyanotype's review (its design 33) for the browser tests, on its preview (CYANOTYPE_BASE_URL): the review's test game
// (apps/cyanotype/src/lib/review/fixtures/stamp-duty.txt, Stamp Duty against itself) up to the end of turn TURNS, at
// Lite (512 visits a move): with the release engine-3ac5c2fc, its first note is a Mistake at turn 15. The tests load
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
import { DISPLAY_KEY, ENGINE_KEY } from "../../cyanotype/src/lib/site.ts";

export const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;
const TURNS = 20;
export const MOVES = 1 + 2 * (TURNS - 1); // the first turn has one move, each other turn two
/** The turns that the engine reviews live (reviewTestGame with `live`), and how long the test waits for the review's
 *  end. Turns 1 to 3 have 5 positions before a move, each searched at 32 and at 512 visits. On the owner's machine
 *  with 2 threads, their review took 96 to 109 s, and the whole game's 13.1 minutes. The whole game took 9.6 to 19.0
 *  minutes on the Linux runners, and over 20 in one run, so turns 1 to 3 take about 3 minutes on a slow runner. The
 *  wait leaves more than three times each. */
export const LIVE_TURNS = 3, LIVE_WAIT = 10 * 60_000;
/** The key of the review's display settings in local storage (the site's DISPLAY_KEY). */
export const DISPLAY = DISPLAY_KEY;
/** The engine's settings of the review, other than `on`: Lite, and 512 visits for the position on screen. */
export const LITE = { review: "lite", visits: 512 } as const;
/** The site's database and its store of analyses. */
export const STORE = [NAME, STORES.analysis] as const;
/** The stored review: the results of a real review of the test game, and of the Analysis board's SPREAD_BOARD, with
 *  the engine that made them. scripts/cyanotype-review-fixture.mjs writes it: run it again when Cyanotype's
 *  engine.lock.json takes a new release. */
export const STORED = "tests/fixtures/cyanotype-review.json";

/** The test game's record up to the end of turn `turns`: its tags, but not its result, and its moves. */
export function testRecord(turns = TURNS): string {
  const text = readFileSync("../cyanotype/src/lib/review/fixtures/stamp-duty.txt", "utf8");
  const [tags, moves] = text.split(/\r?\n\r?\n/);
  const words = moves.trim().split(/\s+/);
  return `${tags.split(/\r?\n/).filter(t => !/^\[(Result|Scores) /.test(t)).join("\n")}\n\n${words.slice(0, words.indexOf(`${turns + 1}.`)).join(" ")}\n`;
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

/** Keeps the engine's settings `engine` and the display settings `display` in the page's local storage, on /about. */
async function keepSettings(page: Page, engine: object, display: object) {
  await page.goto(new URL("/about", CYANOTYPE).href);
  await page.evaluate(([e, d, settings, shown]) => {
    localStorage.setItem(e, JSON.stringify(settings));
    localStorage.setItem(d, JSON.stringify(shown));
  }, [ENGINE_KEY, DISPLAY_KEY, engine, display] as const);
}

/** Reviews the test game in `page`, with the display settings `display`, and waits for the review's end: from the
 *  stored review with the engine off (storeReview), or, with `live`, its first LIVE_TURNS turns with the engine on at
 *  Lite. */
export async function reviewTestGame(page: Page, display: object = {}, { live = false } = {}) {
  if (live) await keepSettings(page, { on: true, ...LITE }, display);
  else await storeReview(page, display);
  await page.goto(new URL(`/review#record=${encodeURIComponent(testRecord(live ? LIVE_TURNS : TURNS))}`, CYANOTYPE).href);
  await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: live ? LIVE_WAIT : 120_000 });
}

/** The keys of the stored review's results for the test game's first `turns` turns: each position before a move, at
 *  each depth of the review. */
export function storedKeys(turns: number): string[] {
  const played = testRecord(turns).split(/\r?\n\r?\n/)[1].trim().split(/\s+/).filter(w => !/^\d+\.$/.test(w));
  const analyses: [string][] = JSON.parse(readFileSync(STORED, "utf8")).analyses;
  return analyses.map(([key]) => key).filter(key => {
    const moves = readAnalysisKey(key).moves.split(" ").filter(Boolean);
    return moves.length < played.length && moves.every((m, i) => m === played[i]);
  }).sort();
}

/** The keys of the results in the browser's store of analyses, on the page's site. */
export function keptKeys(page: Page): Promise<string[]> {
  return page.evaluate(([name, store]) => new Promise<string[]>((resolve, reject) => {
    const open = indexedDB.open(name);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const keys = open.result.transaction(store, "readonly").objectStore(store).getAllKeys();
      keys.onsuccess = () => { open.result.close(); resolve(keys.result.map(String).sort()); };
      keys.onerror = () => reject(keys.error);
    };
  }), STORE);
}

/** Puts the stored review's results (STORED) in the browser's store of analyses, with the display settings `display`,
 *  and the engine off, or on at Lite with `on`. The test's browser context is new, so the site has no database yet.
 *  This makes the database with the site's stores, so the site's upgrade adds none (db.ts adds only the stores that
 *  are missing). A page that opens next takes the results as its own. With the engine on, a search of a position takes
 *  its stored result (analysis.svelte.ts, search), and asks nothing of the engine. Then expectNoSearch checks that the
 *  page asked the engine for no search. Fails when the preview's engine is not the one that made the results, or when
 *  the site no longer reads their keys (cache.ts, analysisKey and READ_SHAPES). */
export async function storeReview(page: Page, display: object = {}, { on = false } = {}) {
  const fixture = JSON.parse(readFileSync(STORED, "utf8"));
  const analyses: [string, unknown][] = fixture.analyses;
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
  await countSearches(page);
  await page.evaluate(([[name, store], stores, entries]) => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open(name);
    open.onupgradeneeded = () => { for (const s of stores) open.result.createObjectStore(s); };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(store, "readwrite");
      for (const [key, value] of entries) tx.objectStore(store).put(value, key);
      tx.oncomplete = () => { open.result.close(); resolve(); };
      tx.onerror = tx.onabort = () => reject(tx.error);
    };
  }), [STORE, Object.values(STORES), analyses] as const);
}

/** What a page asks of the engine's workers since it opened: every message, and the searches among them. */
type EngineWork = { messages: number; searches: number };
/** Counts what `page` asks of the engine's workers, in each page that opens next in it (countEngineWork). */
export const countSearches = (page: Page) => page.addInitScript(countEngineWork);
/** What the page asked of the engine's workers since it opened, when countSearches counts it. */
export const engineWork = (page: Page) =>
  page.evaluate(() => (window as unknown as { engineWork?: EngineWork }).engineWork);
/** Counts what the page asks of the engine's workers (storeReview and countSearches add it). A search is a message
 *  `search`, or a `call` whose request is an analysis (packages/engine/src/client.ts, analyse). */
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
/** Fails when the page asked the engine for a search since it opened, or when storeReview's count saw no message to
 *  the engine's workers (then the count does not work). */
export async function expectNoSearch(page: Page) {
  const work = await engineWork(page);
  expect(work?.messages ?? 0, "the messages to the engine's workers that storeReview counted").toBeGreaterThan(0);
  expect(work?.searches, "the searches that the page asked of the engine").toBe(0);
}
