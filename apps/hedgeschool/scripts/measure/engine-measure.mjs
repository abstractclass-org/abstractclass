// The engine measure's page (packages/measure; decisions/engine.md, "The engine measure on a visitor's device"), run
// from Start to its end in Playwright's Chromium, headless, with the layout test's launch options (playwright.config.ts:
// off the GPU on Windows), so the engine runs on the CPU and the GPU part does not run. The page sees a device of
// <cores> logical cores (navigator.hardwareConcurrency), so the run has that many pool sizes: give the job that many
// threads. The script prints the run's time and the results block that "Copy results" copies.
//
//   node scripts/measure/engine-measure.mjs <site's address> [cores] [seconds]
//
// <site's address> is a running preview, Hedge School's or Cyanotype's. [seconds] sets each pool size's time (the
// page's `seconds`, by default its own).
import { chromium } from "@playwright/test";
import config from "../../playwright.config.ts";

const [base, cores = "4", seconds] = process.argv.slice(2);
if (!base) throw new Error("usage: engine-measure.mjs <site's address> [cores] [seconds]");
const launchOptions = config.projects.find(p => p.name === "chromium").use.launchOptions;
const browser = await chromium.launch(launchOptions);
try {
  const context = await browser.newContext();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await context.newPage();
  await page.addInitScript(n => Object.defineProperty(navigator, "hardwareConcurrency", { get: () => n }), Number(cores));
  await page.goto(new URL(`/lab/measure${seconds ? `?seconds=${seconds}` : ""}`, base).href);
  const estimate = await page.getByTestId("measure-estimate").textContent({ timeout: 60_000 });
  console.log(estimate?.replace(/\s+/g, " ").trim());
  const t0 = Date.now();
  await page.getByRole("button", { name: "Start" }).click();
  let last = "";
  const timer = setInterval(async () => {
    const line = await page.getByTestId("measure-progress").textContent().catch(() => "");
    const now = line?.replace(/\s+/g, " ").trim().replace(/, \d+ s of .*/, "") ?? "";
    if (now && now !== last) console.log(`${((Date.now() - t0) / 1000).toFixed(0)} s: ${(last = now)}`);
  }, 5000);
  await page.getByText("The measure is done.").waitFor({ timeout: 60 * 60_000 });
  clearInterval(timer);
  console.log(`The run took ${((Date.now() - t0) / 60_000).toFixed(1)} minutes.\n`);
  await page.getByRole("button", { name: "Copy results" }).click();
  console.log(await page.evaluate(() => navigator.clipboard.readText()));
} finally {
  await browser.close();
}
