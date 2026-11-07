// The check of Cyanotype's GPU paths (its design 33, "The engine's files", item 4), on Cyanotype's preview, in
// Playwright's full Chromium (channel "chromium", the new headless mode) with WebGPU on the real GPU
// (docs/working-notes.md, "The GPU in Playwright's Chromium"). Playwright's headless shell, the browser of a headless
// launch without a channel, makes no WebGPU device on this machine. One run checks the engine settings' GPU On, then
// Auto, each in a new browser context of one browser, so that one job of `scripts/machine run --gpu` covers both. Each
// takes three parts:
// - The review. With On, the review of the test game's first turns (tests/cyanotype-review.ts, LIVE_TURNS) at Lite:
//   the engine settings say that the GPU is in use ("In use, ..."), and the review ends. With Auto, the review of the
//   whole test game, so that the GPU's first-use test (Hedge School's design 15) has its 20 seconds of work on the GPU
//   and on the workers: the engine settings then give the GPU's speed against a worker's ("In use, ...: N times a
//   worker's speed."), or say that it is slower and off. The check does not wait for that review's end. A review of
//   3 turns took 34 s on the GPU, too short for the test, which then waits for more work.
// - The Analysis board, which takes the review's session GPU control: the GPU joins its one worker when more searches
//   wait than the worker takes (Hedge School's design 15, item 1). The board opens at the end of the test game's next
//   turn, which the review did not search, with 1 worker and the threat on: the position's search and the threat's make
//   that backlog. The engine settings then say that the GPU is in use. The board then goes one move back: its new
//   position's search takes the worker, and the threat's search takes the GPU, which the check counts. Both searches
//   end, the position's with its candidates in the table. With Auto, the board takes the review's test result.
// - Practice: a game in which the bot plays Blue. The bot starts on the GPU (its line "..., on the GPU.") and plays
//   its first move, which the page checks against the rules' legal moves. The game does not stop. With Auto, the bot
//   starts on the GPU only where the review's test found it faster ("In use, ...: N times a worker's speed.").
// Each wait for the page's state has a limit (WAITS), and the whole run has one (BUDGET): such a wait ends at the run's
// limit at the latest. A page's load and a click take at most 60 s. A part whose wait ends prints the page's state, and
// the next part runs. A part that starts after the run's limit does not run. A watchdog ends the process 20 s after the
// run's limit, so that a run never outlasts its job.
// A run with WebGPU is a GPU-path check: it starts only as that note says (jam-coord's and eng-coord's yes), through
// `scripts/machine run --gpu` in the planning folder. Run it in apps/hedgeschool:
//
//   CYANOTYPE_BASE_URL=http://127.0.0.1:4187 node scripts/cyanotype-gpu-check.mjs [--on | --auto] [--cpu]
//
// With --on or --auto, it checks that setting alone.
// With --cpu, it checks the same pages off the GPU instead, with the layout test's launch options and longer waits: the
// engine settings say that this browser cannot use the GPU, the board's searches end with no GPU worker, and the bot
// starts on the CPU workers. That run checks the script itself, and starts no GPU code.
import { chromium } from "@playwright/test";
import { checkLaunch } from "./edge.mjs";
import config from "../playwright.config.ts";
import { ENGINE_KEY } from "../../cyanotype/src/lib/site.ts";
import { CYANOTYPE, LITE, LIVE_TURNS, testRecord } from "../tests/cyanotype-review.ts";

if (!CYANOTYPE) throw new Error("CYANOTYPE_BASE_URL gives no Cyanotype preview");
const cpu = process.argv.includes("--cpu");
const settings = process.argv.includes("--on") ? ["on"] : process.argv.includes("--auto") ? ["auto"] : ["on", "auto"];
const launchOptions = config.projects.find(p => p.name === "chromium").use.launchOptions;
const WEBGPU = ["--enable-unsafe-webgpu", "--use-angle=d3d11", "--enable-features=Vulkan"]; // the note's flags
// The full Chromium for WebGPU: the headless shell refuses requestDevice ("DynamicLib.Open: dxil.dll Windows Error: 87")
const options = cpu ? launchOptions : { ...launchOptions, channel: "chromium", args: WEBGPU };
/** The longest wait of each step, in ms. On the GPU (abscls-8tl1.64-gpu2, GPU On): the review of 3 turns took 34 s, the
 *  board 12 s, and the bot's first turn 1.4 s. Auto's test needs about 20 s of the GPU after its files load. Off the GPU
 *  (--cpu, 2 threads): the review took 113 to 151 s, the board 62 to 67 s, and the bot's first turn 4.9 to 6.6 s. */
const WAITS = { gpuLine: 60_000, ...cpu ? { autoTest: 60_000, review: 300_000, board: 180_000, practice: 120_000 }
  : { autoTest: 120_000, review: 90_000, board: 60_000, practice: 60_000 } };
/** The whole run's limit: under the job's --expect (8 minutes on the GPU). */
const BUDGET = (cpu ? 12 : 7.5) * 60_000;
/** The engine settings' line once the GPU has settled, and where the bot must run, for the GPU setting `gpu`. */
const expectedOf = gpu => cpu ? { status: /^This browser cannot use the GPU/, where: /, on the CPU workers\.$/ }
  : gpu === "auto" ? { status: /^In use, .*times a worker's speed\.$|^Off: /, where: /, on (the GPU|the CPU workers)\.$/ }
  : { status: /^In use/, where: /, on the GPU\.$/ };
/** A line of the GPU that no later state replaces (Auto's test first says "In use. Testing ..."). */
const settledOf = gpu => new RegExp(`^(This browser cannot|In use${gpu === "auto" ? ", " : ""}|Off:|The GPU did not start)`);
console.log(`${cpu ? "off the GPU: the headless shell" : `on the GPU: channel ${options.channel}`}, ` +
            `Chromium's flags ${JSON.stringify(options.args)}, the GPU settings ${settings.join(", ")}, ` +
            `the run's limit ${BUDGET / 60_000} minutes`);

/** Counts the GPU workers that the page starts (packages/engine/src/gpuClient.ts) and the searches posted to them. */
function countGpuWork() {
  const work = { workers: 0, searches: 0 }, gpuWorkers = new WeakSet();
  window.gpuWork = work;
  const Native = window.Worker, post = Native.prototype.postMessage;
  window.Worker = class extends Native {
    constructor(url, options) {
      super(url, options);
      if (String(url).includes("gpuWorker")) { gpuWorkers.add(this); work.workers++; }
    }
  };
  Native.prototype.postMessage = function (...args) {
    if (gpuWorkers.has(this) && args[0]?.type === "search") work.searches++;
    return post.apply(this, args);
  };
}

const seconds = t0 => Math.round((Date.now() - t0) / 1000);
const run0 = Date.now(), deadline = run0 + BUDGET;
/** A wait of at most `ms`, and at most to the run's limit. */
const upTo = ms => Math.max(1, Math.min(ms, deadline - Date.now()));
const failures = [], times = [];
setTimeout(() => {
  console.error(`FAIL\nthe run passed its limit of ${BUDGET / 60_000} minutes by 20 s: the watchdog ends it\n${failures.join("\n")}`);
  process.exit(1);
}, BUDGET + 20_000).unref();

checkLaunch(options);
const browser = await chromium.launch(options);
try {
  for (const gpu of settings) {
    const auto = gpu === "auto", expected = expectedOf(gpu), settled = settledOf(gpu);
    const context = await browser.newContext({ viewport: { width: 1376, height: 952 } });
    context.setDefaultTimeout(60_000);
    await context.addInitScript(countGpuWork);
    const page = await context.newPage();
    page.on("pageerror", e => failures.push(`${gpu}: page error: ${e}`));
    const keep = (more = {}) => page.evaluate(([key, engine]) => localStorage.setItem(key, JSON.stringify(engine)),
                                              [ENGINE_KEY, { on: true, ...LITE, gpu, ...more }]);
    const settingsButton = page.getByRole("button", { name: "Engine settings" });
    const settingsLine = page.getByRole("region", { name: "Engine settings" }).locator("p[aria-live]");
    /** The GPU's line once it has settled, checked against the expected one. Throws when it does not settle. */
    async function gpuLine(ms, { say, fail }) {
      const status = await settingsLine.filter({ hasText: settled }).first().innerText({ timeout: upTo(ms) });
      say(`the GPU: ${status}`);
      if (!expected.status.test(status)) fail(`the GPU: "${status}", not ${expected.status}`);
      return status;
    }
    /** The page's state, for a part whose wait ended: its address, the GPU's line, and the bot's line or the
     *  review's progress where they show. */
    async function state() {
      const text = locator => locator.first().innerText({ timeout: 1000 }).then(t => t.replace(/\s+/g, " "), () => null);
      const parts = [`at ${new URL(page.url()).pathname}`];
      const line = await text(settingsLine);
      if (line !== null) parts.push(`the GPU's line "${line}"`);
      const other = await text(page.getByText(/^(Stamp Duty |Reviewing|Review done|The game stopped)/));
      if (other !== null) parts.push(`"${other}"`);
      return parts.join(", ");
    }
    /** Runs a part, timed, with its own `say` and `fail`. A part whose wait ends prints the page's state, and the next
     *  part runs. */
    async function part(name, body) {
      const label = `${gpu}, ${name}`, fail = line => failures.push(`${label}: ${line}`);
      if (Date.now() >= deadline) { fail("not run: the run's limit has passed"); return; }
      const t0 = Date.now();
      try {
        await body({ say: line => console.log(`${label}: ${line}`), fail });
      } catch (e) {
        fail(`${(e instanceof Error ? e.message : String(e)).split("\n")[0]}; the page's state: ${await state()}`);
      }
      const s = seconds(t0);
      times.push([label, s]);
      console.log(`${label}: ${s} s`);
    }
    await page.goto(new URL("/about", CYANOTYPE).href);
    let tested = null; // the review's GPU line, which gives Auto's test

    // The review: the GPU joins the workers at the sweep's backlog. Auto's test needs the whole game's work.
    await part("the review", async report => {
      await keep();
      await page.goto(new URL(`/review#record=${encodeURIComponent(testRecord(auto ? undefined : LIVE_TURNS))}`, CYANOTYPE).href);
      await settingsButton.click();
      tested = await gpuLine(auto ? WAITS.autoTest : WAITS.gpuLine, report);
      if (auto) return; // the review of the whole game goes on: the board's page ends it
      await page.getByText(/^Review done/).waitFor({ timeout: upTo(WAITS.review) });
      report.say(`the review of ${LIVE_TURNS} turns done; the GPU then: ${await settingsLine.first().innerText()}`);
    });

    // The Analysis board: 1 worker, and the threat on, make a backlog
    await part("the board", async report => {
      const { say, fail } = report;
      await keep({ workers: 1 });
      await page.goto(new URL(`/analysis#record=${encodeURIComponent(testRecord(LIVE_TURNS + 1))}`, CYANOTYPE).href);
      const threat = page.getByRole("button", { name: "Show threat" });
      await threat.click({ timeout: upTo(WAITS.board) });
      await settingsButton.click();
      const status = await gpuLine(WAITS.gpuLine, report);
      // A new position: its search takes the worker first, and the threat's search the GPU, where it is in use
      await page.keyboard.press("ArrowLeft");
      const done = name => page.locator(`[role="progressbar"][aria-label="${name}"][aria-valuenow="100"]`)
        .waitFor({ timeout: upTo(WAITS.board) });
      await done("The threat's search");
      if (!(await page.getByText(/^If (Blue|Red) passes: margin/).count())) fail("the threat's search gave no values");
      await threat.click();
      await done("This position's search");
      await settingsButton.click(); // the candidates' table in the settings' place
      const table = page.locator("table", { has: page.getByRole("columnheader", { name: "Visits" }) });
      const rows = table.locator("tbody tr").filter({ has: page.locator("td:nth-child(5)", { hasText: /^\d+$/ }) });
      const count = await rows.count();
      const first = count ? (await rows.first().innerText()).replace(/\s+/g, " ") : null;
      if (!first) fail("the position's search ended with no candidates");
      const work = await page.evaluate(() => window.gpuWork);
      say(`${count} candidates, the first "${first}"; ${work.workers} GPU workers, ${work.searches} searches on the GPU`);
      if (cpu ? work.workers : status.startsWith("In use") && !work.searches)
        fail(`${work.workers} GPU workers and ${work.searches} searches on the GPU, with "${status}"`);
    });

    // Practice: the bot plays Blue, so it moves first
    await part("Practice", async ({ say, fail }) => {
      await keep();
      await page.goto(new URL("/practice", CYANOTYPE).href);
      // The button is enabled once the rules' worker is ready: the click waits for that
      await page.getByRole("button", { name: "Play as Red" }).click({ timeout: upTo(WAITS.practice) });
      const bot = page.getByText(/^Stamp Duty .*, on (the GPU|the CPU workers|one thread)\.$/);
      const botLine = await bot.innerText({ timeout: upTo(WAITS.practice) });
      say(`the bot: ${botLine}`);
      // With Auto on the GPU, the bot's form follows the review's test (botForms.ts): the GPU where the test found it
      // faster. The test is kept for each network, and the review and the bot play the lock's one network.
      const where = auto && !cpu && tested ? (tested.startsWith("In use") ? /, on the GPU\.$/ : /, on the CPU workers\.$/)
        : expected.where;
      if (!where.test(botLine)) fail(`the bot: "${botLine}", not ${where}${where === expected.where ? "" : `, after "${tested}"`}`);
      await page.getByText(/^(Stamp Duty's last turn took|The game stopped)/).waitFor({ timeout: upTo(WAITS.practice) });
      const stopped = page.getByText(/^The game stopped/);
      if (await stopped.count()) fail(await stopped.innerText());
      else say(await page.getByText(/^Stamp Duty's last turn took/).innerText());
    });
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`times: ${times.map(([name, s]) => `${name} ${s} s`).join("; ")}; the whole run ${seconds(run0)} s`);
if (failures.length) {
  console.error(`FAIL\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("PASS");
