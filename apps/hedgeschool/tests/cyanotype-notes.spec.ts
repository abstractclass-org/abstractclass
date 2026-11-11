// The player's notes on Cyanotype's board (its design 33, "The player's notes"), on its preview (CYANOTYPE_BASE_URL):
// on the Analysis board with the review's test game (Stamp Duty against itself), and on Practice with a game in
// progress. A right-click marks a hex and a right drag draws an arrow, in each colour by the keys held (Cyanotype's:
// Ctrl, Alt or both). The same note again removes it, and in another colour changes its colour. An arrow drawn the
// other way is another arrow. A right drag with Shift marks each hex that it goes across, or clears that colour's marks
// when its first hex has one. The notes stay with their position for the visit, a click on the board clears them, and a
// pan does not. The view keeps its fit under a press when the engine's rules come, so a right-click or a click on a
// candidate takes the hex that it pressed. Hedge School's notes are in notes.spec.ts. The review's notes are in
// cyanotype-review.spec.ts, which reviews the game once. Without the engine's files the tests skip, with a message.
// Run: npx playwright test tests/cyanotype-notes.spec.ts, with CYANOTYPE_BASE_URL.
import { expect, type Page, test } from "./page-log.ts";
import { readFileSync } from "node:fs";
import { keepBefore } from "./keep-before.ts";
import { CYANOTYPE, MOVES, noReview, reviewTestGame } from "./cyanotype-review.ts";
import { analysisAt, BRUSHES, field, hexSpot, hexUnder, marksOn, middleHex, notesOn, rightClick, rightDrag, spot }
  from "./cyanotype-notes.ts";
import { tableBox, toMove } from "./move-header.ts";

/** An init script: each message from the page's workers waits while `delaying` is on, and `flush` gives the waiting
 *  ones. A test then chooses when the engine's answers come, as a busy machine makes them late. `rules` counts the
 *  waiting replies to a request for a position's rules: a call `describe` (packages/engine/src/client.ts), whose
 *  reply has the request's id (channel.ts). */
function delayWorkers() {
  const w = window as unknown as Delay, waiting: { rules: boolean; give: () => void }[] = [];
  const asked = new WeakMap<Worker, Set<number>>(); // each worker's ids of the calls `describe`
  const post = Worker.prototype.postMessage as (this: Worker, ...args: unknown[]) => void;
  Worker.prototype.postMessage = function (this: Worker, ...args: unknown[]) {
    const m = args[0] as { type?: string; id?: number; request?: { action?: string } } | null;
    if (m?.type === "call" && m.request?.action === "describe" && m.id !== undefined)
      asked.set(this, (asked.get(this) ?? new Set()).add(m.id));
    post.apply(this, args);
  };
  const d = Object.getOwnPropertyDescriptor(Worker.prototype, "onmessage")!; // Worker's own attribute (HTML)
  Object.defineProperty(Worker.prototype, "onmessage", { ...d, set(h: ((e: MessageEvent) => void) | null) {
    d.set!.call(this, h && function (this: Worker, e: MessageEvent) {
      if (!w.delaying) return h.call(this, e);
      const id = (e.data as { id?: number } | null)?.id ?? -1;
      waiting.push({ rules: !!asked.get(this)?.has(id), give: () => h.call(this, e) });
    });
  } });
  w.delaying = false;
  w.rules = () => waiting.filter(m => m.rules).length;
  w.flush = () => { w.delaying = false; for (const m of waiting.splice(0)) m.give(); };
}
type Delay = { delaying: boolean; rules: () => number; flush: () => void };
/** Delays the workers' messages from now, and waits for the reply with the position's rules to be among them. */
async function delayRules(page: Page, step: () => Promise<void>) {
  await page.evaluate(() => { (window as unknown as Delay).delaying = true; });
  await step();
  const rules = () => page.evaluate(() => (window as unknown as Delay).rules());
  await expect.poll(rules, { message: "the reply with the position's rules, delayed" }).toBeGreaterThan(0);
}
const flush = (page: Page) => page.evaluate(() => (window as unknown as Delay).flush());
/** Two frames: the page has drawn what it changed. */
const drawn = (page: Page) => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const boardSvg = (page: Page) => field(page).locator("svg[aria-label='Blueprints board']");
/** A candidate's rank on the board: the middle of its square in the window, and the rank. */
type Rank = { x: number; y: number; rank: string };
/** The rank farthest from the field's middle (a fit moves it most), or null when the board shows none in reach. In
 *  reach is 40 pixels in from the field's edges, off the strip of buttons along its foot (30 pixels high, 6 from the
 *  edge), and 10 pixels off the hands' panel. A press there goes to the field. */
const farthestRank = (page: Page) => field(page).evaluate((f): Rank | null => {
  const box = f.getBoundingClientRect(), panel = f.parentElement!.querySelector(".hands-panel")?.getBoundingClientRect();
  const inside = (r: DOMRect, x: number, y: number, m: number) =>
    x > r.left + m && x < r.right - m && y > r.top + m && y < r.bottom - m;
  const mx = box.left + box.width / 2, my = box.top + box.height / 2;
  return [...f.querySelectorAll("g.candidate rect.rank")].map(r => {
    const b = r.getBoundingClientRect(), rank = r.parentElement!.querySelector("text")!.textContent!.trim();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, rank };
  }).filter(c => inside(box, c.x, c.y, 40) && !(panel && inside(panel, c.x, c.y, -10)))
    .sort((a, b) => Math.hypot(b.x - mx, b.y - my) - Math.hypot(a.x - mx, a.y - my))[0] ?? null;
});

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

  test("the Analysis board: the view keeps its fit under a right-click while the rules come", async ({ page }) => {
    // The engine's rules for a new position come later on a busy machine. The view fits their legal moves when they
    // come, but under a press it keeps its fit until the release (design 33, "How the board takes a move", item 1).
    // So a right-click stays a click, and marks its hex.
    await page.addInitScript(delayWorkers);
    await page.setViewportSize({ width: 1376, height: 952 });
    await analysisAt(page, 10);
    const svg = boardSvg(page);
    await page.locator("body").click({ position: { x: 2, y: 2 } }); // no control has the focus: the page takes the keys
    await delayRules(page, () => page.keyboard.press("ArrowRight"));
    await drawn(page);
    const fitted = await svg.getAttribute("viewBox"); // the new position's fit without its rules
    const p = await spot(page, 0, -60);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down({ button: "right" });
    await flush(page);
    await drawn(page);
    expect(await svg.getAttribute("viewBox"), "the view under the press, after the rules came").toBe(fitted);
    await page.mouse.move(p.x, p.y, { steps: 6 });
    await page.mouse.up({ button: "right" });
    await expect.poll(() => notesOn(page)).toEqual([{ brush: "purple", kind: "hex" }]);
    await expect(svg).not.toHaveAttribute("viewBox", fitted!); // the view fits the rules after the release
  });

  test("the review: a click on a candidate while the rules come pins that candidate", async ({ page }) => {
    // The review's candidates come from its stored results at once, and the position's rules come from the engine
    // after them. A click pressed before the rules and released after them takes the hex that it pressed. The view
    // fits the rules after the release.
    await page.addInitScript(delayWorkers);
    await page.setViewportSize({ width: 1376, height: 952 });
    await reviewTestGame(page);
    const status = page.locator("section.side"), svg = boardSvg(page);
    await toMove(page, 10);
    await expect(status).toContainText("Move 11 of");
    // The first position after it whose board shows a candidate's rank before the rules come. Without them the view
    // fits the cells only, and a placement's rank can be out of view.
    let target: Rank | null = null, fitted: string | null = null;
    for (let k = 11; !target; k++) {
      expect(k, "a position with a candidate's rank in view before its rules").toBeLessThan(MOVES);
      if (k > 11) await flush(page);
      await delayRules(page, () => page.keyboard.press("ArrowRight"));
      await expect(status).toContainText(`Move ${k + 1} of`);
      await expect(tableBox(page).locator("tbody tr").first()).toBeVisible(); // the stored results
      await drawn(page);
      [target, fitted] = [await farthestRank(page), await svg.getAttribute("viewBox")];
    }
    const pressed = await hexUnder(page, target);
    await page.mouse.down();
    await flush(page);
    await drawn(page);
    await page.mouse.up();
    await expect(svg).not.toHaveAttribute("viewBox", fitted!); // the view fits the rules after the release
    await page.mouse.move(2, 2); // off the board: the table marks the pinned candidate, not the one under the pointer
    await expect(tableBox(page).locator("tbody tr[class*='inset_3px'] td").first()).toHaveText(target.rank);
    // In the new fit, the pointer's point shows another hex: the hex that the click pressed decided
    expect(await hexUnder(page, target), "the hex under the click's point in the new fit").not.toBe(pressed);
  });

  test("Practice: the notes stay with their position", async ({ page }) => {
    const manifest = await page.request.get(new URL("/engine/manifest.json", CYANOTYPE).href).then(r => r.json()).catch(() => null);
    test.skip(!manifest?.artifacts?.some((a: { kind: string }) => a.kind === "practice-module"),
              "Cyanotype's preview has no practice bot: run `npm run engine` in apps/cyanotype before its build");
    // A game in progress, the player to move: the lab's middle game, as the layout test keeps it
    const fixtures = JSON.parse(readFileSync("../cyanotype/src/lib/board/fixtures.json", "utf8")).fixtures as { name: string; moves: string[] }[];
    const moves = fixtures.find(f => f.name === "A middle game")!.moves; // Red to move
    await page.setViewportSize({ width: 1376, height: 952 });
    await keepBefore(page, "cyanotype:practice-game:1",
      { version: 1, bot: { network: manifest.artifacts.find((a: { kind: string }) => a.kind === "model").id, visits: 32, variety: "low" },
        human: 1, name: "", seed: 1, moves, builds: [], started: new Date().toISOString() });
    await page.goto(new URL("/practice", CYANOTYPE).href);
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
