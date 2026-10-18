// The review's start (decisions/product.md, "The rules worker starts with the manifest"): the time from the navigation
// to the rules worker's start and to the review's first frame, on reloads of the stored review of
// tests/fixtures/hedgefund-review.json. Two builds in alternating pairs (speed.mjs, inPairs), in Playwright's
// Chromium, headless, with its scroll bars shown, at 1,366 × 657 pixels. Each build is served from its own folder on its
// own port (speed.mjs, preview), and opens in a page of its own, so each keeps its own stored games. A script that runs
// before the page's own (Playwright's addInitScript) notes when each step ends, in milliseconds from the navigation's
// start (performance.now()):
//   - start: the review page's code asks for the first of the game, the lock and the manifest (its onMount): the
//     open of IndexedDB, the lock's request or the manifest's fetch;
//   - open: IndexedDB is open (the site's store, src/lib/storage/db.ts, opens at the game's read);
//   - game: the stored game is read (the first read of the store `games` in IndexedDB succeeds);
//   - lock: the tab holds the game's lock (navigator.locks.request calls back);
//   - manifest: the engine's manifest answers (the fetch of /engine/manifest.json);
//   - worker: the rules worker is made (the page's first Worker: the pool's first, or the session's, startRules);
//   - init: the page sends it the module (the module compiled, EngineWorker.init);
//   - ready: the rules worker has started (its reply to the module);
//   - rules, shown, moves: the page's marks `review:rules` (the rules answered), `review:shown` (the review's first
//     frame starts) and `review:moves` (the move list's rows, a frame later), src/routes/review/+page.svelte and
//     src/lib/review/ReviewView.svelte.
// A set is a few reloads of one build: the median of each time. The verdict (speed.mjs, verdict) compares the sets'
// medians, pair by pair, for the rules worker's start and for the review's first frame, from the navigation and from
// the page's start: the page's own scripts load first, and on a loaded machine that time varies. Each reload also
// reads the page's layout shift (speed.mjs, layoutShift).
//
//   node scripts/measure/review-start.mjs <before> <after> [pairs] [reloads]
//
// <before> and <after> are build folders, copies of `build` (docs/working-notes.md). They are served on the port PORT
// and the next (4195 by default). With CORES, the pages see that many cores (navigator.hardwareConcurrency), so the
// review starts half as many search workers (pool.ts, defaultPoolSize): a job of 2 threads (scripts/machine run) then
// runs 2 of them with CORES=4, not one for every two of the machine's threads. With LATENCY, each request that reaches
// the server takes that many milliseconds more (Chrome's network emulation), as on the deployed site, where the
// manifest's check is a round trip: the files kept in the browser's cache take none. It starts after the review is
// stored. With OUT, the sets go to that file as JSON.
import { writeFileSync } from "node:fs";
import { inPairs, launch, layoutShift, median, preview, storeReview, verdict } from "./speed.mjs";

const [before, after, pairCount = "5", reloadCount = "5"] = process.argv.slice(2);
if (!before || !after) throw new Error("usage: review-start.mjs <before> <after> [pairs] [reloads]");
const STEPS = ["start", "open", "game", "lock", "manifest", "worker", "init", "ready", "rules", "shown", "moves"];
const FROM_START = ["worker", "ready", "shown", "moves"]; // also counted from the page's start

/** Runs in the page before its own scripts: notes the first time that each step ends, in `window.__start`. */
function noteSteps() {
  const t = (window.__start = {}), note = step => { t[step] ??= performance.now(); };
  const open = IDBFactory.prototype.open;
  IDBFactory.prototype.open = function (...args) {
    note("start");
    const request = open.apply(this, args);
    request.addEventListener("success", () => note("open"));
    return request;
  };
  const get = IDBObjectStore.prototype.get;
  IDBObjectStore.prototype.get = function (key) {
    const request = get.call(this, key);
    if (this.name === "games") { note("start"); request.addEventListener("success", () => note("game")); }
    return request;
  };
  const request = LockManager.prototype.request;
  LockManager.prototype.request = function (name, options, callback) {
    const call = typeof options === "function" ? options : callback;
    note("start");
    const held = lock => { note("lock"); return call(lock); };
    return typeof options === "function" ? request.call(this, name, held) : request.call(this, name, options, held);
  };
  const fetched = window.fetch;
  window.fetch = function (input, init) {
    const answer = fetched.call(this, input, init);
    if (String(input?.url ?? input).includes("/engine/manifest.json")) { note("start"); answer.then(() => note("manifest"), () => {}); }
    return answer;
  };
  const Made = window.Worker;
  window.Worker = class extends Made {
    constructor(url, options) {
      super(url, options);
      if (t.worker !== undefined) return;
      note("worker");
      t.workerUrl = String(url);
      let started;
      const post = this.postMessage.bind(this);
      this.postMessage = (m, ...rest) => {
        if (m?.type === "init" && started === undefined) { started = m.id; note("init"); }
        return post(m, ...rest);
      };
      this.addEventListener("message", e => { if (started !== undefined && e.data?.id === started) note("ready"); });
    }
  };
}

const browser = await launch();
const builds = [];
const port = Number(process.env.PORT ?? 4195);
for (const [dir, k] of [[before, 0], [after, 1]]) {
  const served = await preview(dir, port + k), page = await browser.newPage({ viewport: { width: 1366, height: 657 } });
  if (process.env.CORES) await page.addInitScript(cores => Object.defineProperty(navigator, "hardwareConcurrency", { get: () => cores }), Number(process.env.CORES));
  await storeReview(page, served.url);
  if (process.env.LATENCY) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: Number(process.env.LATENCY), downloadThroughput: -1, uploadThroughput: -1 });
  }
  await page.addInitScript(noteSteps);
  builds.push({ name: dir, served, page });
}

/** One set: `reloadCount` reloads of a build's page. Each step's median time, and the median layout shift. */
async function set({ page }) {
  const reloads = [];
  for (let k = 0; k < Number(reloadCount); k++) {
    await page.reload();
    await page.waitForFunction(() => performance.getEntriesByName("review:shown").length, null, { timeout: 120_000 });
    await page.waitForTimeout(3000); // the frames after the first, and what moves in them
    const times = await page.evaluate(() => {
      const t = { ...window.__start };
      for (const step of ["rules", "shown", "moves"]) t[step] = performance.getEntriesByName(`review:${step}`)[0]?.startTime;
      return t;
    });
    if (!times.workerUrl?.includes("worker")) throw new Error(`the page's first worker is ${times.workerUrl}`);
    for (const step of FROM_START) times[`${step}-start`] = times[step] - times.start;
    reloads.push({ ...times, cls: (await layoutShift(page)).cls });
  }
  const keys = [...STEPS, ...FROM_START.map(s => `${s}-start`), "cls"];
  return { ...Object.fromEntries(keys.map(s => [s, median(reloads.map(r => r[s]))])), reloads };
}

const pairs = await inPairs(builds, Number(pairCount), set);
const ms = x => `${Math.round(x)}`;
console.log(`1366×657${process.env.LATENCY ? `, ${process.env.LATENCY} ms more for each request` : ""}, ${pairCount} pairs of ${reloadCount} reloads, the medians of each set in ms from the navigation's start:`);
pairs.forEach((pair, i) => {
  console.log(`  pair ${i + 1}:`);
  pair.forEach((run, k) => console.log(`    ${k ? "after " : "before"} ${STEPS.map(s => `${s} ${ms(run.result[s])}`).join(", ")}; ` +
    `CLS ${run.result.cls.toFixed(4)} (${run.load?.cpu ?? "?"}%, load ${run.load?.load ?? "?"}${run.load?.jobs ? `, jobs ${run.load.jobs.join(", ")}` : ""})`));
});
const verdicts = {};
for (const step of ["worker", "init", "ready", "rules", "shown", "moves", ...FROM_START.map(s => `${s}-start`), "cls"]) {
  const v = verdicts[step] = verdict(pairs.map(pair => pair.map(run => run.result[step])));
  const f = step === "cls" ? x => x.toFixed(4) : ms;
  console.log(`  ${step}: differences ${v.diffs.map(f).join(", ")}, median ${f(v.diff)}; before median ${f(v.a.median)} (spread ${f(v.a.spread)}), ` +
              `after median ${f(v.b.median)} (spread ${f(v.b.spread)}); the pairs agree: ${v.agree}, a change: ${v.change}`);
}
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify({ pairs, verdicts }));
await browser.close();
for (const b of builds) await b.served.stop();
