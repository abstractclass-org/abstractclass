// The player's notes on Hedge School's board (design 07, item 16), on Practice with a game in progress: a right-click
// rings a point and a right drag draws a line to another, as Lichess draws circles and arrows. The keys held choose
// the colour by Hedge School's keys (BRUSH_KEYS in packages/review/src/notes.ts): purple with no key, yellow with Shift
// or Ctrl, green with Alt, grey with both. The same note again removes it, and in another colour changes its colour. A
// line drawn the other way is the same line: it has no head. A left click on the board clears the position's notes.
// The notes stay with their position for the visit. Cyanotype's notes are in cyanotype-notes.spec.ts. Run: npx
// playwright test tests/notes.spec.ts.
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { rightClick, rightDrag } from "./cyanotype-notes.ts";

const board = (page: Page) => page.locator("svg[aria-label='Enclosure board']");
/** The point of the window at a point (x, y) of the board (or past its edge), by the board's drawing's own transform:
 *  the drawing has y down, from 18 at the board's foot. */
const at = (page: Page, x: number, y: number) => board(page).evaluate((svg: SVGSVGElement, [x, y]) => {
  const p = new DOMPoint(x, 18 - y).matrixTransform(svg.getScreenCTM()!);
  return { x: p.x, y: p.y };
}, [x, y]);
/** The notes on the board, each as its colour and its points, "x,y". */
const notesOn = (page: Page) => board(page).locator(".note-ring, .note-line").evaluateAll(es => es.map(e => {
  const brush = ["purple", "yellow", "green", "grey"].find(c => e.classList.contains(c)) ?? "";
  const point = (x: string, y: string) => `${e.getAttribute(x)},${18 - Number(e.getAttribute(y))}`;
  return e.classList.contains("note-ring") ? { brush, at: point("cx", "cy") }
    : { brush, at: point("x1", "y1"), to: point("x2", "y2") };
}));

test("Practice: a ring, a line, the colours, the same note again, and the notes by position", async ({ page }) => {
  await page.setViewportSize({ width: 1376, height: 952 });
  // A game in progress, kept in this browser, the player to move: the fixture's first 20 edges, as the layout test
  // opens Practice, so that the bot does not search. The visitor has answered the consent notice.
  const moves = (JSON.parse(readFileSync("tests/fixtures/hedgefund-review.json", "utf8")).record as string)
    .replace(/\[[^\]]*\]/g, "").split(/\s+/).filter(t => /^[A-T]\d+-[A-T]\d+$/.test(t)).slice(0, 20);
  await page.goto("/practice");
  await page.evaluate(kept => {
    localStorage.setItem("hedge-school:consent:2", JSON.stringify({ games: "denied" }));
    localStorage.setItem("hedge-school:practice-game:1", JSON.stringify(kept));
  }, { version: 1, bot: { network: "b10c128-s66625408-d13350730", visits: 64, variety: "low" }, human: 0, name: "",
       seed: 1, moves, builds: [], started: new Date().toISOString() });
  await page.reload();
  await expect(page.locator(".mv").first()).toBeVisible({ timeout: 120_000 });
  await expect(board(page)).toBeVisible();
  // The browser's own menu does not open on the board: the board's handler has prevented it by the time the event
  // reaches the window
  await page.evaluate(() => addEventListener("contextmenu", e => {
    const w = window as unknown as { menus?: boolean[] };
    w.menus = [...(w.menus ?? []), e.defaultPrevented];
  }));

  // A ring, then a line from the ring's point
  await rightClick(page, await at(page, 5, 9));
  await expect.poll(() => notesOn(page)).toEqual([{ brush: "purple", at: "5,9" }]);
  await rightDrag(page, await at(page, 5, 9), await at(page, 11, 9));
  const ab = { brush: "purple", at: "5,9", to: "11,9" };
  await expect.poll(() => notesOn(page)).toEqual([{ brush: "purple", at: "5,9" }, ab]);
  expect(await page.evaluate(() => (window as unknown as { menus: boolean[] }).menus)).toEqual([true, true]);
  // The same ring again, in the same colour, removes it. The line drawn the other way is the same line: in another
  // colour, it changes the line's colour, and in the same colour it removes it.
  await rightClick(page, await at(page, 5, 9));
  await expect.poll(() => notesOn(page)).toEqual([ab]);
  await rightDrag(page, await at(page, 11, 9), await at(page, 5, 9), ["Control"]);
  await expect.poll(() => notesOn(page)).toEqual([{ brush: "yellow", at: "11,9", to: "5,9" }]);
  await rightDrag(page, await at(page, 5, 9), await at(page, 11, 9), ["Shift"]);
  await expect.poll(() => notesOn(page)).toEqual([]);

  // Each colour by its keys: none, Shift or Ctrl, Alt, and Shift or Ctrl with Alt
  const colours: [string, string[]][] = [["purple", []], ["yellow", ["Shift"]], ["yellow", ["Control"]],
    ["green", ["Alt"]], ["grey", ["Shift", "Alt"]], ["grey", ["Control", "Alt"]]];
  for (const [i, [brush, keys]] of colours.entries()) {
    await rightClick(page, await at(page, 3 + 2 * i, 13), keys);
    await expect.poll(async () => (await notesOn(page)).at(-1)).toEqual({ brush, at: `${3 + 2 * i},13` });
  }
  const rings = await notesOn(page);
  expect(rings.map(n => n.brush)).toEqual(colours.map(([brush]) => brush));

  // Another position has its own notes, and the position's come back
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.()); // the page takes the keys
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => notesOn(page)).toEqual([]);
  await rightDrag(page, await at(page, 9, 4), await at(page, 13, 4), ["Alt"]);
  const line = [{ brush: "green", at: "9,4", to: "13,4" }];
  await expect.poll(() => notesOn(page)).toEqual(line);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => notesOn(page)).toEqual(rings);
  // A left click on the board, past the points, clears the position's notes, and the other position's stay
  const edge = await at(page, -1, -1);
  await page.mouse.click(edge.x, edge.y);
  await expect.poll(() => notesOn(page)).toEqual([]);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => notesOn(page)).toEqual(line);
});
