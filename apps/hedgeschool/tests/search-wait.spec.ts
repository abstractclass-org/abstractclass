// A move that the player asked to evaluate, with no label yet (design 07, item 11), with the engine off: no search can
// run, so the move says "Not analyzed yet" and why, and shows no pulsing "…". The unit test of the rule is
// packages/review/src/searchWait.test.ts, which also holds the states where a search can run ("Evaluating…"). On the
// Analysis board, a link with the main line's first move and a variation of three moves (the first turn's other move,
// then a turn of two), each evaluated. In a review, the same variation, with "Review for" set to Blue: Red's moves show
// no wait, by edge and by turn. The last case turns the engine on, on the CPU, and fails one move's search. Only that
// move says that the engine has an error, and the panel says the engine's error. A new search of its position clears
// both (GameAnalysis.judgeFailed and engineError). No position of the game makes the engine fail by itself. So the
// page's Worker gives the engine's error reply to the first search of that position, and that search never reaches
// the engine (failFirstSearch).
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "./page-log.ts";
import { boardLink } from "../src/lib/game/board.ts";
import type { KeptBoard } from "../../../packages/analysis/src/kept.ts";
import { openReviewFile } from "./review-file.ts";
import { keepBefore } from "./keep-before.ts";
import { CONSENT_KEY, DISPLAY_KEY, ENGINE_KEY } from "../src/lib/keys.ts";

test.describe.configure({ timeout: 120_000 });

const OFF = "Not analyzed yet. The engine is off. To evaluate this move, set the engine switch to on.";
const board: KeptBoard = {
  version: 2, main: [],
  nodes: [["A10-D9", 0, 1], ["A10-D9 N11-Q10", 0], ["A10-D9 N11-Q10 K9-N11", 0],
          ["D10-G12", 1, 1], ["D10-G12 N11-Q10", 0, 1], ["D10-G12 N11-Q10 K9-N11", 0, 1]],
};
/** The review's variation: the same moves, the first in the place of the game's A10-D9. */
const variation: [string, number, 1][] = [["D10-G12", 0, 1], ["D10-G12 N11-Q10", 0, 1],
                                          ["D10-G12 N11-Q10 K9-N11", 0, 1]];

/** Sets the consent, the engine off and the display settings before the page loads. */
async function settings(page: Page, display: Record<string, string>) {
  await keepBefore(page, CONSENT_KEY, { games: "denied" });
  await keepBefore(page, ENGINE_KEY, { on: false });
  await keepBefore(page, DISPLAY_KEY, display);
}

async function open(page: Page, unit: "edge" | "turn") {
  await settings(page, { judge: unit, branchForm: "text" });
  await page.goto(boardLink("", board, 0));
  await expect(page.locator("button.mv[data-path]").first()).toBeVisible({ timeout: 60_000 });
}

/** The titles that say the engine is off, by the path of the move or the turn's cell that holds them. */
const offTitles = (page: Page) => page.locator(`[title^="${OFF}"]`);
const title = (page: Page, path: string) => page.locator(`button.mv[data-path="${path}"]`).getAttribute("title");
/** Nothing pulses, and no title says "Evaluating…": the text shows only in titles. */
async function noWait(page: Page) {
  await expect(page.locator(".animate-pulse")).toHaveCount(0);
  await expect(page.locator('[title*="Evaluating"]')).toHaveCount(0);
}

test("by edge: with the engine off, every evaluated move with no label says why, and none pulses", async ({ page }) => {
  await open(page, "edge");
  for (const path of ["A10-D9", "D10-G12", "D10-G12 N11-Q10", "D10-G12 N11-Q10 K9-N11"])
    expect(await title(page, path), path).toContain(OFF);
  expect((await title(page, "A10-D9 N11-Q10")) ?? "", "a move that was not asked for")
    .not.toContain("Not analyzed yet");
  await expect(offTitles(page)).toHaveCount(4);
  await noWait(page);
});

test("by turn: the same texts, on the turn that ends in each evaluated move", async ({ page }) => {
  await open(page, "turn");
  // The variation's turns end in D10-G12 and K9-N11, and the game's first turn in A10-D9: its cell holds the text.
  for (const path of ["D10-G12", "D10-G12 N11-Q10 K9-N11"]) expect(await title(page, path), path).toContain(OFF);
  expect(await title(page, "D10-G12 N11-Q10"), "the middle of a turn").toBeNull();
  await expect(offTitles(page)).toHaveCount(3);
  await noWait(page);
});

for (const unit of ["edge", "turn"] as const) {
  test(`in a review by ${unit}, "Review for" Blue hides the wait of Red's evaluated moves`, async ({ page }) => {
    await settings(page, { judge: unit, branchForm: "text", reviewFor: "blue" });
    const file = JSON.parse(readFileSync("tests/fixtures/hedgefund-review.json", "utf8"));
    await openReviewFile(page, {
      name: "search-wait-review.json", mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ ...file, branches: { version: 2, nodes: variation } })),
    }, { ready: 60_000 });
    // At Playwright's 1,280 pixels, the Analysis has its own column: the tabs come below 1,260.
    await expect(page.locator('button.mv[data-path="D10-G12"]')).toBeVisible();
    // Blue's D10-G12 is a turn of one edge: by edge and by turn, it says why. Red's turn of two says nothing.
    expect(await title(page, "D10-G12")).toContain(OFF);
    for (const path of ["D10-G12 N11-Q10", "D10-G12 N11-Q10 K9-N11"])
      expect((await title(page, path)) ?? "", path).not.toContain("Not analyzed yet");
    await expect(offTitles(page)).toHaveCount(1);
    await noWait(page);
  });
}

const ERROR = "Not analyzed yet. The engine has an error.";

/** Makes the page's first search of the position after `moves` fail with the engine's error reply: the request never
 *  reaches the engine worker. Every later search of the position runs. */
const failFirstSearch = (page: Page, moves: string[]) => page.addInitScript(target => {
  let failed = false;
  const Real = window.Worker;
  window.Worker = class extends Real {
    postMessage(message: unknown, options?: Transferable[] | StructuredSerializeOptions) {
      const m = message as { id: number; request?: { maxVisits?: number; moves?: string[] } };
      if (!failed && m.request?.maxVisits && m.request.moves?.join(" ") === target) {
        failed = true;
        // The engine's error reply, as the worker sends it (packages/engine/src/worker.ts, and channel.ts's
        // searchInSlices, which sends the search as `q` and the message's id): the channel's message keeps that id too.
        const reply = { id: `q${m.id}`, error: "the test failed this search" };
        const data = { type: "reply", id: m.id, reply, ms: 0, memory: 0 };
        setTimeout(() => this.dispatchEvent(new MessageEvent("message", { data })));
        return;
      }
      // Both of Worker's forms, as in cyanotype-home.spec.ts: the if only picks super's overload for each form.
      if (Array.isArray(options)) super.postMessage(message, options); else super.postMessage(message, options);
    }
  };
}, moves.join(" "));

test("with the engine on, a failed search marks only its own move, until a new search of its position", async ({ page }) => {
  await keepBefore(page, CONSENT_KEY, { games: "denied" });
  await keepBefore(page, ENGINE_KEY, { on: true, review: "lite", gpu: "off" });
  await keepBefore(page, DISPLAY_KEY, { judge: "edge", branchForm: "text", areaMap: { review: false, board: false } });
  await failFirstSearch(page, ["D10-G12"]);
  // The main line's A10-D9 and the variation D10-G12, both evaluated, from the start on screen
  await page.goto(boardLink("", { version: 2, main: [], nodes: [["A10-D9", 0, 1], ["D10-G12", 1, 1]] }, 0));
  await expect(page.locator('button.mv[data-path="D10-G12"]')).toHaveAttribute("title", new RegExp(`^${ERROR}`), { timeout: 180_000 });
  await expect(page.getByRole("alert").filter({ hasText: "Engine error: the test failed this search" })).toBeVisible();
  // The other move's searches run on: it says no error
  expect(await title(page, "A10-D9")).not.toContain(ERROR);
  // The position on screen gets a new search: the move says the error no more
  await page.locator('button.mv[data-path="D10-G12"]').click();
  await expect.poll(() => title(page, "D10-G12"), { timeout: 60_000 }).not.toContain(ERROR);
  // No failure holds: the panel's line goes too (GameAnalysis.engineError)
  await expect(page.getByRole("alert").filter({ hasText: "Engine error:" })).toHaveCount(0);
});
