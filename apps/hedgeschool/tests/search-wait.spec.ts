// A move that the player asked to evaluate, with no label yet (design 07, item 11), on the Analysis board with the engine
// off: no search can run, so the move says "Not analyzed yet" and why, and shows no pulsing "…". The unit test of the rule
// is packages/review/src/searchWait.test.ts, which also holds the states where a search can run ("Evaluating…"): the
// browser tests keep the engine off. The board is a link with the main line's first move and a variation of three moves
// (the first turn's other move, then a turn of two), each evaluated.
import { expect, test, type Page } from "@playwright/test";
import { boardLink } from "../src/lib/game/board.ts";

const OFF = "Not analyzed yet. The engine is off. Turn it on to evaluate this move.";
const board = {
  version: 2 as const, main: [],
  nodes: [["A10-D9", 0, 1], ["A10-D9 N11-Q10", 0], ["A10-D9 N11-Q10 K9-N11", 0],
          ["D10-G12", 1, 1], ["D10-G12 N11-Q10", 0, 1], ["D10-G12 N11-Q10 K9-N11", 0, 1]] as [string, number, 1?][],
};

async function open(page: Page, unit: "edge" | "turn") {
  await page.addInitScript(([judge]) => {
    localStorage.setItem("hedge-school:consent:2", JSON.stringify({ analytics: "denied", games: "denied" }));
    localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false }));
    localStorage.setItem("learn-enclosure:review-display:1", JSON.stringify({ judge, branchForm: "text" }));
  }, [unit]);
  await page.goto(boardLink("", board, 0));
  await expect(page.locator("button.mv[data-path]").first()).toBeVisible({ timeout: 60_000 });
}

/** The titles that say the engine is off, by the path of the move or the turn's cell that holds them. */
const asked = (page: Page) => page.locator(`[title^="${OFF}"]`);
const title = (page: Page, path: string) => page.locator(`button.mv[data-path="${path}"]`).getAttribute("title");

test("by edge: with the engine off, every evaluated move with no label says why, and none pulses", async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, "edge");
  for (const path of ["A10-D9", "D10-G12", "D10-G12 N11-Q10", "D10-G12 N11-Q10 K9-N11"])
    expect(await title(page, path), path).toContain(OFF);
  expect(await title(page, "A10-D9 N11-Q10"), "a move that was not asked for").not.toContain("Not analyzed yet");
  await expect(asked(page)).toHaveCount(4);
  await expect(page.locator(".animate-pulse")).toHaveCount(0);
  await expect(page.getByText("Evaluating…")).toHaveCount(0);
});

test("by turn: the same texts, on the turn that ends in each evaluated move", async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, "turn");
  // The variation's turns end in D10-G12 and K9-N11, and the game's first turn in A10-D9: its cell holds the text.
  for (const path of ["D10-G12", "D10-G12 N11-Q10 K9-N11"]) expect(await title(page, path), path).toContain(OFF);
  expect(await title(page, "D10-G12 N11-Q10"), "the middle of a turn").toBeNull();
  await expect(asked(page)).toHaveCount(3);
  await expect(page.locator(".animate-pulse")).toHaveCount(0);
  await expect(page.getByText("Evaluating…")).toHaveCount(0);
});
