// The player's notes on Drawing Board's board (its design 33, "The player's notes"), for the browser tests: a marked
// hex by a right-click, an arrow by a right drag, the marks of a right drag with Shift, each colour by the keys held
// (Drawing Board's: Ctrl, Alt or both).
import { expect, type Page } from "@playwright/test";
import { center, type Hex } from "../../drawingboard/src/lib/board/hex.ts";
import { DRAWING_BOARD, testRecord } from "./drawingboard-review.ts";

/** The board's field: the board without its hands. */
export const field = (page: Page) => page.locator(".board .field");
/** The Analysis board on the review's test game after move `at`, with the engine off: no candidates under a click. */
export async function analysisAt(page: Page, at: number) {
  await page.addInitScript(() => localStorage.setItem("drawing-board:engine:1", JSON.stringify({ on: false })));
  await page.goto(new URL(`/analysis#record=${encodeURIComponent(testRecord())}&at=${at}`, DRAWING_BOARD).href);
  await expect(page.locator("main.review")).not.toHaveAttribute("aria-busy", { timeout: 120_000 });
  await expect(field(page)).toBeVisible();
}
/** The notes on the board, each as its colour and its kind. */
export const notesOn = (page: Page) => field(page).locator("g.note").evaluateAll(gs => gs.map(g => ({
  brush: (g as SVGGElement).dataset.brush ?? "",
  kind: g.querySelector(".note-arrow") ? "arrow" : g.querySelector(".note-ring") ? "hex" : "",
})));
/** How many hexes are marked in each colour. */
export async function marksOn(page: Page) {
  const count: Record<string, number> = { purple: 0, yellow: 0, green: 0, grey: 0 };
  for (const n of await notesOn(page)) if (n.kind === "hex") count[n.brush]++;
  return count;
}
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
/** The hex under the field's middle. */
export async function middleHex(page: Page): Promise<Hex> {
  const [q, r] = (await hexUnder(page, await spot(page))).split(",").map(Number);
  return [q, r];
}
/** The point of the window at a hex's centre, by the board's drawing's own transform. */
export const hexSpot = (page: Page, h: Hex) =>
  field(page).locator("svg[aria-label='Blueprints board']").evaluate((svg: SVGSVGElement, [x, y]) => {
    const p = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()!);
    return { x: p.x, y: p.y };
  }, center(h));
/** The keys held while a note is drawn. */
async function holding(page: Page, keys: string[], draw: () => Promise<void>) {
  for (const k of keys) await page.keyboard.down(k);
  await draw();
  for (const k of keys.toReversed()) await page.keyboard.up(k);
}
/** A right drag from a point of the window to another, with keys held: on Drawing Board's board an arrow, or with
 *  Shift the marks of the hexes that it goes across, and on Hedge School's a line (notes.spec.ts). */
export const rightDrag = (page: Page, a: { x: number; y: number }, b: { x: number; y: number }, keys: string[] = []) =>
  holding(page, keys, async () => {
    await page.mouse.move(a.x, a.y);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(b.x, b.y, { steps: 6 });
    await page.mouse.up({ button: "right" });
  });
/** A right-click at a point: a marked hex, or on Hedge School's board a ring. */
export const rightClick = (page: Page, p: { x: number; y: number }, keys: string[] = []) => rightDrag(page, p, p, keys);
/** The colours, each with the keys that choose it (Drawing Board's: purple with no key, yellow with Ctrl, green with
 *  Alt, grey with both). */
export const BRUSHES: [string, string[]][] = [["purple", []], ["yellow", ["Control"]], ["green", ["Alt"]], ["grey", ["Control", "Alt"]]];

/** In each colour, the marks of a right drag with Shift along a row of four hexes, and an arrow beside them, about the
 *  field's middle: the screenshots' notes, and the layout test's. */
export async function drawEach(page: Page) {
  const [q, r] = await middleHex(page);
  for (const [i, [, keys]] of BRUSHES.entries()) {
    const row = r - 3 + 2 * i;
    await rightDrag(page, await hexSpot(page, [q - 4, row]), await hexSpot(page, [q - 1, row]), ["Shift", ...keys]);
    await rightDrag(page, await hexSpot(page, [q + 1, row]), await hexSpot(page, [q + 3, row - 1]), keys);
  }
}
