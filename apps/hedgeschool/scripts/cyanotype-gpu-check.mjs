// The check of Cyanotype's GPU paths (its design 33, "The engine's files", item 4), on Cyanotype's preview, in
// Playwright's headless Chromium with WebGPU on the real GPU (docs/working-notes.md, "The GPU in Playwright's
// Chromium"), with the engine settings' GPU On:
// - The review of the test game's first turns (tests/cyanotype-review.ts, LIVE_TURNS) at Lite: the engine settings say
//   that the GPU is in use ("In use, ..."), and the review ends.
// - Practice: a game in which the bot plays Blue. The bot starts on the GPU (its line "..., on the GPU.") and plays
//   its first move, which the page checks against the rules' legal moves. The game does not stop.
// A run with WebGPU is a GPU-path check: it starts only as that note says (jam-coord's and eng-coord's yes), through
// `scripts/machine run --gpu` in the planning folder. Run it in apps/hedgeschool:
//
//   CYANOTYPE_BASE_URL=http://127.0.0.1:4187 node scripts/cyanotype-gpu-check.mjs [--auto | --cpu]
//
// With --auto, the GPU setting is Auto, so the review runs the GPU's first-use test (Hedge School's design 15): the
// engine settings then give the GPU's speed against a worker's ("In use, ...: N times a worker's speed."), or say that
// it is slower and off. The bot then starts on the GPU only where the test found it faster.
// With --cpu, it checks the same pages off the GPU instead, with the layout test's launch options and the GPU on Auto:
// the engine settings say that this browser cannot use the GPU, and the bot starts on the CPU workers. That run checks
// the script itself, and starts no GPU code.
import { chromium } from "@playwright/test";
import config from "../playwright.config.ts";
import { ENGINE_KEY } from "../../cyanotype/src/lib/site.ts";
import { CYANOTYPE, LITE, LIVE_TURNS, LIVE_WAIT, testRecord } from "../tests/cyanotype-review.ts";

if (!CYANOTYPE) throw new Error("CYANOTYPE_BASE_URL gives no Cyanotype preview");
const cpu = process.argv.includes("--cpu"), auto = process.argv.includes("--auto");
const launchOptions = config.projects.find(p => p.name === "chromium").use.launchOptions;
const WEBGPU = ["--enable-unsafe-webgpu", "--use-angle=d3d11", "--enable-features=Vulkan"]; // the note's flags
const options = cpu ? launchOptions : { ...launchOptions, args: WEBGPU };
/** The GPU setting, the engine settings' line once the GPU has settled, and where the bot must run. */
const expected = cpu ? { gpu: "auto", status: /^This browser cannot use the GPU/, where: /, on the CPU workers\.$/ }
  : auto ? { gpu: "auto", status: /^In use, .*times a worker's speed\.$|^Off: /, where: /, on (the GPU|the CPU workers)\.$/ }
  : { gpu: "on", status: /^In use/, where: /, on the GPU\.$/ };
/** A line of the GPU that no later state replaces during the review (Auto's test first says "In use. Testing ..."). */
const settled = new RegExp(`^(This browser cannot|In use${auto ? ", " : ""}|Off:|The GPU did not start)`);
console.log(`${cpu ? "off the GPU" : "on the GPU"}: Chromium's flags ${JSON.stringify(options.args)}, the GPU setting ${expected.gpu}`);

const browser = await chromium.launch(options);
const failures = [];
try {
  const page = await (await browser.newContext({ viewport: { width: 1376, height: 952 } })).newPage();
  page.on("pageerror", e => failures.push(`page error: ${e}`));
  await page.goto(new URL("/about", CYANOTYPE).href);
  await page.evaluate(([key, engine]) => localStorage.setItem(key, JSON.stringify(engine)),
                      [ENGINE_KEY, { on: true, ...LITE, gpu: expected.gpu }]);

  // The review: the GPU joins the workers at the sweep's backlog
  const t0 = Date.now();
  await page.goto(new URL(`/review#record=${encodeURIComponent(testRecord(LIVE_TURNS))}`, CYANOTYPE).href);
  await page.getByRole("button", { name: "Engine settings" }).click();
  const line = page.getByRole("region", { name: "Engine settings" }).locator("p[aria-live]");
  await line.filter({ hasText: settled }).first().waitFor({ timeout: LIVE_WAIT });
  const status = await line.first().innerText();
  console.log(`the review's GPU: ${status}`);
  if (!expected.status.test(status)) failures.push(`the review's GPU: "${status}", not ${expected.status}`);
  await page.getByText(/^Review done/).waitFor({ timeout: LIVE_WAIT });
  console.log(`the review of ${LIVE_TURNS} turns: ${Math.round((Date.now() - t0) / 1000)} s; the GPU then: ${await line.first().innerText()}`);

  // Practice: the bot plays Blue, so it moves first
  await page.goto(new URL("/practice", CYANOTYPE).href);
  const red = page.getByRole("button", { name: "Play as Red" });
  await page.waitForFunction(() => document.querySelector('button[aria-label="Play as Red"]')?.disabled === false, null,
                             { timeout: 120_000 }); // the rules' worker is ready
  await red.click();
  const bot = page.getByText(/^Stamp Duty .*, on (the GPU|the CPU workers|one thread)\.$/);
  await bot.waitFor({ timeout: 120_000 });
  const botLine = await bot.innerText();
  console.log(`the bot: ${botLine}`);
  if (!expected.where.test(botLine)) failures.push(`the bot: "${botLine}", not ${expected.where}`);
  await page.getByText(/^(Stamp Duty's last turn took|The game stopped)/).waitFor({ timeout: 300_000 });
  const stopped = page.getByText(/^The game stopped/);
  if (await stopped.count()) failures.push(`Practice: ${await stopped.innerText()}`);
  else console.log(`Practice: ${await page.getByText(/^Stamp Duty's last turn took/).innerText()}`);
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(`FAIL\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("PASS");
