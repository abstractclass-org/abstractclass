// The layout shift of the review, the Analysis board and the Review tab as they load (decisions/product.md, "The layout
// shift of the review and the Analysis board, again" and "The Review tab before the page's code runs"): two builds in
// alternating pairs (speed.mjs, inPairs), at each window size, in Playwright's Chromium, headless, with its scroll bars
// shown (playwright.config.ts). Each build is served from its own folder on its own port (speed.mjs, preview), and
// opens in a page of its own, so each keeps its own stored games.
//   - review: the review of tests/fixtures/hedgefund-review.json, stored, reloaded. Each reload waits for the mark
//     `review:shown` (src/routes/review/+page.svelte), then 3 seconds for the frames after it.
//   - board: the Analysis board from an analysis file of the fixture's first 15 edges, every move evaluated, with a
//     branch at the second move (boardFile), reloaded. Each reload waits 5 seconds: the board has no mark.
//   - tab: the Review tab (`/review`), with the fixture's review stored, so that "Continue your last review" and the
//     list of games come once the tab has read them, reloaded. Each reload waits for the link, then 2 seconds.
// A set is a few reloads of one build. It gives its median layout shift, as the browser's Cumulative Layout Shift counts
// it (its largest session window, speed.mjs, layoutShift), and each element that moved, with how many reloads moved it.
// The verdict (speed.mjs, verdict) compares the sets' medians, pair by pair.
//
//   node scripts/measure/layout-shift.mjs <review|board|tab> <before> <after> [pairs] [reloads] [WxH...]
//
// <before> and <after> are build folders, copies of `build` (docs/working-notes.md). They are served on the port PORT
// and the next (4193 by default). With OUT, the sets go to that file as JSON.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FIXTURE, importFile, inPairs, launch, layoutShift, median, preview, storeReview, verdict } from "./speed.mjs";
import { parseRecord } from "../../src/lib/game/record.ts";
import { readAnalysisKey } from "../../src/lib/analysis/cache.ts";
import { ANALYSIS_FILE_VERSION, ANALYSIS_FORMAT } from "../../src/lib/game/analysisFile.ts";
import { boardPositionKeys } from "../../src/lib/game/board.ts";
import { belongs } from "../../src/lib/game/reviewFile.ts";
import { prefixKeys } from "../../src/lib/review/tree.ts";

const [kind, before, after, pairCount = "5", reloadCount = "3", ...sizeArgs] = process.argv.slice(2);
if (!["review", "board", "tab"].includes(kind) || !before || !after) throw new Error("usage: layout-shift.mjs <review|board|tab> <before> <after> [pairs] [reloads] [WxH...]");
const sizes = (sizeArgs.length ? sizeArgs : ["1366x657", "1427x849", "390x760", "390x1100"]).map(s => s.split("x").map(Number));

/** An analysis file of the fixture's first `edges` edges, every move evaluated, with a branch at the second move: the
 *  second move of another stored result. It holds the fixture's results of its positions and of those one move from
 *  them, as the site's export chooses them (src/lib/game/analysisFile.ts). */
function boardFile(edges = 15) {
  const fixture = JSON.parse(readFileSync(FIXTURE, "utf8"));
  const moves = parseRecord(fixture.record).moves.slice(0, edges);
  const branch = fixture.analyses.map(([key]) => readAnalysisKey(key).moves)
    .find(m => m.split(" ").length === 2 && m.startsWith(`${moves[0]} `) && m !== `${moves[0]} ${moves[1]}`);
  const board = { version: 2, nodes: [...prefixKeys(moves).slice(1).map(k => [k, 0, 1]), [branch, 1, 1]], main: moves };
  const positions = boardPositionKeys(board);
  return { format: ANALYSIS_FORMAT, version: ANALYSIS_FILE_VERSION, exported: new Date().toISOString(), site: "layout-shift.mjs",
           board, analyses: fixture.analyses.filter(([key]) => belongs(key, positions, null)) };
}

const browser = await launch();
const builds = [];
const port = Number(process.env.PORT ?? 4193);
for (const [dir, k] of [[before, 0], [after, 1]]) {
  const served = await preview(dir, port + k), page = await browser.newPage({ viewport: { width: sizes[0][0], height: sizes[0][1] } });
  if (kind !== "board") {
    await storeReview(page, served.url);
    if (kind === "tab") await page.goto(`${served.url}/review`);
  } else {
    const file = join(tmpdir(), "layout-shift-board.json");
    writeFileSync(file, JSON.stringify(boardFile()));
    await importFile(page, served.url, file);
    await page.waitForURL(/\/analysis/);
    await page.waitForTimeout(8000); // the board keeps its lines in the browser once its rules have read them
  }
  builds.push({ name: dir, served, page });
}

/** One set: `reloadCount` reloads of a build's page. Its median layout shift, and each element that moved, with how
 *  many of the reloads moved it. */
async function set({ page }) {
  const shifts = [], moved = new Map();
  for (let k = 0; k < Number(reloadCount); k++) {
    await page.reload();
    if (kind === "review") {
      await page.waitForFunction(() => performance.getEntriesByName("review:shown").length, null, { timeout: 120_000 });
      await page.waitForTimeout(3000);
    } else if (kind === "tab") {
      await page.getByText("Continue your last review").waitFor();
      await page.waitForTimeout(2000);
    } else await page.waitForTimeout(5000);
    const { cls, moved: these } = await layoutShift(page);
    shifts.push(cls);
    for (const m of these) {
      const name = m.replace(/ at -?\d+ ms(, \d+ times)?$/, ""); // layoutShift names each element once
      moved.set(name, (moved.get(name) ?? 0) + 1);
    }
  }
  return { cls: median(shifts), shifts, moved: Object.fromEntries(moved) };
}

const out = [];
const f = x => x.toFixed(4);
for (const [width, height] of sizes) {
  for (const b of builds) await b.page.setViewportSize({ width, height });
  const pairs = await inPairs(builds, Number(pairCount), set);
  const v = verdict(pairs.map(pair => pair.map(run => run.result.cls)));
  console.log(`\n${kind} at ${width}×${height}, ${pairCount} pairs of ${reloadCount} reloads:`);
  pairs.forEach((pair, i) => console.log(`  pair ${i + 1}: ` + pair.map((run, k) => `${k ? "after" : "before"} ${f(run.result.cls)} ` +
    `(${run.result.shifts.map(f).join(", ")}; ${run.load?.cpu ?? "?"}%, load ${run.load?.load ?? "?"})`).join(", ")));
  console.log(`  verdict: differences ${v.diffs.map(f).join(", ")}, median ${f(v.diff)}; before median ${f(v.a.median)} (spread ${f(v.a.spread)}), ` +
              `after median ${f(v.b.median)} (spread ${f(v.b.spread)}); the pairs agree: ${v.agree}, a change: ${v.change}`);
  for (const [k, label] of [[0, "before"], [1, "after"]]) {
    const moved = new Map();
    for (const pair of pairs) for (const [name, n] of Object.entries(pair[k].result.moved)) moved.set(name, (moved.get(name) ?? 0) + n);
    console.log(`  moved, ${label}: ${moved.size ? [...moved].map(([name, n]) => `${name} in ${n} reloads`).join("; ") : "nothing"}`);
  }
  out.push({ kind, width, height, pairs, verdict: v });
}
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(out));
await browser.close();
for (const b of builds) await b.served.stop();
