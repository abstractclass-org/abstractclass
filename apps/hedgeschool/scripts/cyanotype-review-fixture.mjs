// The stored review of Cyanotype's test game (tests/fixtures/cyanotype-review.json), for the layout test's Cyanotype
// cases (tests/layout.spec.ts), which load it so that nothing searches there (tests/cyanotype-review.ts, storeReview).
// Only cyanotype-review.spec.ts reviews the test game with the engine. This script makes the file from a real review: in
// Playwright's headless Chromium, with the layout test's launch options (playwright.config.ts), it reviews the test game
// on Cyanotype's preview as cyanotype-review.ts does (Lite, 512 visits a position, on the CPU), then searches the
// Analysis board's position of more views (cyanotype-review.ts, SPREAD_BOARD) to 512 visits. It writes every result
// that the browser's store of analyses then holds, under its key (@abstractclass/analysis/cache.ts, analysisKey), and the
// engine that made them: its search and the network's id and SHA-256.
//
// Run it again when Cyanotype's engine.lock.json takes a new release (another search or network): the stored results
// name the engine that made them, and the layout test fails with a message while the preview serves another one. The
// preview must serve the lock's engine files (`npm run engine` in apps/cyanotype before its build). The review takes
// about 15 minutes on 2 threads.
//
//   CYANOTYPE_BASE_URL=http://127.0.0.1:4174 node scripts/cyanotype-review-fixture.mjs
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
import config from "../playwright.config.ts";
import { CYANOTYPE, DISPLAY, ENGINE, SPREAD_BOARD, STORE, STORED, testRecord } from "../tests/cyanotype-review.ts";

if (!CYANOTYPE) throw new Error("CYANOTYPE_BASE_URL gives no Cyanotype preview");
const VISITS = 512; // the review's (Lite) and the Analysis board's search
const manifest = await fetch(new URL("/engine/manifest.json", CYANOTYPE)).then(r => r.json());
const model = manifest.artifacts.find(a => a.kind === "model"), search = manifest.artifacts.find(a => a.kind === "module")?.search;
if (!model || !search) throw new Error("Cyanotype's preview has no engine files: run `npm run engine` in apps/cyanotype before its build");

const browser = await chromium.launch(config.projects.find(p => p.name === "chromium").use.launchOptions);
try {
  const page = await (await browser.newContext({ viewport: { width: 1376, height: 952 } })).newPage();
  page.on("pageerror", e => console.error(`page error: ${e}`));
  // The engine on, with no time limit, so that the Analysis board's search ends at its visits and the store keeps it
  await page.goto(new URL("/about", CYANOTYPE).href);
  await page.evaluate(([e, d, visits]) => {
    localStorage.setItem(e, JSON.stringify({ on: true, review: "lite", visits, seconds: null }));
    localStorage.setItem(d, "{}");
  }, [ENGINE, DISPLAY, VISITS]);
  const t0 = Date.now();
  await page.goto(new URL(`/review#record=${encodeURIComponent(testRecord())}`, CYANOTYPE).href);
  await page.getByText(/^Review done/).waitFor({ timeout: 60 * 60_000 });
  console.log(`the review: ${Math.round((Date.now() - t0) / 1000)} s`);

  /** The keys and values of the browser's store of analyses. */
  const stored = () => page.evaluate(([name, store]) => new Promise((resolve, reject) => {
    const open = indexedDB.open(name);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const s = open.result.transaction(store, "readonly").objectStore(store), keys = s.getAllKeys(), values = s.getAll();
      s.transaction.oncomplete = () => { resolve(keys.result.map((k, i) => [String(k), values.result[i]])); open.result.close(); };
      s.transaction.onerror = () => reject(s.transaction.error);
    };
  }), STORE);
  // The Analysis board's position: its record's moves, all of them (at the record's end)
  const board = new URLSearchParams(SPREAD_BOARD.split("#")[1]);
  const moves = board.get("record").split(/\s+/).filter(w => w && !/^\d+\.$/.test(w) && w !== "*");
  if (Number(board.get("at")) !== moves.length) throw new Error("SPREAD_BOARD's position is not its record's end");
  const t1 = Date.now();
  await page.goto(new URL(SPREAD_BOARD, CYANOTYPE).href);
  const searched = ([key]) => {
    const [, , , visits, ...position] = key.split("|");
    return Number(visits) >= VISITS && position.join("|") === moves.join(" ");
  };
  for (let tries = 0; !(await stored()).some(searched); tries++) {
    if (tries > 600) throw new Error("the Analysis board's search did not reach the store in 20 minutes");
    await page.waitForTimeout(2_000);
  }
  console.log(`the Analysis board's position: ${Math.round((Date.now() - t1) / 1000)} s`);

  const analyses = (await stored()).filter(([key]) => key.split("|")[2] === model.sha256);
  const file = { made: new Date().toISOString(), by: "scripts/cyanotype-review-fixture.mjs", search, network: model.id,
                 model: model.sha256, visits: VISITS, analyses };
  writeFileSync(STORED, JSON.stringify(file) + "\n");
  console.log(`${STORED}: ${analyses.length} results, ${Math.round(JSON.stringify(file).length / 1024)} KB`);
} finally {
  await browser.close();
}
