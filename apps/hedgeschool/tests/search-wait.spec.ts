// A move that the player asked to evaluate, with no label yet (design 07, item 11), with the engine off: no search can
// run, so the move says "Not analyzed yet" and why, and shows no pulsing "…". The unit test of the rule is
// packages/review/src/searchWait.test.ts, which also holds the states where a search can run ("Evaluating…"): the
// browser tests keep the engine off. On the Analysis board, a link with the main line's first move and a variation of
// three moves (the first turn's other move, then a turn of two), each evaluated. In a review, the same variation, with
// "Review for" set to Blue: Red's moves show no wait, by edge and by turn.
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { boardLink } from "../src/lib/game/board.ts";
import { fileInput } from "./review-file.ts";

test.describe.configure({ timeout: 120_000 });

const OFF = "Not analyzed yet. The engine is off. To evaluate this move, set the engine switch to on.";
const board = {
  version: 2 as const, main: [],
  nodes: [["A10-D9", 0, 1], ["A10-D9 N11-Q10", 0], ["A10-D9 N11-Q10 K9-N11", 0],
          ["D10-G12", 1, 1], ["D10-G12 N11-Q10", 0, 1], ["D10-G12 N11-Q10 K9-N11", 0, 1]] as [string, number, 1?][],
};
/** The review's variation: the same moves, the first in the place of the game's A10-D9. */
const variation: [string, number, 1][] = [["D10-G12", 0, 1], ["D10-G12 N11-Q10", 0, 1],
                                          ["D10-G12 N11-Q10 K9-N11", 0, 1]];

/** Sets the consent, the engine off and the display settings before the page loads. */
function settings(page: Page, display: Record<string, string>) {
  return page.addInitScript(([d]) => {
    localStorage.setItem("hedge-school:consent:2", JSON.stringify({ analytics: "denied", games: "denied" }));
    localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false }));
    localStorage.setItem("learn-enclosure:review-display:1", JSON.stringify(d));
  }, [display]);
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
    await page.goto("/review");
    await fileInput(page).and(page.locator("[data-ready]")).setInputFiles({
      name: "search-wait-review.json", mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ ...file, branches: { version: 2, nodes: variation } })),
    });
    await page.waitForURL(/#game=/);
    await expect(page.locator("main.review")).not.toHaveAttribute("aria-busy", { timeout: 60_000 });
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
