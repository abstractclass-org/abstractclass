// The player's notes on Drawing Board's board (its design 33, "The player's notes"), for the browser tests: a marked
// hex by a right-click, an arrow by a right drag, each colour by the keys held, as on Hedge School's board.
import { expect, type Page } from "@playwright/test";
import { DRAWING_BOARD, testRecord } from "./drawingboard-review.ts";

/** The board's field: the board without its hands. */
export const field = (page: Page) => page.locator(".board .field");
/** The Analysis board on the review's test game after move `at`, with the engine off: no candidates under a click. */
export async function analysisAt(page: Page, at: number) {
  await page.goto(new URL("/about", DRAWING_BOARD).href);
  await page.evaluate(() => localStorage.setItem("drawing-board:engine:1", JSON.stringify({ on: false })));
  await page.goto(new URL(`/analysis#record=${encodeURIComponent(testRecord())}&at=${at}`, DRAWING_BOARD).href);
  await expect(page.locator("main.review")).not.toHaveAttribute("aria-busy", { timeout: 120_000 });
  await expect(field(page)).toBeVisible();
}
/** The notes on the board, each as its colour and its kind. */
export const notesOn = (page: Page) => field(page).locator("g.note").evaluateAll(gs => gs.map(g => ({
  brush: ["purple", "yellow", "green", "grey"].find(b => g.classList.contains(b)) ?? "",
  kind: g.querySelector("polygon.note-arrow") ? "arrow" : g.querySelector("path.note-ring") ? "hex" : "",
})));
/** A point of the field, `dx` and `dy` pixels from its middle. */
export async function spot(page: Page, dx = 0, dy = 0) {
  const b = (await field(page).boundingBox())!;
  return { x: b.x + b.width / 2 + dx, y: b.y + b.height / 2 + dy };
}
/** The hex under a point of the field, as the board's readout gives it: "q,r". */
export async function hexUnder(page: Page, p: { x: number; y: number }) {
  await page.mouse.move(p.x, p.y);
  return (await field(page).locator("div.font-mono").innerText()).trim();
}
/** The keys held while a note is drawn. */
async function holding(page: Page, keys: string[], draw: () => Promise<void>) {
  for (const k of keys) await page.keyboard.down(k);
  await draw();
  for (const k of keys.toReversed()) await page.keyboard.up(k);
}
/** A right-click at a point: a marked hex. */
export const rightClick = (page: Page, p: { x: number; y: number }, keys: string[] = []) => holding(page, keys, async () => {
  await page.mouse.move(p.x, p.y);
  await page.mouse.down({ button: "right" });
  await page.mouse.up({ button: "right" });
});
/** A right drag from a point to another: an arrow. */
export const rightDrag = (page: Page, a: { x: number; y: number }, b: { x: number; y: number }, keys: string[] = []) =>
  holding(page, keys, async () => {
    await page.mouse.move(a.x, a.y);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(b.x, b.y, { steps: 6 });
    await page.mouse.up({ button: "right" });
  });
/** The colours, each with the keys that choose it (Hedge School's: purple with no key, yellow with Shift or Ctrl, green
 *  with Alt, grey with both). */
export const BRUSHES: [string, string[]][] = [["purple", []], ["yellow", ["Shift"]], ["green", ["Alt"]], ["grey", ["Shift", "Alt"]]];

/** A marked hex and an arrow in each colour, about the field's middle: the screenshots' notes, and the layout test's. */
export async function drawEach(page: Page) {
  for (const [i, [, keys]] of BRUSHES.entries()) {
    const y = (i - 1.5) * 60;
    await rightClick(page, await spot(page, -120, y), keys);
    await rightDrag(page, await spot(page, -40, y), await spot(page, 90, y + 30), keys);
  }
}
