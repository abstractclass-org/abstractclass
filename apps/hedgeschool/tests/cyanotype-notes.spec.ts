// The player's notes on Cyanotype's board (its design 33, "The player's notes"), on its preview (CYANOTYPE_BASE_URL):
// on the Analysis board with the review's test game (Stamp Duty against itself), and on Practice with a game in
// progress. A right-click marks a hex and a right drag draws an arrow, in each colour by the keys held (Cyanotype's:
// Ctrl, Alt or both). The same note again removes it, and in another colour changes its colour. An arrow drawn the
// other way is another arrow. A right drag with Shift marks each hex that it goes across, or clears that colour's marks
// when its first hex has one. The notes stay with their position for the visit, a click on the board clears them, and a
// pan does not. A right-click stays a click while the view fits again under it. Hedge School's notes are in
// notes.spec.ts. The review's notes are in cyanotype-review.spec.ts, which reviews the game once. Without the engine's
// files the tests skip, with a message. Run: npx playwright test tests/cyanotype-notes.spec.ts, with
// CYANOTYPE_BASE_URL.
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { CYANOTYPE, noReview } from "./cyanotype-review.ts";
import { analysisAt, BRUSHES, field, hexSpot, hexUnder, marksOn, middleHex, notesOn, rightClick, rightDrag, spot }
  from "./cyanotype-notes.ts";

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
    await expect(field(page).locator("path.note-fill")).toHaveCount(1); // the hex's fill, under the cells
    await rightDrag(page, a, b);
    await expect.poll(() => notesOn(page)).toEqual([{ brush: "purple", kind: "hex" }, { brush: "purple", kind: "arrow" }]);
    expect(await page.evaluate(() => (window as unknown as { menus: boolean[] }).menus)).toEqual([true, true]);
    // The same hex again, in the same colour, removes its note. In another colour, it changes the note's colour. An
    // arrow drawn the other way is another arrow, as on Lichess.
    await rightClick(page, a);
    await expect.poll(() => notesOn(page)).toEqual([{ brush: "purple", kind: "arrow" }]);
    await rightDrag(page, b, a, ["Control"]);
    const arrows = [{ brush: "purple", kind: "arrow" }, { brush: "yellow", kind: "arrow" }];
    await expect.poll(() => notesOn(page)).toEqual(arrows);
    await rightDrag(page, a, b, ["Control"]);
    await expect.poll(() => notesOn(page)).toEqual([arrows[1], arrows[1]]);
    await rightDrag(page, a, b, ["Control"]);
    await expect.poll(() => notesOn(page)).toEqual([arrows[1]]);
    await rightDrag(page, b, a, ["Control"]);
    await expect.poll(() => notesOn(page)).toEqual([]);
    // Each colour by its keys (none, Ctrl, Alt, both), and Shift alone, which chooses no colour
    for (const [i, [brush, keys]] of [...BRUSHES, ["purple", ["Shift"]] as [string, string[]]].entries()) {
      await rightClick(page, await spot(page, -140 + 70 * i, -90), keys);
      await expect.poll(async () => (await notesOn(page)).at(-1)).toEqual({ brush, kind: "hex" });
    }
    await expect.poll(async () => (await notesOn(page)).length).toBe(5);
  });

  test("the Analysis board: a right drag with Shift marks the hexes that it goes across, or clears them", async ({ page }) => {
    await page.setViewportSize({ width: 1376, height: 952 });
    await analysisAt(page, 10);
    const [q, r] = await middleHex(page);
    const drag = async (from: [number, number], to: [number, number], keys: string[]) =>
      rightDrag(page, await hexSpot(page, from), await hexSpot(page, to), ["Shift", ...keys]);
    // In each colour, along a row of four hexes: four marks, and no arrow
    for (const [i, [, keys]] of BRUSHES.entries()) await drag([q - 2, r - 3 + 2 * i], [q + 1, r - 3 + 2 * i], keys);
    await expect.poll(() => marksOn(page)).toEqual({ purple: 4, yellow: 4, green: 4, grey: 4 });
    expect((await notesOn(page)).every(n => n.kind === "hex")).toBe(true);
    // A drag that starts on a mark of its colour clears that colour's marks from the hexes that it goes across: three
    // purple marks of the four
    await drag([q - 2, r - 3], [q, r - 3], []);
    await expect.poll(() => marksOn(page)).toEqual({ purple: 1, yellow: 4, green: 4, grey: 4 });
    // A clearing drag marks no hex: yellow from its row's first hex up to the purple row, where no mark is left
    await drag([q - 2, r - 1], [q - 2, r - 3], ["Control"]);
    await expect.poll(() => marksOn(page)).toEqual({ purple: 1, yellow: 3, green: 4, grey: 4 });
    // A drag that starts on a mark of another colour marks: green from the last purple mark down to the yellow row,
    // over an empty hex
    await drag([q + 1, r - 3], [q + 1, r - 1], ["Alt"]);
    await expect.poll(() => marksOn(page)).toEqual({ purple: 0, yellow: 2, green: 7, grey: 4 });
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
    await rightClick(page, await spot(page, 0, -60), ["Control", "Alt"]);
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
    await expect(dialog.getByText("Right-click a hex, or right-drag to another hex")).toBeVisible();
    await expect(dialog.getByText("Hold Shift and right-drag across hexes")).toBeVisible();
    const yellow = dialog.locator("tr", { hasText: "Yellow" });
    await expect(yellow).toContainText("Ctrl");
    await expect(yellow).not.toContainText("Shift");
  });

  test("the Analysis board: a right-click marks its hex while the view fits again under the pointer", async ({ page }) => {
    // The engine's rules for a new position come later on a busy machine, and the view fits again when they come. A
    // right-click during that fit is still a click (design 33, "The player's notes", item 14). The page holds each
    // message from its workers while `hold` is on, and gives them at `flush`.
    await page.addInitScript(() => {
      const w = window as unknown as { hold: boolean; flush: () => number };
      const held: (() => void)[] = [];
      w.hold = false;
      w.flush = () => { w.hold = false; const n = held.length; for (const f of held.splice(0)) f(); return n; };
      let proto: object | null = Worker.prototype, d: PropertyDescriptor | undefined;
      while (proto && !(d = Object.getOwnPropertyDescriptor(proto, "onmessage"))) proto = Object.getPrototypeOf(proto);
      Object.defineProperty(Worker.prototype, "onmessage", {
        configurable: true,
        get() { return d!.get!.call(this); },
        set(h: ((e: MessageEvent) => void) | null) {
          d!.set!.call(this, h && function (this: Worker, e: MessageEvent) {
            if (w.hold) held.push(() => h.call(this, e)); else h.call(this, e);
          });
        },
      });
    });
    await page.setViewportSize({ width: 1376, height: 952 });
    await analysisAt(page, 10);
    const svg = field(page).locator("svg[aria-label='Blueprints board']");
    await page.locator("body").click({ position: { x: 2, y: 2 } }); // no control has the focus: the page takes the keys
    await page.evaluate(() => { (window as unknown as { hold: boolean }).hold = true; });
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => notesOn(page)).toEqual([]);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); // drawn
    const fitted = await svg.getAttribute("viewBox"); // the new position's fit without its rules
    const p = await spot(page, 0, -60);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down({ button: "right" });
    expect(await page.evaluate(() => (window as unknown as { flush: () => number }).flush())).toBeGreaterThan(0);
    await expect(svg).not.toHaveAttribute("viewBox", fitted!); // the rules came, and the view fitted again
    await page.mouse.move(p.x, p.y, { steps: 6 });
    await page.mouse.up({ button: "right" });
    await expect.poll(() => notesOn(page)).toEqual([{ brush: "purple", kind: "hex" }]);
  });

  test("Practice: the notes stay with their position", async ({ page }) => {
    const manifest = await page.request.get(new URL("/engine/manifest.json", CYANOTYPE).href).then(r => r.json()).catch(() => null);
    test.skip(!manifest?.artifacts?.some((a: { kind: string }) => a.kind === "practice-module"),
              "Cyanotype's preview has no practice bot: run `npm run engine` in apps/cyanotype before its build");
    // A game in progress, the player to move: the lab's middle game, as the layout test keeps it
    const fixtures = JSON.parse(readFileSync("../cyanotype/src/lib/board/fixtures.json", "utf8")).fixtures as { name: string; moves: string[] }[];
    const moves = fixtures.find(f => f.name === "A middle game")!.moves; // Red to move
    await page.setViewportSize({ width: 1376, height: 952 });
    await page.goto(new URL("/practice", CYANOTYPE).href);
    await page.evaluate(kept => localStorage.setItem("cyanotype:practice-game:1", JSON.stringify(kept)),
      { version: 1, bot: { network: manifest.artifacts.find((a: { kind: string }) => a.kind === "model").id, visits: 32, variety: "low" },
        human: 1, name: "", seed: 1, moves, builds: [], started: new Date().toISOString() });
    await page.reload();
    await expect(page.getByTestId("practice-status")).toHaveText(/^Your turn/, { timeout: 120_000 });
    await rightClick(page, await spot(page, -60, 0), ["Control"]);
    await rightDrag(page, await spot(page, -60, 40), await spot(page, 60, 40));
    const drawn = [{ brush: "yellow", kind: "hex" }, { brush: "purple", kind: "arrow" }];
    await expect.poll(() => notesOn(page)).toEqual(drawn);
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => notesOn(page)).toEqual([]);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => notesOn(page)).toEqual(drawn);
  });
});
