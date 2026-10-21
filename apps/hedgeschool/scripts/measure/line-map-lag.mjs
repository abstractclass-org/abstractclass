// How far the area map lags behind an animated line (design 30): the engine's line of a candidate pointed at in the
// table draws one edge every 500 ms, and the map of each step (the position after its edge k) comes from that
// position's map, a short search the first time (askOwnership). For each step, the time from the drawing of edge k to
// the legend's "After edge k of the line", in milliseconds: 0 when the map was there when the edge was drawn. In
// Playwright's Chromium, headless, 1,366 × 900 pixels, with the area map on, `workers` search workers and the GPU off,
// on tests/fixtures/hedgefund-review.json's game, at a few positions, for a candidate other than the game's next move
// whose line shows at least 3 edges. Two cases, as in candidate-map-delay.mjs:
//   - "running": the game imported with no result, while the review's label pass runs (after its sweep);
//   - "idle": the fixture's review file imported, its review done, and no search running for a second.
// The page's own clock (requestAnimationFrame) times both events.
//
//   node scripts/measure/line-map-lag.mjs <build dir> [workers] [port]
import { readFileSync } from "node:fs";
import { parseRecord } from "../../src/lib/game/record.ts";
import { FIXTURE, importFile, launch, median, preview, searchesEnded, stepTo, watchSweep } from "./speed.mjs";

const [dir, workersArg = "2", portArg = "4497"] = process.argv.slice(2);
const workers = Number(workersArg), POSITIONS = [9, 17, 25, 33, 41, 49, 57, 65, 73, 81, 89, 97, 105], WINDOW_MS = 15_000;
const record = JSON.parse(readFileSync(FIXTURE, "utf8")).record, moves = parseRecord(record).moves;
const server = await preview(dir, Number(portArg)), browser = await launch();
const DISPLAY = "learn-enclosure:review-display:1";

/** In the page: for WINDOW_MS from now, when each count of drawn edges first shows, and when the legend first names
 *  each step's map ("After edge k of the line:"), in ms from the start. */
const watch = windowMs => new Promise(resolve => {
  const t0 = performance.now(), draw = {}, map = {};
  const tick = () => {
    const now = performance.now() - t0, n = document.querySelectorAll("svg.board .line-number").length;
    if (n && draw[n] === undefined) draw[n] = now;
    const m = (document.querySelector(".map-legend")?.textContent ?? "").trim().match(/^After edge (\d+) of the line:/);
    if (m && map[m[1]] === undefined) map[m[1]] = now;
    if (now > windowMs) resolve({ draw, map });
    else requestAnimationFrame(tick);
  };
  tick();
});

/** At the position after `n` edges: points at a candidate other than the game's next move whose line shows at least 3
 *  edges, and watches its drawing and its maps. */
async function sample(page, n) {
  await stepTo(page, n);
  const rows = page.locator('table:has(th:text-is("Edge")) tbody tr');
  const until = Date.now() + 60_000;
  while (Date.now() < until) {
    for (let r = 0; r < Math.min(await rows.count(), 4); r++) {
      const edge = (await rows.nth(r).locator("td").nth(1).innerText()).trim().split(/\s/)[0];
      if (edge === moves[n]) continue;
      await page.mouse.move(1, 1);
      await page.waitForTimeout(300);
      const watching = page.evaluate(watch, WINDOW_MS);
      await rows.nth(r).hover();
      const { draw, map } = await watching;
      const steps = Object.keys(draw).map(Number).sort((a, b) => a - b);
      if (steps.length < 3) continue; // a line too short: another candidate, or later
      const lags = steps.map(k => (map[k] === undefined ? null : Math.max(0, map[k] - draw[k])));
      return { n, edge, steps: steps.length, lags };
    }
    await page.waitForTimeout(1000);
  }
  return { n, edge: null, steps: 0, lags: [] };
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
  const all = [];
  for (const n of POSITIONS) {
    if (kind === "idle") {
      await stepTo(page, n);
      await searchesEnded(page);
      await page.waitForTimeout(1000);
      await searchesEnded(page);
    }
    const s = await sample(page, n);
    const done = await page.getByText(/^Review done/).count();
    console.log(`${kind} edge ${n}: ${s.edge}, ${s.steps} edges drawn, lag by step (ms): ` +
                `${s.lags.map(l => (l === null ? "none" : Math.round(l))).join(", ")}${kind === "running" ? `, review done: ${done > 0}` : ""}`);
    all.push(...s.lags);
  }
  await context.close();
  const got = all.filter(l => l !== null);
  console.log(`${kind}: ${got.length} of ${all.length} steps had their map within ${WINDOW_MS / 1000} s of the hover; lag median ` +
              `${Math.round(median(got))} ms, ${got.filter(l => l === 0).length} at 0, most ${Math.round(Math.max(...got))} ms\n`);
}

await run("running");
await run("idle");
await browser.close();
await server.stop();
