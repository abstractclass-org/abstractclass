// The delay of a candidate's map (design 30): from the pointer on a candidate's row in the table to the area map of the
// position after its move, which the page asks a short search for (askOwnership). The first time: no map of it is
// stored. In Playwright's Chromium, headless, 1,366 × 900 pixels, with the area map on, `workers` search workers and
// the GPU off, on tests/fixtures/hedgefund-review.json's game, at a few positions, for a candidate other than the
// game's next move (that position has its own result, and its map shows at once). Two cases:
//   - "running": the game imported with no result, while the review's label pass runs (after its sweep);
//   - "idle": the fixture's review file imported, its review done, and no search running for a second (watchSweep's
//     record of the searches sent to the workers).
// Each sample gives the time to the line on the board and to the map, in milliseconds.
//
//   node scripts/measure/candidate-map-delay.mjs <build dir> [workers] [port]
import { readFileSync } from "node:fs";
import { parseRecord } from "../../src/lib/game/record.ts";
import { FIXTURE, importFile, launch, median, preview, watchSweep } from "./speed.mjs";

const [dir, workersArg = "2", portArg = "4495"] = process.argv.slice(2);
const workers = Number(workersArg), POSITIONS = [15, 25, 35, 45, 55, 65, 75, 85, 95, 105];
const record = JSON.parse(readFileSync(FIXTURE, "utf8")).record, moves = parseRecord(record).moves;
const server = await preview(dir, Number(portArg)), browser = await launch();
const DISPLAY = "learn-enclosure:review-display:1";

async function goTo(page, n) {
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  await page.keyboard.press("Home");
  for (let i = 0; i < n; i++) await page.keyboard.press("ArrowRight");
}

/** At the position after `n` edges: points at a candidate other than the game's next move until its line shows, then
 *  waits for its map. */
async function sample(page, n) {
  await goTo(page, n);
  const rows = page.locator('table:has(th:text-is("Edge")) tbody tr'), legend = page.locator(".map-legend");
  const until = Date.now() + 60_000;
  while (Date.now() < until) {
    const count = await rows.count();
    for (let r = 0; r < Math.min(count, 4); r++) {
      const edge = (await rows.nth(r).locator("td").nth(1).innerText()).trim().split(/\s/)[0];
      if (edge === moves[n]) continue;
      await page.mouse.move(1, 1);
      await page.waitForTimeout(300);
      const t0 = Date.now();
      await rows.nth(r).hover();
      const line = await page.locator("svg.board .line-edge").first().waitFor({ timeout: 1500 }).then(() => Date.now() - t0, () => null);
      if (line === null) continue; // no line yet: too few visits
      const map = await page.waitForFunction(() => document.querySelector(".map-legend")?.textContent?.trim().startsWith("After"),
                                             null, { timeout: 60_000, polling: "raf" }).then(() => Date.now() - t0, () => null);
      return { n, edge, line, map, legend: await legend.textContent().catch(() => null) };
    }
    await page.waitForTimeout(1000);
  }
  return { n, edge: null, line: null, map: null };
}

async function run(kind) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await context.addInitScript(watchSweep, JSON.stringify({ workers, gpu: "off" }));
  await context.addInitScript(([key]) => {
    try { localStorage.setItem(key, JSON.stringify({ areaMap: { review: true, board: true } })); } catch { /* no storage */ }
  }, [DISPLAY]);
  const page = await context.newPage();
  if (kind === "running") {
    await page.goto(`${server.url}/import#record=${encodeURIComponent(record)}`);
    await page.waitForFunction(() => performance.getEntriesByName("sweep:end").length > 0, null, { timeout: 600_000 });
  } else {
    await importFile(page, server.url, FIXTURE);
    await page.getByText(/^Review done/).waitFor({ timeout: 600_000 });
  }
  const out = [];
  for (const n of POSITIONS) {
    if (kind === "idle") {
      await goTo(page, n);
      // No search running: the position on screen's, the key moments' and the Greats' have ended
      const idle = () => page.waitForFunction(() => window.__searches.every(s => s.ended !== undefined), null, { timeout: 180_000 });
      await idle();
      await page.waitForTimeout(1000);
      await idle();
    }
    const s = await sample(page, n);
    const done = await page.getByText(/^Review done/).count();
    s.running = await page.evaluate(() => window.__searches.filter(x => x.ended === undefined).length);
    console.log(`${kind} edge ${n}: ${s.edge} line ${s.line} ms, map ${s.map} ms, searches running after: ${s.running}` +
                (kind === "running" ? `, review done: ${done > 0}` : ""));
    out.push(s);
  }
  await context.close();
  const maps = out.map(s => s.map).filter(m => m !== null);
  console.log(`${kind}: the map in ${median(maps)} ms (median of ${maps.length}), from ${Math.min(...maps)} to ${Math.max(...maps)} ms\n`);
}

await run("running");
await run("idle");
await browser.close();
await server.stop();
