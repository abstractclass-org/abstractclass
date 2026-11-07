// The start of the engine's pool on a site's Analysis board (design 09, pool.ts): how long each worker takes to start,
// and how much memory it holds. It opens the board of a build (Hedge School's or Cyanotype's) in Playwright's Chromium,
// headless, with the layout test's launch options (playwright.config.ts: off the GPU on Windows), so the engine runs on
// the CPU. Before the page's own scripts, it keeps the engine's settings in the page's storage, with the workers asked
// and the GPU off, so the page starts its pool by its own code (EngineSession, EnginePool). A script that runs before
// the page's own (Playwright's addInitScript) notes, for each worker that the page makes, in milliseconds from its
// creation (performance.now()):
//   - init: the worker's reply to the module (EngineWorker.init: the module compiled and started in the worker);
//   - model: its reply to the network (EngineWorker.loadModel): a search worker is then ready, and the pool gives it
//     work (pool.ts, start);
//   - search: its first answer to a search (a partial result or the reply), for the worker that searches the position
//     on screen, counted from the page's request (searchSent), and the time from it to the search's next answer
//     (secondSearch): a first answer much slower than the next is a cost of the first search, not of every slice. Each
//     answer's visits (rootInfo.visits) give the time of a visit: the next answer's time over the visits that it adds,
//     when both answers are of one search;
//   - memory: the module's linear memory that its last reply gives (worker.ts, memoryBytes).
// The rules worker loads no network: it is the worker that has no reply to a network. When the last search worker is
// ready and a search has given its second answer, and 3 seconds after that, the run reads the commit charge of the
// browser's renderer processes (Windows only: the processes with --type=renderer in their command line whose parent is
// a browser that this script started), where the page and its workers run. Each run opens a new browser context, so
// each starts with an empty cache of the page's compiled module.
//
//   node scripts/measure/pool-start.mjs <build> <port> <settings key> <workers, comma-separated> [runs]
//
// <build> is a build folder, served on <port> as Cloudflare Pages serves it (speed.mjs, preview). <settings key> is the
// site's key of the engine's settings in localStorage: "learn-enclosure:engine:2" for Hedge School,
// "cyanotype:engine:2" for Cyanotype. With OUT, the runs go to that file as JSON.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import config from "../../playwright.config.ts";
import { median, preview } from "./speed.mjs";

const [build, port, key, workerList, runCount = "3"] = process.argv.slice(2);
if (!build || !port || !key || !workerList) {
  throw new Error("usage: pool-start.mjs <build> <port> <settings key> <workers, comma-separated> [runs]");
}
const launchOptions = config.projects.find(p => p.name === "chromium").use.launchOptions;

/** Runs in the page before its own scripts: keeps the engine's settings, and notes each worker's steps in
 *  `window.__workers`. */
function watchWorkers({ key, settings }) {
  try { localStorage.setItem(key, JSON.stringify(settings)); } catch { /* storage blocked: the count of workers fails */ }
  const workers = (window.__workers = []);
  const Native = window.Worker;
  window.Worker = class extends Native {
    constructor(url, options) {
      super(url, options);
      const made = performance.now(), w = { memory: 0 }, types = new Map();
      workers.push(w);
      const post = this.postMessage.bind(this);
      this.postMessage = (m, ...rest) => {
        const search = m?.type === "search" || (m?.type === "call" && m.request?.id === "a"); // client.ts, analyse
        const type = m?.type === "init" || m?.type === "model" ? m.type : search ? "search" : undefined;
        if (type && typeof m.id === "number") types.set(m.id, type);
        if (search) w.searchSent ??= performance.now() - made;
        return post(m, ...rest);
      };
      this.addEventListener("message", event => {
        const m = event.data, type = types.get(m?.id), at = performance.now() - made;
        if (!type || !(m.type === "reply" || (m.type === "partial" && type === "search"))) return;
        if (m.type === "reply") w.memory = m.memory;
        const id = m.id, visits = m.reply?.rootInfo?.visits;
        if (type === "init") { w.init ??= at; w.initInWorker ??= m.ms; }
        else if (type === "model") w.model ??= at;
        else if (w.search === undefined) Object.assign(w, { search: at, searchId: id, searchVisits: visits });
        else if (w.secondSearch === undefined) Object.assign(w, { secondSearch: at, secondId: id, secondVisits: visits });
      });
    }
  };
}

/** The commit charge, in bytes, of the renderer processes of the browser that this script started (Windows only, else
 *  null). Playwright starts the browser as a child of this process, and the browser starts its renderers: so the sum
 *  leaves out the browsers of other runs on the machine. */
function rendererCommit() {
  if (process.platform !== "win32") return null;
  const script = "$all = Get-CimInstance Win32_Process; " +
                 `$browsers = $all | Where-Object { $_.ParentProcessId -eq ${process.pid} } | ` +
                 "ForEach-Object { $_.ProcessId }; " +
                 "$all | Where-Object { $_.CommandLine -like '*--type=renderer*' -and " +
                 "$browsers -contains $_.ParentProcessId } | " +
                 "Measure-Object -Property PrivatePageCount -Sum | ForEach-Object { $_.Sum }";
  return Number(execFileSync("powershell", ["-NoProfile", "-Command", script], { encoding: "utf8" }).trim()) || 0;
}

const MB = bytes => Math.round(bytes / 2 ** 20);
const server = await preview(build, Number(port));
const browser = await chromium.launch(launchOptions);
const results = [];
try {
  for (const n of workerList.split(",").map(Number)) {
    for (let run = 0; run < Number(runCount); run++) {
      const context = await browser.newContext({ viewport: { width: 1366, height: 657 } });
      await context.addInitScript(watchWorkers, { key, settings: { on: true, workers: n, gpu: "off" } });
      const page = await context.newPage();
      await page.goto(`${server.url}/analysis`);
      // The search workers are those that load a network: wait until n of them are ready and one has given two
      // answers to its search.
      await page.waitForFunction(n => {
        const search = window.__workers.filter(w => w.model !== undefined);
        return search.length >= n && search.some(w => w.secondSearch !== undefined);
      }, n, { timeout: 300_000, polling: 250 });
      await page.waitForTimeout(3_000);
      const { workers, cores } = await page.evaluate(() => ({
        workers: window.__workers, cores: navigator.hardwareConcurrency }));
      const commit = rendererCommit();
      const search = workers.filter(w => w.model !== undefined), rules = workers.find(w => w.model === undefined);
      // A page that did not keep the settings starts its default pool (defaultPoolSize): not the run asked.
      if (search.length !== n) throw new Error(`the page started ${search.length} search workers, not ${n}`);
      const answered = search.filter(w => w.secondSearch !== undefined);
      const soonest = search.filter(w => w.search !== undefined)
        .reduce((a, w) => (w.search - w.searchSent < a.search - a.searchSent ? w : a));
      const oneSearch = answered.filter(w => w.secondId === w.searchId && w.secondVisits > w.searchVisits);
      const r = {
        workers: n, run, hardwareConcurrency: cores,
        init: median(search.map(w => w.init)), ready: median(search.map(w => w.model)),
        lastReady: Math.max(...search.map(w => w.model)), initInWorker: median(search.map(w => w.initInWorker)),
        firstSearch: soonest.search - soonest.searchSent, firstVisits: soonest.searchVisits,
        nextAnswer: Math.min(...answered.map(w => w.secondSearch - w.search)),
        visitMs: oneSearch.length
          ? median(oneSearch.map(w => (w.secondSearch - w.search) / (w.secondVisits - w.searchVisits))) : null,
        memory: MB(median(search.map(w => w.memory))), rulesMemory: MB(rules?.memory ?? 0),
        renderer: commit === null ? null : MB(commit), raw: workers,
      };
      results.push(r);
      console.log(`${n} worker(s), run ${run + 1}: init ${Math.round(r.init)} ms (in the worker ` +
        `${Math.round(r.initInWorker)}), ready ${Math.round(r.ready)} ms (last ${Math.round(r.lastReady)}), first ` +
        `answer to a search ${Math.round(r.firstSearch)} ms after the page asked (${r.firstVisits} visits; the next ` +
        `${Math.round(r.nextAnswer)} ms later; ${r.visitMs === null ? "no" : r.visitMs.toFixed(1)} ms a visit), ` +
        `${r.memory} MB a search worker, rules worker ${r.rulesMemory} MB, renderers ${r.renderer} MB ` +
        `(hardwareConcurrency ${r.hardwareConcurrency})`);
      await context.close();
    }
  }
} finally {
  await browser.close();
  await server.stop();
}
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(results, null, 2));
