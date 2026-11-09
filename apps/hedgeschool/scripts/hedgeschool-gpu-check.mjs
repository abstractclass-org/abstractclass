// The check of Hedge School's GPU paths (its design 15) on its preview: the review, the Analysis board and Practice,
// as scripts/gpu-check.mjs gives them, and the weak walls with the GPU On. The review of On reviews the test game's
// first LIVE_TURNS turns at Lite: the layout test's game (tests/fixtures/hedgefund-review.json, scripts/test-fixture.mjs).
// The weak walls (design 30, "The weak walls") come from a CPU worker only: the GPU module refuses `includeWeakWalls`
// (the engine repository's design 19, "No training-only outputs"), so the site asks the pool's `cpu` task for them
// (packages/engine/src/pool.ts). Their part opens the Analysis board in a new browser context, at the start, with 1
// worker and the threat on, as the board's part does, so that the GPU searches beside the worker. Space then plays the
// first choice six times (design 30, "Positions that show them": the opening's long walls), and the key w shows the
// walls. The part checks that the rings show, that no request for the walls reaches a GPU worker and one reaches
// another worker, that the GPU searched (where it is in use), and that the page's console shows no error. Run it in
// apps/hedgeschool:
//
//   BASE_URL=http://127.0.0.1:4173 node scripts/hedgeschool-gpu-check.mjs [--on | --auto] [--cpu]
//
// A run with WebGPU is a GPU-path check: it starts only through `scripts/machine run --gpu` (gpu-check.mjs).
import { readFileSync } from "node:fs";
import { firstTurns } from "../tests/records.ts";
import { gpuCheck } from "./gpu-check.mjs";

/** The turns that the review of On reviews. The early edition's test book (tests/fixtures/test-book) holds the game's
 *  first 3 turns, positions 0 to 5, and the review takes their values from the book with no search. So the review of
 *  5 turns searches 4 positions before a move, 6 to 9, and the game's end, at 32 and at 512 visits: a backlog at which
 *  the GPU joins, as the 5 positions of Cyanotype's LIVE_TURNS. */
const LIVE_TURNS = 5;
const BASE = process.env.BASE_URL;
/** The test game's record. */
const GAME = JSON.parse(readFileSync(new URL("../tests/fixtures/hedgefund-review.json", import.meta.url), "utf8")).record;
/** The Analysis board's link to the record `record` (firstTurns'), at its end: a link with no place opens at the start
 *  (src/routes/analysis/+page.svelte, recordBoard). The place is its edge count: the words of its moves that are not
 *  a turn's number. */
const boardLink = record => "/analysis#" + new URLSearchParams({
  record, at: String(record.split("\n\n")[1].split(/\s+/).filter(w => w && !/^\d+\.$/.test(w)).length),
});
/** The Analysis board's position on screen in local storage, its edges with a space between
 *  (src/routes/analysis/+page.svelte, AT_KEY). */
const AT_KEY = "hedge-school:board-at";
/** The edges that Space plays from the start (design 30, "Positions that show them"). */
const WALLS_AT = 6;

/** Pastes `record` in the Review tab, once its games are read (its footer shows then), and clicks Review: the import
 *  keeps the game, then its review opens. `timeout`: the longest wait of each step. */
async function paste(page, record, timeout) {
  await page.goto(new URL("/review", BASE).href, { timeout });
  await page.getByRole("heading", { name: "Review your Enclosure game" }).waitFor({ timeout });
  await page.locator("footer").waitFor({ timeout });
  await page.getByLabel("A game record").fill(record, { timeout });
  await page.getByRole("button", { name: "Review", exact: true }).click({ timeout });
}

/** The weak walls with the GPU On, on the Analysis board (the file's header). */
async function weakWalls({ newPage, at, upTo, waits }, { say, fail, show }) {
  const board = await newPage(), { page } = board, consoleErrors = [];
  show(board);
  page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text()); });
  await board.keep({ workers: 1 });
  await page.goto(at("/analysis"));
  await page.getByRole("button", { name: "Show threat" }).click({ timeout: upTo(waits.board) });
  // Space plays the first choice once the position's search has one (or the book's): it is pressed again until the
  // board is one edge further. The page takes the keys while no control has the focus.
  const edges = () => page.evaluate(key => (localStorage.getItem(key) ?? "").split(" ").filter(Boolean).length, AT_KEY);
  const blur = () => page.evaluate(() => document.activeElement?.blur?.());
  for (let k = 1; k <= WALLS_AT; k++) {
    const until = Date.now() + upTo(waits.board);
    while ((await edges()) < k) {
      if (Date.now() >= until) throw new Error(`Space played ${k - 1} of ${WALLS_AT} edges`);
      await blur();
      await page.keyboard.press("Space");
      await page.waitForTimeout(500);
    }
  }
  const played = await page.evaluate(key => localStorage.getItem(key), AT_KEY);
  say(`Space played ${played}`);
  await board.settingsButton.click();
  const status = await board.gpuLine(waits.gpuLine, { say, fail });
  await blur();
  await page.keyboard.press("w");
  await page.getByRole("button", { name: "Weak walls", pressed: true }).waitFor({ timeout: upTo(60_000) });
  // The rings, or the note that says why none show (an engine that refuses the walls: "not in this engine")
  const rings = page.locator("g.walls circle.wall-ring");
  const none = page.getByText(/^Weak walls: (not in this engine|none at|the game ends here)/);
  await rings.or(none).first().waitFor({ timeout: upTo(waits.board) });
  const count = await rings.count();
  if (!count) fail(`no rings: the board says "${await none.first().innerText()}"`);
  const work = await board.gpuWork(status, fail);
  say(`${count} rings; requests for the walls: ${work.gpuWalls} to the GPU, ${work.cpuWalls} to the CPU workers; ` +
      `${work.workers} GPU workers, ${work.searches} searches on the GPU`);
  if (work.gpuWalls) fail(`${work.gpuWalls} requests for the walls reached the GPU module`);
  if (!work.cpuWalls) fail("no request for the walls reached a CPU worker");
  for (const error of consoleErrors) fail(`the console: ${error}`);
}

await gpuCheck({
  name: "Hedge School", variable: "BASE_URL", base: BASE, engineKey: "learn-enclosure:engine:2",
  lite: { review: "lite", visits: 512 }, local: { "hedge-school:consent:2": { analytics: "denied", games: "denied" } },
  liveTurns: LIVE_TURNS, record: turns => firstTurns(GAME, turns ?? Infinity), paste, boardLink, bot: "HedgeFund",
  /** Cyanotype's (cyanotype-gpu-check.mjs), until a run on the GPU measures Hedge School's. Off the GPU (--cpu, 2
   *  threads, abscls-bp3a): the review of 5 turns took 24 s, the board 21 to 28 s, the weak walls 12 s, and the bot's
   *  first turn 1.0 to 1.1 s. The whole run took 91 s. */
  waits: {
    cpu: { autoTest: 60_000, review: 300_000, board: 180_000, practice: 120_000 },
    gpu: { autoTest: 120_000, review: 90_000, board: 60_000, practice: 60_000 },
  },
  /** Under the job's --expect (10 minutes on the GPU). */
  budget: { cpu: 15, gpu: 9 },
  parts: [{ name: "the weak walls", settings: ["on"], run: weakWalls }],
});
