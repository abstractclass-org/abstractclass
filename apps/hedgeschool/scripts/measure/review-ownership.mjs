// The cost of the ownership in a whole review (design 30): two builds, for example one whose searches ask for the
// root's ownership alone and one that asks for each candidate's too (includeMovesOwnership, the map of the engine's
// lines), in alternating pairs (speed.mjs, inPairs), each reviewing
// tests/fixtures/hedgefund-review.json's game (120 edges) from no stored result, in Playwright's Chromium, headless, at
// 1,366 × 657 pixels, in a fresh browser context. The engine settings: `workers` search workers (by default 2), the
// GPU off, the rest the site's defaults (the Lite review). Each run reads:
//   - the review's time: from the page's start to "Review done", in seconds;
//   - each search's time, by its visits: the median of the worker's own time for the searches that reached their
//     visits (watchSweep), in milliseconds;
//   - the browser's store: the results of the analysis store, how many, and their size as JSON (all of them, the part
//     that is the root's ownership, and the part that is the candidates'), in kB, with the candidates that have one.
//
//   node scripts/measure/review-ownership.mjs <before> <after> [pairs] [workers] [port]
import { readFileSync } from "node:fs";
import { FIXTURE, inPairs, launch, median, preview, verdict, verdictText, watchSweep } from "./speed.mjs";

const [before, after] = process.argv.slice(2, 4);
const pairs = Number(process.argv[4] ?? 3), workers = Number(process.argv[5] ?? 2), port = Number(process.argv[6] ?? 4491);
const record = JSON.parse(readFileSync(FIXTURE, "utf8")).record;
const builds = [await preview(before, port), await preview(after, port + 1)];
const browser = await launch();

/** The analysis store's results, as JSON: how many, their size, the size of their ownership and of their candidates',
 *  and how many candidates have one. */
const storeSize = () => new Promise((resolve, reject) => {
  const open = indexedDB.open("learn-enclosure");
  open.onerror = () => reject(open.error);
  open.onsuccess = () => {
    const all = open.result.transaction("analysis").objectStore("analysis").getAll();
    all.onerror = () => reject(all.error);
    all.onsuccess = () => {
      let bytes = 0, ownership = 0, moves = 0, maps = 0;
      const size = o => JSON.stringify(o).length + '"ownership":,'.length;
      for (const a of all.result) {
        bytes += JSON.stringify(a).length;
        if (a.ownership) ownership += size(a.ownership);
        for (const c of a.candidates) if (c.ownership) { moves += size(c.ownership); maps++; }
      }
      resolve({ results: all.result.length, kB: bytes / 1024, ownershipKB: ownership / 1024, movesKB: moves / 1024, maps });
    };
  };
});

async function review({ url }) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 657 } });
  await context.addInitScript(watchSweep, JSON.stringify({ workers, gpu: "off" }));
  const page = await context.newPage();
  const t0 = Date.now();
  await page.goto(`${url}/import#record=${encodeURIComponent(record)}`);
  await page.getByText(/^Review done/).waitFor({ timeout: 900_000 });
  const seconds = (Date.now() - t0) / 1000, store = await page.evaluate(storeSize);
  const searches = await page.evaluate(() => window.__searches.filter(s => s.ms !== undefined && s.searched >= s.visits)
    .map(s => ({ visits: s.visits, ms: s.ms })));
  await context.close();
  const ms = Object.fromEntries([...new Set(searches.map(s => s.visits))].sort((a, b) => a - b)
    .map(v => [v, median(searches.filter(s => s.visits === v).map(s => s.ms))]));
  const result = { seconds, ...store, ms };
  console.log(`  searches: ${Object.entries(ms).map(([v, m]) => `${v} visits ${m.toFixed(0)} ms ` +
              `(${searches.filter(s => s.visits === Number(v)).length})`).join(", ")}`);
  console.log(`${url}: ${seconds.toFixed(1)} s, ${store.results} results, ${store.kB.toFixed(0)} kB (ownership ` +
              `${store.ownershipKB.toFixed(0)} kB, the candidates' ${store.movesKB.toFixed(0)} kB in ${store.maps} maps)`);
  return result;
}

const runs = await inPairs(builds, pairs, review);
const f1 = x => x.toFixed(1);
for (const [name, key] of [["The review's time, s", "seconds"], ["The store, kB", "kB"]])
  console.log(`${name}: ${verdictText(verdict(runs.map(p => p.map(r => r.result[key]))), f1)}`);
for (const v of Object.keys(runs[0][0].result.ms))
  console.log(`A search of ${v} visits, ms: ${verdictText(verdict(runs.map(p => p.map(r => r.result.ms[v] ?? NaN))), f1)}`);
await browser.close();
for (const b of builds) await b.stop();
