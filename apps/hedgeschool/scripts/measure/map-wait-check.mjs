// A browser check of the area map's note (design 30): every state that the note shows ends. As the owner met the bug
// "Map: waiting for the engine does not end": tests/fixtures/hedgefund-review.json with the ownership removed from every
// result (a review stored before the maps), its results as deep as the position on screen's search, imported, its
// review done, the area map turned on at a position (the key t); then the page reloaded, with the map still on, at the
// position that it opens, with no step. And a review while it runs, the map on from its start, in a new browser. Each
// time, the note in the board's margin is read once a second for `seconds`: the check fails when a note that says the
// map waits or is searched is still there at the end, or when no map shows. In Playwright's Chromium, headless, with
// `workers` search workers and the GPU off.
//
//   node scripts/measure/map-wait-check.mjs <build dir> <scratch dir> [seconds] [workers] [port]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FIXTURE, launch, preview, watchSweep } from "./speed.mjs";

const [dir, scratch, secondsArg = "30", workersArg = "2", portArg = "4501"] = process.argv.slice(2);
const seconds = Number(secondsArg), workers = Number(workersArg), AT = 30;
// The fixture's results without their maps, and as deep as the position on screen's search (1,024 visits), as an older
// review's can be: no search of the position on screen runs, which would bring a map of its own
const fixture = JSON.parse(readFileSync(FIXTURE, "utf8"));
fixture.analyses = fixture.analyses.map(([key, a]) => {
  delete a.ownership;
  return [key.replace(/^(\d+\|[^|]*\|[^|]*\|)\d+\|/, "$11024|"), { ...a, visits: 1024 }];
});
const file = join(scratch, "hedgefund-review-no-maps.json");
writeFileSync(file, JSON.stringify(fixture));

const server = await preview(dir, Number(portArg)), browser = await launch();
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
await context.addInitScript(watchSweep, JSON.stringify({ workers, gpu: "off" }));
let page = await context.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
for (let tries = 0; !page.url().includes("#game="); tries++) {
  if (tries === 4) throw new Error("the import did not open");
  await page.goto(`${server.url}/review`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.locator('input[type="file"][accept*="json"]').first().setInputFiles(file);
  await page.waitForURL(/#game=/, { timeout: 60_000 }).catch(() => {});
}
await page.getByText(/^Review done/).waitFor({ timeout: 600_000 });

const note = () => page.locator('.map-margin [role="status"]').first().textContent({ timeout: 500 }).then(t => t.trim()).catch(() => null);
const legend = () => page.locator(".map-legend").first().textContent({ timeout: 500 }).then(t => t.trim()).catch(() => null);
const goTo = async n => {
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  await page.keyboard.press("Home");
  for (let i = 0; i < n; i++) await page.keyboard.press("ArrowRight");
};
/** Reads the note once a second for `seconds`, and says how it ended. */
async function watch(name) {
  const seen = [];
  for (let s = 0; s < seconds; s++) {
    const n = await note();
    if (seen.at(-1)?.note !== n) seen.push({ at: s, note: n });
    await page.waitForTimeout(1000);
  }
  const last = await note(), map = await legend();
  const stuck = !!last && /waiting|searching/.test(last);
  console.log(`${name}: ${seen.map(x => `${x.at} s ${x.note ?? "(no note)"}`).join(" → ")}; at ${seconds} s the note ` +
              `${last ?? "(none)"}, the legend ${map ? `"${map.slice(0, 40)}"` : "(none)"}: ${stuck || !map ? "FAIL" : "ok"}`);
  return !stuck && !!map;
}

await goTo(AT);
await page.keyboard.press("t");
const first = await watch(`the map turned on at edge ${AT}`);
await page.reload();
await page.getByText(/^Review done|^Maps:/).first().waitFor({ timeout: 600_000 });
// The position that the page opens at, without a step: a step asks for its map again, and would hide the bug
const where = await page.getByText(/^Edge \d+ of \d+/).first().textContent().catch(() => "?");
const reloaded = await watch(`after a reload, at the position it opens (${where.split("·")[0].trim()})`);
// A review while it runs: the fixture's game with no result, in a new browser, the map on from the start
const fresh = await browser.newContext({ viewport: { width: 1366, height: 900 } });
await fresh.addInitScript(watchSweep, JSON.stringify({ workers, gpu: "off" }));
await fresh.addInitScript(() => {
  try { localStorage.setItem("learn-enclosure:review-display:1", JSON.stringify({ areaMap: { review: true, board: true } })); } catch { /* none */ }
});
const running = await fresh.newPage();
running.on("pageerror", e => errors.push(e.message));
await running.goto(`${server.url}/import#record=${encodeURIComponent(fixture.record)}`);
await running.waitForURL(/#game=/, { timeout: 60_000 });
page = running; // watch() reads the page in `page`
const during = await watch("a review while it runs, at the position it opens");
console.log(`page errors: ${errors.length ? errors.join("; ") : "none"}`);
const ok = first && reloaded && during;
console.log(ok ? "PASS" : "FAIL");
await browser.close();
await server.stop();
process.exit(ok ? 0 : 1);
