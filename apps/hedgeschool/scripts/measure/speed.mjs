// The tools of the scripts that measure the site's speed (docs/working-notes.md, "Measuring speed in a browser"): a
// build's preview, Playwright's Chromium with Chrome's trace, a browser whose tab can be hidden, the test fixture's
// review kept in a page and reloaded, the watch of a review's sweep, the main thread's tasks and a named event's thread
// time from the trace, the page's layout shift, the machine's load, and two builds measured in alternating pairs, with
// the verdict on them. Its tests: speed.test.mjs.
import { chromium } from "@playwright/test";
import { execFileSync, spawn } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkBrowser, edgeProgram } from "../edge.mjs";

// The types of the build's files, by their extension. The browser checks some: a module script of another type does
// not run (the engine's CPU evaluator is a .mjs file), and WebAssembly streams only as application/wasm.
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
                ".json": "application/json", ".wasm": "application/wasm", ".svg": "image/svg+xml", ".png": "image/png",
                ".ico": "image/x-icon", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".txt": "text/plain; charset=utf-8",
                ".xml": "application/xml" };

/**
 * The rules of a build folder's _headers (Cloudflare Pages' format, from static/_headers): each path's pattern, where
 * `*` matches any text and `:name` one segment of the path, and the headers that it sets. A rule for a host
 * (`https://…`) matches no path.
 */
export function headerRules(dir) {
  const rules = [], path = join(dir, "_headers");
  for (const line of existsSync(path) ? readFileSync(path, "utf8").split(/\r?\n/) : []) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (/^\s/.test(line)) { const at = line.indexOf(":"); rules.at(-1).set[line.slice(0, at).trim()] = line.slice(at + 1).trim(); }
    else rules.push({ pattern: new RegExp("^" + line.trim().replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/:\w+/g, "[^/]+") + "$"), set: {} });
  }
  return rules;
}

/**
 * A build's preview on a port of its own, at 127.0.0.1. It serves a build folder (`build` after `npm run build`, or a
 * copy of it, so that two builds can run side by side) as Cloudflare Pages does: a page at its path without `.html`,
 * the folder's 404.html for a path that it lacks, and the headers of the folder's own _headers, "no-cache" where they
 * set no Cache-Control. Resolves with the preview's address and a function that stops it.
 */
export async function preview(dir, port) {
  const file = p => existsSync(p) && statSync(p).isFile() ? p : undefined, rules = headerRules(dir);
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname), base = join(dir, path);
    const found = file(base) ?? file(`${base}.html`) ?? file(join(base, "index.html")), sent = found ?? join(dir, "404.html");
    const headers = { "Content-Type": TYPES[extname(sent)] ?? "application/octet-stream", "Content-Length": statSync(sent).size, "Cache-Control": "no-cache" };
    if (found) for (const { pattern, set } of rules) if (pattern.test(path)) Object.assign(headers, set);
    res.writeHead(found ? 200 : 404, headers);
    createReadStream(sent).pipe(res);
  });
  await new Promise((resolve, reject) => server.once("error", reject).listen(port, "127.0.0.1", resolve));
  return { url: `http://127.0.0.1:${port}`, stop: () => new Promise(resolve => server.close(resolve)) };
}

/** Playwright's Chromium, headless, with its scroll bars shown, as the layout sweep runs it (playwright.config.ts). A
 *  `channel` in `options` goes through the gate on Edge (edge.mjs). An `executablePath` does not, and no script gives
 *  one. */
export function launch(options = {}) {
  if (options.channel) checkBrowser(options.channel);
  return chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"], ...options });
}

/** The switches of a browser that Playwright launches (playwright-core, chromiumSwitches) that keep a new profile apart
 *  from the machine's: no sign-in, sync or extensions, and no network traffic of the browser's own. Without them, Edge
 *  signs a new profile in to the Windows account and syncs that account's extensions into it, which open pages of
 *  their own. Playwright's switches that keep pages visible and their timers unthrottled are left out. Added:
 *  `--disable-sync`, and Edge's implicit sign-in to the Windows account off (`msImplicitSignin`, a name from Edge's
 *  own library), which Playwright's own contexts need not turn off: they are off the record. */
const APART = ["--no-first-run", "--no-default-browser-check", "--disable-sync", "--disable-extensions",
               "--disable-component-extensions-with-background-pages", "--disable-background-networking",
               "--disable-component-update", "--disable-default-apps", "--disable-client-side-phishing-detection",
               "--no-service-autorun", "--password-store=basic", "--disable-search-engine-choice-screen",
               "--edge-skip-compat-layer-relaunch", "--disable-features=msForceBrowserSignIn,msImplicitSignin"];

/** The accounts that a profile signed in to (its preference `account_info`), once its browser has ended. */
function accountsOf(profile) {
  try { return JSON.parse(readFileSync(join(profile, "Default", "Preferences"), "utf8")).account_info?.length ?? 0; }
  catch { return 0; }
}

/**
 * A browser whose tab can be hidden as a visitor hides one (docs/working-notes.md, "A hidden tab in Playwright"):
 * Playwright's Chromium (`channel` "chromium") or Edge ("msedge", only with HS_EDGE=1: edge.mjs), headless, with a new
 * profile of its own in the system's temporary folder, reached over CDP on `port`, its window `size` pixels. A browser
 * that Playwright launches keeps every page visible and its timers unthrottled: its switches turn off the background
 * throttling and the hidden renderers' lower priority, and its focus emulation keeps each page visible. This browser
 * has neither (`connectOverCDP` with `noDefaults`). Its profile stays apart from the machine's (APART), and its
 * preferences allow no sign-in, Edge's implicit sign-in too (in Local State). The page is in the profile's own context,
 * not in one that Playwright makes: Playwright turns on its focus emulation in those. Resolves with the browser, its
 * one context, its first page, `hide()`, which brings a new tab to front and so hides the others, `close()`, which ends
 * the browser and removes its profile, and the browser's process id (`pid`). `close()` throws when the profile signed
 * in to an account all the same.
 */
export async function launchHideable({ channel = "chromium", port, size = [1366, 657], args = [] }) {
  checkBrowser(channel);
  const profile = mkdtempSync(join(tmpdir(), "hideable-"));
  mkdirSync(join(profile, "Default"));
  writeFileSync(join(profile, "Default", "Preferences"), JSON.stringify({ signin: { allowed: false } }));
  writeFileSync(join(profile, "Local State"), JSON.stringify({ profiles: { edge_implicit_sign_in_enabled: false } }));
  const child = spawn(channel === "msedge" ? edgeProgram() : chromium.executablePath(),
                      [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--headless=new", ...APART,
                       `--window-size=${size.join(",")}`, ...args, "about:blank"], { stdio: "ignore" });
  const exited = new Promise(resolve => child.once("exit", resolve));
  let browser;
  const close = async () => {
    // Browser.close ends the browser as the close of its last window does: it writes the profile's preferences first.
    await browser?.newBrowserCDPSession().then(cdp => cdp.send("Browser.close")).catch(() => {});
    await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 10_000).unref())]);
    child.kill();
    await exited;
    const accounts = accountsOf(profile);
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
    if (accounts) throw new Error(`the browser's profile signed in to ${accounts} account(s)`);
  };
  for (let tries = 0; !browser; tries++) {
    try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { noDefaults: true }); }
    catch (e) {
      if (tries >= 100) { await close(); throw e; }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  const context = browser.contexts()[0];
  const page = context.pages()[0] ?? await context.newPage();
  const hide = async () => { const other = await context.newPage(); await other.bringToFront(); return other; };
  return { browser, context, page, hide, close, pid: child.pid };
}

/** The test fixture: the review file of a whole game, with the engine's results (from apps/hedgeschool). */
export const FIXTURE = "tests/fixtures/hedgefund-review.json";

/** Imports a Hedge School file (a review file or an analysis file) on the Review tab of the site at `url`. */
export async function importFile(page, url, file) {
  await page.goto(`${url}/review`);
  await page.locator('input[type="file"][accept*="json"]').first().setInputFiles(file);
}

/** Keeps the fixture's review in the page's browser: imports it, and waits until the review is done, as the engine
 *  searches what the file lacks. */
export async function storeReview(page, url) {
  await importFile(page, url, FIXTURE);
  await page.waitForURL(/#game=/);
  await page.getByText(/^Review done/).waitFor({ timeout: 300_000 });
}

/** Reloads the review kept in the page (storeReview), and waits for its first frame (the mark `review:shown`,
 *  src/routes/review/+page.svelte), then 3 seconds for the frames after it and what moves in them. */
export async function reloadReview(page) {
  await page.reload();
  await page.waitForFunction(() => performance.getEntriesByName("review:shown").length, null, { timeout: 120_000 });
  await page.waitForTimeout(3000);
}

/**
 * An init script (Playwright's `addInitScript`) that watches a review's sweep, with `settings`, the engine settings
 * that it keeps in the page's browser, as JSON. It marks the sweep's start (`sweep:start`, when the review's progress
 * line, ReviewView.svelte, first names the game's shape) and its end (`sweep:end`, when it names the move quality).
 * It wraps `Worker`. In `window.__searches` it notes each search that the page sends to a worker (a request with
 * maxVisits): the worker, the position's moves (`moves`, joined by spaces), the visits, the visits of its slices
 * (`slice`, for a search in slices), when it was sent and when its final reply came (a partial reply is a slice's
 * result), with the worker's own time for it (`ms`), at the end of each slice (`slices`), and the visits that it
 * searched (`searched`). In `window.__workers` it notes when each worker was made, and when it ended (terminate).
 */
export function watchSweep(settings) {
  localStorage.setItem("learn-enclosure:engine:2", settings);
  const marked = name => performance.getEntriesByName(name).length > 0;
  const once = (name, selector) => { if (!marked(name) && document.querySelector(selector)) performance.mark(name); };
  const observer = new MutationObserver(() => {
    once("sweep:start", `p[title^="Reviewing: the game's shape"]`);
    if (marked("sweep:start")) once("sweep:end", `p[title^="Reviewing: move quality"]`);
    if (marked("sweep:end")) observer.disconnect();
  });
  observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["title"] });
  const searches = (window.__searches = []), workers = (window.__workers = []), Base = window.Worker;
  window.Worker = class extends Base {
    #index = workers.push({ made: performance.now() }) - 1;
    #open = new Map();
    constructor(...args) {
      super(...args);
      this.addEventListener("message", e => {
        const s = this.#open.get(e.data?.id);
        if (!s) return;
        if (e.data.type === "partial") { s.slices.push(e.data.ms); return; }
        Object.assign(s, { ended: performance.now(), ms: e.data.ms, searched: e.data.reply?.rootInfo?.visits });
        this.#open.delete(e.data.id);
      });
    }
    postMessage(m, ...rest) {
      if ((m?.type === "call" || m?.type === "search") && m.request?.maxVisits !== undefined) {
        const s = { worker: this.#index, moves: m.request.moves?.join(" ") ?? "", visits: m.request.maxVisits,
                    slice: m.request.slice?.visits, sent: performance.now(), slices: [] };
        searches.push(s);
        this.#open.set(m.id, s);
      }
      return super.postMessage(m, ...rest);
    }
    terminate() {
      workers[this.#index].ended = performance.now();
      return super.terminate();
    }
  };
}

/** The gaps between one engine's searches of the sweep, in milliseconds (`searches` as watchSweep notes them, `end`
 *  the sweep's end mark, `visits` the sweep's budget, SWEEP_VISITS): from a search's final reply to the next search
 *  that the page sends to the same worker, where both are the sweep's and the next one starts before the sweep's end.
 *  The sweep's searches wait in the queue until its end, so a gap is mostly the page's time between two searches. It
 *  also holds any wait for the next search to reach the queue (its read of the store). */
export function sweepGaps(searches, end, visits) {
  const gaps = [];
  for (const worker of new Set(searches.map(s => s.worker))) {
    const own = searches.filter(s => s.worker === worker).sort((a, b) => a.sent - b.sent);
    for (let k = 1; k < own.length; k++) {
      const [a, b] = [own[k - 1], own[k]];
      if (a.visits === visits && b.visits === visits && a.ended !== undefined && b.sent <= end) gaps.push(b.sent - a.ended);
    }
  }
  const sorted = gaps.sort((a, b) => a - b);
  return { count: gaps.length, median: median(sorted), p90: sorted[Math.floor(0.9 * (sorted.length - 1))],
           longest: sorted.at(-1), total: gaps.reduce((s, g) => s + g, 0) };
}

/** The categories of Chrome's trace that the tasks and the marks need. A named event can need another: `DoDigest` is
 *  in "disabled-by-default-devtools.timeline". */
export const CATEGORIES = ["toplevel", "blink.user_timing", "devtools.timeline"];

/** Chrome's trace of the page while `act` runs, as its JSON ({ traceEvents }). */
export async function trace(browser, page, act, categories = CATEGORIES) {
  await browser.startTracing(page, { categories });
  await act();
  return JSON.parse((await browser.stopTracing()).toString());
}

const end = e => e.ts + e.dur;

/** The mark named `name` (performance.mark) in a trace, or undefined. */
export const mark = (trace, name) => trace.traceEvents.find(e => e.name === name && e.cat?.includes("blink.user_timing"));

/**
 * The main thread's tasks between two marks in a trace: from the task that holds the mark `from` to the end of the task
 * that holds the mark `to`. With `paint`, to the end of the first paint after that task instead: the end of its frame.
 * Each task has its start from the first task's start (`at`), its wall time and its thread time, the time that the
 * thread ran, in milliseconds. A loaded machine makes the thread wait for a processor: the wall time counts that wait,
 * the thread time does not. Null when the trace lacks a mark or the paint.
 */
export function tasksBetween(trace, from, to, { paint = false } = {}) {
  const start = mark(trace, from), stop = mark(trace, to);
  if (!start || !stop) return null;
  const main = trace.traceEvents.filter(e => e.ph === "X" && e.pid === start.pid && e.tid === start.tid).sort((a, b) => a.ts - b.ts);
  // The main thread's tasks, the outermost only: a task can run another inside it.
  const tasks = [];
  for (const e of main) if (e.name === "ThreadControllerImpl::RunTask" && !(tasks.length && end(e) <= end(tasks.at(-1)))) tasks.push(e);
  const holding = m => tasks.find(t => t.ts <= m.ts && m.ts <= end(t));
  const first = holding(start), held = holding(stop), painted = held && paint && main.find(e => e.name === "Paint" && e.ts > end(held));
  const last = paint ? painted && holding(painted) : held;
  if (!first || !last) return null;
  return tasks.filter(t => t.ts >= first.ts && end(t) <= end(last))
    .map(t => ({ at: (t.ts - first.ts) / 1000, wall: t.dur / 1000, thread: (t.tdur ?? t.dur) / 1000 }));
}

/** A long task takes more than this many milliseconds. */
export const LONG_TASK = 50;
/** The long tasks among tasks' times in milliseconds: how many, their time beyond LONG_TASK each together (as Total
 *  Blocking Time counts it), and the longest task of all. */
export const longTasks = xs => {
  const long = xs.filter(x => x > LONG_TASK);
  return { count: long.length, beyond: long.reduce((s, x) => s + x - LONG_TASK, 0), longest: Math.max(0, ...xs) };
};

/** The trace's events named `name`, on every thread: how many, and their wall time and thread time together, in
 *  milliseconds. `DoDigest` gives the processor time of the page's SHA-256 checks (`crypto.subtle.digest`). */
export function eventTime(trace, name) {
  const events = trace.traceEvents.filter(e => e.ph === "X" && e.name === name);
  return { count: events.length, wall: events.reduce((s, e) => s + e.dur, 0) / 1000,
           thread: events.reduce((s, e) => s + (e.tdur ?? e.dur), 0) / 1000 };
}

/**
 * The page's layout shift so far, as the browser's Cumulative Layout Shift counts it (`cls`), and each element that
 * moved (`moved`): when it first moved, in milliseconds from the mark `since` (from the page's start when no `since` is
 * given), and how many times. The page must have the mark `since` already.
 */
export function layoutShift(page, since) {
  return page.evaluate(since => {
    // The layout shifts come from a buffered PerformanceObserver (its takeRecords gives them at once): the browser keeps
    // them out of the performance timeline, so performance.getEntriesByType("layout-shift") gives none.
    const observer = new PerformanceObserver(() => {});
    observer.observe({ type: "layout-shift", buffered: true });
    const entries = observer.takeRecords();
    observer.disconnect();
    const zero = since ? performance.getEntriesByName(since)[0].startTime : 0;
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
        const name = label(s.node), m = moved.get(name) ?? { at: Math.round(e.startTime - zero), times: 0 };
        m.times++;
        moved.set(name, m);
      }
    }
    return { cls, moved: [...moved].map(([name, m]) => `${name} at ${m.at} ms${m.times > 1 ? `, ${m.times} times` : ""}`) };
  }, since);
}

/**
 * The machine's load now, from `scripts/machine status` in the planning folder (`abstractclass-org`, docs/machine.md):
 * Windows' processor use in percent, WSL's load average over one minute, the GPU's use in percent, and the heavy jobs
 * that run. Null away from the machine. When the status fails, its error (`error`), so that a long measurement goes on.
 */
export function machineLoad() {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(dir, "scripts", "machine.py"))) {
    if (dirname(dir) === dir) return null; // the disk's root
    dir = dirname(dir);
  }
  const time = new Date().toISOString();
  let s;
  try { s = JSON.parse(execFileSync("python", [join(dir, "scripts", "machine.py"), "status", "--json"], { encoding: "utf8" })); }
  catch (e) { return { time, error: (e.stderr?.trim() || e.message).split("\n").at(-1) }; }
  return { time, cpu: s.windows.cpu_pct, load: s.wsl.load?.[0], gpu: s.gpu.util_pct,
           jobs: s.jobs.filter(j => (j.state ?? "running") === "running").map(j => `${j.name} (${j.threads} threads${j.gpu ? ", the GPU" : ""})`) };
}

/**
 * Two builds measured in alternating pairs (docs/working-notes.md). In each of `count` pairs, `run(build)` runs once
 * for each of the two builds, back to back, and the build that runs first takes turns: the first build in the pairs
 * 1, 3, 5, the second in the pairs 2, 4. The machine's load is read before each run. Resolves with each pair's two
 * runs, in the order of `builds`, each as { load, result }.
 */
export async function inPairs(builds, count, run) {
  const pairs = [];
  for (let i = 0; i < count; i++) {
    const pair = [];
    for (const k of i % 2 ? [1, 0] : [0, 1]) pair[k] = { load: machineLoad(), result: await run(builds[k]) };
    pairs.push(pair);
  }
  return pairs;
}

/** The median of numbers: the mean of the middle two for an even count. */
export const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

/**
 * The verdict on two builds measured in pairs (docs/working-notes.md). `pairs` holds one value of each build for each
 * pair, [a, b], such as the median of the build's set of runs. Gives each pair's difference, b less a (`diffs`), and
 * their median (`diff`); each build's median and spread, its largest value less its smallest (`a`, `b`); whether every
 * pair agrees, all differences with one sign (`agree`); and whether the pairs show a change (`change`): every pair
 * agrees, and the median difference is at least the larger of the two spreads.
 */
export function verdict(pairs) {
  const diffs = pairs.map(([a, b]) => b - a), diff = median(diffs);
  const build = k => { const xs = pairs.map(p => p[k]); return { median: median(xs), spread: Math.max(...xs) - Math.min(...xs) }; };
  const a = build(0), b = build(1), agree = diffs.every(d => d < 0) || diffs.every(d => d > 0);
  return { diffs, diff, a, b, agree, change: agree && Math.abs(diff) >= Math.max(a.spread, b.spread) };
}

/** A verdict (verdict) as one line of text, each number written by `f`. */
export const verdictText = (v, f) =>
  `differences ${v.diffs.map(f).join(", ")}, median ${f(v.diff)}; before median ${f(v.a.median)} (spread ${f(v.a.spread)}), ` +
  `after median ${f(v.b.median)} (spread ${f(v.b.spread)}); the pairs agree: ${v.agree}, a change: ${v.change}`;
