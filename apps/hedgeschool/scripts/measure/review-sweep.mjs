// The review's sweep (decisions/product.md, "A search's final results in the batch"): the main thread's tasks while
// the sweep searches every position of tests/fixtures/hedgefund-review.json's game (120 edges), from no stored result,
// in Playwright's Chromium, headless, at 1,366 × 657 pixels. Two builds, each served from a folder of its own, run in
// alternating pairs (speed.mjs, inPairs). Each sweep opens the game's record (`/import#record=`, which an older build
// forwards to `/review#record=`) in a fresh browser context, so that the browser's store holds no result. An init
// script (speed.mjs, watchSweep) marks the sweep's start (`sweep:start`, when the progress line first names the game's
// shape) and its end (`sweep:end`, when it names the move quality), and Chrome's trace gives each task between them, by
// wall time and by thread time. Each sweep reads:
//   - the tasks over 50 milliseconds (a long task): how many, their time beyond 50 milliseconds each (as Total
//     Blocking Time counts it), and the longest, by wall time and by thread time;
//   - the tasks of 10 milliseconds of thread time or more, the main thread's thread time in all, and the sweep's time;
//   - the gaps between one engine's searches (decisions/product.md, "The engine's next search does not wait for a
//     result's write"): from a search's final result to the engine's next search, where both are the sweep's
//     (speed.mjs, sweepGaps). The init script wraps `Worker`, and notes when the page sends each search to a worker
//     and when the worker's final reply comes.
// The engine settings: `workers` search workers (by default 2), the GPU off or on (on: the real GPU, with the flags of
// docs/working-notes.md, "The GPU in Playwright's Chromium"), the rest the site's defaults. With OUT, every sweep's
// numbers and the machine's load go to that file as JSON.
//
//   node scripts/measure/review-sweep.mjs <before> <after> [pairs] [workers] [off|on] [port]
import { readFileSync, writeFileSync } from "node:fs";
import { LONG_TASK, inPairs, launch, longTasks, preview, sweepGaps, tasksBetween, trace, verdict, watchSweep } from "./speed.mjs";
import { SWEEP_VISITS } from "@abstractclass/analysis/cache.ts";

const [before, after] = process.argv.slice(2, 4);
const pairs = Number(process.argv[4] ?? 5), workers = Number(process.argv[5] ?? 2), gpu = process.argv[6] ?? "off";
const port = Number(process.argv[7] ?? 4291);
const record = JSON.parse(readFileSync("tests/fixtures/hedgefund-review.json", "utf8")).record;

const builds = [await preview(before, port), await preview(after, port + 1)];
const browser = await launch(gpu === "on" ? { args: ["--enable-unsafe-webgpu", "--use-angle=d3d11", "--enable-features=Vulkan"] } : {});

/** One sweep of the game at the build's address. */
async function sweep(url) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 657 } });
  await context.addInitScript(watchSweep, JSON.stringify({ workers, gpu }));
  const page = await context.newPage();
  let searches;
  const traced = await trace(browser, page, async () => {
    await page.goto(`${url}/import#record=${encodeURIComponent(record)}`);
    await page.waitForFunction(() => performance.getEntriesByName("sweep:end").length, null, { timeout: 900_000 });
    searches = await page.evaluate(() => ({ list: window.__searches, end: performance.getEntriesByName("sweep:end")[0].startTime }));
  }, ["toplevel", "blink.user_timing"]);
  await context.close();
  const tasks = tasksBetween(traced, "sweep:start", "sweep:end");
  if (!tasks) throw new Error("the trace lacks the sweep's marks");
  return { wall: longTasks(tasks.map(t => t.wall)), thread: longTasks(tasks.map(t => t.thread)), tasks: tasks.length,
           tens: tasks.filter(t => t.thread >= 10).length, work: tasks.reduce((s, t) => s + t.thread, 0),
           span: tasks.at(-1).at + tasks.at(-1).wall, gaps: sweepGaps(searches.list, searches.end, SWEEP_VISITS) };
}

const ms = x => `${Math.round(x)} ms`;
const runs = await inPairs(builds, pairs, async ({ url }) => {
  const r = await sweep(url);
  console.log(`${url}: ${r.tasks} tasks in ${(r.span / 1000).toFixed(1)} s, ${ms(r.work)} of thread time, ${r.tens} of 10 ms or more; ` +
              `over ${LONG_TASK} ms by wall ${r.wall.count} (${ms(r.wall.beyond)} beyond, longest ${ms(r.wall.longest)}), ` +
              `by thread ${r.thread.count} (${ms(r.thread.beyond)} beyond, longest ${ms(r.thread.longest)}); ` +
              `${r.gaps.count} gaps between an engine's searches: median ${r.gaps.median.toFixed(1)} ms, 90th percentile ` +
              `${r.gaps.p90.toFixed(1)} ms, longest ${r.gaps.longest.toFixed(1)} ms, ${ms(r.gaps.total)} in all`);
  return r;
});
const measures = {
  [`tasks over ${LONG_TASK} ms, by wall time`]: r => r.wall.count, [`their time beyond ${LONG_TASK} ms, by wall time`]: r => r.wall.beyond,
  [`tasks over ${LONG_TASK} ms, by thread time`]: r => r.thread.count, [`their time beyond ${LONG_TASK} ms, by thread time`]: r => r.thread.beyond,
  "the longest task, by thread time": r => r.thread.longest, "tasks of 10 ms or more, by thread time": r => r.tens,
  "the main thread's thread time": r => r.work, "the sweep's time": r => r.span,
  "the median gap between an engine's searches, in tenths of a millisecond": r => 10 * r.gaps.median,
  "the 90th percentile of the gaps, in tenths of a millisecond": r => 10 * r.gaps.p90,
  "the gaps in all, in milliseconds": r => r.gaps.total,
};
for (const [name, of] of Object.entries(measures)) {
  const v = verdict(runs.map(pair => pair.map(run => of(run.result))));
  console.log(`${name}: before ${Math.round(v.a.median)} (spread ${Math.round(v.a.spread)}), after ${Math.round(v.b.median)} ` +
              `(spread ${Math.round(v.b.spread)}); the pairs' differences ${v.diffs.map(Math.round).join(", ")}; ${v.change ? "a change" : "no change"}`);
}
console.log("the machine's load before each run:", JSON.stringify(runs.map(pair => pair.map(run => run.load && `${run.load.cpu}%, ${run.load.load}`))));
console.log("each sweep, by pair (before, after):", JSON.stringify(Object.fromEntries(Object.entries(measures).map(([n, of]) => [n, runs.map(p => p.map(r => Math.round(of(r.result))))]))));
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(runs));
await browser.close();
await Promise.all(builds.map(b => b.stop()));
