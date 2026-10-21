// The map pass's time (design 30): tests/fixtures/hedgefund-review.json with the ownership removed from every result,
// as a review stored before the maps, imported and reviewed (its results are all there: no search), the engine idle
// (no search running for a second), then the area map turned on (the key t). From there to the pass's end: the
// review's line "Maps: n of n" gone and "Review done" back. In Playwright's Chromium, headless, 1,366 × 900 pixels,
// with `workers` search workers and the GPU off. It also counts the pass's searches and the time of each (watchSweep).
//
//   node scripts/measure/map-pass.mjs <build dir> <scratch dir> [workers] [port]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FIXTURE, importReview, launch, median, preview, searchesEnded, watchSweep } from "./speed.mjs";

const [dir, scratch, workersArg = "2", portArg = "4499"] = process.argv.slice(2);
const workers = Number(workersArg);
// The fixture without its maps: the same results, as shape 5 stored them before the ownership
const fixture = JSON.parse(readFileSync(FIXTURE, "utf8"));
for (const [, a] of fixture.analyses) delete a.ownership;
const file = join(scratch, "hedgefund-review-no-maps.json");
writeFileSync(file, JSON.stringify(fixture));

const server = await preview(dir, Number(portArg)), browser = await launch();
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
await context.addInitScript(watchSweep, JSON.stringify({ workers, gpu: "off" }));
const page = await context.newPage();
await importReview(page, server.url, file);
await searchesEnded(page, 600_000);
await page.waitForTimeout(1000);
await searchesEnded(page, 600_000);
const before = await page.evaluate(() => window.__searches.length);
await page.locator("body").click({ position: { x: 1, y: 1 } });
const t0 = Date.now();
await page.keyboard.press("t");
await page.getByText(/^Maps: \d+ of \d+/).first().waitFor({ timeout: 60_000 });
const shown = Date.now() - t0;
const line = await page.getByText(/^Maps: \d+ of \d+/).first().textContent();
// While the pass runs: the page, with its progress bar and the map's note (light and dark), into the scratch folder
for (const scheme of ["light", "dark"]) {
  await page.emulateMedia({ colorScheme: scheme });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(scratch, `map-pass-${scheme}.png`) });
}
await page.getByText(/^Review done/).waitFor({ timeout: 1_800_000 });
const seconds = (Date.now() - t0) / 1000;
const searches = await page.evaluate(n => window.__searches.slice(n).filter(s => s.ms !== undefined)
  .map(s => ({ visits: s.visits, ms: s.ms, slices: s.slices.length })), before);
const pass = searches.filter(s => s.visits === 32);
console.log(`the pass's line after ${shown} ms: "${line}"`);
console.log(`the pass: ${seconds.toFixed(1)} s from the map on to "Review done"; ${pass.length} searches of 32 visits, ` +
            `${median(pass.map(s => s.ms)).toFixed(0)} ms each (median, the worker's own time), ${searches.length - pass.length} other searches`);
await browser.close();
await server.stop();
