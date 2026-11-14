// Cyanotype's home board (its design 33, as Hedge School's design 22) on its preview (CYANOTYPE_BASE_URL): the scenes
// of apps/cyanotype/src/lib/home/replay.json, which its scripts/home-replay.mjs writes from stored reviews. The home
// page asks the engine for nothing while the board plays: no worker, no message to a worker and no request for the
// engine's files. And each scene's labels are the Review tab's labels by move for the same game, reviewed there from the
// same stored review with the engine off. Without the engine's files the tests skip, with a message. Run:
// npm run test:layout -- tests/cyanotype-home.spec.ts, with CYANOTYPE_BASE_URL.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "./page-log.ts";
import { declineGames } from "./cyanotype-consent.ts";
import { CYANOTYPE, OTHER_STORED, STORED, TEST_GAME, TURNS, noReview, pasteRecord, readStored, storeReview,
         testRecord } from "./cyanotype-review.ts";
import { turnFromCount } from "../../../packages/analysis/src/turns.ts";
import { LABEL_TEXT } from "../../../packages/analysis/src/model.ts";
import { BAD_LABELS, type Label } from "../../../packages/analysis/src/labels.ts";

/** A scene's frame, with only what the tests read: the labels on the moves of the turn so far, the last move first. */
type Frame = { m: { label: Label }[] };
/** The replay: the scenes, and where each comes from (`made.games`, by scene): the stored review's file, the game's
 *  record (a file in apps/cyanotype/src/lib/review/fixtures) and the scene's first position in the game. */
const REPLAY = JSON.parse(readFileSync(new URL("../../cyanotype/src/lib/home/replay.json", import.meta.url), "utf8")) as {
  made: { games: { review: string; record: string; from: number }[] }; scenes: { frames: Frame[] }[];
};

/** The stored review of a file name in `made.games`, with its game and its turns: STORED, or one of OTHER_STORED. */
function storedOf(review: string) {
  const all = [{ file: STORED, game: TEST_GAME, turns: TURNS }, ...OTHER_STORED];
  const found = all.find(s => s.file.split("/").pop() === review);
  if (!found) throw new Error(`replay.json's scene comes from ${review}, which is no stored review of the tests`);
  return found;
}

/** The Review tab's labels by move of its game, in the order of the moves: each move's title starts with its label's
 *  word when the review judges by move (ReviewView.svelte, turnMoves). */
async function reviewLabels(page: Page): Promise<(Label | null)[]> {
  const byWord = new Map(Object.entries(LABEL_TEXT).map(([label, word]) => [word, label as Label]));
  const titles = await page.locator("button.mv[data-path]").evaluateAll(es => es.map(e => e.getAttribute("title") ?? ""));
  return titles.map(t => byWord.get(t.split(":")[0]) ?? null);
}

test.beforeEach(async ({ context, page }) => {
  await declineGames(context); // the consent banner would cover the page (cyanotype-consent.ts)
  const skipped = await noReview(page);
  test.skip(!!skipped, skipped);
});

test("the home board asks the engine for nothing", async ({ page }) => {
  // Each worker that the page makes, each message to one, and each request for the engine's files
  await page.addInitScript(() => {
    const work = { workers: 0, messages: 0 };
    (window as unknown as { engineWork: typeof work }).engineWork = work;
    const Base = window.Worker;
    window.Worker = class extends Base {
      constructor(...args: ConstructorParameters<typeof Worker>) { super(...args); work.workers++; }
      postMessage(...args: Parameters<Worker["postMessage"]>) { work.messages++; super.postMessage(...(args as [unknown])); }
    };
  });
  const engine: string[] = [];
  page.on("request", r => { if (new URL(r.url()).pathname.startsWith("/engine/")) engine.push(r.url()); });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(new URL("/", CYANOTYPE).href);
  // The scenes load, and the board plays them: a move every 1 to 2 seconds (@abstractclass/site/Replay.svelte). The
  // build names the scenes' file by its hash, so the board's change shows that they loaded.
  const board = page.getByRole("img", { name: "Blueprints board" });
  const still = await board.innerHTML();
  await expect.poll(() => board.innerHTML(), { timeout: 30_000 }).not.toBe(still);
  await page.waitForTimeout(8_000);
  const work = await page.evaluate(() => (window as unknown as { engineWork: object }).engineWork);
  expect(work, "the workers that the home page made, and the messages to them").toEqual({ workers: 0, messages: 0 });
  expect(engine, "the home page's requests for the engine's files").toEqual([]);
});

for (const [k, { review, record, from }] of REPLAY.made.games.entries()) {
  test(`scene ${k + 1}'s labels are the Review tab's for ${record}`, async ({ page }) => {
    test.setTimeout(5 * 60_000);
    const { file, game, turns } = storedOf(review);
    expect(game, `${review}'s game`).toBe(record);
    // The game reviewed from the stored review's results alone, judged by move
    await storeReview(page, { judge: "edge" }, { results: readStored(file).analyses });
    await pasteRecord(page, testRecord(turns, game));
    await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: 120_000 });
    const labels = await reviewLabels(page);

    const frames = REPLAY.scenes[k].frames;
    expect(frames.some(f => f.m.some(m => BAD_LABELS.includes(m.label))),
           "the scene shows a bad move's label").toBe(true);
    frames.forEach((frame, f) => {
      const i = from + f; // the frame's position: the moves of its turn so far are i - 1, and i - 2 when i - 1 is second
      const moves = i === 0 ? [] : turnFromCount(i - 1).first ? [i - 1] : [i - 1, i - 2];
      const shown = moves.map(j => labels[j]).filter(l => l !== null);
      expect(frame.m.map(m => m.label), `the labels of frame ${f + 1}, the position after move ${i}`).toEqual(shown);
    });
  });
}
