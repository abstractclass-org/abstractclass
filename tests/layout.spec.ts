// The layout sweep (CLAUDE.md, "How to work"): each page at every window width from 360 to 1,920 pixels, by steps of
// 10, at three heights (860: where the review's board is as wide as its column allows, and its move list was cut),
// with the browser's scroll bars shown (playwright.config.ts). At each size:
//   - the page does not scroll sideways;
//   - no area that clips or scrolls hides its content sideways (its content is no wider than its inside), but text cut
//     with an ellipsis, which shows that it is cut, what no one sees (hidden for screen readers alone, or unseen, as the
//     players' row's twin cards), a code block, which scrolls sideways on purpose, a text field, which scrolls its
//     text by design (the board editor's position), and a moving gleam that its bar clips (Lichess's bar-glider);
//   - the header is one row.
// The review shows a game of HedgeFund against itself, reviewed (tests/fixtures/hedgefund-review.json, made by
// scripts/test-fixture.mjs), and Practice a game in progress from it. Run: npm run test:layout (the site running first).
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

/** Sweeps the page at every size: the report of what broke the rules, empty when nothing did. */
async function sweep(page: Page, label: string): Promise<string> {
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
    for (const problem of await problems(page)) found.push({ width, height, problem });
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

// The review's display settings that change its move list's width (review/display.ts): by turn, the turn's label and
// loss in a fourth column; by edge, each edge's in its own cell, wider (the move list cut at 1,280 pixels showed by
// edge only); and the labels as text, not badges.
const REVIEW_DISPLAYS: [string, Record<string, string>][] = [
  ["the default display", {}],
  ["labels by edge", { judge: "edge" }],
  ["labels by edge, as text", { judge: "edge", marks: "text", branchForm: "text" }],
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
  expect(reports.filter(Boolean).join("\n")).toBe("");
});

test("layout of a practice game", async ({ page }) => {
  // A game in progress, kept in this browser (practice.ts, KeptPractice): the fixture's first 20 edges, the player to
  // move next, so that the bot does not search.
  const moves = (JSON.parse(readFileSync(FIXTURE, "utf8")).record as string).replace(/\[[^\]]*\]/g, "").split(/\s+/).filter(t => /^[A-T]\d+-[A-T]\d+$/.test(t)).slice(0, 20);
  await page.goto("/practice");
  await page.evaluate(kept => localStorage.setItem("hedge-school:practice-game:1", JSON.stringify(kept)), {
    version: 1, bot: { network: "b10c128-s66625408-d13350730", visits: 64, variety: "low" }, human: 0, name: "", seed: 1,
    moves, builds: [], started: new Date().toISOString(),
  });
  await page.reload();
  await expect(page.locator(".mv").first()).toBeVisible({ timeout: 120_000 });
  expect(await sweep(page, "/practice in a game")).toBe("");
});
