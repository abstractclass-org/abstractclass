// The player's notes on Drawing Board's board (its design 33, "The player's notes"), on its preview (DB_BASE_URL): on
// the Analysis board with the review's test game (Stamp Duty against itself), and on Practice with a game in progress.
// A right-click marks a hex and a right drag draws an arrow, in each colour by the keys held. The same note again
// removes it, and in another colour changes its colour. The notes stay with their position for the visit, a click on
// the board clears them, and a pan does not. The review's notes are in drawingboard-review.spec.ts, which reviews the
// game once. Without the engine's files the tests skip, with a message. Run: npx playwright test
// tests/drawingboard-notes.spec.ts, with DB_BASE_URL.
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { DRAWING_BOARD, noReview } from "./drawingboard-review.ts";
import { analysisAt, BRUSHES, field, hexUnder, notesOn, rightClick, rightDrag, spot } from "./drawingboard-notes.ts";

test.describe("with the engine's files", () => {
  test.beforeEach(async ({ page }) => {
    const skip = await noReview(page);
    test.skip(!!skip, skip);
  });

  test("the Analysis board: a hex, an arrow, each colour by its key, and the same note again", async ({ page }) => {
    await page.setViewportSize({ width: 1376, height: 952 });
    await analysisAt(page, 10);
    // The browser's own menu does not open on the board: the board's handler (Svelte delegates the event to the app's
    // root) has prevented it by the time the event reaches the window
    await page.evaluate(() => addEventListener("contextmenu", e => {
      const w = window as unknown as { menus?: boolean[] };
      w.menus = [...(w.menus ?? []), e.defaultPrevented];
    }));
    const a = await spot(page, -60, 0), b = await spot(page, 60, 0);
    expect(await hexUnder(page, a)).not.toBe(await hexUnder(page, b));
    await rightClick(page, a);
    await expect.poll(() => notesOn(page)).toEqual([{ brush: "purple", kind: "hex" }]);
    await expect(field(page).locator("path.note-fill.purple")).toHaveCount(1); // the hex's fill, under the cells
    await rightDrag(page, a, b);
    await expect.poll(() => notesOn(page)).toEqual([{ brush: "purple", kind: "hex" }, { brush: "purple", kind: "arrow" }]);
    expect(await page.evaluate(() => (window as unknown as { menus: boolean[] }).menus)).toEqual([true, true]);
    // The same hex again, in the same colour, removes its note. In another colour, it changes the note's colour. The
    // arrow drawn the other way is the same arrow.
    await rightClick(page, a);
    await expect.poll(() => notesOn(page)).toEqual([{ brush: "purple", kind: "arrow" }]);
    await rightDrag(page, b, a, ["Shift"]);
    await expect.poll(() => notesOn(page)).toEqual([{ brush: "yellow", kind: "arrow" }]);
    await rightDrag(page, a, b, ["Shift"]);
    await expect.poll(() => notesOn(page)).toEqual([]);
    // Each colour by its keys: Ctrl as Shift, Alt, both
    for (const [i, [brush, keys]] of [...BRUSHES, ["yellow", ["Control"]] as [string, string[]]].entries()) {
      await rightClick(page, await spot(page, -140 + 70 * i, -90), keys);
      await expect.poll(async () => (await notesOn(page)).at(-1)).toEqual({ brush, kind: "hex" });
    }
    await expect.poll(async () => (await notesOn(page)).length).toBe(5);
  });

  test("the Analysis board: the notes stay with their position, a pan keeps them, and a click clears them", async ({ page }) => {
    await page.setViewportSize({ width: 1376, height: 952 });
    await analysisAt(page, 10);
    await rightClick(page, await spot(page, -60, 0));
    await rightDrag(page, await spot(page, -60, 40), await spot(page, 60, 40), ["Alt"]);
    const drawn = [{ brush: "purple", kind: "hex" }, { brush: "green", kind: "arrow" }];
    await expect.poll(() => notesOn(page)).toEqual(drawn);
    // Another position has its own notes, and the position's come back
    await page.locator("body").click({ position: { x: 2, y: 2 } }); // no control has the focus: the page takes the keys
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => notesOn(page)).toEqual([]);
    await rightClick(page, await spot(page, 0, -60), ["Shift", "Alt"]);
    await expect.poll(() => notesOn(page)).toEqual([{ brush: "grey", kind: "hex" }]);
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => notesOn(page)).toEqual(drawn);
    // A pan keeps them: the board moves, and the notes with it
    const before = await field(page).locator("g.note").first().boundingBox();
    const from = await spot(page, 150, 150);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 50, from.y + 30, { steps: 5 });
    await page.mouse.up();
    await expect.poll(() => notesOn(page)).toEqual(drawn);
    const after = await field(page).locator("g.note").first().boundingBox();
    expect(Math.abs(after!.x - before!.x - 50)).toBeLessThan(2);
    // A click clears the position's notes, and the other position's stay
    await page.mouse.click(from.x, from.y);
    await expect.poll(() => notesOn(page)).toEqual([]);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => notesOn(page)).toEqual([{ brush: "grey", kind: "hex" }]);
    // The keys list gives the colours, with their keys
    await page.keyboard.press("?");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Note colours")).toBeVisible();
    await expect(dialog.getByText("Right-click a hex, or right-drag to another")).toBeVisible();
  });

  test("Practice: the notes stay with their position", async ({ page }) => {
    const manifest = await page.request.get(new URL("/engine/manifest.json", DRAWING_BOARD).href).then(r => r.json()).catch(() => null);
    test.skip(!manifest?.artifacts?.some((a: { kind: string }) => a.kind === "practice-module"),
              "Drawing Board's preview has no practice bot: run `npm run engine` in apps/drawingboard before its build");
    // A game in progress, the player to move: the lab's middle game, as the layout test keeps it
    const fixtures = JSON.parse(readFileSync("../drawingboard/src/lib/board/fixtures.json", "utf8")).fixtures as { name: string; moves: string[] }[];
    const moves = fixtures.find(f => f.name === "A middle game")!.moves; // Red to move
    await page.setViewportSize({ width: 1376, height: 952 });
    await page.goto(new URL("/practice", DRAWING_BOARD).href);
    await page.evaluate(kept => localStorage.setItem("drawing-board:practice-game:1", JSON.stringify(kept)),
      { version: 1, bot: { network: manifest.artifacts.find((a: { kind: string }) => a.kind === "model").id, visits: 32, variety: "low" },
        human: 1, name: "", seed: 1, moves, builds: [], started: new Date().toISOString() });
    await page.reload();
    await expect(page.getByTestId("practice-status")).toHaveText(/^Your turn/, { timeout: 120_000 });
    await rightClick(page, await spot(page, -60, 0), ["Shift"]);
    await rightDrag(page, await spot(page, -60, 40), await spot(page, 60, 40));
    const drawn = [{ brush: "yellow", kind: "hex" }, { brush: "purple", kind: "arrow" }];
    await expect.poll(() => notesOn(page)).toEqual(drawn);
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => notesOn(page)).toEqual([]);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => notesOn(page)).toEqual(drawn);
  });
});
