// Cyanotype's board editor and the Analysis board's New menu (its design 33, as Hedge School's design 21) on its preview
// (CYANOTYPE_BASE_URL). The editor sets up a position that the engine's rules read, and Analyze opens the board from
// it. A drag with Shift puts cells along it, or removes them. The Import takes a position and the moves from it. A link
// and an analysis file with a set-up start open from it, and a start that the rules refuse leaves the board kept here,
// with a notice. Each way in refuses a komi, which the board does not take yet (design 33, "The komi"), and the review
// refuses a game from a set-up start. The board's engine is off, so nothing
// searches: the engine's rules check what comes in. The positions are Stamp Duty's own (the lab's games,
// apps/cyanotype/src/lib/board/fixtures.json), and each move is one of the engine's legal moves there. Each test opens a
// fresh browser context, so its store starts empty. The tests skip, with a message, when the preview has no engine
// files. Run: npx playwright test tests/cyanotype-editor.spec.ts, with CYANOTYPE_BASE_URL.
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { boardLink } from "../../cyanotype/src/lib/game/board.ts";
import { writePosition } from "../../cyanotype/src/lib/game/position.ts";
import type { SitePosition } from "../../cyanotype/src/lib/board/position.ts";
import { EDITOR_KEY, ENGINE_KEY } from "../../cyanotype/src/lib/site.ts";
import { CYANOTYPE, LITE, noReview } from "./cyanotype-review.ts";

const fixtures = JSON.parse(readFileSync("../cyanotype/src/lib/board/fixtures.json", "utf8")).fixtures as
  { name: string; moves: string[]; position: SitePosition; legal: string[] }[];
const middle = fixtures.find(f => f.name === "A middle game")!; // Red's first move of turn 6, after 9 moves
const MIDDLE = writePosition(middle.position);
const MOVE = middle.legal[0]; // a legal move there, from the engine

const at = (path: string) => new URL(path, CYANOTYPE).href;
/** The board kept in this browser (the `branches` store, under `board`), or null. */
const keptBoard = (page: Page) => page.evaluate(() => new Promise<{ main: string[]; start?: string } | null>((resolve, reject) => {
  const open = indexedDB.open("learn-enclosure");
  open.onerror = () => reject(open.error);
  open.onsuccess = () => {
    if (!open.result.objectStoreNames.contains("branches")) { open.result.close(); resolve(null); return; }
    const get = open.result.transaction("branches", "readonly").objectStore("branches").get("board");
    get.onsuccess = () => { open.result.close(); resolve(get.result ?? null); };
    get.onerror = () => reject(get.error);
  };
}));
/** The board kept here once it opens: its start and its main line. A page that loads again meanwhile (a file loaded,
 *  the Import) has no store to read until it is back: the poll then asks again. */
const expectBoard = (page: Page, start: string | undefined, main: string[]) =>
  expect.poll(async () => {
    try {
      const b = await keptBoard(page);
      return b && { start: b.start, main: b.main };
    } catch {
      return "the page loads again";
    }
  }, { timeout: 120_000 }).toEqual({ start, main });
/** Opens the New menu's way `name`. */
async function newMenu(page: Page, name: string | RegExp) {
  await page.getByRole("button", { name: "New", exact: true }).click({ timeout: 120_000 });
  await page.getByRole("menuitem", { name }).click();
}

test.beforeEach(async ({ page }) => {
  const skip = await noReview(page);
  test.skip(!!skip, skip);
  // The engine off on the board: it searches nothing.
  await page.addInitScript(([key, settings]) => localStorage.setItem(key, settings), [ENGINE_KEY, JSON.stringify({ ...LITE, on: false })]);
});

test("the editor: a position set up by hand, read by the engine's rules, and Analyze opens the board from it", async ({ page }) => {
  await page.goto(at("/editor"));
  const status = page.getByRole("status").filter({ hasText: "engine" });
  await expect(status).toHaveText("The engine accepts this position. It does not examine if a game can get to it.", { timeout: 120_000 });
  // A position pasted in the field
  const field = page.getByLabel("Position, in the notation");
  await field.fill(MIDDLE);
  await field.press("Enter");
  await expect(page.getByLabel("Moves played")).toHaveValue("9");
  expect(await page.evaluate(k => localStorage.getItem(k), EDITOR_KEY)).toBe(MIDDLE);
  // A Blue wall put on a hex of the board, then a Red one with the right button there: Red's wall replaces Blue's
  await page.getByRole("radio", { name: "Wall" }).click();
  const board = page.locator(".field").first(), box = (await board.boundingBox())!;
  const point = { x: box.width * 0.04, y: box.height * 0.04 }; // in the fit's margin: no cell there
  await board.click({ position: point });
  await expect(field).not.toHaveValue(MIDDLE);
  const blue = await field.inputValue();
  expect(blue.split(" ")[0].split(";").filter(c => c.endsWith("w")).length)
    .toBe(MIDDLE.split(" ")[0].split(";").filter(c => c.endsWith("w")).length + 1);
  await board.click({ position: point, button: "right" });
  await expect(field).not.toHaveValue(blue);
  const red = await field.inputValue();
  expect(red.split(" ")[0]).toBe(MIDDLE.split(" ")[0]); // Blue's cells as before
  await expect(status).toHaveText(/The engine accepts this position/, { timeout: 60_000 });
  // Red to play from 9 moves: Red's first move of turn 6 stays; Blue to play goes on to move 11
  await page.getByRole("radio", { name: "Blue to play" }).click();
  await expect(page.getByLabel("Moves played")).toHaveValue("11");
  const made = await field.inputValue();
  await page.getByRole("button", { name: "Analyze" }).click();
  await page.waitForURL(url => url.pathname === "/analysis" && !url.hash, { timeout: 60_000 });
  await expectBoard(page, made, []);
  await expect(page.getByRole("alert")).toHaveCount(0);
  // The New menu's board editor starts from the position on screen
  await newMenu(page, /Board editor/);
  await page.waitForURL(url => url.pathname === "/editor", { timeout: 60_000 });
  await expect(page.getByLabel("Position, in the notation")).toHaveValue(made);
});

test("the editor: a drag with Shift puts a cell on each hex that it passes, and one from a filled hex removes them", async ({ page }) => {
  await page.goto(at("/editor"));
  const status = page.getByRole("status").filter({ hasText: "engine" });
  await expect(status).toHaveText(/The engine accepts this position/, { timeout: 120_000 });
  const field = page.getByLabel("Position, in the notation"), start = await field.inputValue(); // the standard start
  const cells = (text: string, player: 0 | 1) => { const f = text.split(" ")[player]; return f === "-" ? [] : f.split(";"); };
  // A row in the fit's margin, with no cell: from 10% to 60% of the field's width
  const box = (await page.locator(".field").first().boundingBox())!;
  const from = { x: box.x + box.width * 0.1, y: box.y + box.height * 0.06 }, to = { x: box.x + box.width * 0.6, y: from.y };
  async function drag(shift: boolean, button: "left" | "right" = "left") {
    if (shift) await page.keyboard.down("Shift");
    await page.mouse.move(from.x, from.y);
    await page.mouse.down({ button });
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up({ button });
    if (shift) await page.keyboard.up("Shift");
  }
  // Blue's Normal cells along the drag
  await drag(true);
  await expect(field).not.toHaveValue(start);
  const put = await field.inputValue(), added = cells(put, 0).filter(c => !cells(start, 0).includes(c));
  expect(added.length).toBeGreaterThanOrEqual(4);
  expect(added.every(c => /^-?\d+,-?\d+$/.test(c)), added.join(";")).toBe(true); // Normal cells: no letter
  expect(cells(put, 1)).toEqual(cells(start, 1));
  await expect(status).toHaveText(/The engine accepts this position/, { timeout: 60_000 });
  // The same drag again: its first hex has Blue's Normal cell, so it removes each one
  await drag(true);
  await expect(field).toHaveValue(start);
  // With the right button, Red's cells. Then a drag without Shift moves the view, and puts no cell.
  await drag(true, "right");
  await expect(field).not.toHaveValue(start);
  const red = await field.inputValue();
  expect(cells(red, 1).length - cells(start, 1).length).toBe(added.length);
  expect(cells(red, 0)).toEqual(cells(start, 0));
  await drag(false);
  await expect(field).toHaveValue(red);
});

test("the editor: a right-button drag opens no menu, also when it ends off the board", async ({ page }) => {
  await page.goto(at("/editor"));
  await expect(page.getByRole("status").filter({ hasText: "engine" })).toHaveText(/The engine accepts this position/, { timeout: 120_000 });
  // Each contextmenu event, and whether the page cancelled it, read once the event has gone to every listener
  await page.evaluate(() => {
    const w = window as unknown as { menus: boolean[] };
    w.menus = [];
    window.addEventListener("contextmenu", e => setTimeout(() => w.menus.push(e.defaultPrevented)));
  });
  const box = (await page.locator(".field").first().boundingBox())!;
  const panel = (await page.getByRole("heading", { name: "Board editor" }).boundingBox())!;
  for (const shift of [true, false]) {
    if (shift) await page.keyboard.down("Shift");
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.06);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(panel.x + panel.width / 2, panel.y + panel.height / 2, { steps: 8 });
    await page.mouse.up({ button: "right" });
    if (shift) await page.keyboard.up("Shift");
  }
  const menus = await page.evaluate(() => (window as unknown as { menus: boolean[] }).menus);
  expect(menus.length).toBeGreaterThan(0);
  expect(menus.every(cancelled => cancelled), JSON.stringify(menus)).toBe(true);
});

test("the editor says what the engine's rules refuse, and Analyze waits", async ({ page }) => {
  await page.goto(at("/editor"));
  const field = page.getByLabel("Position, in the notation");
  const fields = MIDDLE.split(" ");
  fields[2] = fields[2].replace(/;[^;|]+$/, ""); // Blue's blueprint 3 without its last cell: 20 cells
  await field.fill(fields.join(" "));
  await field.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "engine" }))
    .toHaveText("The engine cannot read this position: Blue's blueprints hold 20 cells, not 21.", { timeout: 120_000 });
  await expect(page.getByRole("button", { name: "Analyze" })).toBeDisabled();
});

test("the Import: a position and the moves from it, then a position alone", async ({ page }) => {
  await page.goto(at("/analysis"));
  await newMenu(page, /Import a position or moves/);
  const dialog = page.getByRole("dialog", { name: "Import a position or moves" });
  await dialog.getByLabel("Position").fill(MIDDLE);
  await dialog.getByLabel("Moves").fill("1. 2@99,99");
  await dialog.getByRole("button", { name: "Import" }).click();
  await expect(dialog.getByRole("alert")).toHaveText(/turn 1\. where the notation gives turn 6\./, { timeout: 120_000 });
  await dialog.getByLabel("Moves").fill(MOVE);
  await dialog.getByRole("button", { name: "Import" }).click();
  await expectBoard(page, MIDDLE, [MOVE]);
  await expect(page.getByRole("alert")).toHaveCount(0);
  // A position alone replaces the board, after the board asks
  await newMenu(page, /Import a position or moves/);
  await dialog.getByLabel("Position").fill(writePosition(fixtures.find(f => f.name === "A capture")!.position));
  await dialog.getByRole("button", { name: "Import" }).click();
  await page.getByRole("button", { name: "Replace it" }).click({ timeout: 120_000 });
  await expectBoard(page, writePosition(fixtures.find(f => f.name === "A capture")!.position), []);
});

test("a link with a set-up start opens from it", async ({ page }) => {
  await page.goto(boardLink(CYANOTYPE!, { version: 2, main: [MOVE], nodes: [[MOVE, -1]], start: MIDDLE }, 1));
  await expectBoard(page, MIDDLE, [MOVE]);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a link whose start the engine's rules refuse leaves the board kept here, with a notice", async ({ page }) => {
  const fields = MIDDLE.split(" ");
  fields[2] = fields[2].replace(/;[^;|]+$/, "");
  await page.goto(boardLink(CYANOTYPE!, { version: 2, main: [], nodes: [], start: fields.join(" ") }, 0));
  await expect(page.getByRole("alert")).toHaveText(/^The Analysis board cannot load this link: .*20 cells, not 21\. Your own analysis is here instead\.$/,
                                                   { timeout: 120_000 });
  expect((await keptBoard(page))?.start).toBeUndefined();
});

test("an analysis file with a set-up start loads from it", async ({ page }) => {
  await page.goto(at("/analysis"));
  const file = { format: "cyanotype-analysis", version: 1, exported: "2026-11-07T00:00:00.000Z", site: "test",
                 board: { version: 2, main: [MOVE], nodes: [[MOVE, -1]], start: MIDDLE }, analyses: [] };
  await page.getByRole("button", { name: "New", exact: true }).click({ timeout: 120_000 });
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("menuitem", { name: /Load an analysis file/ }).click();
  await (await chooser).setFiles({ name: "analysis.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) });
  await expectBoard(page, MIDDLE, [MOVE]);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("the Import, a link and an analysis file with a komi: the board says that it analyzes only at komi 0", async ({ page }) => {
  const komi0 = "The Analysis board can analyze only at komi 0.";
  // The Import: a record from a set-up start, with a Komi tag. The dialog says why, and the board stays.
  await page.goto(at("/analysis"));
  await newMenu(page, /Import a position or moves/);
  const dialog = page.getByRole("dialog", { name: "Import a position or moves" });
  await dialog.getByLabel("Position").fill(MIDDLE);
  await dialog.getByLabel("Moves").fill(`[Komi "300"]\n\n${MOVE} *`);
  await dialog.getByRole("button", { name: "Import" }).click();
  await expect(dialog.getByRole("alert")).toHaveText(`Cyanotype cannot open these moves: the record has a komi. ${komi0}`,
                                                     { timeout: 120_000 });
  await page.keyboard.press("Escape");
  // A link and an analysis file from a set-up start, at a komi
  const board = { version: 2 as const, main: [MOVE], nodes: [[MOVE, -1]] as [string, number][], start: MIDDLE, komi: 300 };
  await page.goto("about:blank"); // else the link changes only the address's hash, and the board does not read it
  await page.goto(boardLink(CYANOTYPE!, board, 1));
  await expect(page.getByRole("alert")).toHaveText(
    `The Analysis board cannot load this link: it has a komi. ${komi0} Your own analysis is here instead.`, { timeout: 120_000 });
  const file = { format: "cyanotype-analysis", version: 1, exported: "2026-11-07T00:00:00.000Z", site: "test", board, analyses: [] };
  await page.getByRole("button", { name: "New", exact: true }).click({ timeout: 120_000 });
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("menuitem", { name: /Load an analysis file/ }).click();
  await (await chooser).setFiles({ name: "analysis.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) });
  await expect(page.getByRole("alert")).toHaveText(`The Analysis board cannot load this file: it has a komi. ${komi0}`);
  expect((await keptBoard(page))?.start).toBeUndefined();
  // The editor's field takes a position, which has no komi: a record there is no position
  await page.goto(at("/editor"));
  const field = page.getByLabel("Position, in the notation");
  await field.fill(`[Komi "300"] ${MIDDLE}`);
  await field.press("Enter");
  await expect(page.getByRole("alert")).toHaveText(/^a position has seven fields/);
});

test("the review refuses a game from a set-up start, and says where it opens", async ({ page }) => {
  await page.goto(at(`/review#${new URLSearchParams({ record: `[Position "${MIDDLE}"]\n\n${MOVE} *` })}`));
  await expect(page.getByRole("alert")).toHaveText("This game starts from another position. Cyanotype reviews games from the "
    + "standard start only: open it on the Analysis board.", { timeout: 120_000 });
});
