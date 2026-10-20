// A review in a hidden tab (decisions/product.md, "A review in a hidden tab"): the review of
// tests/fixtures/hedgefund-review.json's game (120 positions) from no stored result, in a tab that stays in front, in a
// tab hidden for under 5 minutes, and in a tab hidden for over 5 minutes. A browser checks a hidden page's timers once
// a second, and, once the page has been hidden for 5 minutes, its chained timers (a timer set by a timer, 5 deep or
// more) once a minute (developer.chrome.com, "Heavy throttling of chained JS timers beginning in Chrome 88"). Each run
// starts a browser of its own, headless, with a new profile, whose tab can be hidden (speed.mjs, launchHideable), at
// 1,366 × 657 pixels. The set-ups:
//   - front: the tab opens the game's record (`/import#record=`) and stays in front;
//   - hidden: the same, and a new tab comes to front once the review shows (`review:shown`), before the sweep starts;
//   - late: the tab opens the About page, a new tab comes to front, and 5 minutes 40 seconds later (5 minutes, the 30
//     seconds of silence that the browser also waits for, and a margin) the tab opens the record by a link in the page.
// The import page keeps a record's game, then loads the game's review in its place (Arrival.svelte), so the review runs
// in a new document in all three. An init script watches the sweep (speed.mjs, watchSweep), and another probes the tab:
// a chained timer of 250 ms notes each time it runs, the batch's timer (BATCH_MS in
// packages/analysis/src/analysis.svelte.ts, set from a worker's message or a write, not chained) notes how long each
// one waited, and each change of document.visibilityState and of the progress line's step is noted. Each run reads:
//   - the sweep's time on the page (sweep:start to sweep:end), and the engine's: from the sweep's first search sent to
//     its last search's final reply. The display's lag: from that reply to sweep:end;
//   - the search workers' speed: the sweep searches' visits over the workers' own time for them (the reply's `ms`),
//     and the same for the searches in slices of 32 visits (the position on screen, the key moments) and of 256 (the
//     label pass, the Greats' confirmations): between two slices, the worker yields (packages/engine/src/channel.ts,
//     searchInSlices);
//   - the gaps between one engine's searches (speed.mjs, sweepGaps), and the pool's times with no search running, from
//     the sweep's start to the run's end: the longest, and each one over 50 ms;
//   - how long the batch's timers waited during the sweep, the chained timer's interval, and the share of the sweep's
//     time that the tab was hidden;
//   - the main thread's thread time during the sweep, from Chrome's trace (with the end `sweep` only);
//   - each search's times, and the searches with no final reply (with the end `review`);
//   - the search workers that ended before the run's end (the pool's idle release, IDLE_RELEASE_MS in
//     packages/engine/src/pool.ts), and the workers made after the sweep's start;
//   - in a hidden tab, each renderer process's priority class and Windows' power throttling (EcoQoS), from PowerShell.
// The end: `sweep` stops a run once a search after the sweep has ended (the label pass's first), or 60 s after the
// sweep's end. `review` stops it at Review done, and reads when each step of the progress line started.
//
//   node scripts/measure/review-hidden.mjs <build> [runs] [set-ups] [browsers] [end] [port]
//
// set-ups: a list from front, hidden and late (by default all three); browsers: a list from chromium and msedge (by
// default chromium alone, and msedge only with HS_EDGE=1: scripts/edge.mjs); end: sweep or review (by default sweep).
// Each browser runs `runs` rounds (by default 3), and each round runs every set-up, in an order that turns by one each
// round. The engine settings: 2 search workers (WORKERS sets another number), the GPU off, the rest the site's
// defaults. With OUT, every run's numbers and the machine's load go to that file as JSON.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { browserList } from "../edge.mjs";
import { FIXTURE, launchHideable, longTasks, machineLoad, median, preview, sweepGaps, tasksBetween, trace, watchSweep } from "./speed.mjs";
import { SWEEP_VISITS } from "@abstractclass/analysis/cache.ts";

const [build] = process.argv.slice(2, 3);
const runs = Number(process.argv[3] ?? 3), setups = (process.argv[4] ?? "front,hidden,late").split(",");
const browsers = browserList(process.argv[5]), end = process.argv[6] ?? "sweep";
const port = Number(process.argv[7] ?? 4391);
const record = JSON.parse(readFileSync(FIXTURE, "utf8")).record;
// The batch's delay, from its source: game.svelte.ts holds runes, which Node cannot import.
const BATCH_MS = Number(readFileSync("../../packages/analysis/src/analysis.svelte.ts", "utf8").match(/export const BATCH_MS = (\d+);/)[1]);
const LATE_MS = 340_000, WORKERS = Number(process.env.WORKERS ?? 2);

/** An init script that probes the tab: see the head of this file. */
function probeTab(batchMs) {
  const p = (window.__probe = { ticks: [], batches: [], visibility: [[performance.now(), document.visibilityState]], steps: [] });
  document.addEventListener("visibilitychange", () => p.visibility.push([performance.now(), document.visibilityState]));
  const tick = () => { p.ticks.push(performance.now()); setTimeout(tick, 250); };
  setTimeout(tick, 250);
  const set = window.setTimeout;
  window.setTimeout = (fn, ms, ...rest) => {
    if (ms !== batchMs || typeof fn !== "function") return set(fn, ms, ...rest);
    const at = performance.now();
    return set((...a) => { p.batches.push([at, performance.now()]); fn(...a); }, ms, ...rest);
  };
  // The progress line's step ("Reviewing: the game's shape", "Reviewing: move quality", …), and null once it goes.
  let step;
  new MutationObserver(() => {
    const now = document.querySelector('p[title^="Reviewing:"]')?.title.split(",")[0] ?? null;
    if (now !== step && (now || step)) p.steps.push([performance.now(), now]);
    step = now;
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["title"] });
}

/** What the page noted, at the run's end. */
const collect = () => ({
  marks: Object.fromEntries(["review:shown", "sweep:start", "sweep:end"].map(n => [n, performance.getEntriesByName(n)[0]?.startTime])),
  searches: window.__searches, workers: window.__workers, probe: window.__probe, now: performance.now(),
  done: document.body.innerText.includes("Review done"),
});

/** Waits until `check` holds in the page, asked from here every `every` milliseconds: a hidden page's own timers and
 *  animation frames, which Playwright's waits use, run late or not at all. A page that loads meanwhile answers false. */
async function until(page, check, arg, timeout, every = 1000) {
  for (const stop = Date.now() + timeout; Date.now() < stop; await new Promise(r => setTimeout(r, every)))
    if (await page.evaluate(check, arg).catch(() => false)) return;
  throw new Error(`timed out after ${timeout / 1000} s`);
}

/** Each renderer process of the browser `pid`: its priority class and its power throttling (EcoQoS: control and state,
 *  1 for the execution speed, 4 for the timer resolution). */
function renderers(pid) {
  const script = `
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public static class Eco {
  [StructLayout(LayoutKind.Sequential)] public struct State { public uint Version; public uint ControlMask; public uint StateMask; }
  [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint a, bool i, int p);
  [DllImport("kernel32.dll")] public static extern bool GetProcessInformation(IntPtr h, int c, ref State s, int n);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
  public static string Of(int pid) {
    IntPtr h = OpenProcess(0x1000, false, pid); if (h == IntPtr.Zero) return "?";
    State s = new State(); s.Version = 1; bool ok = GetProcessInformation(h, 4, ref s, Marshal.SizeOf(s)); CloseHandle(h);
    return ok ? (s.ControlMask + "/" + s.StateMask) : "?";
  }
}
"@
Get-CimInstance Win32_Process -Filter "ParentProcessId=${pid}" | Where-Object { $_.CommandLine -like "*--type=renderer*" } |
  ForEach-Object { "{0} {1}" -f (Get-Process -Id $_.ProcessId).PriorityClass, [Eco]::Of([int]$_.ProcessId) }`;
  try { return execFileSync("pwsh", ["-NoProfile", "-Command", script], { encoding: "utf8" }).trim().split(/\r?\n/); }
  catch (e) { return [`error: ${e.message.split("\n")[0]}`]; }
}

let cdpPort = 9400;
/** One run: the browser `channel`, the set-up `setup`, the site at `url`. */
async function run(url, channel, setup) {
  const b = await launchHideable({ channel, port: cdpPort++ });
  try {
    await b.context.addInitScript(watchSweep, JSON.stringify({ workers: WORKERS, gpu: "off" }));
    await b.context.addInitScript(probeTab, BATCH_MS);
    const address = `/import#record=${encodeURIComponent(record)}`;
    let waited = null;
    if (setup === "late") {
      await b.page.goto(`${url}/about`);
      await b.hide();
      await new Promise(r => setTimeout(r, LATE_MS));
      waited = await b.page.evaluate(() => ({ visibility: document.visibilityState, ticks: window.__probe.ticks.slice(-4) }));
    }
    let data;
    const act = async () => {
      if (setup === "late") {
        await b.page.evaluate(href => { const a = Object.assign(document.createElement("a"), { href }); document.body.append(a); a.click(); }, address);
      } else await b.page.goto(url + address);
      if (setup === "hidden") {
        await until(b.page, () => performance.getEntriesByName("review:shown").length > 0, null, 120_000, 100);
        await b.hide();
      }
      if (end === "review") await until(b.page, () => document.body.innerText.includes("Review done"), null, 3_600_000, 2000);
      else await until(b.page, sweep => {
        const at = performance.getEntriesByName("sweep:end")[0]?.startTime;
        if (at === undefined) return false;
        const last = Math.max(...window.__searches.filter(s => s.visits === sweep).map(s => s.ended ?? Infinity));
        return window.__searches.some(s => s.sent > last && s.ended !== undefined) || performance.now() - at > 60_000;
      }, SWEEP_VISITS, 900_000);
      data = await b.page.evaluate(collect);
    };
    const traced = end === "sweep" ? await trace(b.browser, b.page, act, ["toplevel", "blink.user_timing"]) : (await act(), null);
    const priority = setup === "front" ? null : renderers(b.pid);
    return { ...measure(data, traced), waited, priority };
  } finally {
    await b.close();
  }
}

/** A run's numbers, from what the page noted and Chrome's trace. Times in milliseconds. */
function measure(d, traced) {
  const { marks, searches, probe } = d, start = marks["sweep:start"], stop = marks["sweep:end"];
  const sweep = searches.filter(s => s.visits === SWEEP_VISITS), lastReply = Math.max(...sweep.map(s => s.ended));
  const first = Math.min(...sweep.map(s => s.sent));
  const within = (t, a = start, b = stop) => t >= a && t <= b;
  const delays = probe.batches.filter(([at]) => within(at)).map(([at, fired]) => fired - at);
  const ticks = probe.ticks.filter(t => within(t)), intervals = ticks.slice(1).map((t, k) => t - ticks[k]);
  // The pool's times with no search running, from the sweep's first search to the run's end.
  const spans = searches.filter(s => s.sent >= first).map(s => [s.sent, s.ended ?? d.now]).sort((a, b) => a[0] - b[0]);
  let idle = { ms: 0, at: null }, reach = spans[0][1];
  const idles = [];
  for (const [a, b] of spans.slice(1)) {
    if (a - reach > idle.ms) idle = { ms: a - reach, at: reach };
    if (a - reach > 50) idles.push([Math.round(reach - start), Math.round(a - reach)]);
    reach = Math.max(reach, b);
  }
  // The share of the sweep's time that the tab was hidden.
  const states = [...probe.visibility, [stop, null]];
  const hidden = states.slice(0, -1).reduce((sum, [t, v], k) => sum + (v === "hidden" ? Math.max(0, Math.min(stop, states[k + 1][0]) - Math.max(start, t)) : 0), 0) / (stop - start);
  const tasks = traced && tasksBetween(traced, "sweep:start", "sweep:end");
  const next = searches.filter(s => s.sent > lastReply).sort((a, b) => a.sent - b.sent)[0];
  const speedOf = xs => (xs.length ? (1000 * xs.reduce((n, x) => n + x.searched, 0)) / xs.reduce((n, x) => n + x.ms, 0) : null);
  const replied = searches.filter(x => x.ended !== undefined && x.ms > 0);
  const bySlice = n => { const xs = replied.filter(x => x.slice === n); return { count: xs.length, speed: speedOf(xs) }; };
  return {
    shown: stop - start, engine: lastReply - first, lag: stop - lastReply,
    speed: speedOf(sweep), sliced: bySlice(32), label: bySlice(256),
    // Each search from a minute before the sweep's start: [sent, ended or null, visits, slice or null, worker], in ms
    // from the sweep's start.
    searches: searches.filter(s => s.sent >= start - 60_000).map(s => [Math.round(s.sent - start), s.ended === undefined ? null : Math.round(s.ended - start), s.visits, s.slice ?? null, s.worker]),
    gaps: sweepGaps(searches, stop, SWEEP_VISITS), idle, idles, next: next && { visits: next.visits, after: next.sent - lastReply },
    batch: { count: delays.length, median: median(delays), longest: Math.max(...delays) },
    tick: { median: intervals.length ? median(intervals) : null, longest: intervals.length ? Math.max(...intervals) : null },
    hidden,
    ended: d.workers.filter(w => w.ended !== undefined).map(w => w.ended), made: d.workers.filter(w => w.made > start).length,
    main: tasks && { thread: tasks.reduce((s, t) => s + t.thread, 0), long: longTasks(tasks.map(t => t.thread)) },
    steps: probe.steps.map(([t, s]) => [Math.round(t - start), s]), done: d.done,
  };
}

const site = await preview(build, port);
const s = x => (x === null || x === undefined ? "-" : `${(x / 1000).toFixed(1)} s`), ms = x => (x === null || x === undefined ? "-" : `${Math.round(x)} ms`);
const out = [];
for (const channel of browsers) {
  for (let k = 0; k < runs; k++) {
    for (const setup of setups.map((_, i) => setups[(i + k) % setups.length])) {
      const load = machineLoad();
      let r;
      try { r = await run(site.url, channel, setup); }
      catch (e) { console.log(`${channel} ${setup}: failed: ${e.message}`); out.push({ channel, setup, load, error: e.message }); continue; }
      out.push({ channel, setup, load, ...r });
      console.log(`${channel} ${setup} (${load ? `${load.cpu}%, ${load.load}` : "load ?"}): hidden for ${Math.round(100 * r.hidden)}% of the sweep; ` +
                  `the sweep ${s(r.shown)} on the page, ` +
                  `${s(r.engine)} in the engine, lag ${ms(r.lag)}; ${Math.round(r.speed)} visits/s a worker (in slices of 32: ` +
                  `${r.sliced.speed ? Math.round(r.sliced.speed) : "-"}, ${r.sliced.count} searches; of 256: ${r.label.speed ? Math.round(r.label.speed) : "-"}, ` +
                  `${r.label.count}); gaps median ` +
                  `${r.gaps.median.toFixed(1)} ms, ${ms(r.gaps.total)} in all; the pool idle at most ${ms(r.idle.ms)}; the next search ` +
                  `${r.next ? `(${r.next.visits} visits) ${ms(r.next.after)} after the sweep's last reply` : "none"}; batch waits median ` +
                  `${ms(r.batch.median)}, longest ${ms(r.batch.longest)} (${r.batch.count}); the chained timer every ${ms(r.tick.median)}, ` +
                  `longest ${ms(r.tick.longest)}; workers ended ${r.ended.length}, made after the start ${r.made}` +
                  `${r.main ? `; main thread ${ms(r.main.thread)}, ${r.main.long.count} tasks over 50 ms` : ""}` +
                  `${r.priority ? `; renderers ${r.priority.join(", ")}` : ""}` +
                  `${end === "review" ? `; steps ${JSON.stringify(r.steps)}, done ${r.done}; the pool idle over 50 ms ` +
                                        `(from the sweep's start, ms) ${JSON.stringify(r.idles)}; searches with no final reply ` +
                                        `${JSON.stringify(r.searches.filter(x => x[1] === null))}` : ""}`);
      if (r.waited) console.log(`  before the late start: ${r.waited.visibility}, the chained timer's last runs ${JSON.stringify(r.waited.ticks.map(Math.round))}`);
      if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(out));
    }
  }
}
// The medians of each browser's set-ups.
for (const channel of browsers) for (const setup of setups) {
  const rs = out.filter(r => r.channel === channel && r.setup === setup && !r.error);
  if (!rs.length) continue;
  const m = f => { const xs = rs.map(f).filter(x => x !== null && x !== undefined); return xs.length ? median(xs) : null; };
  const v = x => (x === null ? "-" : Math.round(x));
  console.log(`${channel} ${setup}, median of ${rs.length}: the sweep ${s(m(r => r.shown))} on the page, ${s(m(r => r.engine))} in the engine; ` +
              `${v(m(r => r.speed))} visits/s a worker (in slices of 32: ${v(m(r => r.sliced.speed))}, of 256: ${v(m(r => r.label.speed))}); the pool idle at most ${ms(m(r => r.idle.ms))}; batch waits ${ms(m(r => r.batch.median))}` +
              `${rs[0].main ? `; main thread ${ms(m(r => r.main.thread))}` : ""}`);
}
await site.stop();
