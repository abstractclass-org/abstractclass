// The layout test (CLAUDE.md, "How to work"): each page at every window width from 360 to 1,920 pixels, by steps of
// 10, at three heights (860: where the review's board is as wide as its column allows, and its move list was cut),
// with the browser's scroll bars shown (playwright.config.ts). At each size:
//   - the page does not scroll sideways;
//   - no area that clips or scrolls hides its content sideways (its content is no wider than its inside), but text cut
//     with an ellipsis, which shows that it is cut, what no one sees (hidden for screen readers alone, or unseen, as the
//     players' row's twin cards), a code block, which scrolls sideways on purpose, a text field, which scrolls its
//     text by design (the board editor's position), and a moving gleam that its bar clips (Lichess's bar-glider);
//   - the header is one row.
// The review shows a game of HedgeFund against itself, reviewed (tests/fixtures/hedgefund-review.json, made by
// scripts/test-fixture.mjs), the Review tab with that game kept, and Practice a game in progress from it. The import
// page shows the choice for a userscript's game, with the notice to update the userscript. Two tests check that the
// monospaced font draws no ligatures, on Hedge School and on Drawing Board (DB_BASE_URL). A last test checks the step
// bar on a phone, on the review, the Analysis board and Practice. Run: npm run test:layout (the site running first).
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const WIDTHS = Array.from({ length: (1920 - 360) / 10 + 1 }, (_, k) => 360 + 10 * k);
const HEIGHTS = [700, 860, 1000];
const FIXTURE = "tests/fixtures/hedgefund-review.json";

/** What breaks the rules at the page's current size, as text: empty when nothing does. */
function problems(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    const name = (e: Element) => `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ""}.${[...e.classList].slice(0, 4).join(".")}`;
    const root = document.documentElement, area = document.getElementById("page");
    if (root.scrollWidth > root.clientWidth + 1) out.push(`the page scrolls sideways: ${root.scrollWidth} in ${root.clientWidth}`);
    if (area && area.scrollWidth > area.clientWidth + 1) out.push(`the page area scrolls sideways: ${area.scrollWidth} in ${area.clientWidth}`);
    for (const e of document.querySelectorAll("body *")) {
      if (!(e instanceof HTMLElement) || !e.offsetParent && getComputedStyle(e).position !== "fixed") continue;
      const s = getComputedStyle(e);
      if (!/auto|scroll|hidden|clip/.test(s.overflowX) || e.clientWidth <= 1) continue;
      if (s.textOverflow === "ellipsis" || e.classList.contains("sr-only") || s.visibility === "hidden") continue;
      if (["PRE", "INPUT", "TEXTAREA"].includes(e.tagName)) continue;
      if (["::before", "::after"].some(p => getComputedStyle(e, p).animationName !== "none")) continue;
      if (e.scrollWidth > e.clientWidth + 1) out.push(`${name(e)} hides ${e.scrollWidth - e.clientWidth} pixels sideways (${e.scrollWidth} in ${e.clientWidth})`);
    }
    const header = document.querySelector("header");
    if (header) {
      const tops = [...header.children].filter(c => (c as HTMLElement).offsetWidth > 0).map(c => Math.round(c.getBoundingClientRect().top));
      if (Math.max(...tops) - Math.min(...tops) > 20) out.push("the header takes more than one row");
    }
    return out;
  });
}

/** The problems found, one line for each kind (its text without its numbers), with the sizes where it shows: the
 *  widths in runs, at each height. */
function report(label: string, found: { width: number; height: number; problem: string }[]): string {
  const kinds = new Map<string, { example: string; at: Map<number, number[]> }>();
  for (const f of found) {
    const kind = f.problem.replace(/\d+/g, "N");
    const k = kinds.get(kind) ?? { example: f.problem, at: new Map() };
    k.at.set(f.height, [...(k.at.get(f.height) ?? []), f.width]);
    kinds.set(kind, k);
  }
  const runs = (ws: number[]) => [...new Set(ws)].sort((a, b) => a - b)
    .reduce<number[][]>((out, w) => (out.at(-1) && w - out.at(-1)!.at(-1)! <= 10 ? out.at(-1)!.push(w) : out.push([w]), out), [])
    .map(r => (r.length > 1 ? `${r[0]} to ${r.at(-1)}` : `${r[0]}`)).join(", ");
  return [...kinds.values()].map(k => `${label}: ${k.example}, at widths ${[...k.at].map(([h, ws]) => `${runs(ws)} (height ${h})`).join("; ")}`).join("\n");
}

/** Two frames, for the layout and what the page measures after it (the review's side columns, ResizeObserver). */
const settle = (page: Page) => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30)))));

/** Sweeps the page at every size: the report of what broke the rules, empty when nothing did. `ownRules`: the page's
 *  own rules, checked at each size too. */
async function sweep(page: Page, label: string, ownRules?: (page: Page) => Promise<string[]>): Promise<string> {
  // The browser must show scroll bars: without them, the sweep misses the room that they take.
  const bar = await page.evaluate(() => {
    const d = document.createElement("div");
    d.style.cssText = "position:absolute;width:100px;height:100px;overflow:scroll;visibility:hidden";
    document.body.append(d);
    const w = d.offsetWidth - d.clientWidth;
    d.remove();
    return w;
  });
  expect(bar, "the browser shows scroll bars").toBeGreaterThan(0);
  const found: { width: number; height: number; problem: string }[] = [];
  for (const height of HEIGHTS) for (const width of WIDTHS) {
    await page.setViewportSize({ width, height });
    await settle(page);
    for (const problem of [...await problems(page), ...await ownRules?.(page) ?? []]) found.push({ width, height, problem });
  }
  return found.length ? report(label, found) : "";
}

/** Loads the fixture's review file in the Review tab, which opens its review. */
async function reviewedGame(page: Page) {
  await page.goto("/review");
  await page.locator('input[type="file"][accept*="json"]').first().setInputFiles(FIXTURE);
  await page.waitForURL(/#game=/);
}

for (const path of ["/", "/about", "/privacy", "/notation", "/tools", "/editor", "/analysis", "/practice"]) {
  test(`layout of ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await sweep(page, path)).toBe("");
  });
}

/** The monospaced font's ligature settings on the page: the font-mono utility's (a probe's), the elements in Fira Code
 *  (texts and fields) whose settings differ from it, and the probe's width in em a character. */
function monoSettings(page: Page) {
  return page.evaluate(() => {
    const name = (e: Element) => `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ""}.${[...e.classList].slice(0, 4).join(".")}`;
    const text = "k3x9q ?? => !=", probe = document.createElement("span");
    probe.textContent = text;
    probe.className = "font-mono";
    document.body.append(probe);
    const s = getComputedStyle(probe), utility = s.fontFeatureSettings;
    const emPerCharacter = probe.getBoundingClientRect().width / parseFloat(s.fontSize) / text.length;
    probe.remove();
    const differing = [...document.querySelectorAll("body *")].filter(e => {
      const t = getComputedStyle(e);
      return /Fira Code/.test(t.fontFamily) && t.fontFeatureSettings !== utility;
    });
    return { utility, differing: differing.map(name), emPerCharacter };
  });
}

// The monospaced font draws no ligatures (design 06, item 11), on both sites: a record's text shows as it is, and the
// columns keep their width of 0.6 em a character. Fira Code's ligatures keep that width, so the settings show them,
// not the width. The pages: each site's Notation page, and Hedge School's editor, whose position field is in Fira Code.
// Drawing Board's test runs when DB_BASE_URL gives its running preview.
const DRAWING_BOARD = process.env.DB_BASE_URL;
for (const [site, urls] of Object.entries({
  "Hedge School": ["/notation", "/editor"],
  "Drawing Board": DRAWING_BOARD ? [new URL("/notation", DRAWING_BOARD).href] : [],
})) {
  test(`the monospaced font draws no ligatures on ${site}`, async ({ page }) => {
    test.skip(!urls.length, "DB_BASE_URL gives no Drawing Board preview");
    for (const url of urls) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.fonts.ready);
      const { utility, differing, emPerCharacter } = await monoSettings(page);
      expect(utility.split(", ").sort(), url).toEqual(['"calt" 0', '"liga" 0']);
      expect(differing, `${url}: Fira Code with other ligature settings`).toEqual([]);
      expect(emPerCharacter, url).toBeCloseTo(0.6, 2);
    }
  });
}

// The import page's choice for a tool's game (design 21), below the notice that an out-of-date userscript gets.
test("layout of the choice for a tool's game", async ({ page }) => {
  const record = '[Blue "Ann"]\n[Red "Bo"]\n\n1. D10-E13 2. Q10-R8 O11-Q10 *\n';
  await page.goto("/import#" + new URLSearchParams({ tool: "userscript", v: "old", site: "strategyjam.org", at: "1", record }));
  await expect(page.getByRole("button", { name: "Analyze on the board" })).toBeVisible();
  expect(await sweep(page, "/import, a tool's game")).toBe("");
});

// The review's display settings that change its move list's width (review/display.ts): by turn, the turn's label and
// loss in a fourth column; by edge, each edge's in its own cell, wider (the move list cut at 1,280 pixels showed by
// edge only); and the labels as text, not badges. In the early edition, the book moves' marks take the labels' slots:
// the label on the book's brown by default, and an open book as a mark alone, the widest mark.
const REVIEW_DISPLAYS: [string, Record<string, string>][] = [
  ["the default display", {}],
  ["labels by edge", { judge: "edge" }],
  ["labels by edge, as text", { judge: "edge", marks: "text", branchForm: "text" }],
  ["labels by edge, as text, the book moves as a book", { judge: "edge", marks: "text", bookMoves: "book" }],
];

test("layout of a review", async ({ page }) => {
  await reviewedGame(page); // the review opens the game: a second opening would find it open "in another tab"
  const reports: string[] = [];
  for (const [name, display] of REVIEW_DISPLAYS) {
    // The page settled first: the import opens the review by a navigation of its own.
    await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: 300_000 });
    await page.evaluate(d => localStorage.setItem("learn-enclosure:review-display:1", JSON.stringify(d)), display);
    await page.reload();
    // The review done: the move list's labels and numbers are in, which make it widest. A build that does not know
    // the file's engine reviews the game again, from its results.
    await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: 300_000 });
    reports.push(await sweep(page, `/review, ${name}`));
  }
  // The Review tab with the game kept: "Continue your last review", its game cut to fit, and the list of games.
  await page.goto("/review");
  await expect(page.getByText("Continue your last review")).toBeVisible();
  reports.push(await sweep(page, "/review, the Review tab"));
  expect(reports.filter(Boolean).join("\n")).toBe("");
});

// The book's table in the review's analysis column (design 32, items 3 and 10), after the game's first edge, where its
// six rows have edges of 6 and 7 characters. The Report's end row turns the book on, and on a phone it opens the
// Analysis tab. At every size, the head "Line ends" stays on one line, and the rows' quality label badges start at
// one place, after the edge's fixed width. The test book is served by the dev and preview servers only, and the review
// shows the book in the early edition only: elsewhere the test is skipped.
test("layout of the book's table in a review", async ({ page }) => {
  const served = await page.request.get("/test-book/prototype/index.json");
  test.skip(!served.ok() || !(served.headers()["content-type"] ?? "").includes("json"), "the site serves no test book");
  // The visitor has answered the consent notice, which would cover the Report's row on a phone
  await page.addInitScript(() =>
    localStorage.setItem("hedge-school:consent:2", JSON.stringify({ analytics: "denied", games: "denied" })));
  await page.goto("/review");
  test.skip(!(await page.getByRole("link", { name: "Early Access" }).count()), "not the early edition");
  await reviewedGame(page);
  await expect(page.getByText(/^Review done/)).toBeVisible({ timeout: 300_000 });
  await page.setViewportSize({ width: 360, height: 700 });
  await page.reload();
  await page.getByRole("button", { name: /^The game followed the book to its end/ }).click({ timeout: 300_000 });
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".mv.here")).toHaveText(/^A10-D9/);
  await expect(page.getByRole("region", { name: "Opening book" }).locator("tbody tr[data-move]")).toHaveCount(6);
  expect(await sweep(page, "/review, the book's table", bookTableProblems)).toBe("");
});

/** The book's table's own rules at the page's size: its head "Line ends" is one line box, and the rows' badges start
 *  at one place, though their edges differ in length. */
function bookTableProblems(page: Page) {
  return page.evaluate(() => {
    const table = document.querySelector('[aria-label="Opening book"] table');
    const head = [...table?.querySelectorAll("th") ?? []].find(th => th.textContent?.trim() === "Line ends");
    if (!table || !head) return ["the book's table is not there"];
    const out: string[] = [];
    const range = document.createRange();
    range.selectNodeContents(head);
    const lines = new Set([...range.getClientRects()].map(r => Math.round(r.top))).size;
    if (lines !== 1) out.push(`the head "Line ends" takes ${lines} lines`);
    // A row's badge is its second cell's image, whose name is its word
    const starts = new Set([...table.querySelectorAll('tbody td:nth-child(2) [role="img"]')]
      .map(b => Math.round(b.getBoundingClientRect().left)));
    if (starts.size !== 1) out.push(`the rows' badges start at ${starts.size} places`);
    const lengths = new Set([...table.querySelectorAll("tbody tr[data-move]")].map(r => r.getAttribute("data-move")!.length));
    if (lengths.size < 2) out.push("the rows' edges have one length, so the badges' places prove nothing");
    return out;
  });
}

/** Opens Practice in a game in progress, kept in this browser (practice.ts, KeptPractice): the fixture's first 20
 *  edges, the player to move next, so that the bot does not search. */
async function practiceGame(page: Page) {
  const moves = (JSON.parse(readFileSync(FIXTURE, "utf8")).record as string).replace(/\[[^\]]*\]/g, "").split(/\s+/).filter(t => /^[A-T]\d+-[A-T]\d+$/.test(t)).slice(0, 20);
  await page.goto("/practice");
  await page.evaluate(kept => localStorage.setItem("hedge-school:practice-game:1", JSON.stringify(kept)), {
    version: 1, bot: { network: "b10c128-s66625408-d13350730", visits: 64, variety: "low" }, human: 0, name: "", seed: 1,
    moves, builds: [], started: new Date().toISOString(),
  });
  await page.reload();
  await expect(page.locator(".mv").first()).toBeVisible({ timeout: 120_000 });
}

test("layout of a practice game", async ({ page }) => {
  await practiceGame(page);
  expect(await sweep(page, "/practice in a game")).toBe("");
});

/** Where the step bar on a phone fails, as text: at every 100 pixels down the page, the board in view and the step back
 *  not in view or under something, and at the page's end, its last move under the bar. */
function stepBarProblems(page: Page) {
  return page.evaluate(async () => {
    const out: string[] = [];
    const frame = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    const scroller = document.scrollingElement!, board = document.querySelector("svg.board")!;
    const back = document.querySelector<HTMLElement>('.step-dock [aria-label="Back"]')!;
    for (let y = 0; ; y += 100) {
      scroller.scrollTop = y;
      await frame();
      const b = board.getBoundingClientRect(), r = back.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      if (b.bottom > 0 && b.top < innerHeight && (r.top < 0 || r.bottom > innerHeight || !back.contains(hit)))
        out.push(`at ${y} pixels down, the board is in view and the step back is not`);
      if (scroller.scrollTop < y) break;
    }
    // The move list scrolls in its own box where it is taller than its room (moveList.ts, MOVE_LIST): its end too.
    for (const list of document.querySelectorAll(".movelist")) list.scrollTop = list.scrollHeight;
    await frame();
    const moves = document.querySelectorAll(".mv"), last = moves[moves.length - 1].getBoundingClientRect();
    if (last.bottom > document.querySelector(".step-dock")!.getBoundingClientRect().top)
      out.push("at the page's end, the step bar covers the last move");
    return out;
  });
}

// The step bar on a phone (design 06, item 4): on a touch screen of 360 × 640, the bar is fixed to the window's foot,
// on the review, the Analysis board and Practice. The visitor has answered the consent notice, which covers the bar
// until they choose: a build that stores practice games, as CI's, asks for it.
test("the step bar on a phone", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });
  await context.addInitScript(() =>
    localStorage.setItem("hedge-school:consent:2", JSON.stringify({ analytics: "denied", games: "denied" })));
  const page = await context.newPage();
  const record = JSON.parse(readFileSync(FIXTURE, "utf8")).record as string;
  const found: string[] = [];
  await reviewedGame(page);
  await expect(page.getByText(/^Review done/).first()).toBeVisible({ timeout: 300_000 });
  for (const problem of await stepBarProblems(page)) found.push(`/review: ${problem}`);
  await page.goto("/analysis#" + new URLSearchParams({ record }));
  await expect(page.locator(".mv").first()).toBeVisible({ timeout: 60_000 });
  for (const problem of await stepBarProblems(page)) found.push(`/analysis: ${problem}`);
  await practiceGame(page);
  for (const problem of await stepBarProblems(page)) found.push(`/practice: ${problem}`);
  await context.close();
  expect(found.join("\n")).toBe("");
});
