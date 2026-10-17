// The review's first draw (decisions/product.md, "The review's first frame"): its tasks and the page's layout shift, on
// reloads of the review of tests/fixtures/hedgefund-review.json in Playwright's Chromium, headless, with its scroll bars
// shown (playwright.config.ts). The first draw runs from the task that holds the mark `review:shown` (the review shows,
// src/routes/review/+page.svelte) to the end of the frame that paints the move list's rows: the first paint after the
// task that holds `review:moves` (the rows, a frame later, src/lib/review/ReviewView.svelte), or after the first task
// where the rows come with it. Each reload is traced (Chrome's trace of the page's main thread), and reads:
//   - the first draw's tasks over 50 milliseconds (a long task): how many, their time beyond 50 milliseconds each (as
//     Total Blocking Time counts it), and the longest;
//   - the same by each task's thread time, the time that the main thread ran. A loaded machine makes the thread wait
//     for a processor, and the wall time counts that wait: the thread time does not;
//   - the layout shift of the whole load, as the browser's Cumulative Layout Shift counts it (its largest session
//     window), and each element that moved.
// The site must run first (`npm run build`, then the preview), at BASE_URL (by default the local preview). With OUT,
// the reloads' numbers go to that file as JSON.
//
//   node scripts/measure/review-first-frame.mjs [reloads] [width]x[height] [turn|edge]
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const FIXTURE = "tests/fixtures/hedgefund-review.json";
const reloads = Number(process.argv[2] ?? 5);
const [width, height] = (process.argv[3] ?? "1366x657").split("x").map(Number);
const judge = process.argv[4]; // the review's unit (src/lib/review/display.ts): by turn, the default, or by edge
const LONG = 50;

const browser = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(`${BASE}/review`);
await page.locator('input[type="file"][accept*="json"]').first().setInputFiles(FIXTURE);
await page.waitForURL(/#game=/);
await page.getByText(/^Review done/).waitFor({ timeout: 300_000 });
if (judge) await page.evaluate(d => localStorage.setItem("learn-enclosure:review-display:1", JSON.stringify(d)), { judge });

/** The first draw's tasks in a trace, each with its wall time and thread time in milliseconds, or null when the trace
 *  lacks a mark or the paint after it. */
function firstDraw(trace) {
  const events = trace.traceEvents, end = e => e.ts + e.dur;
  const mark = name => events.find(e => e.name === name && e.cat?.includes("blink.user_timing"));
  const shown = mark("review:shown"), moves = mark("review:moves") ?? shown;
  if (!shown) return null;
  const main = events.filter(e => e.ph === "X" && e.pid === shown.pid && e.tid === shown.tid).sort((a, b) => a.ts - b.ts);
  // The main thread's tasks, the outermost only: a task can run another inside it.
  const tasks = [];
  for (const e of main) if (e.name === "ThreadControllerImpl::RunTask" && !(tasks.length && end(e) <= end(tasks.at(-1)))) tasks.push(e);
  const holding = m => tasks.find(t => t.ts <= m.ts && m.ts <= end(t));
  const first = holding(shown), last = holding(moves), paint = last && main.find(e => e.name === "Paint" && e.ts > end(last));
  const painting = paint && holding(paint);
  if (!first || !painting) return null;
  const from = first.ts, to = end(painting);
  return tasks.filter(t => t.ts >= from && end(t) <= to)
    .map(t => ({ at: (t.ts - from) / 1000, wall: t.dur / 1000, thread: (t.tdur ?? t.dur) / 1000 }));
}
const overLong = xs => { const l = xs.filter(x => x > LONG); return { count: l.length, beyond: l.reduce((s, x) => s + x - LONG, 0), longest: Math.max(0, ...xs) }; };

const ms = x => `${Math.round(x)} ms`;
const results = [];
for (let k = 1; results.length < reloads; k++) { // a trace without the marks or the paint: the reload again, a few times
  if (k > reloads + 3) throw new Error("the traces lack the review's marks");
  await browser.startTracing(page, { categories: ["toplevel", "blink.user_timing", "devtools.timeline"] });
  await page.reload();
  await page.waitForFunction(() => performance.getEntriesByName("review:shown").length, null, { timeout: 120_000 });
  await page.waitForTimeout(3000); // the frames after the first, and what moves in them
  const tasks = firstDraw(JSON.parse((await browser.stopTracing()).toString()));
  if (!tasks) { console.log(`reload ${k}: the trace lacks a mark or the paint after it, again`); continue; }
  const shift = await page.evaluate(() => {
    // The layout shifts come from a buffered PerformanceObserver (its takeRecords gives them at once): the browser keeps
    // them out of the performance timeline, so performance.getEntriesByType("layout-shift") gives none.
    const observer = new PerformanceObserver(() => {});
    observer.observe({ type: "layout-shift", buffered: true });
    const entries = observer.takeRecords();
    observer.disconnect();
    const shown = performance.getEntriesByName("review:shown")[0].startTime;
    // The largest session window: shifts less than a second apart, in at most five seconds (web.dev's CLS).
    let cls = 0, sum = 0, start = 0, prev = 0;
    const moved = new Map(); // each element that moved: when it first moved, and how many times
    const label = node => `${node?.nodeName?.toLowerCase() ?? "?"}.${[...(node?.classList ?? [])].slice(0, 3).join(".")}`;
    for (const e of entries) {
      if (e.hadRecentInput) continue;
      if (sum && (e.startTime - prev > 1000 || e.startTime - start > 5000)) sum = 0;
      if (!sum) start = e.startTime;
      sum += e.value; prev = e.startTime; cls = Math.max(cls, sum);
      for (const s of e.sources) {
        const name = label(s.node), m = moved.get(name) ?? { at: Math.round(e.startTime - shown), times: 0 };
        m.times++;
        moved.set(name, m);
      }
    }
    return { cls, moved: [...moved].map(([name, m]) => `${name} at ${m.at} ms${m.times > 1 ? `, ${m.times} times` : ""}`) };
  });
  const r = { tasks, wall: overLong(tasks.map(t => t.wall)), thread: overLong(tasks.map(t => t.thread)), span: tasks.at(-1).at + tasks.at(-1).wall,
              work: tasks.reduce((s, t) => s + t.thread, 0), ...shift };
  results.push(r);
  const big = tasks.filter(t => t.wall >= 10 || t.thread >= 10);
  console.log(`reload ${k}: ${tasks.length} tasks in ${ms(r.span)}, ${ms(r.work)} of thread time; those of 10 ms or more ` +
              `${big.map(t => `${ms(t.wall)} (thread ${ms(t.thread)}) at ${ms(t.at)}`).join(", ")}; CLS ${r.cls.toFixed(4)}${r.moved.length ? ` (${r.moved.join("; ")})` : ""}`);
}
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const head = `${width}×${height}, by ${judge ?? "turn"}, ${reloads} reloads`;
console.log(`${head}: the first draw's thread time median ${ms(median(results.map(r => r.work)))}`);
for (const key of ["wall", "thread"]) {
  const longest = results.map(r => r[key].longest);
  console.log(`${head}, ${key} time: tasks over ${LONG} ms median ${median(results.map(r => r[key].count))}; ` +
              `time beyond ${LONG} ms median ${ms(median(results.map(r => r[key].beyond)))}; the longest task median ${ms(median(longest))}, longest ${ms(Math.max(...longest))}`);
}
console.log(`CLS median ${median(results.map(r => r.cls)).toFixed(4)}, largest ${Math.max(...results.map(r => r.cls)).toFixed(4)}`);
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(results));
await browser.close();
