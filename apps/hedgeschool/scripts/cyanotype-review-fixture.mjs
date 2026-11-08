// Cyanotype's stored reviews (tests/fixtures/cyanotype-review.json, STORED, and the others of OTHER_STORED in
// tests/cyanotype-review.ts). The tests of Cyanotype's review (tests/cyanotype-review.spec.ts) and the layout test's
// Cyanotype cases (tests/layout.spec.ts) load the first, so that nothing searches there (tests/cyanotype-review.ts,
// storeReview). Only one test reviews with the engine, the game's first turns, and checks that the store then holds
// the stored review's results for them. Cyanotype's label snapshot
// (apps/cyanotype/src/lib/review/labels.snapshot.engine.test.ts) reads them all. This script makes the files from real
// reviews:
// - In Playwright's headless Chromium, with the layout test's launch options (playwright.config.ts), it reviews the
//   test game to the end of turn 20 on Cyanotype's preview as cyanotype-review.ts does (Lite, 512 visits a position,
//   on the CPU).
// - Then it searches the Analysis board's position of more views (cyanotype-review.ts, SPREAD_BOARD) to 512 visits.
// - It writes each result that the browser's store of analyses then holds, under its key
//   (@abstractclass/analysis/cache.ts, analysisKey), and the engine that made them: its search, and the network's id
//   and SHA-256 (STORED).
// - Then it makes each other stored review at the same visits: it reviews the stored review's game to its turn, and
//   writes the results of that review (@abstractclass/analysis/files.ts, belongs: of a position of the record, or one
//   move from one), without their ownership, which only the area map reads. A review of the test game runs in the
//   same page, and takes the results of the first turns from the store, so that the files give those positions the
//   same results. A review of another game runs in a new browser context, with a store of its own.
//
// Run it again when Cyanotype's engine.lock.json takes a new release (another search or network). The stored results
// name the engine that made them, and the tests that load them fail with a message while the preview serves another
// engine. With the files of other stored reviews as arguments, it makes only those: first it puts STORED's results in
// the store, so that a review of the test game takes them, as when it makes them all.
// The preview must serve the lock's engine files (`npm run engine` in apps/cyanotype before its build). On 2 threads,
// the review to turn 20 takes about 17 minutes, and the whole test game's about 37. Run it in apps/hedgeschool, and on
// this machine through `scripts/machine run` in the planning folder (its docs/machine.md):
//
//   CYANOTYPE_BASE_URL=http://127.0.0.1:4174 node scripts/cyanotype-review-fixture.mjs [tests/fixtures/FILE.json...]
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { readAnalysisKey } from "@abstractclass/analysis/cache.ts";
import { belongs } from "@abstractclass/analysis/files.ts";
import { positionKeys } from "@abstractclass/analysis/kept.ts";
import { moduleOf } from "@abstractclass/engine/client.ts";
import config from "../playwright.config.ts";
import { parseRecord } from "../../cyanotype/src/lib/game/record.ts";
import { DISPLAY_KEY, ENGINE_KEY } from "../../cyanotype/src/lib/site.ts";
import { CYANOTYPE, LITE, OTHER_STORED, SPREAD_BOARD, STORED, TEST_GAME, TURNS, keptResults, putResults, readStored,
         testRecord } from "../tests/cyanotype-review.ts";

if (!CYANOTYPE) throw new Error("CYANOTYPE_BASE_URL gives no Cyanotype preview");
const named = process.argv.slice(2);
const unknown = named.filter(f => !OTHER_STORED.some(s => s.file === f));
if (unknown.length) throw new Error(`not the file of another stored review (OTHER_STORED): ${unknown.join(", ")}`);
const others = named.length ? OTHER_STORED.filter(s => named.includes(s.file)) : OTHER_STORED;
const manifest = await fetch(new URL("/engine/manifest.json", CYANOTYPE)).then(r => r.json());
const model = manifest.artifacts.find(a => a.kind === "model"), search = moduleOf(manifest)?.search;
if (!model || !search)
  throw new Error("Cyanotype's preview has no engine files: run `npm run engine` in apps/cyanotype before its build");

const models = new Set([model.sha256]);

/** Writes the stored review `path`: the store's results that `keep` keeps, with the engine that made them. With
 *  `noOwnership`, each result without its ownership. */
async function write(page, path, keep, { noOwnership = false } = {}) {
  const analyses = (await keptResults(page, true)).filter(([key]) => keep(key))
    .map(([key, value]) => [key, noOwnership ? { ...value, ownership: undefined } : value]);
  const text = JSON.stringify({ made: new Date().toISOString(), by: "scripts/cyanotype-review-fixture.mjs", search,
                                network: model.id, model: model.sha256, visits: LITE.visits, analyses }) + "\n";
  writeFileSync(path, text);
  console.log(`${path}: ${analyses.length} results, ${Math.round(text.length / 1024)} KB`);
}

/** Reviews the game `game` to the end of turn `turns` in `page`, and waits for the review's end. */
async function review(page, turns, game = TEST_GAME) {
  const t0 = Date.now();
  await page.goto(new URL(`/review#record=${encodeURIComponent(testRecord(turns, game))}`, CYANOTYPE).href);
  await page.getByText(/^Review done/).waitFor({ timeout: 3 * 60 * 60_000 });
  const to = Number.isFinite(turns) ? `to turn ${turns}` : "to its end";
  console.log(`the review of ${game} ${to}: ${Math.round((Date.now() - t0) / 1000)} s`);
}

const browser = await chromium.launch(config.projects.find(p => p.name === "chromium").use.launchOptions);
/** A page in a new browser context, with the engine on, with no time limit, so that the Analysis board's search ends
 *  at its visits and the store keeps it. */
async function newPage() {
  const page = await (await browser.newContext({ viewport: { width: 1376, height: 952 } })).newPage();
  page.on("pageerror", e => console.error(`page error: ${e}`));
  await page.goto(new URL("/about", CYANOTYPE).href);
  await page.evaluate(([e, d, engine]) => {
    localStorage.setItem(e, JSON.stringify(engine));
    localStorage.setItem(d, "{}");
  }, [ENGINE_KEY, DISPLAY_KEY, { on: true, ...LITE, seconds: null }]);
  return page;
}

try {
  const page = await newPage();
  if (named.length) {
    const first = readStored();
    if (first.model !== model.sha256 || first.search !== search)
      throw new Error(`${STORED} holds the results of another engine: run this script with no file named`);
    await putResults(page, first.analyses);
  } else {
    await review(page, TURNS);
    // The Analysis board's position: its record's moves, all of them (at the record's end)
    const board = new URLSearchParams(SPREAD_BOARD.split("#")[1]);
    const moves = parseRecord(board.get("record")).moves.join(" ");
    if (Number(board.get("at")) !== moves.split(" ").length)
      throw new Error("SPREAD_BOARD's position is not its record's end");
    const t1 = Date.now();
    await page.goto(new URL(SPREAD_BOARD, CYANOTYPE).href);
    const searched = ([key]) => {
      const k = readAnalysisKey(key);
      return !k.map && k.visits >= LITE.visits && k.moves === moves;
    };
    for (let tries = 0; !(await keptResults(page)).some(searched); tries++) {
      if (tries > 600) throw new Error("the Analysis board's search did not reach the store in 20 minutes");
      await page.waitForTimeout(2_000);
    }
    console.log(`the Analysis board's position: ${Math.round((Date.now() - t1) / 1000)} s`);
    await write(page, STORED, key => models.has(readAnalysisKey(key).model));
  }

  for (const { file, game, turns } of others) {
    const p = game === TEST_GAME ? page : await newPage();
    await review(p, turns, game);
    // The review's results: not the Analysis board's, and no area map
    const positions = positionKeys(parseRecord(testRecord(turns, game)).moves, null);
    await write(p, file, key => !readAnalysisKey(key).map && belongs(key, positions, models), { noOwnership: true });
  }
} finally {
  await browser.close();
}
