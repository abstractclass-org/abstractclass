// The engine measure's page (packages/measure; decisions/engine.md, "The engine measure on a visitor's device"), on each
// site: Hedge School's with Enclosure's engine, and Cyanotype's with Blueprints' on its preview (CYANOTYPE_BASE_URL).
// Each run goes from Start to its end, and the block that "Copy results" copies holds every measure. The test makes
// the device one of 2 logical cores and each pool size's time 4 seconds (the address's `seconds`), so the run has two
// pool sizes and stays short. The browser here gives no GPU adapter (playwright.config.ts runs Chromium off the GPU),
// so the GPU part says that it did not run. Hedge School's test also hides the tab during the measure of 2 workers:
// that measure stops, and "Run it again" runs it and ends the run.
import { test, expect, type Page } from "@playwright/test";

const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;
const PATH = "/lab/measure?seconds=4";
/** The longest wait for the run's end: Cyanotype's searches of 512 visits take about half a minute each on a busy
 *  machine, and each pool size finishes its workers' last search. */
const RUN_WAIT = 8 * 60_000;

/** A device of 2 logical cores, and a tab whose visibility the test sets (`hide`). */
async function setUp(page: Page) {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 2 });
    const w = window as unknown as { hidden: boolean };
    w.hidden = false;
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (w.hidden ? "hidden" : "visible") });
  });
}

/** Hides the tab, or shows it again, as the browser tells a page. */
const setHidden = (page: Page, hidden: boolean) => page.evaluate(h => {
  (window as unknown as { hidden: boolean }).hidden = h;
  document.dispatchEvent(new Event("visibilitychange"));
}, hidden);

/** Starts the run once the page gives its estimate. */
async function start(page: Page, url: string) {
  await page.goto(url);
  await expect(page.getByTestId("measure-estimate")).toContainText(/approximately \d+ minutes? on this device \(2 logical cores\)/,
                                                                    { timeout: 60_000 });
  await page.getByRole("button", { name: "Start" }).click();
}

/** Copies the results at the run's end and checks that the block holds every measure: the build, the device, both
 *  pool sizes with their numbers, the GPU part, the memory, the downloads and the run. */
async function checkResults(page: Page, site: string) {
  await expect(page.getByText("The measure is done.")).toBeVisible({ timeout: RUN_WAIT });
  await page.getByRole("button", { name: "Copy results" }).click();
  await expect(page.getByText("The results are copied.")).toBeVisible();
  // Windows' clipboard gives each line end back as CR LF.
  const copied = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n");
  expect(copied).toBe(await page.getByTestId("measure-block").inputValue());
  const number = String.raw`\d+(\.\d+)?`;
  for (const line of [
    new RegExp(`^Engine measure, ${site}, \\d{4}-\\d\\d-\\d\\d \\d\\d:\\d\\d UTC$`),
    /^- Site commit \w+\. Engine module engine-\w+ \(build [^,]+, protocol [\d.]+, search [^)]+\)\.$/,
    /^- GPU module: engine-\w+-gpu\. Network: .+ \([\w-]+\)\.$/,
    /^- Logical cores: 2\. Memory: (at least \d+ GB|not given)\. Power: .+\.$/,
    /^- Browser: .+ \d+[\d.]*/,
    /^- WebGPU adapter: .+\. JSPI: (present|absent)\.$/,
    /^- User agent: Mozilla/,
    /^- Positions: .+ positions\)\. Searched: after \d+(, \d+)* moves\.$/,
    new RegExp(`^\\| 1 \\| ${number} \\| ${number} \\| \\d+ \\| ${number} min \\| ${number} s \\| \\d+ MB \\|$`),
    new RegExp(`^\\| 2 \\| ${number} \\| ${number} \\| \\d+ \\| ${number} min \\| ${number} s \\| \\d+ MB \\|$`),
    /^- Not run: (WebGPU gives no adapter \(no GPU\)|this browser has no WebGPU)\.$/,
    /^- At the end of the largest pool's measure: the whole page .+, the page's JavaScript heap .+\.$/,
    /^- Download, by the manifest: the CPU workers' files [\d.]+ MB, the GPU's [\d.]+ MB more\./,
    /^- [\d.]+ minutes from Start to the end\./,
  ]) expect(copied.split("\n").some(l => line.test(l)), `the block lacks ${line}:\n${copied}`).toBe(true);
  return copied;
}

test("Hedge School's engine measure runs to its end, stops while the tab is hidden, and copies every measure", async ({ page }) => {
  await setUp(page);
  await start(page, PATH);
  const progress = page.getByTestId("measure-progress");
  await expect(progress).toContainText("2 workers, searching", { timeout: 120_000 });
  await setHidden(page, true);
  await expect(page.getByRole("alert")).toContainText("The tab was hidden, so the measure of 2 workers stopped.");
  await setHidden(page, false);
  await page.getByRole("button", { name: "Run it again" }).click();
  const copied = await checkResults(page, "Hedge School");
  expect(copied).toMatch(/Stopped because the tab was hidden: 2 workers \(\d\d:\d\d:\d\d UTC\)\.$/);
});

test("Cyanotype's engine measure runs to its end with Blueprints' engine, and copies every measure", async ({ page }) => {
  test.skip(!CYANOTYPE, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
  await setUp(page);
  await start(page, new URL(PATH, CYANOTYPE).href);
  const copied = await checkResults(page, "Cyanotype");
  expect(copied).toMatch(/^- Positions: Blueprints, the review's test game \(Stamp Duty against itself, 120 positions\)\./m);
  expect(copied).toMatch(/No measure stopped\.$/);
});
