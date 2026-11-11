// Cyanotype's removal of earlier results (its design 33, as Hedge School's design 20), on its preview
// (CYANOTYPE_BASE_URL): a browser's store with the results of earlier engines and of the site's own, and the player's
// games, then a start of the site. The test puts them in the store on a file of the site that no page code runs on
// (the engine's manifest), so that the removal is due at the next start: the store has no mark of a removal yet. The
// results are the stored review's (cyanotype-review.ts, STORED), the site's own, and copies of them under other keys:
// - a game reviewed by an earlier engine, with the search READ_SEARCH: its review snapshot reads its results, so the
//   ones that it shows stay, each position of the game's line at the review's depth;
// - COPIES that no game reads, half under another search and half under a network file that the lock does not ship:
//   they go.
// The test also times the removal's transaction: from the browser's mark that a removal runs (cache.ts, earlierRemoval)
// to the mark that it ended. The test skips, with a message, when the preview has no engine files, and fails in CI.
// Run: npx playwright test tests/cyanotype-earlier-results.spec.ts, with CYANOTYPE_BASE_URL.
import { test, expect, type Page } from "./page-log.ts";
import type { Manifest } from "../../../packages/engine/src/client.ts";
import { EARLIER_MARK, SHAPE_MARK, SHAPE, engineFiles, lineKeyMoves, readAnalysisKey } from "../../../packages/analysis/src/cache.ts";
import { NAME, STORES } from "../../../packages/storage/src/db.ts";
import { parseRecord } from "../../cyanotype/src/lib/game/record.ts";
import { gameId } from "../../cyanotype/src/lib/game/store.ts";
import { CYANOTYPE, keptResults, noReview, putResults, readStored, testRecord } from "./cyanotype-review.ts";

/** The search of the earlier engine whose results the game's review snapshot reads. */
const READ_SEARCH = "0e100000";
/** The copies of the stored review's results that no game reads: a few thousand results, as a browser holds after some
 *  reviews by earlier engines. */
const COPIES = 62;

/** The searches and files of the COPIES: an earlier search with the site's file, or the site's search with a file
 *  that the lock does not ship. */
const earlierEngines = () => Array.from({ length: COPIES }, (_, i) => i % 2
  ? { search: `0e0${String(i).padStart(5, "0")}`, model: readStored().model }
  : { search: readStored().search, model: i.toString(16).padStart(64, "f") });

/** Puts the stored review's results in the store under the keys of each engine of `engines` too, in one transaction,
 *  with the values of the stored review: copies made in the page, so that only the stored review crosses to it. */
function putCopies(page: Page, engines: { search: string; model: string }[]) {
  const { search, model, analyses } = readStored();
  return page.evaluate(([[name, store], from, entries, engines]) => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open(name);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(store, "readwrite"), s = tx.objectStore(store);
      for (const e of engines) for (const [key, value] of entries) s.put(value, key.replace(from, `|${e.search}|${e.model}|`));
      tx.oncomplete = () => { open.result.close(); resolve(); };
      tx.onerror = tx.onabort = () => reject(tx.error);
    };
  }), [[NAME, STORES.analysis], `|${search}|${model}|`, analyses, engines] as const);
}

/** Puts the games `games` in the site's store of games, each under its key (putResults made the stores). */
const putGames = (page: Page, games: [string, object][]) => page.evaluate(([name, store, games]) =>
  new Promise<void>((resolve, reject) => {
    const open = indexedDB.open(name);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(store, "readwrite");
      for (const [key, game] of games) tx.objectStore(store).put(game, key);
      tx.oncomplete = () => { open.result.close(); resolve(); };
      tx.onerror = tx.onabort = () => reject(tx.error);
    };
  }), [NAME, STORES.games, games] as const);

/** The games in the site's store, each with its key. */
const keptGames = (page: Page) => page.evaluate(([name, store]) => new Promise<[string, unknown][]>((resolve, reject) => {
  const open = indexedDB.open(name);
  open.onerror = () => reject(open.error);
  open.onsuccess = () => {
    const s = open.result.transaction(store, "readonly").objectStore(store), keys = s.getAllKeys(), all = s.getAll();
    s.transaction.oncomplete = () => { open.result.close(); resolve(keys.result.map((k, i) => [String(k), all.result[i]])); };
  };
}), [NAME, STORES.games] as const);

/** Notes the times at which the page writes the removal's mark: when a removal starts, and when it ends. */
function timeTheMark(mark: string) {
  const times: { start?: number; end?: number } = {};
  (window as unknown as { removal: typeof times }).removal = times;
  const set = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key: string, value: string) {
    if (key === mark) times[value.startsWith("removing ") ? "start" : "end"] = performance.now();
    set.call(this, key, value);
  };
}

test("a start removes the earlier engines' results that no game needs, and keeps the site's own, a review snapshot's and the games", async ({ page }) => {
  const skip = await noReview(page);
  test.skip(!!skip, skip);
  test.setTimeout(180_000);
  const manifest: Manifest = await page.request.get(new URL("/engine/manifest.json", CYANOTYPE).href).then(r => r.json());
  const stored = readStored(), own = stored.analyses.map(([key]) => key);
  // The test game, reviewed by an earlier engine at the stored review's depth, and the same game at another komi, never
  // reviewed to its end
  const record = testRecord(), moves = parseRecord(record).moves, added = "2026-11-01T00:00:00Z";
  const games: [string, object][] = [
    [gameId(moves), { version: 1, id: gameId(moves), record, added, reviewed:
      { module: "an earlier build", model: stored.model, network: stored.network, visits: stored.visits, at: added, search: READ_SEARCH } }],
    [gameId(moves, 2), { version: 1, id: gameId(moves, 2), record: record.replace("\n\n", '\n[Komi "2"]\n\n'), added }],
  ];
  // The store, on the engine's manifest: no page code runs there, so nothing removes before the start
  await page.goto(new URL("/engine/manifest.json", CYANOTYPE).href);
  await putResults(page, stored.analyses);
  await putCopies(page, [{ search: READ_SEARCH, model: stored.model }, ...earlierEngines()]);
  await putGames(page, games);
  // A start after a release of a new engine, with the same shape of results: the removal of older shapes is not due
  await page.evaluate(([mark, shape]) => localStorage.setItem(mark, shape), [SHAPE_MARK, String(SHAPE)] as const);
  const before = (await keptResults(page)).map(([key]) => key);
  expect(before.length).toBe(own.length * (2 + COPIES));
  // The start: the removal runs once the page is idle, and its mark then names the build's engine files
  await page.addInitScript(timeTheMark, EARLIER_MARK);
  await page.goto(new URL("/about", CYANOTYPE).href);
  await expect.poll(() => page.evaluate(mark => localStorage.getItem(mark), EARLIER_MARK), { timeout: 60_000 })
    .toBe(engineFiles(manifest));
  // The site's own results stay, and of the earlier engine's that the game's review snapshot reads, those that it shows:
  // each position of the game's line at the review's depth. Every other result goes.
  const line = new Set(lineKeyMoves(moves).map(m => m.join(" ")));
  const shown = own.map(k => k.replace(`|${stored.search}|`, `|${READ_SEARCH}|`)).filter(k => {
    const { visits, moves: at } = readAnalysisKey(k);
    return visits === stored.visits && line.has(at);
  });
  const after = (await keptResults(page)).map(([key]) => key);
  expect(after).toEqual([...own, ...shown].sort());
  expect(await keptGames(page)).toEqual(games.sort(([a], [b]) => (a < b ? -1 : 1)));
  const { start, end } = await page.evaluate(() => (window as unknown as { removal: { start?: number; end?: number } }).removal);
  const ms = end! - start!;
  console.log(`the removal of earlier results: ${before.length - after.length} of ${before.length} results removed, ` +
              `${after.length} kept, ${games.length} games read, in ${ms.toFixed(0)} ms`);
  test.info().annotations.push({ type: "removal", description: `${before.length} results, ${ms.toFixed(0)} ms` });
});
