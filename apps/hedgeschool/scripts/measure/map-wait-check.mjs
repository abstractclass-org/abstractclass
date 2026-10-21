// A browser check of the area map's note (design 30): every state that the note shows ends. As the owner met the bug
// "Map: waiting for the engine does not end": tests/fixtures/hedgefund-review.json with the ownership removed from every
// result (a review stored before the maps), its results as deep as the position on screen's search, imported, its
// review done, the area map turned on at a position (the key t); then the page reloaded, with the map still on, at the
// position that it opens, with no step. And a review while it runs, the map on from its start, in a new browser. Each
// time, the note in the board's margin is read once a second for `seconds`: the check fails when a note that says the
// map waits or is searched is still there at the end, or when no map shows. Last, a snapshot (design 20), in a new
// browser: the fixture as an earlier engine's review, with maps stored for every position but those after 30 edges. Its
// stored map must show, and its missing one must say so. In Playwright's Chromium, headless, with `workers` search
// workers and the GPU off.
//
//   node scripts/measure/map-wait-check.mjs <build dir> <scratch dir> [seconds] [workers] [port]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FIXTURE, importReview, launch, preview, stepTo, watchSweep } from "./speed.mjs";

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
await importReview(page, server.url, file);

const note = () => page.locator('.map-margin [role="status"]').first().textContent({ timeout: 500 }).then(t => t.trim()).catch(() => null);
const legend = () => page.locator(".map-legend").first().textContent({ timeout: 500 }).then(t => t.trim()).catch(() => null);
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

await stepTo(page, AT);
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

// A snapshot (design 20): the fixture's review as an earlier engine's, with no ownership in its results, and the maps
// added to every position but those after AT edges. A snapshot searches nothing: it shows its stored maps, and a map
// that it lacks says so at once, with no wait.
const EARLIER = "0ldsrch", NO_MAP = "No map: a snapshot searches nothing";
const earlier = JSON.parse(readFileSync(FIXTURE, "utf8"));
earlier.review = { ...earlier.review, module: "0".repeat(64), search: EARLIER };
const maps = new Map();
earlier.analyses = earlier.analyses.map(([key, { ownership, ...a }]) => {
  const [shape, , model, , ...rest] = key.split("|"), moves = rest.join("|");
  if (ownership && (moves ? moves.split(" ").length : 0) !== AT)
    maps.set(`map|${shape}|${EARLIER}|${model}|32|${moves}`, { ownership, visits: 32, source: "short search" });
  return [key.replace(/^(\d+\|)[^|]*\|/, `$1${EARLIER}|`), a];
});
earlier.analyses.push(...maps);
const snapshotFile = join(scratch, "hedgefund-review-earlier-engine.json");
writeFileSync(snapshotFile, JSON.stringify(earlier));
const snap = await browser.newContext({ viewport: { width: 1366, height: 900 } });
await snap.addInitScript(watchSweep, JSON.stringify({ workers, gpu: "off" }));
await snap.addInitScript(() => {
  try { localStorage.setItem("learn-enclosure:review-display:1", JSON.stringify({ areaMap: { review: true, board: true } })); } catch { /* none */ }
});
page = await snap.newPage();
page.on("pageerror", e => errors.push(e.message));
await page.goto(`${server.url}/review`);
await page.waitForLoadState("networkidle");
await page.locator('input[type="file"][accept*="json"]').first().setInputFiles(snapshotFile);
await page.waitForURL(/#game=/, { timeout: 60_000 });
await page.getByText(/^Reviewed on/).first().waitFor({ timeout: 60_000 });
/** Reads the note once a second for a few seconds: a stored map shows with no note, a missing one says so. */
async function watchSnapshot(name, stored) {
  const seen = [];
  for (let s = 0; s < 5; s++) {
    const n = await note();
    if (seen.at(-1)?.note !== n) seen.push({ at: s, note: n });
    await page.waitForTimeout(1000);
  }
  const last = await note(), map = await legend();
  const ok = stored ? !!map && !last : last === NO_MAP && !map;
  console.log(`${name}: ${seen.map(x => `${x.at} s ${x.note ?? "(no note)"}`).join(" → ")}; at 5 s the note ` +
              `${last ?? "(none)"}, the legend ${map ? `"${map.slice(0, 40)}"` : "(none)"}: ${ok ? "ok" : "FAIL"}`);
  return ok;
}
await stepTo(page, AT + 1);
const snapshotMap = await watchSnapshot(`a snapshot, after edge ${AT + 1} (its map stored)`, true);
await stepTo(page, AT);
const snapshotNone = await watchSnapshot(`a snapshot, after edge ${AT} (no map stored)`, false);
console.log(`page errors: ${errors.length ? errors.join("; ") : "none"}`);
const ok = first && reloaded && during && snapshotMap && snapshotNone;
console.log(ok ? "PASS" : "FAIL");
await browser.close();
await server.stop();
process.exit(ok ? 0 : 1);
