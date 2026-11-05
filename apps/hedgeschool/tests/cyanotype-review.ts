// Cyanotype's review (its design 33) for the browser tests, on its preview (CYANOTYPE_BASE_URL): the review's test game
// (apps/cyanotype/src/lib/review/fixtures/stamp-duty.txt, Stamp Duty against itself) up to the end of turn TURNS,
// reviewed in the browser from the engine's real replies on the CPU, at Lite (512 visits a move), the stored review's
// depth: with the release engine-3ac5c2fc, its first note is a Mistake at turn 15. The review takes about ten minutes,
// and only cyanotype-review.spec.ts runs it. The layout test loads the stored review instead (STORED), and searches
// nothing. The Tests workflow builds Cyanotype with the engine's files (design 33, "The engine's files"). A test skips,
// with a message, when the preview has none, and fails in CI.
import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { BOOKMARK_VERSION } from "../../../packages/import/src/bookmarklet.ts";
import { STORES } from "../../../packages/storage/src/db.ts";

export const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;
const TURNS = 20;
export const MOVES = 1 + 2 * (TURNS - 1); // the first turn has one move, each other turn two
export const DISPLAY = "cyanotype:review-display:1";
export const ENGINE = "cyanotype:engine:1";
const GAME = "cyanotype:review-game:2"; // the id of the game in review
/** The browser's store of analyses: the site's database (packages/storage/src/db.ts, NAME) and its store. */
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

/** Reviews the test game in `page`, with the engine on at Lite and the display settings `display`, and waits for the
 *  review's end. */
export async function reviewTestGame(page: Page, display: object = {}) {
  await page.goto(new URL("/about", CYANOTYPE).href);
  await page.evaluate(([e, d, shown]) => {
    localStorage.setItem(e, JSON.stringify({ on: true, review: "lite", visits: 512 }));
    localStorage.setItem(d, JSON.stringify(shown));
  }, [ENGINE, DISPLAY, display] as const);
  await page.goto(new URL(`/review#record=${encodeURIComponent(testRecord())}`, CYANOTYPE).href);
  await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: 20 * 60_000 });
}

/** Puts the stored review's results (STORED) in the browser's store of analyses, with the display settings `display`,
 *  and leaves the test game in review. The engine is off while the results go in, and then on when `on` says so, at
 *  the stored results' 512 visits: its search of a position takes a stored result as deep (analysis.svelte.ts, search)
 *  and searches nothing. The Analysis board needs it on, since it reads only its start and its variations from the
 *  store, not a record's moves (GameAnalysis.fromStore). Fails when the preview's engine is not the one that made the
 *  results. */
export async function storeReview(page: Page, display: object = {}, on = false) {
  const stored = JSON.parse(readFileSync(STORED, "utf8"));
  const manifest = await page.request.get(new URL("/engine/manifest.json", CYANOTYPE).href).then(r => r.json());
  const model = manifest.artifacts.find((a: { kind: string; id: string }) => a.kind === "model" && a.id === stored.network);
  const search = manifest.artifacts.find((a: { kind: string }) => a.kind === "module")?.search;
  if (model?.sha256 !== stored.model || search !== stored.search)
    throw new Error(`${STORED} holds the results of the search ${stored.search} with the network ${stored.network}, and ` +
      `Cyanotype's preview serves another engine: run scripts/cyanotype-review-fixture.mjs again (its header says how)`);
  await page.goto(new URL("/about", CYANOTYPE).href);
  await page.evaluate(([e, d, shown]) => {
    localStorage.setItem(e, JSON.stringify({ on: false, review: "lite", visits: 512 }));
    localStorage.setItem(d, JSON.stringify(shown));
  }, [ENGINE, DISPLAY, display] as const);
  // The site makes its store as it keeps the game in review: then the results go in, beside it.
  await page.goto(new URL(`/review#record=${encodeURIComponent(testRecord())}`, CYANOTYPE).href);
  await expect.poll(() => page.evaluate(k => localStorage.getItem(k), GAME), { timeout: 60_000 }).not.toBeNull();
  await page.evaluate(([[name, store], entries]) => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open(name);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(store, "readwrite");
      for (const [key, value] of entries) tx.objectStore(store).put(value, key);
      tx.oncomplete = () => { open.result.close(); resolve(); };
      tx.onerror = tx.onabort = () => reject(tx.error);
    };
  }), [STORE, stored.analyses as [string, unknown][]] as const);
  if (!on) return;
  await page.goto(new URL("/about", CYANOTYPE).href);
  await page.evaluate(e => localStorage.setItem(e, JSON.stringify({ on: true, review: "lite", visits: 512, seconds: null })), ENGINE);
}

/** The test game's review from the stored review (storeReview), with the engine off and the display settings
 *  `display`: done once the network loads, with no search. */
export async function storedReview(page: Page, display: object = {}) {
  await storeReview(page, display);
  await page.goto(new URL("/review", CYANOTYPE).href);
  await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: 120_000 });
}
