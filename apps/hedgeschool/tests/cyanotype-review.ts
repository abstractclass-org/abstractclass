// Cyanotype's review (its design 33) for the browser tests, on its preview (CYANOTYPE_BASE_URL): the review's test game
// (apps/cyanotype/src/lib/review/fixtures/stamp-duty.txt, Stamp Duty against itself) up to the end of turn TURNS,
// reviewed in the browser from the engine's real replies on the CPU, at Lite (512 visits a move): with the release
// engine-3ac5c2fc, its first note is a Mistake at turn 15. The review takes 10 to 20 minutes, and only
// cyanotype-review.spec.ts runs it. The layout test loads the stored review of the same game instead (STORED), and
// searches nothing. The Tests workflow builds Cyanotype with the engine's files (design 33, "The engine's files"). A
// test skips, with a message, when the preview has none, and fails in CI.
import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { BOOKMARK_VERSION } from "../../../packages/import/src/bookmarklet.ts";
import { modelOf, moduleOf, type Manifest } from "../../../packages/engine/src/client.ts";
import { analysisKey, readAnalysisKey, readable } from "../../../packages/analysis/src/cache.ts";
import { STORES } from "../../../packages/storage/src/db.ts";
import { DISPLAY_KEY, ENGINE_KEY } from "../../cyanotype/src/lib/site.ts";

export const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;
const TURNS = 20;
export const MOVES = 1 + 2 * (TURNS - 1); // the first turn has one move, each other turn two
/** The key of the review's display settings in local storage (the site's DISPLAY_KEY). */
export const DISPLAY = DISPLAY_KEY;
/** The engine's settings of the review, other than `on`: Lite, and 512 visits for the position on screen. */
export const LITE = { review: "lite", visits: 512 } as const;
/** The site's database and its store of analyses. packages/storage/src/db.ts names the database (NAME), and does not
 *  export the name. */
export const STORE = ["learn-enclosure", STORES.analysis] as const;
/** The stored review: the results of a real review of the test game, and of the Analysis board's SPREAD_BOARD, with
 *  the engine that made them. scripts/cyanotype-review-fixture.mjs writes it: run it again when Cyanotype's
 *  engine.lock.json takes a new release. */
export const STORED = "tests/fixtures/cyanotype-review.json";

/** The test game's record up to the end of turn TURNS: its tags, but not its result, and its moves. */
export function testRecord(): string {
  const text = readFileSync("../cyanotype/src/lib/review/fixtures/stamp-duty.txt", "utf8");
  const [tags, moves] = text.split(/\r?\n\r?\n/);
  const words = moves.trim().split(/\s+/);
  return `${tags.split(/\r?\n/).filter(t => !/^\[(Result|Scores) /.test(t)).join("\n")}\n\n${words.slice(0, words.indexOf(`${TURNS + 1}.`)).join(" ")}\n`;
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

/** Reviews the test game in `page`, with the display settings `display`, and waits for the review's end: with the
 *  engine on at Lite, or, with `stored`, from the stored review with the engine off (storeReview). */
export async function reviewTestGame(page: Page, display: object = {}, { stored = false } = {}) {
  if (stored) await storeReview(page, display);
  else await keepSettings(page, { on: true, ...LITE }, display);
  await page.goto(new URL(`/review#record=${encodeURIComponent(testRecord())}`, CYANOTYPE).href);
  await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: stored ? 120_000 : 20 * 60_000 });
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
  await page.addInitScript(countEngineWork);
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
/** Counts what the page asks of the engine's workers, in each page that opens next (storeReview adds it). A search is a
 *  message `search`, or a `call` whose request is an analysis (packages/engine/src/client.ts, analyse). */
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
  const work = await page.evaluate(() => (window as unknown as { engineWork?: EngineWork }).engineWork);
  expect(work?.messages ?? 0, "the messages to the engine's workers that storeReview counted").toBeGreaterThan(0);
  expect(work?.searches, "the searches that the page asked of the engine").toBe(0);
}
