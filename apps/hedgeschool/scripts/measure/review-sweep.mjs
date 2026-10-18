// The review's sweep (decisions/product.md, "A search's final results in the batch"): the main thread's tasks while
// the sweep searches every position of tests/fixtures/hedgefund-review.json's game (120 edges), from no stored result,
// in Playwright's Chromium, headless, at 1,366 × 657 pixels. Two builds, each served from a folder of its own, run in
// alternating pairs (speed.mjs, inPairs). Each sweep opens the game's record (`/review#record=`) in a fresh browser
// context, so that the browser's store holds no result. An init script marks the sweep's start (`sweep:start`, when the
// progress line first names the game's shape) and its end (`sweep:end`, when it names the move quality), and Chrome's
// trace gives each task between them, by wall time and by thread time. Each sweep reads:
//   - the tasks over 50 milliseconds (a long task): how many, their time beyond 50 milliseconds each (as Total
//     Blocking Time counts it), and the longest, by wall time and by thread time;
//   - the tasks of 10 milliseconds of thread time or more, the main thread's thread time in all, and the sweep's time.
// The engine settings: `workers` search workers (by default 2), the GPU off or on (on: the real GPU, with the flags of
// docs/working-notes.md, "The GPU in Playwright's Chromium"), the rest the site's defaults. With OUT, every sweep's
// numbers and the machine's load go to that file as JSON.
//
//   node scripts/measure/review-sweep.mjs <before> <after> [pairs] [workers] [off|on] [port]
import { readFileSync, writeFileSync } from "node:fs";
import { inPairs, launch, preview, tasksBetween, trace, verdict } from "./speed.mjs";

const [before, after] = process.argv.slice(2, 4);
const pairs = Number(process.argv[4] ?? 5), workers = Number(process.argv[5] ?? 2), gpu = process.argv[6] ?? "off";
const port = Number(process.argv[7] ?? 4291);
const record = JSON.parse(readFileSync("tests/fixtures/hedgefund-review.json", "utf8")).record;
const LONG = 50;

const builds = [await preview(before, port), await preview(after, port + 1)];
const browser = await launch(gpu === "on" ? { args: ["--enable-unsafe-webgpu", "--use-angle=d3d11", "--enable-features=Vulkan"] } : {});

const overLong = xs => { const l = xs.filter(x => x > LONG); return { count: l.length, beyond: l.reduce((s, x) => s + x - LONG, 0), longest: Math.max(0, ...xs) }; };

/** One sweep of the game at the build's address. */
async function sweep(url) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 657 } });
  await context.addInitScript(settings => {
    localStorage.setItem("learn-enclosure:engine:2", settings);
    // The marks of the sweep's start and end, from the review's progress line (ReviewView.svelte).
    const seen = new Set();
    const once = (name, selector) => { if (!seen.has(name) && document.querySelector(selector)) { seen.add(name); performance.mark(name); } };
    const observer = new MutationObserver(() => {
      once("sweep:start", `p[title^="Reviewing: the game's shape"]`);
      if (seen.has("sweep:start")) once("sweep:end", `p[title^="Reviewing: move quality"]`);
      if (seen.has("sweep:end")) observer.disconnect();
    });
    observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["title"] });
  }, JSON.stringify({ workers, gpu }));
  const page = await context.newPage();
  const traced = await trace(browser, page, async () => {
    await page.goto(`${url}/review#record=${encodeURIComponent(record)}`);
    await page.waitForFunction(() => performance.getEntriesByName("sweep:end").length, null, { timeout: 900_000 });
  }, ["toplevel", "blink.user_timing"]);
  await context.close();
  const tasks = tasksBetween(traced, "sweep:start", "sweep:end");
  if (!tasks) throw new Error("the trace lacks the sweep's marks");
  return { wall: overLong(tasks.map(t => t.wall)), thread: overLong(tasks.map(t => t.thread)), tasks: tasks.length,
           tens: tasks.filter(t => t.thread >= 10).length, work: tasks.reduce((s, t) => s + t.thread, 0),
           span: tasks.at(-1).at + tasks.at(-1).wall };
}

const ms = x => `${Math.round(x)} ms`;
const runs = await inPairs(builds, pairs, async ({ url }) => {
  const r = await sweep(url);
  console.log(`${url}: ${r.tasks} tasks in ${(r.span / 1000).toFixed(1)} s, ${ms(r.work)} of thread time, ${r.tens} of 10 ms or more; ` +
              `over ${LONG} ms by wall ${r.wall.count} (${ms(r.wall.beyond)} beyond, longest ${ms(r.wall.longest)}), ` +
              `by thread ${r.thread.count} (${ms(r.thread.beyond)} beyond, longest ${ms(r.thread.longest)})`);
  return r;
});
const measures = {
  "tasks over 50 ms, by wall time": r => r.wall.count, "their time beyond 50 ms, by wall time": r => r.wall.beyond,
  "tasks over 50 ms, by thread time": r => r.thread.count, "their time beyond 50 ms, by thread time": r => r.thread.beyond,
  "the longest task, by thread time": r => r.thread.longest, "tasks of 10 ms or more, by thread time": r => r.tens,
  "the main thread's thread time": r => r.work, "the sweep's time": r => r.span,
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
