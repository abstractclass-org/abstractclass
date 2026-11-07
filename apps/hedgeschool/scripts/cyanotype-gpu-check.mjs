// The check of Cyanotype's GPU paths (its design 33, "The engine's files", item 4), on Cyanotype's preview, in
// Playwright's headless Chromium with WebGPU on the real GPU (docs/working-notes.md, "The GPU in Playwright's
// Chromium"). One run checks the engine settings' GPU On, then Auto, each in a new browser context of one browser, so
// that one job of `scripts/machine run --gpu` covers both. Each takes three parts:
// - The review of the test game's first turns (tests/cyanotype-review.ts, LIVE_TURNS) at Lite: the engine settings say
//   that the GPU is in use ("In use, ..."), and the review ends.
// - The Analysis board, which takes the review's session GPU control: the GPU joins its one worker when more searches
//   wait than the worker takes (Hedge School's design 15, item 1). The board opens at the end of the test game's next
//   turn, which the review did not search, with 1 worker and the threat on: the position's search and the threat's make
//   that backlog. The engine settings then say that the GPU is in use. The board then goes one move back: its new
//   position's search takes the worker, and the threat's search takes the GPU, which the check counts. Both searches
//   end, the position's with its candidates in the table.
// - Practice: a game in which the bot plays Blue. The bot starts on the GPU (its line "..., on the GPU.") and plays
//   its first move, which the page checks against the rules' legal moves. The game does not stop.
// A run with WebGPU is a GPU-path check: it starts only as that note says (jam-coord's and eng-coord's yes), through
// `scripts/machine run --gpu` in the planning folder. Run it in apps/hedgeschool:
//
//   CYANOTYPE_BASE_URL=http://127.0.0.1:4187 node scripts/cyanotype-gpu-check.mjs [--on | --auto] [--cpu]
//
// With --on or --auto, it checks that setting alone. Auto runs the GPU's first-use test in the review (Hedge School's
// design 15): the engine settings then give the GPU's speed against a worker's ("In use, ...: N times a worker's
// speed."), or say that it is slower and off. The board then takes the test's result, and the bot starts on the GPU
// only where the test found it faster.
// With --cpu, it checks the same pages off the GPU instead, with the layout test's launch options: the engine settings
// say that this browser cannot use the GPU, the board's searches end with no GPU worker, and the bot starts on the CPU
// workers. That run checks the script itself, and starts no GPU code.
import { chromium } from "@playwright/test";
import config from "../playwright.config.ts";
import { ENGINE_KEY } from "../../cyanotype/src/lib/site.ts";
import { CYANOTYPE, LITE, LIVE_TURNS, LIVE_WAIT, testRecord } from "../tests/cyanotype-review.ts";

if (!CYANOTYPE) throw new Error("CYANOTYPE_BASE_URL gives no Cyanotype preview");
const cpu = process.argv.includes("--cpu");
const settings = process.argv.includes("--on") ? ["on"] : process.argv.includes("--auto") ? ["auto"] : ["on", "auto"];
const launchOptions = config.projects.find(p => p.name === "chromium").use.launchOptions;
const WEBGPU = ["--enable-unsafe-webgpu", "--use-angle=d3d11", "--enable-features=Vulkan"]; // the note's flags
const options = cpu ? launchOptions : { ...launchOptions, args: WEBGPU };
/** The engine settings' line once the GPU has settled, and where the bot must run, for the GPU setting `gpu`. */
const expectedOf = gpu => cpu ? { status: /^This browser cannot use the GPU/, where: /, on the CPU workers\.$/ }
  : gpu === "auto" ? { status: /^In use, .*times a worker's speed\.$|^Off: /, where: /, on (the GPU|the CPU workers)\.$/ }
  : { status: /^In use/, where: /, on the GPU\.$/ };
/** A line of the GPU that no later state replaces (Auto's test first says "In use. Testing ..."). */
const settledOf = gpu => new RegExp(`^(This browser cannot|In use${gpu === "auto" ? ", " : ""}|Off:|The GPU did not start)`);
/** The searches of the board: each ends at its 512 visits or at the settings' 30 seconds. The GPU loads first. */
const BOARD_WAIT = 300_000;
console.log(`${cpu ? "off the GPU" : "on the GPU"}: Chromium's flags ${JSON.stringify(options.args)}, the GPU settings ${settings.join(", ")}`);

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
const browser = await chromium.launch(options);
const failures = [], times = [];
const run0 = Date.now();
try {
  for (const gpu of settings) {
    const expected = expectedOf(gpu), settled = settledOf(gpu), part = name => `${gpu}, ${name}`;
    const context = await browser.newContext({ viewport: { width: 1376, height: 952 } });
    await context.addInitScript(countGpuWork);
    const page = await context.newPage();
    page.on("pageerror", e => failures.push(`${gpu}: page error: ${e}`));
    const keep = (more = {}) => page.evaluate(([key, engine]) => localStorage.setItem(key, JSON.stringify(engine)),
                                              [ENGINE_KEY, { on: true, ...LITE, gpu, ...more }]);
    const settingsLine = () => page.getByRole("region", { name: "Engine settings" }).locator("p[aria-live]");
    /** The GPU's line once it has settled, checked against the expected one; an empty string after a timeout. */
    async function gpuLine(name) {
      const line = settingsLine();
      try {
        await line.filter({ hasText: settled }).first().waitFor({ timeout: name.endsWith("board") ? BOARD_WAIT : LIVE_WAIT });
      } catch {
        failures.push(`${part(name)}: the GPU's line did not settle: "${await line.first().innerText().catch(() => "")}"`);
        return "";
      }
      const status = await line.first().innerText();
      console.log(`${part(name)}: the GPU: ${status}`);
      if (!expected.status.test(status)) failures.push(`${part(name)}: the GPU: "${status}", not ${expected.status}`);
      return status;
    }
    await page.goto(new URL("/about", CYANOTYPE).href);
    await keep();

    // The review: the GPU joins the workers at the sweep's backlog
    let t0 = Date.now();
    await page.goto(new URL(`/review#record=${encodeURIComponent(testRecord(LIVE_TURNS))}`, CYANOTYPE).href);
    await page.getByRole("button", { name: "Engine settings" }).click();
    await gpuLine("the review");
    await page.getByText(/^Review done/).waitFor({ timeout: LIVE_WAIT });
    times.push([part("the review"), seconds(t0)]);
    console.log(`${part("the review")} of ${LIVE_TURNS} turns: ${seconds(t0)} s; the GPU then: ${await settingsLine().first().innerText()}`);

    // The Analysis board: 1 worker, and the threat on, make a backlog
    t0 = Date.now();
    await keep({ workers: 1 });
    await page.goto(new URL(`/analysis#record=${encodeURIComponent(testRecord(LIVE_TURNS + 1))}`, CYANOTYPE).href);
    const threat = page.getByRole("button", { name: "Show threat" });
    await threat.click({ timeout: 120_000 });
    const settingsButton = page.getByRole("button", { name: "Engine settings" });
    await settingsButton.click();
    const status = await gpuLine("the board");
    if (status) {
      // A new position: its search takes the worker first, and the threat's search the GPU, where it is in use
      await page.keyboard.press("ArrowLeft");
      const done = label => page.locator(`[role="progressbar"][aria-label="${label}"][aria-valuenow="100"]`)
        .waitFor({ timeout: BOARD_WAIT });
      await done("The threat's search");
      const passes = page.getByText(/^If (Blue|Red) passes: margin/);
      if (!(await passes.count())) failures.push(`${part("the board")}: the threat's search gave no values`);
      await threat.click();
      await done("This position's search");
      await settingsButton.click(); // the candidates' table in the settings' place
      const table = page.locator("table", { has: page.getByRole("columnheader", { name: "Visits" }) });
      const rows = table.locator("tbody tr").filter({ has: page.locator("td:nth-child(5)", { hasText: /^\d+$/ }) });
      const first = (await rows.count()) ? (await rows.first().innerText()).replace(/\s+/g, " ") : null;
      if (!first) failures.push(`${part("the board")}: the position's search ended with no candidates`);
      const work = await page.evaluate(() => window.gpuWork);
      console.log(`${part("the board")}: ${await rows.count()} candidates, the first "${first}"; ` +
                  `${work.workers} GPU workers, ${work.searches} searches on the GPU`);
      if (cpu ? work.workers : status.startsWith("In use") && !work.searches)
        failures.push(`${part("the board")}: ${work.workers} GPU workers and ${work.searches} searches on the GPU, with "${status}"`);
    }
    times.push([part("the board"), seconds(t0)]);
    console.log(`${part("the board")}: ${seconds(t0)} s`);

    // Practice: the bot plays Blue, so it moves first
    t0 = Date.now();
    await keep();
    await page.goto(new URL("/practice", CYANOTYPE).href);
    const red = page.getByRole("button", { name: "Play as Red" });
    await page.waitForFunction(() => document.querySelector('button[aria-label="Play as Red"]')?.disabled === false, null,
                               { timeout: 120_000 }); // the rules' worker is ready
    await red.click();
    const bot = page.getByText(/^Stamp Duty .*, on (the GPU|the CPU workers|one thread)\.$/);
    await bot.waitFor({ timeout: 120_000 });
    const botLine = await bot.innerText();
    console.log(`${part("Practice")}: the bot: ${botLine}`);
    if (!expected.where.test(botLine)) failures.push(`${part("Practice")}: the bot: "${botLine}", not ${expected.where}`);
    await page.getByText(/^(Stamp Duty's last turn took|The game stopped)/).waitFor({ timeout: 300_000 });
    const stopped = page.getByText(/^The game stopped/);
    if (await stopped.count()) failures.push(`${part("Practice")}: ${await stopped.innerText()}`);
    else console.log(`${part("Practice")}: ${await page.getByText(/^Stamp Duty's last turn took/).innerText()}`);
    times.push([part("Practice"), seconds(t0)]);
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
