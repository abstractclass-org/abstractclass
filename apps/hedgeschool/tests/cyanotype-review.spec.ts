// Cyanotype's review (its design 33) on its preview (CYANOTYPE_BASE_URL): the review's test game up to turn 20, from
// the stored review of the engine's real replies (cyanotype-review.ts), with the engine on at Lite as in a live review,
// in one page that the tests share in turn. The tests check the candidates' table's Move header (move-header.ts), the
// display setting "Move notation", the marks of a turn's two moves by turn and by move, each turn's cell on its last
// move's row by turn, the two moves of a Mistake's note on one line with a middle dot, the dot between a turn's two
// moves in Hexes and in Notation with glyphs, the hands' rank chips with "+N", that the page has no area map, and the
// player's notes (cyanotype-notes.ts) by position and while a preview shows. The stored review was made with an earlier
// release of the same search, and opens with no search on the lock's release.
// The page asks the engine for no search: cyanotype-live-review.spec.ts reviews with the engine. And the
// Analysis board's check of a record brought to it, and its refusal of a kept board with a komi. Without the engine's
// files the tests skip, with a message. Run:
// npm run test:layout -- tests/cyanotype-review.spec.ts, with CYANOTYPE_BASE_URL.
import { expect, test, type BrowserContext, type Locator, type Page } from "./page-log.ts";
import { checkMoveHeader, readTable, tableBox, toMove as stepTo } from "./move-header.ts";
import { readAnalysisKey } from "../../../packages/analysis/src/cache.ts";
import { moduleOf, type Manifest } from "../../../packages/engine/src/client.ts";
import { parseRecord } from "../../cyanotype/src/lib/game/record.ts";
import { CYANOTYPE, DISPLAY, MOVES, expectNoSearch, noReview, putResults, readStored, reviewTestGame, testRecord }
  from "./cyanotype-review.ts";
import { notesOn, rightClick, rightDrag, spot } from "./cyanotype-notes.ts";
import { NAME, STORES } from "../../../packages/storage/src/db.ts";
import { BOARD_ID } from "../../../packages/analysis/src/kept.ts";

test.describe.configure({ mode: "serial" });
let context: BrowserContext | undefined, page: Page, skipped = "";
const errors: string[] = [];
/** The browser's size for the review. */
const SIZE = { viewport: { width: 1376, height: 952 } };

test.beforeAll(async ({ browser }, info) => {
  info.setTimeout(5 * 60_000);
  context = await browser.newContext(SIZE);
  page = await context.newPage();
  page.on("pageerror", e => errors.push(String(e)));
  skipped = await noReview(page);
  if (!skipped) await reviewTestGame(page, { notation: "glyphs", notes: true }, { on: true });
});
test.afterAll(async () => { await context?.close(); });
test.beforeEach(() => { test.skip(!!skipped, skipped); });

/** Loads the review again, after a check that the page asked the engine for no search since it opened: the tests read
 *  the stored review only. */
async function reload() {
  await expectNoSearch(page);
  await page.reload();
  await expect(page.locator("main.review")).not.toHaveAttribute("aria-busy", { timeout: 120_000 });
}
/** The review again at `w` x `h`, with the display settings `display` added to the kept ones: on a phone, the Analysis
 *  tab, and no control with the focus, so that the page takes the keys. */
async function open(w: number, h: number, display: object = {}) {
  await page.evaluate(([k, d]) => localStorage.setItem(k, JSON.stringify({ ...JSON.parse(localStorage.getItem(k) ?? "{}"), ...d })),
                      [DISPLAY, display] as const);
  await page.setViewportSize({ width: w, height: h });
  await reload();
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
  await reload();
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

test("by turn, a turn's cell stands on its last move's row, and the move on the board lights one row", async () => {
  // One move a line: the turn's cell (its label, the ◆ and the loss) acts as the turn's last move, so it stands on that
  // move's row. Else, after a turn of two moves, the second move and the cell on the first row lit as two boxes.
  // On one row: the cell's box lies within its last move's, from top to bottom, to a pixel. The tops are not equal: the
  // cell and the move stand on one baseline, and a cell with no label badge is shorter than a move (about 17 pixels to
  // 21), so its top is 3 to 4 pixels lower, and 6.5 beside an edit in glyphs (its baseline is its picture's lower
  // edge). A cell on the first row beside a second move fails: its top is a row above the move's. So does a move with
  // no height (a list that does not show).
  type Box = { top: number; bottom: number };
  const within = (cell: Box | null, move: Box) =>
    !!cell && move.bottom > move.top && cell.top >= move.top - 1 && cell.bottom <= move.bottom + 1;
  for (const [w, h] of [[1376, 952], [390, 844]]) {
    await open(w, h, { judge: "turn" });
    /** Each turn's row: the number of its moves, and the boxes of its cell (its third column, as book-review.spec.ts
     *  finds Hedge School's in its fourth) and of its last move. */
    const rows = await page.locator(".movelist > div:has(> button.mv)").evaluateAll(all => all.map(row => {
      const box = (e: Element) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; };
      const moves = row.querySelectorAll(":scope > button.mv"), cell = row.querySelector(":scope > .col-start-3");
      return { moves: moves.length, cell: cell && box(cell), move: box(moves[moves.length - 1]) };
    }));
    expect(rows.filter(r => r.moves === 2).length, `${w} px: turns of two moves`).toBeGreaterThan(0);
    expect(rows.filter(r => r.moves === 1).length, `${w} px: turns of one move`).toBeGreaterThan(0);
    rows.forEach((r, k) => {
      expect(within(r.cell, r.move), `${w} px: turn ${k + 1}: its cell ${JSON.stringify(r.cell)} on its last move's row ${JSON.stringify(r.move)}`).toBe(true);
    });
    // After turn 4 (two placements, moves 6 and 7): the second move and the cell, in the move on the board's look, on
    // one row
    await toMove(7);
    const lit = await page.locator(".movelist .here").evaluateAll(all => all.map(e => {
      const r = e.getBoundingClientRect();
      return { move: e.matches(".mv"), top: r.top, bottom: r.bottom };
    }));
    expect(lit.map(b => b.move), `${w} px: the boxes lit after turn 4: the move, then the cell`).toEqual([true, false]);
    expect(within(lit[1], lit[0]), `${w} px: the lit cell ${JSON.stringify(lit[1])} on the lit move's row ${JSON.stringify(lit[0])}`).toBe(true);
  }
});

test("by turn, a Mistake's note writes the engine's two moves in glyphs on one line, a middle dot between them", async () => {
  // The stored review's Mistakes by turn each name a better turn of an edit and a placement. An edit's glyphs begin
  // with its cell's picture, whose baseline is its lower edge: on the text's baseline it stood 3.4 pixels above the
  // placement beside it. The view sets each note's move on the middle of the line, as the table does. A move in glyphs
  // has spaces of its own, so " · " stands between the two moves (GLYPH_SEPARATOR). The text form keeps the record's
  // space, as the note's title does.
  const notes = page.locator(".movelist div.truncate[title]").filter({ hasText: /^Mistake\. / });
  for (const [w, h] of [[1376, 952], [390, 844]]) {
    await open(w, h, { judge: "turn", notation: "glyphs", notes: true });
    await expect(notes.first()).toBeVisible();
    /** Each note: its moves (the move's notation, its screen reader's text, and the tops of its blueprints' boxes),
     *  and the text between its first two moves. */
    const read = await notes.evaluateAll(all => all.map(n => {
      const [first, second] = [...n.children];
      let between = "";
      for (let x = first?.nextSibling; x && x !== second; x = x.nextSibling) if (x.nodeType === Node.TEXT_NODE) between += x.textContent;
      return { between, moves: [...n.children].map(m => ({
        name: m.querySelector(".sr-only")?.textContent ?? "",
        tops: [...m.querySelectorAll("span.bg-current")].map(b => b.getBoundingClientRect().top),
      })) };
    }));
    const turns = read.filter(({ moves: n }) => n.length === 2 && n.some(m => m.name.includes(">")) && n.some(m => m.name.includes("@")));
    expect(turns.length, `${w} px: a Mistake's note with an edit and a placement`).toBeGreaterThan(0);
    for (const { between, moves: n } of turns) {
      const tops = n.flatMap(m => m.tops), names = n.map(m => m.name).join(" ");
      expect(Math.max(...tops) - Math.min(...tops), `${w} px: ${names}: its boxes' tops`).toBeLessThan(0.5);
      expect(between, `${w} px: ${names}: between the moves`).toBe(" · ");
    }
  }
  // The text form: the record's notation, a space between the moves, as the note's title
  await open(1376, 952, { notation: "text" });
  for (const n of await notes.all()) {
    const [text, title] = [await n.textContent(), await n.getAttribute("title")];
    expect(text, "a note in the text form").toBe(title);
    expect(text).not.toContain("·");
  }
  await open(1376, 952, { notation: "glyphs" });
});

test("in Hexes and in Notation with glyphs, a middle dot stands between a turn's two moves in the engine's lines", async () => {
  // In Hexes an edit's arrow ends at the next move's hex, and in Notation a move in glyphs has spaces of its own, so a
  // turn's two moves side by side could read as one. The turn numbers (under a note, and under the table in Notation)
  // and a wider space (under the table in Hexes) stand between turns. Notation with Move notation Text keeps the
  // record's space. Each row as a string: M a move, · the dot, N a turn's number, _ the space between turns.
  const tokens = (row: Locator) => row.evaluate(r => [...r.children].map(e =>
    e.matches("[data-turn-dot]") ? "·" : e.tagName === "BUTTON" ? "M" : /^\d+\.(…)?$/.test(e.textContent?.trim() ?? "") ? "N"
      : e.matches("span.w-2") ? "_" : "").join(""));
  const check = (where: string, s: string, dots: boolean) => {
    if (!dots) {
      expect(s, `${where}: no dot`).not.toContain("·");
      expect(s, `${where}: a turn's two moves side by side`).toContain("MM");
      return;
    }
    expect(s, `${where}: a turn's two moves with the dot between them`).toContain("M·M");
    expect(s, `${where}: two moves side by side with nothing between them`).not.toContain("MM");
    expect(s, `${where}: a dot beside a turn's number or the space between turns`).not.toMatch(/·[N_]|[N_]·|^·|·$/);
  };
  const forms = [{ branchForm: "pills", notation: "glyphs", dots: true }, { branchForm: "text", notation: "glyphs", dots: true },
                 { branchForm: "text", notation: "text", dots: false }];
  for (const { dots, ...display } of forms) {
    const form = `${display.branchForm}, ${display.notation}`;
    await open(1376, 952, { judge: "turn", notes: true, ...display });
    // The engine's line under the first Mistake's note: the row with the rank badge of the engine's best line
    const note = page.locator(".movelist div.relative.isolate").filter({ has: page.locator('[title="The engine\'s best line from here"]') }).first();
    await note.scrollIntoViewIfNeeded();
    check(`${form}, under a note`, await tokens(note), dots);
    // The engine's line under the table, from a turn's first move (after move 9: Red's first of turn 6)
    await toMove(9);
    const line = page.getByRole("group", { name: "The engine's line" }).locator(":scope > div").first();
    await expect(line.locator("button").nth(1)).toBeVisible();
    check(`${form}, under the table`, await tokens(line), dots);
  }
  await open(1376, 952, { branchForm: "pills", notation: "glyphs" });
});

/** A stored result's candidate, as far as this file reads it. */
type StoredCandidate = { edge: { kind: string; blueprint?: number }; visits: number; blueWin: number; lead?: number; margin?: number };
type StoredResult = { candidates: StoredCandidate[] };
/** The stored result of the position after move `k` at the review's visits, and a copy of it in which CROWD of the
 *  engine's other placements of one blueprint (the blueprint that they place most often) have the first choice's
 *  visits and values, so that the board shows each of them. */
const CROWD = 5;
function crowdedResult(k: number): { key: string; stored: StoredResult; crowded: StoredResult } {
  const fixture = readStored(), moves = parseRecord(testRecord()).moves.slice(0, k).join(" ");
  const found = fixture.analyses.find(([key]) => {
    const r = readAnalysisKey(key);
    return !r.map && r.visits === fixture.visits && r.moves === moves;
  });
  if (!found) throw new Error(`the stored review has no result after move ${k} at ${fixture.visits} visits`);
  const [key, stored] = found as [string, StoredResult];
  const [first, ...others] = stored.candidates;
  const byBlueprint = Map.groupBy(others.filter(c => c.edge.kind === "place"), c => c.edge.blueprint);
  const many = [...byBlueprint.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  if (many.length < CROWD) throw new Error(`after move ${k}, the engine places one blueprint ${many.length} times at most`);
  const chosen = many.slice(0, CROWD), most = Math.max(...stored.candidates.map(c => c.visits));
  const raised = chosen.map(c => ({ ...c, visits: most, blueWin: first.blueWin, lead: first.lead, margin: first.margin }));
  return { key, stored, crowded: { ...stored, candidates: [first, ...raised, ...others.filter(c => !chosen.includes(c))] } };
}

test("many candidates on one blueprint: the rank chips fit the hand's panel, with +N", async () => {
  // A position whose candidates place one blueprint more often than its panel shows. With the release engine-3ac5c2fc
  // (Stamp Duty 0.1), the review showed 4 candidates on blueprint 2 after move 8. With engine-91ab0b7d (Stamp Duty
  // 0.2), it shows at most 2 on one blueprint in turns 1 to 20, so the test makes such a position from the stored
  // result after move 8 (crowdedResult), and puts the stored result back after it. 4 chips fit a panel at 390 pixels,
  // and 3 at 320 pixels, WCAG 2.1's reflow width (success criterion 1.4.10). This test checks the chips only: the
  // layout test (layout.spec.ts) starts at 360.
  const { key, stored, crowded } = crowdedResult(8);
  await putResults(page, [[key, crowded]]);
  try {
    await open(320, 844, { judge: "turn" });
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
  } finally {
    await putResults(page, [[key, stored]]);
  }
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
  const own = await browser.newContext(SIZE);
  try {
    const board = await own.newPage();
    const record = "1. 1:-1,1>2:0,-1 2. 1:-1,1>2:-2,1 1:0,2>2:0,3 3. 1:0,2>2:2,2 2@1,-5x *";
    await board.goto(new URL(`/analysis#record=${encodeURIComponent(record)}`, CYANOTYPE).href);
    await expect(board.getByRole("alert")).toContainText("Move 5 (2@1,-5x) has the mark x, but the move captures no opponent cells.",
                                                         { timeout: 120_000 });
    await expect(board.getByRole("alert")).toContainText("Your own analysis is here instead.");
    expect(new URL(board.url()).hash, "the record left the address").toBe("");
    await expect(board.locator(".movelist button[data-path]")).toHaveCount(0);
  } finally {
    await own.close();
  }
});

test("the Analysis board does not open a kept board with a komi: a new board, with a notice", async ({ browser }) => {
  // The board analyzes at komi 0 only (Hedge School's design 24). Only a board at komi 0 is kept, so this is a
  // defence: a board kept with a komi, one move from the start, in a browser of its own.
  const own = await browser.newContext(SIZE);
  try {
    const board = await own.newPage();
    await board.goto(new URL("/about", CYANOTYPE).href);
    const move = "1:-1,1>2:0,-1";
    await board.evaluate(([name, stores, store, id, kept]) => new Promise<void>((resolve, reject) => {
      const open = indexedDB.open(name);
      open.onupgradeneeded = () => { for (const s of stores) open.result.createObjectStore(s); };
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction(store, "readwrite");
        tx.objectStore(store).put(kept, id);
        tx.oncomplete = () => { open.result.close(); resolve(); };
        tx.onerror = tx.onabort = () => reject(tx.error);
      };
    }), [NAME, Object.values(STORES), STORES.branches, BOARD_ID,
         { version: 2, main: [move], nodes: [[move, 0]], komi: -300 }] as const);
    await board.goto(new URL("/analysis", CYANOTYPE).href);
    await expect(board.getByRole("alert")).toHaveText("The Analysis board cannot open your own analysis: it has a komi. " +
      "The Analysis board can analyze only at komi 0. A new board is here instead.", { timeout: 120_000 });
    await expect(board.getByRole("button", { name: "New" })).toBeVisible({ timeout: 120_000 }); // the board is ready
    await expect(board.locator(".movelist button[data-path]")).toHaveCount(0);
    // A record brought that cannot open either: the kept board's notice stays first, and names the new board.
    await board.goto(new URL("/about", CYANOTYPE).href);
    const record = '[Komi "300"]\n\n1. 2@-6,-2 *';
    await board.goto(new URL(`/analysis#${new URLSearchParams({ record })}`, CYANOTYPE).href);
    await expect(board.getByRole("alert")).toHaveText("The Analysis board cannot open your own analysis: it has a komi. " +
      "The Analysis board can analyze only at komi 0. A new board is here instead. The Analysis board cannot open " +
      "this record: the record has a komi. Open the record in the review.", { timeout: 120_000 });
    await expect(board.locator(".movelist button[data-path]")).toHaveCount(0);
    // A record brought that opens: it takes the kept board's place, and the notice names no new board.
    await board.goto(new URL("/about", CYANOTYPE).href);
    await board.goto(new URL(`/analysis#${new URLSearchParams({ record: `1. ${move} *` })}`, CYANOTYPE).href);
    await expect(board.locator(".movelist button[data-path]")).toHaveCount(1, { timeout: 120_000 });
    await expect(board.getByRole("alert")).toHaveText("The Analysis board cannot open your own analysis: it has a komi. " +
      "The Analysis board can analyze only at komi 0.");
  } finally {
    await own.close();
  }
});

test("a review kept with an earlier release of the same search opens with no search", async () => {
  // The stored results' keys name the search (cache.ts, analysisKey), not the release: Stamp Duty 0.2's results of
  // engine-91ab0b7d serve engine-887be290, whose module reports the same search.
  const manifest: Manifest = await page.request.get(new URL("/engine/manifest.json", CYANOTYPE).href).then(r => r.json());
  const module = moduleOf(manifest)!, stored = readStored();
  test.skip(module.id === `engine-${stored.search}`, `the lock's release ${module.id} made the stored review itself`);
  expect(module.search).toBe(stored.search);
  expect(stored.analyses.filter(([key]) => readAnalysisKey(key).search !== stored.search)).toEqual([]);
  await reload();
  await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: 120_000 });
  await expectNoSearch(page);
});

test("no page error in the review, and no search", async () => {
  expect(errors).toEqual([]);
  await expectNoSearch(page);
});
