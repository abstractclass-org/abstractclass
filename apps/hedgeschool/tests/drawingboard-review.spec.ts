// Drawing Board's review (its design 33) on its preview (DB_BASE_URL): the review's test game up to turn 20, reviewed
// once from the engine's real replies (drawingboard-review.ts), in one page that the tests share in turn. The tests
// check the candidates' table's Move header (move-header.ts), the display setting "Move notation", the marks of a
// turn's two moves by turn and by move, the hands' rank chips with "+N", that the page has no area map, and the
// player's notes (drawingboard-notes.ts) by position and while a preview shows. And the
// Analysis board's check of a record brought to it. Without the engine's files the tests skip, with a message. Run: npm run test:layout -- tests/drawingboard-review.spec.ts, with
// DB_BASE_URL.
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { checkMoveHeader, readTable, tableBox, toMove as stepTo } from "./move-header.ts";
import { DISPLAY, DRAWING_BOARD, MOVES, noReview, reviewTestGame } from "./drawingboard-review.ts";
import { notesOn, rightClick, rightDrag, spot } from "./drawingboard-notes.ts";

test.describe.configure({ mode: "serial" });
let context: BrowserContext | undefined, page: Page, skipped = "";
const errors: string[] = [];

test.beforeAll(async ({ browser }, info) => {
  info.setTimeout(25 * 60_000);
  context = await browser.newContext({ viewport: { width: 1376, height: 952 } });
  page = await context.newPage();
  page.on("pageerror", e => errors.push(String(e)));
  skipped = await noReview(page);
  if (!skipped) await reviewTestGame(page, { notation: "glyphs", notes: true });
});
test.afterAll(async () => { await context?.close(); });
test.beforeEach(() => { test.skip(!!skipped, skipped); });

/** The review again at `w` x `h`, with the display settings `display` added to the kept ones: on a phone, the Analysis
 *  tab, and no control with the focus, so that the page takes the keys. */
async function open(w: number, h: number, display: object = {}) {
  await page.evaluate(([k, d]) => localStorage.setItem(k, JSON.stringify({ ...JSON.parse(localStorage.getItem(k) ?? "{}"), ...d })),
                      [DISPLAY, display] as const);
  await page.setViewportSize({ width: w, height: h });
  await page.reload();
  await expect(page.locator("main.review")).not.toHaveAttribute("aria-busy", { timeout: 120_000 });
  if (w < 800) await page.getByRole("tab", { name: "Analysis", exact: true }).click();
}
/** The status line names the move to play after move `k`. */
const at = (k: number) => expect(page.locator("section.side")).toContainText(`Move ${k + 1} of ${MOVES}`);
/** The position after move `k`, by the keys. */
async function toMove(k: number) {
  await stepTo(page, k);
  await at(k);
}
/** The position after the next move, by the key →: move `k`. */
async function next(k: number) {
  await page.keyboard.press("ArrowRight");
  await at(k);
}
const glyphBoxes = "span.bg-current"; // a blueprint's number in a box: the glyphs (MoveLabel.svelte)

test("the Move header opens the table's Move column, and is plain where every move fits", async () => {
  await open(390, 844);
  // The first position whose table has a cut move: an edit is cut on a phone
  let k = 0;
  for (; k < MOVES; k++) {
    await (k ? next(k) : toMove(0));
    if (await expect.poll(async () => (await readTable(tableBox(page))).names.some(n => n.cut), { timeout: 10_000 }).toBe(true).then(() => true, () => false)) break;
  }
  expect(k, "a position with a cut move").toBeLessThan(MOVES);
  await checkMoveHeader(page, "Move");
  // At 1,920 pixels every move of the game fits its cell: the header is the plain word
  await open(1920, 1080);
  await toMove(k);
  await expect.poll(async () => (await readTable(tableBox(page))).names.length).toBeGreaterThan(0);
  const t = await readTable(tableBox(page));
  expect(t.short).toBe(false);
  expect(t.button).toBe(false);
  await expect(tableBox(page).locator("[data-move-head]")).toHaveText("Move");
});

test("the setting Move notation writes the lists, the status line and the table, and stays after a reload", async () => {
  await open(1376, 952, { notation: "glyphs", branchForm: "text", notes: true });
  const list = page.locator(".movelist");
  // Turn 4's first move, a capture that scores nothing: its notation, which a screen reader reads in both forms
  const played = list.locator("button.mv", { hasText: "2@6,-5x" }).first();
  // A variation: the table's second candidate at the last position, played, then the game's line again. At the last
  // position, so that the keys follow the game's line before it in the tests after this one.
  await toMove(MOVES - 1);
  await tableBox(page).locator("tbody tr").nth(1).locator("td").nth(1).dblclick();
  await expect(list.locator("button[data-path]").first()).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  const notes = list.locator("div.truncate[title]").filter({ hasText: /^(Great|Mistake|Blunder)\b/ });
  const best = await notes.filter({ hasText: /was best/ }).count();
  expect(best, `a note that names the best move (${await notes.count()} notes in the review, ${best} with a best move)`).toBeGreaterThan(0);

  /** Each list in the form `form`: the move played, the variation's moves, the notes' moves, the status line while the
   *  pointer is on a move, and the table's names. */
  const check = async (form: "glyphs" | "text") => {
    const n = form === "glyphs" ? (c: number) => expect(c).toBeGreaterThan(0) : (c: number) => expect(c).toBe(0);
    n(await played.locator(glyphBoxes).count());
    if (form === "text") await expect(played).toContainText("2@6,-5x");
    n(await list.locator("button[data-path]").first().locator(glyphBoxes).count());
    n(await notes.filter({ hasText: /was best/ }).first().locator(glyphBoxes).count());
    await played.hover();
    const status = page.locator("p", { hasText: /^Preview: / });
    await expect(status).toBeVisible();
    n(await status.locator(glyphBoxes).count());
    if (form === "text") await expect(status).toContainText("2@6,-5x");
    await page.mouse.move(2, 2);
    n(await tableBox(page).locator(`[data-name] ${glyphBoxes}`).count());
    if (form === "text") for (const name of await tableBox(page).locator("[data-name]").allTextContents()) expect(name.trim()).toMatch(/^\d[@:]/);
  };
  await check("glyphs");
  const choose = async (text: "Glyphs" | "Text") => {
    await page.getByRole("button", { name: "Display settings" }).click();
    await page.getByRole("radiogroup", { name: "Move notation" }).getByRole("radio", { name: text }).click();
    await page.getByRole("region", { name: "Display settings" }).getByRole("button", { name: "Done" }).click();
  };
  await choose("Text");
  await check("text");
  await page.reload();
  await expect(page.locator("main.review")).not.toHaveAttribute("aria-busy", { timeout: 120_000 });
  await check("text");
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? "{}").notation, DISPLAY)).toBe("text");
  await choose("Glyphs");
  await check("glyphs");
});

test("by turn and by move, the board marks the same moves: both moves of the turn", async () => {
  // After turn 2 (two edits), turn 3 (an edit, then a placement) and turn 4 (two placements)
  const expected: Record<number, { outlines: number; edits: number }> = { 3: { outlines: 0, edits: 2 }, 5: { outlines: 1, edits: 1 }, 7: { outlines: 2, edits: 0 } };
  const marks = () => page.evaluate(() => ({
    outlines: [...document.querySelectorAll(".board .last-move-outline")].map(e => e.getAttribute("d")),
    old: [...document.querySelectorAll("svg.hand .old-place")].map(e => e.getAttribute("d")),
    new: [...document.querySelectorAll("svg.hand .new-place")].map(e => e.getAttribute("d")),
  }));
  const seen: Record<string, Awaited<ReturnType<typeof marks>>> = {};
  for (const judge of ["turn", "move"]) {
    await open(1376, 952, { judge });
    for (const k of Object.keys(expected).map(Number)) {
      await toMove(k);
      seen[`${judge} ${k}`] = await marks();
    }
  }
  for (const [k, e] of Object.entries(expected)) {
    expect(seen[`move ${k}`], `after move ${k}`).toEqual(seen[`turn ${k}`]);
    expect(seen[`turn ${k}`].outlines.length, `the placements marked after move ${k}`).toBe(e.outlines);
    expect(seen[`turn ${k}`].old.length, `the edits marked after move ${k}`).toBe(e.edits);
    expect(seen[`turn ${k}`].new.length).toBe(e.edits);
  }
  // A played move's preview marks the turn so far too: from the start, the pointer on turn 4's second move marks both
  // of the turn's placements, as the position after it does
  await toMove(0);
  await page.locator(".movelist button.mv", { hasText: "2@3,-7x+10" }).first().hover();
  await expect(page.locator("p", { hasText: /^Preview: / })).toBeVisible();
  await expect.poll(async () => (await marks()).outlines).toEqual(seen["move 7"].outlines);
  await page.mouse.move(2, 2);
});

test("many candidates on one blueprint: the rank chips fit the hand's panel, with +N", async () => {
  await open(390, 844, { judge: "turn" });
  /** Each chip in the hands, in its panel: whether it lies in the panel, clear of the panel's number, and the "+N". */
  const chips = () => page.evaluate(() => {
    const out: { inside: boolean; more: string | null }[] = [];
    for (const hand of document.querySelectorAll("svg.hand")) {
      let panel: DOMRect | null = null, label: DOMRect | null = null;
      for (const e of hand.querySelectorAll("rect.panel, rect.label, rect.rank-chip, rect.more-chip")) {
        const r = e.getBoundingClientRect();
        if (e.classList.contains("panel")) { panel = r; label = null; continue; }
        if (e.classList.contains("label")) { label = r; continue; }
        const inside = !!panel && r.left >= panel.left - 0.5 && r.right <= panel.right + 0.5 && r.top >= panel.top - 0.5 && r.bottom <= panel.bottom + 0.5
          && !(label && r.left < label.right && r.right > label.left && r.top < label.bottom && r.bottom > label.top);
        out.push({ inside, more: e.classList.contains("more-chip") ? e.nextElementSibling?.textContent ?? "" : null });
      }
    }
    return out;
  });
  let found = -1;
  for (let k = 0; k < MOVES && found < 0; k++) {
    await (k ? next(k) : toMove(0));
    await page.waitForTimeout(300);
    const all = await chips();
    expect(all.filter(c => !c.inside), `after move ${k}: chips outside their panel`).toEqual([]);
    if (all.some(c => c.more)) {
      found = k;
      expect(all.find(c => c.more)!.more).toMatch(/^\+\d+$/);
    }
  }
  expect(found, "a position whose candidates place one blueprint more often than its panel shows").toBeGreaterThanOrEqual(0);
});

test("the review has no area map: no switch, no legend and no shading", async () => {
  for (const [w, h] of [[1376, 952], [390, 844]]) {
    await open(w, h);
    await toMove(7);
    await expect(page.getByRole("radiogroup", { name: "Area map style" })).toHaveCount(0);
    await expect(page.locator(".map-legend")).toHaveCount(0);
    await expect(page.locator(".board path.hold")).toHaveCount(0);
    await page.getByRole("button", { name: "Display settings" }).click();
    await expect(page.getByRole("region", { name: "Display settings" })).not.toContainText("Area map");
    await page.getByRole("region", { name: "Display settings" }).getByRole("button", { name: "Done" }).click();
  }
});

test("the player's notes: on the review's board, by position, and hidden while a move's preview shows", async () => {
  await open(1376, 952, { previewMoves: true });
  await toMove(9);
  await rightClick(page, await spot(page, -60, 0));
  await rightDrag(page, await spot(page, -60, 40), await spot(page, 60, 40), ["Control"]);
  const drawn = [{ brush: "purple", kind: "hex" }, { brush: "yellow", kind: "arrow" }];
  await expect.poll(() => notesOn(page)).toEqual(drawn);
  // The pointer on another move of the list shows its position, with no notes. Off the list, the notes come back.
  await page.locator(".movelist button.mv").nth(3).hover();
  await expect.poll(() => notesOn(page)).toEqual([]);
  await page.mouse.move(2, 2);
  await expect.poll(() => notesOn(page)).toEqual(drawn);
  await next(10);
  await expect.poll(() => notesOn(page)).toEqual([]);
  await page.keyboard.press("ArrowLeft");
  await at(9);
  await expect.poll(() => notesOn(page)).toEqual(drawn);
  // A click on the board clears them
  const p = await spot(page, 150, 150);
  await page.mouse.click(p.x, p.y);
  await expect.poll(() => notesOn(page)).toEqual([]);
});

test("the Analysis board refuses a record whose capture mark the engine does not confirm", async ({ browser }) => {
  // The test game's first three turns, with an x on 2@1,-5, which captures nothing. In a browser of its own: the
  // board kept there, empty, opens instead, with a notice.
  const own = await browser.newContext({ viewport: { width: 1376, height: 952 } });
  try {
    const board = await own.newPage();
    const record = "1. 1:-1,1>2:0,-1 2. 1:-1,1>2:-2,1 1:0,2>2:0,3 3. 1:0,2>2:2,2 2@1,-5x *";
    await board.goto(new URL(`/analysis#record=${encodeURIComponent(record)}`, DRAWING_BOARD).href);
    await expect(board.getByRole("alert")).toContainText("Move 5 (2@1,-5x) has the mark x, but the move captures no opponent cells.",
                                                         { timeout: 120_000 });
    await expect(board.getByRole("alert")).toContainText("Your own analysis is here instead.");
    expect(new URL(board.url()).hash, "the record left the address").toBe("");
    await expect(board.locator(".movelist button[data-path]")).toHaveCount(0);
  } finally {
    await own.close();
  }
});

test("no page error in the review", () => {
  expect(errors).toEqual([]);
});
