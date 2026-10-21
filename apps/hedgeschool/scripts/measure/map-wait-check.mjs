// A browser check of the area map's note (design 30): every state that the note shows ends. As the owner met the bug
// "Map: waiting for the engine does not end": tests/fixtures/hedgefund-review.json with the ownership removed from every
// result (a review stored before the maps), its results as deep as the position on screen's search, imported, its
// review done, the area map turned on at a position (the key t); then the page reloaded, with the map still on, at the
// position that it opens, with no step. And a review while it runs, the map on from its start, in a new browser. Each
// time, the note in the board's margin is read once a second for `seconds`: the check fails when a note that says the
// map waits or is searched is still there at the end, or when no map shows. Last, a snapshot (design 20), in a new
// browser: the fixture as an earlier engine's review, with maps stored for every position but the one after 30 edges.
// Its stored map must show, and its missing one must say so. In Playwright's Chromium, headless, with `workers` search
// workers and the GPU off.
//
//   node scripts/measure/map-wait-check.mjs <build dir> <scratch dir> [seconds] [workers] [port]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FIXTURE, importReview, launch, preview, stepTo, watchSweep } from "./speed.mjs";
import { MAP_VISITS, analysisKey, mapKey, readAnalysisKey } from "@abstractclass/analysis/cache.ts";

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
/** Reads the note once a second for `secs`, and says how it ended: `pass` judges the last note and legend. By
 *  default, a note that says the map waits or is searched fails, and so does no map. */
async function watch(name, secs = seconds, pass = (last, map) => !(last && /waiting|searching/.test(last)) && !!map) {
  const seen = [];
  for (let s = 0; s < secs; s++) {
    const n = await note();
    if (seen.at(-1)?.note !== n) seen.push({ at: s, note: n });
    await page.waitForTimeout(1000);
  }
  const last = await note(), map = await legend(), ok = pass(last, map);
  console.log(`${name}: ${seen.map(x => `${x.at} s ${x.note ?? "(no note)"}`).join(" → ")}; at ${secs} s the note ` +
              `${last ?? "(none)"}, the legend ${map ? `"${map.slice(0, 40)}"` : "(none)"}: ${ok ? "ok" : "FAIL"}`);
  return ok;
}
/** A page in a new browser, with the area map on from the start. */
async function mapOnPage() {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await context.addInitScript(watchSweep, JSON.stringify({ workers, gpu: "off" }));
  await context.addInitScript(() => {
    try { localStorage.setItem("learn-enclosure:review-display:1", JSON.stringify({ areaMap: { review: true, board: true } })); } catch { /* none */ }
  });
  const p = await context.newPage();
  p.on("pageerror", e => errors.push(e.message));
  return p;
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
const running = await mapOnPage();
await running.goto(`${server.url}/import#record=${encodeURIComponent(fixture.record)}`);
await running.waitForURL(/#game=/, { timeout: 60_000 });
page = running; // watch() reads the page in `page`
const during = await watch("a review while it runs, at the position it opens");

// A snapshot (design 20): the fixture's review as an earlier engine's, with no ownership in its results, and the maps
// added to every position but the one after AT edges. A snapshot does no searches: it shows its stored maps, and a map
// that it lacks says so at once, with no wait.
const EARLIER = "0ldsrch", NO_MAP = "No map saved: snapshots do no searches";
const earlier = JSON.parse(readFileSync(FIXTURE, "utf8"));
earlier.review = { ...earlier.review, module: "0".repeat(64), search: EARLIER };
const maps = new Map();
earlier.analyses = earlier.analyses.map(([key, { ownership, ...a }]) => {
  const k = readAnalysisKey(key), moves = k.moves ? k.moves.split(" ") : [];
  if (ownership && moves.length !== AT)
    maps.set(mapKey(EARLIER, k.model, moves), { ownership, visits: MAP_VISITS, source: "short search" });
  return [analysisKey(EARLIER, k.model, moves, k.visits, k.shape), a];
});
earlier.analyses.push(...maps);
const snapshotFile = join(scratch, "hedgefund-review-earlier-engine.json");
writeFileSync(snapshotFile, JSON.stringify(earlier));
page = await mapOnPage();
await importReview(page, server.url, snapshotFile, /^Reviewed on/);
// A few seconds: a stored map shows with no note, and a missing one says so
await stepTo(page, AT + 1);
const snapshotMap = await watch(`a snapshot, after edge ${AT + 1} (its map stored)`, 5, (last, map) => !!map && !last);
await stepTo(page, AT);
const snapshotNone = await watch(`a snapshot, after edge ${AT} (no map stored)`, 5, (last, map) => last === NO_MAP && !map);
console.log(`page errors: ${errors.length ? errors.join("; ") : "none"}`);
const ok = first && reloaded && during && snapshotMap && snapshotNone;
console.log(ok ? "PASS" : "FAIL");
await browser.close();
await server.stop();
process.exit(ok ? 0 : 1);
