// The check of a site's GPU paths, which Hedge School's script (hedgeschool-gpu-check.mjs) and Cyanotype's
// (cyanotype-gpu-check.mjs) run with their sites' parts: on the site's preview, in Playwright's full Chromium (channel
// "chromium", the new headless mode) with WebGPU on the real GPU (docs/working-notes.md, "The GPU in Playwright's
// Chromium"). Playwright's headless shell, the browser of a headless launch without a channel, makes no WebGPU device
// on this machine. One run checks the engine settings' GPU On, then Auto, each in a new browser context of one
// browser, so that one job of `scripts/machine run --gpu` covers both. Each takes these parts:
// - The review. With On, the review of the test game's first turns (the site's `liveTurns`) at Lite: the engine
//   settings say that the GPU is in use ("In use, ..."), and the review ends. With Auto, the review of more of the test
//   game (the site's `record()`: Hedge School's whole game, Cyanotype's first 20 turns), so that the GPU's first-use
//   test (Hedge School's design 15) has its 20 seconds of work on the GPU and on the workers: the engine settings then
//   give the GPU's speed against a worker's ("In use, ...: N times a worker's speed."), or say that it is slower and
//   off. The check does not wait for that review's end. A review of 3 turns took 34 s on the GPU (Cyanotype's), too
//   short for the test, which then waits for more work.
// - The Analysis board, which takes the review's session GPU control: the GPU joins its one worker when more searches
//   wait than the worker takes (Hedge School's design 15, item 1). The board opens at the end of the test game's next
//   turn, which the review did not search, with 1 worker and the threat on: the position's search and the threat's make
//   that backlog. The engine settings then say that the GPU is in use. The board then goes one move back: its new
//   position's search takes the worker, and the threat's search takes the GPU, which the check counts. Both searches
//   end, the position's with its candidates in the table. With Auto, the board takes the review's test result.
// - The site's own parts (the site's `parts`), each with the GPU settings that it names.
// - Practice: a game in which the bot plays Blue. The bot starts on the GPU (its line "..., on the GPU.") and plays
//   its first move, which the page checks against the rules' legal moves. The game does not stop. With Auto, the bot
//   starts on the GPU only where the review's test found it faster ("In use, ...: N times a worker's speed.").
// Each wait for the page's state has a limit (the site's `waits`), and the whole run has one (the site's `budget`):
// such a wait ends at the run's limit at the latest. A page's load and a click take at most 60 s. A part whose wait
// ends prints the page's state, and the next part runs. A part that starts after the run's limit does not run. A
// watchdog ends the process 20 s after the run's limit, so that a run never outlasts its job.
// A run with WebGPU is a GPU-path check: it starts only as that note says (jam-coord's and eng-coord's yes), through
// `scripts/machine run --gpu` in the planning folder. The site's script takes these options:
// - --on or --auto: it checks that setting alone.
// - --cpu: it checks the same pages off the GPU instead, with the layout test's launch options and longer waits: the
//   engine settings say that this browser cannot use the GPU, the board's searches end with no GPU worker, and the bot
//   starts on the CPU workers. That run checks the script itself, and starts no GPU code.
import { chromium } from "@playwright/test";
import { checkLaunch } from "./edge.mjs";
import config from "../playwright.config.ts";

const WEBGPU = ["--enable-unsafe-webgpu", "--use-angle=d3d11", "--enable-features=Vulkan"]; // the note's flags

/** Counts the GPU workers that the page starts (packages/engine/src/gpuClient.ts) and the searches posted to them,
 *  and the requests for the weak walls (protocol 0.6.2, `includeWeakWalls`) posted to the GPU workers and to the
 *  others. Each engine worker takes a request in the message's `request` (packages/engine/src/client.ts, gpuClient.ts). */
function countGpuWork() {
  const work = { workers: 0, searches: 0, gpuWalls: 0, cpuWalls: 0 }, gpuWorkers = new WeakSet();
  window.gpuWork = work;
  const Native = window.Worker, post = Native.prototype.postMessage;
  window.Worker = class extends Native {
    constructor(url, options) {
      super(url, options);
      if (String(url).includes("gpuWorker")) { gpuWorkers.add(this); work.workers++; }
    }
  };
  Native.prototype.postMessage = function (...args) {
    const gpu = gpuWorkers.has(this), message = args[0];
    if (gpu && message?.type === "search") work.searches++;
    if (message?.request?.includeWeakWalls) work[gpu ? "gpuWalls" : "cpuWalls"]++;
    return post.apply(this, args);
  };
}

const seconds = t0 => Math.round((Date.now() - t0) / 1000);
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Runs the check of the site `site`, with the options of the command line, and ends the process with its result:
 *  - `name`: the site's name, and `variable`, the environment variable that gives its preview's address, `base`.
 *  - `engineKey`: the key of the engine's settings in local storage, and `lite`, the settings of the review other than
 *    `on` and `gpu`. `local`: other keys that each page keeps, such as an answered consent notice.
 *  - `liveTurns` and `record(turns)`: the turns that the review of On reviews, and the test game's record up to the end
 *    of a turn (with no turns, the record that the review of Auto reviews). `paste(page, record, timeout)`: brings the
 *    record in by the Review tab's paste, which keeps the game and opens its review. `boardLink(record)`: the Analysis
 *    board's address at the record's end (by default, the record alone: Cyanotype's board opens a record at its end).
 *  - `bot`: the practice bot's name, which starts its line ("Stamp Duty 0.1, ..., on the GPU.").
 *  - `waits`: by `cpu` and by `gpu`, the longest wait of each step in ms: `autoTest`, `review`, `board` and
 *    `practice`, and those of the site's own parts. `budget`: by `cpu` and by `gpu`, the whole run's limit in minutes.
 *  - `parts`: the site's own parts, each `{ name, settings, run }`, after the board's: `settings` names the GPU
 *    settings that it runs with, and `run(check, report)` runs it with the check's means: `newPage()` (a page in a new
 *    browser context, below), `at(path)` (the address on the preview), `upTo(ms)` (a wait's limit), `waits`, `cpu` and
 *    `gpu`. `report` gives `say(line)`, `fail(line)`, and `show(page)`, which names the page whose state a wait that
 *    ends prints. */
export async function gpuCheck(site) {
  const { name, variable, base, engineKey, lite, local = {}, liveTurns, record, paste, bot, parts = [] } = site;
  const boardLink = site.boardLink ?? (text => `/analysis#record=${encodeURIComponent(text)}`);
  if (!base) throw new Error(`${variable} gives no ${name} preview`);
  const cpu = process.argv.includes("--cpu");
  const settings = process.argv.includes("--on") ? ["on"] : process.argv.includes("--auto") ? ["auto"] : ["on", "auto"];
  const launchOptions = config.projects.find(p => p.name === "chromium").use.launchOptions;
  // The full Chromium for WebGPU: the headless shell refuses requestDevice ("DynamicLib.Open: dxil.dll Windows Error: 87")
  const options = cpu ? launchOptions : { ...launchOptions, channel: "chromium", args: WEBGPU };
  const waits = { gpuLine: 60_000, ...(cpu ? site.waits.cpu : site.waits.gpu) };
  const budget = (cpu ? site.budget.cpu : site.budget.gpu) * 60_000;
  const botLine = new RegExp(`^${escape(bot)} .*, on (the GPU|the CPU workers|one thread)\\.$`);
  /** The engine settings' line once the GPU has settled, and where the bot must run, for the GPU setting `gpu`. */
  const expectedOf = gpu => cpu ? { status: /^This browser cannot use the GPU/, where: /, on the CPU workers\.$/ }
    : gpu === "auto" ? { status: /^In use, .*times a worker's speed\.$|^Off: /, where: /, on (the GPU|the CPU workers)\.$/ }
    : { status: /^In use/, where: /, on the GPU\.$/ };
  /** A line of the GPU that no later state replaces (Auto's test first says "In use. Testing ..."). */
  const settledOf = gpu => new RegExp(`^(This browser cannot|In use${gpu === "auto" ? ", " : ""}|Off:|The GPU did not start)`);
  console.log(`${name}, ${cpu ? "off the GPU: the headless shell" : `on the GPU: channel ${options.channel}`}, ` +
              `Chromium's flags ${JSON.stringify(options.args)}, the GPU settings ${settings.join(", ")}, ` +
              `the run's limit ${budget / 60_000} minutes`);

  const run0 = Date.now(), deadline = run0 + budget;
  /** A wait of at most `ms`, and at most to the run's limit. */
  const upTo = ms => Math.max(1, Math.min(ms, deadline - Date.now()));
  const at = path => new URL(path, base).href;
  const failures = [], times = [];
  setTimeout(() => {
    console.error(`FAIL\nthe run passed its limit of ${budget / 60_000} minutes by 20 s: the watchdog ends it\n${failures.join("\n")}`);
    process.exit(1);
  }, budget + 20_000).unref();

  checkLaunch(options);
  const browser = await chromium.launch(options);
  try {
    for (const gpu of settings) {
      const auto = gpu === "auto", expected = expectedOf(gpu), settled = settledOf(gpu), contexts = [];
      /** A page in a new browser context, with its means:
       *  - `keep(more)`: keeps the engine's settings (the GPU setting `gpu`, Lite, and `more`) and the site's `local`
       *    in the page's local storage. The page must be on the site.
       *  - `settingsButton` and `settingsLine`: the engine settings' button, and the GPU's line in them.
       *  - `gpuLine(ms, report)`: the GPU's line once it has settled, checked against the expected one. Throws when it
       *    does not settle.
       *  - `gpuWork(status, fail)`: the GPU's work on the page (countGpuWork), checked against the GPU's line `status`:
       *    no GPU worker off the GPU, and searches on the GPU where it is in use.
       *  - `state()`: the page's state, for a part whose wait ended: its address, the GPU's line, and the bot's line
       *    or the review's progress where they show.
       *  A context that a part opens closes at the part's end. */
      async function newPage() {
        const context = await browser.newContext({ viewport: { width: 1376, height: 952 } });
        contexts.push(context);
        context.setDefaultTimeout(60_000);
        await context.addInitScript(countGpuWork);
        const page = await context.newPage();
        page.on("pageerror", e => failures.push(`${gpu}: page error: ${e}`));
        const keep = (more = {}) => page.evaluate(([key, engine, others]) => {
          localStorage.setItem(key, JSON.stringify(engine));
          for (const [k, v] of Object.entries(others)) localStorage.setItem(k, JSON.stringify(v));
        }, [engineKey, { on: true, ...lite, gpu, ...more }, local]);
        const settingsButton = page.getByRole("button", { name: "Engine settings" });
        const settingsLine = page.getByRole("region", { name: "Engine settings" }).locator("p[aria-live]");
        async function gpuLine(ms, { say, fail }) {
          const status = await settingsLine.filter({ hasText: settled }).first().innerText({ timeout: upTo(ms) });
          say(`the GPU: ${status}`);
          if (!expected.status.test(status)) fail(`the GPU: "${status}", not ${expected.status}`);
          return status;
        }
        async function gpuWork(status, fail) {
          const work = await page.evaluate(() => window.gpuWork);
          if (cpu ? work.workers : status.startsWith("In use") && !work.searches)
            fail(`${work.workers} GPU workers and ${work.searches} searches on the GPU, with "${status}"`);
          return work;
        }
        async function state() {
          const text = locator => locator.first().innerText({ timeout: 1000 }).then(t => t.replace(/\s+/g, " "), () => null);
          const parts = [`at ${new URL(page.url()).pathname}`];
          const line = await text(settingsLine);
          if (line !== null) parts.push(`the GPU's line "${line}"`);
          const other = await text(page.getByText(new RegExp(`^(${escape(bot)} |Reviewing|Review done|The game stopped)`)));
          if (other !== null) parts.push(`"${other}"`);
          return parts.join(", ");
        }
        await page.goto(at("/about"));
        return { page, keep, settingsButton, settingsLine, gpuLine, gpuWork, state };
      }
      const main = await newPage(), { page, keep, settingsButton, settingsLine, gpuLine, gpuWork } = main;
      /** Runs a part, timed, with its own `say` and `fail`. A part whose wait ends prints the state of the page that
       *  the part names (`main`'s by default), and the next part runs. The contexts that the part opened then close,
       *  so that their searches do not take the next part's GPU and workers. */
      async function part(partName, body) {
        const label = `${gpu}, ${partName}`, fail = line => failures.push(`${label}: ${line}`);
        if (Date.now() >= deadline) { fail("not run: the run's limit has passed"); return; }
        const t0 = Date.now(), opened = contexts.length;
        let shown = main;
        try {
          await body({ say: line => console.log(`${label}: ${line}`), fail, show: p => (shown = p) });
        } catch (e) {
          fail(`${(e instanceof Error ? e.message : String(e)).split("\n")[0]}; the page's state: ${await shown.state()}`);
        }
        for (const context of contexts.splice(opened)) await context.close();
        const s = seconds(t0);
        times.push([label, s]);
        console.log(`${label}: ${s} s`);
      }
      let tested = null; // the review's GPU line, which gives Auto's test

      // The review: the GPU joins the workers at the sweep's backlog. Auto's test needs the whole game's work. The game
      // comes in by the Review tab's paste, as the tests' does.
      await part("the review", async report => {
        await keep();
        await paste(page, record(auto ? undefined : liveTurns), upTo(60_000));
        await settingsButton.click();
        tested = await gpuLine(auto ? waits.autoTest : waits.gpuLine, report);
        if (auto) return; // the review of the whole game goes on: the board's page ends it
        await page.getByText(/^Review done/).waitFor({ timeout: upTo(waits.review) });
        report.say(`the review of ${liveTurns} turns done; the GPU then: ${await settingsLine.first().innerText()}`);
      });

      // The Analysis board: 1 worker, and the threat on, make a backlog
      await part("the board", async report => {
        const { say, fail } = report;
        await keep({ workers: 1 });
        await page.goto(at(boardLink(record(liveTurns + 1))));
        const threat = page.getByRole("button", { name: "Show threat" });
        await threat.click({ timeout: upTo(waits.board) });
        await settingsButton.click();
        const status = await gpuLine(waits.gpuLine, report);
        // A new position: its search takes the worker first, and the threat's search the GPU, where it is in use
        await page.keyboard.press("ArrowLeft");
        const done = label => page.locator(`[role="progressbar"][aria-label="${label}"][aria-valuenow="100"]`)
          .waitFor({ timeout: upTo(waits.board) });
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
        const work = await gpuWork(status, fail);
        say(`${count} candidates, the first "${first}"; ${work.workers} GPU workers, ${work.searches} searches on the GPU`);
      });

      // The site's own parts
      for (const own of parts.filter(p => p.settings.includes(gpu)))
        await part(own.name, report => own.run({ newPage, at, upTo, waits, cpu, gpu }, report));

      // Practice: the bot plays Blue, so it moves first
      await part("Practice", async ({ say, fail }) => {
        await keep();
        await page.goto(at("/practice"));
        // The button is enabled once the rules' worker is ready: the click waits for that
        await page.getByRole("button", { name: "Play as Red" }).click({ timeout: upTo(waits.practice) });
        const line = await page.getByText(botLine).innerText({ timeout: upTo(waits.practice) });
        say(`the bot: ${line}`);
        // With Auto on the GPU, the bot's form follows the review's test (botForms.ts): the GPU where the test found it
        // faster. The test is kept for each network, and the review and the bot play the lock's one network.
        const where = auto && !cpu && tested ? (tested.startsWith("In use") ? /, on the GPU\.$/ : /, on the CPU workers\.$/)
          : expected.where;
        if (!where.test(line)) fail(`the bot: "${line}", not ${where}${where === expected.where ? "" : `, after "${tested}"`}`);
        const lastTurn = new RegExp(`^${escape(bot)}'s last turn took`);
        await page.getByText(new RegExp(`${lastTurn.source}|^The game stopped`)).waitFor({ timeout: upTo(waits.practice) });
        const stopped = page.getByText(/^The game stopped/);
        if (await stopped.count()) fail(await stopped.innerText());
        else say(await page.getByText(lastTurn).innerText());
      });
      for (const context of contexts) await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`times: ${times.map(([label, s]) => `${label} ${s} s`).join("; ")}; the whole run ${seconds(run0)} s`);
  if (failures.length) {
    console.error(`FAIL\n${failures.join("\n")}`);
    process.exit(1);
  }
  console.log("PASS");
}
