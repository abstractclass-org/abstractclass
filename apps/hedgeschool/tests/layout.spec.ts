// The layout test (CLAUDE.md, "How to work"): each page at every window width from 360 to 1,920 pixels, by steps of
// 10, at three heights (860: where the review's board is as wide as its column allows, and its move list was cut),
// with the browser's scroll bars shown (playwright.config.ts). At each size:
//   - the page does not scroll sideways;
//   - no area that clips or scrolls hides its content sideways (its content is no wider than its inside), but text cut
//     with an ellipsis or a fade at its end, which shows that it is cut (the analysis table's moves), what no one sees (hidden for screen readers alone, or unseen, as the
//     players' row's twin cards), a code block, which scrolls sideways on purpose, a text field, which scrolls its
//     text by design (the board editor's position), and a moving gleam that its bar clips (Lichess's bar-glider);
//   - the header is one row.
// The review shows a game of HedgeFund against itself, reviewed (tests/fixtures/hedgefund-review.json, made by
// scripts/test-fixture.mjs), the Review tab with that game kept, and Practice a game in progress from it. The import
// page shows the choice for a userscript's game, with the notice to update the userscript. Two tests check that the
// monospaced font draws no ligatures, on Hedge School and on Cyanotype (CYANOTYPE_BASE_URL). One sweeps Cyanotype's home
// page. Two check the site's menu open on a narrow window, on each site. Four check the early access's mark in the
// header and its link, on each site in each theme. Two check Cyanotype's
// Practice (CYANOTYPE_BASE_URL): its page, and a game in progress when the site has its practice bot. Two check
// Cyanotype's import page: the choice for a tool's game, and a record that the engine refuses. One checks Cyanotype's
// board with the player's notes, at design 06's sizes. One checks Openings (design 32) on the test book, with the
// book's table, where the build has it (edition.ts, OPENINGS). One checks that the sentence under the book's table
// keeps the move list in place, on Openings and the Analysis board (the review's book table test checks the review).
// Every page's sweep checks the header in one row, with Openings' fourth tab where the build has it. A last test checks
// the step bar on a phone, on the review, the Analysis board, Openings and Practice. Run: npm run test:layout (the site
// running first).
import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { loadReviewFile } from "./review-file.ts";
import { REFUSED, SPREAD_BOARD, expectNoSearch, noReview, reviewTestGame, storeReview, toolLink }
  from "./cyanotype-review.ts";
import { analysisAt, drawEach } from "./cyanotype-notes.ts";

const WIDTHS = Array.from({ length: (1920 - 360) / 10 + 1 }, (_, k) => 360 + 10 * k);
const HEIGHTS = [700, 860, 1000];
const FIXTURE = "tests/fixtures/hedgefund-review.json";

/** A rule broken, as text, and for a page or a page area that scrolls sideways, what passes its right edge (`detail`). */
interface Problem { problem: string; detail?: string }
/** A problem, with the window's size where it showed. */
interface ProblemAt extends Problem { width: number; height: number }
/** A page's own rules, checked at each size besides the rules of `problems()`: what breaks them, as text. */
type OwnRules = (page: Page) => Promise<string[]>;

/** What breaks the rules at the page's current size: empty when nothing does. Where the page or the page area scrolls
 *  sideways, the detail names, from the same moment, the elements that pass its right edge furthest (outside any box
 *  that clips them: their name, left and right edges, text, and the font list of their style, which does not say which
 *  font draws them), and the font faces not loaded yet. A failure that comes now and then (a race) then names its
 *  element by itself. */
function problems(page: Page): Promise<Problem[]> {
  return page.evaluate(() => {
    const out: Problem[] = [];
    const name = (e: Element) => `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ""}.${[...e.classList].slice(0, 4).join(".")}`;
    /** The elements in `scroller` that pass its right edge furthest, and the font faces not loaded yet, as lines. */
    const pastTheEdge = (scroller: HTMLElement, edge: number) => {
      const clipped = (e: Element) => {
        for (let a = e.parentElement; a && a !== scroller; a = a.parentElement)
          if (getComputedStyle(a).overflowX !== "visible") return true;
        return false;
      };
      const elements = [...scroller.querySelectorAll("*")].map(e => ({ e, r: e.getBoundingClientRect() }))
        .filter(({ e, r }) => r.width > 0 && r.right > edge + 0.5 && !clipped(e))
        .sort((a, b) => b.r.right - a.r.right).slice(0, 5)
        .map(({ e, r }) => `    ${name(e)}: left ${r.left.toFixed(1)}, right ${r.right.toFixed(1)}, ` +
          `font "${getComputedStyle(e).fontFamily.replace(/"/g, "").slice(0, 40)}", ` +
          `text "${(e.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40)}"`);
      const faces = new Map<string, number>();
      for (const f of document.fonts) if (f.status !== "loaded") {
        const face = `${f.family} ${f.weight} ${f.style}: ${f.status}`;
        faces.set(face, (faces.get(face) ?? 0) + 1);
      }
      const fonts = [...faces].map(([f, n]) => (n > 1 ? `${f} (${n} faces)` : f)).join("; ") || "none";
      return [`  at ${innerWidth} x ${innerHeight}, past its right edge (${edge.toFixed(1)}), furthest first:`,
              ...(elements.length ? elements : ["    nothing"]),
              `  font faces not loaded: ${fonts}`].join("\n");
    };
    const root = document.documentElement, area = document.getElementById("page");
    if (root.scrollWidth > root.clientWidth + 1)
      out.push({ problem: `the page scrolls sideways: ${root.scrollWidth} in ${root.clientWidth}`, detail: pastTheEdge(root, root.clientWidth) });
    if (area && area.scrollWidth > area.clientWidth + 1)
      out.push({ problem: `the page area scrolls sideways: ${area.scrollWidth} in ${area.clientWidth}`,
                 detail: pastTheEdge(area, area.getBoundingClientRect().left + area.clientLeft + area.clientWidth) });
    for (const e of document.querySelectorAll("body *")) {
      if (!(e instanceof HTMLElement) || !e.offsetParent && getComputedStyle(e).position !== "fixed") continue;
      const s = getComputedStyle(e);
      if (!/auto|scroll|hidden|clip/.test(s.overflowX) || e.clientWidth <= 1) continue;
      if (s.textOverflow === "ellipsis" || s.maskImage !== "none" || e.classList.contains("sr-only") || s.visibility === "hidden") continue;
      if (["PRE", "INPUT", "TEXTAREA"].includes(e.tagName)) continue;
      if (["::before", "::after"].some(p => getComputedStyle(e, p).animationName !== "none")) continue;
      if (e.scrollWidth > e.clientWidth + 1) out.push({ problem: `${name(e)} hides ${e.scrollWidth - e.clientWidth} pixels sideways (${e.scrollWidth} in ${e.clientWidth})` });
    }
    const header = document.querySelector("header");
    if (header) {
      const tops = [...header.children].filter(c => (c as HTMLElement).offsetWidth > 0).map(c => Math.round(c.getBoundingClientRect().top));
      if (Math.max(...tops) - Math.min(...tops) > 20) out.push({ problem: "the header takes more than one row" });
    }
    return out;
  });
}

/** The problems found, one line for each kind (its text without its numbers), with the sizes where it shows: the
 *  widths in runs, at each height. A kind's detail comes once, under its line, from the first size where it shows. */
function report(label: string, found: ProblemAt[]): string {
  const kinds = new Map<string, { example: string; detail?: string; at: Map<number, number[]> }>();
  for (const f of found) {
    const kind = f.problem.replace(/\d+/g, "N");
    const k = kinds.get(kind) ?? { example: f.problem, detail: f.detail, at: new Map<number, number[]>() };
    k.at.set(f.height, [...(k.at.get(f.height) ?? []), f.width]);
    kinds.set(kind, k);
  }
  const runs = (ws: number[]) => [...new Set(ws)].sort((a, b) => a - b)
    .reduce<number[][]>((out, w) => (out.at(-1) && w - out.at(-1)!.at(-1)! <= 10 ? out.at(-1)!.push(w) : out.push([w]), out), [])
    .map(r => (r.length > 1 ? `${r[0]} to ${r.at(-1)}` : `${r[0]}`)).join(", ");
  return [...kinds.values()].map(k => `${label}: ${k.example}, at widths ${[...k.at].map(([h, ws]) => `${runs(ws)} (height ${h})`).join("; ")}` +
    (k.detail ? `\n${k.detail}` : "")).join("\n");
}

/** Two frames, for the layout and what the page measures after it (the review's side columns, ResizeObserver). */
const settle = (page: Page) => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30)))));

/** The rules' problems and the page's own (`own`), at the page's current size. */
async function allProblems(page: Page, own?: OwnRules): Promise<Problem[]> {
  return [...await problems(page), ...(await own?.(page) ?? []).map(problem => ({ problem }))];
}

/** Sweeps the page at every size: the report of what broke the rules, empty when nothing did. `ownRules`: the page's
 *  own rules, checked at each size too. */
async function sweep(page: Page, label: string, ownRules?: OwnRules): Promise<string> {
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
  const found: ProblemAt[] = [];
  for (const height of HEIGHTS) for (const width of WIDTHS) {
    await page.setViewportSize({ width, height });
    await settle(page);
    for (const p of await allProblems(page, ownRules)) found.push({ width, height, ...p });
  }
  return found.length ? report(label, found) : "";
}

/** Loads the fixture's review file in the Review tab, which opens its review. */
async function reviewedGame(page: Page) {
  await page.goto("/review");
  await loadReviewFile(page, FIXTURE);
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
// not the width. The pages: each site's Notation page and editor, whose position field is in Fira Code.
// Cyanotype's test runs when CYANOTYPE_BASE_URL gives its running preview (in CI, playwright.config.ts requires it).
const CYANOTYPE = process.env.CYANOTYPE_BASE_URL;
for (const [site, urls] of Object.entries({
  "Hedge School": ["/notation", "/editor"],
  "Cyanotype": CYANOTYPE ? [new URL("/notation", CYANOTYPE).href, new URL("/editor", CYANOTYPE).href] : [],
})) {
  test(`the monospaced font draws no ligatures on ${site}`, async ({ page }) => {
    test.skip(!urls.length, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
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

// Cyanotype's home page (its design 33), when CYANOTYPE_BASE_URL gives its preview: the invitation, the board's scene
// from a reviewed game, and the ways in. The sweep checks the header in one row, with the site's menu closed below a
// tablet's width.
test("layout of Cyanotype's home page", async ({ page }) => {
  test.skip(!CYANOTYPE, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
  await page.goto(new URL("/", CYANOTYPE).href);
  await page.waitForLoadState("networkidle");
  expect(await sweep(page, "Cyanotype's /")).toBe("");
});

// Cyanotype's board editor (its design 33, as Hedge School's design 21), when CYANOTYPE_BASE_URL gives its preview: the
// board with both hands in its box, beside the panel on a computer and above it on a phone, with the engine's answer
// in the panel's status when the preview has the engine's files.
test("layout of Cyanotype's board editor", async ({ page }) => {
  test.skip(!CYANOTYPE, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
  await page.goto(new URL("/editor", CYANOTYPE).href);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/The engine (accepts|cannot)|no engine on this site/)).toBeVisible({ timeout: 120_000 });
  expect(await sweep(page, "Cyanotype's /editor")).toBe("");
});

// The site's menu open (packages/site/src/SiteMenu.svelte, design 22), on both sites, at each width where the header
// shows it, by steps of 10, at the lowest of the sweep's heights: Hedge School's below 1,024 pixels, Cyanotype's below
// 640. At each width, the menu opens from the header's button. Its links are the header's own (Tools only from 640
// pixels), each in view and inside the menu, and nothing covers it. The page keeps the sweep's rules. Hedge School's
// visitor has answered the consent notice, which would cover the menu until they choose.
for (const [site, base, below] of [["Hedge School", "", 1024], ["Cyanotype", CYANOTYPE, 640]] as const) {
  test(`layout of the site's menu on ${site}`, async ({ page }) => {
    test.skip(base === undefined, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
    await page.addInitScript(() =>
      localStorage.setItem("hedge-school:consent:2", JSON.stringify({ analytics: "denied", games: "denied" })));
    await page.goto(base ? new URL("/about", base).href : "/about");
    await page.waitForLoadState("networkidle");
    const header = await page.locator("header nav a").evaluateAll(as => as.map(a => a.getAttribute("href")!));
    const found: { width: number; height: number; problem: string }[] = [];
    const height = HEIGHTS[0];
    for (const width of WIDTHS.filter(w => w < below)) {
      await page.setViewportSize({ width, height });
      await settle(page);
      await page.getByRole("button", { name: "Menu" }).click();
      const menu = page.getByRole("menu");
      await expect(menu).toBeVisible();
      await settle(page);
      const expected = header.filter(href => width >= 640 || href !== "/tools");
      const own = await menu.evaluate((box, expected) => {
        const out: string[] = [], r = box.getBoundingClientRect();
        if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight)
          out.push(`the menu leaves the window (${Math.round(r.left)}, ${Math.round(r.top)}, ${Math.round(r.right)}, ${Math.round(r.bottom)})`);
        const links = [...box.querySelectorAll("a")].filter(a => a.offsetWidth > 0);
        const hrefs = links.map(a => a.getAttribute("href"));
        if (hrefs.join(" ") !== expected.join(" ")) out.push(`the menu's links are ${hrefs.join(" ")}, not ${expected.join(" ")}`);
        for (const a of links) {
          const l = a.getBoundingClientRect(), hit = document.elementFromPoint(l.x + l.width / 2, l.y + l.height / 2);
          if (l.left < r.left - 1 || l.right > r.right + 1 || l.top < r.top - 1 || l.bottom > r.bottom + 1)
            out.push(`the menu's link ${a.getAttribute("href")} leaves the menu`);
          else if (!a.contains(hit)) out.push(`something covers the menu's link ${a.getAttribute("href")}`);
          if (a.scrollWidth > a.clientWidth + 1) out.push(`the menu's link ${a.getAttribute("href")} cuts its text`);
        }
        return out;
      }, expected);
      for (const problem of [...await problems(page), ...own]) found.push({ width, height, problem });
      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
    }
    expect(report(`${site}'s menu`, found)).toBe("");
  });
}

// The early access's mark (design 11, "The header"; packages/site/src/SiteName.svelte), on both sites, in the early
// edition that check:all and the workflows build (VITE_EDITION=early), at 360 and 1,280 pixels, in each theme (the
// theme menu's System, on the browser's scheme). On the home page, "Early Access" is in the header, after the name, in
// the accent colour, in the window, with nothing over it, and the header keeps the sweep's rules. A click on it opens
// the About page at its section on the early access, under the header.
for (const [site, base] of [["Hedge School", ""], ["Cyanotype", CYANOTYPE]] as const) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`the early access's mark on ${site}, ${colorScheme}`, async ({ page }) => {
      test.skip(base === undefined, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
      await page.addInitScript(() =>
        localStorage.setItem("hedge-school:consent:2", JSON.stringify({ analytics: "denied", games: "denied" })));
      await page.emulateMedia({ colorScheme });
      const found: string[] = [];
      for (const width of [360, 1280]) {
        await page.setViewportSize({ width, height: HEIGHTS[0] });
        await page.goto(base ? new URL("/", base).href : "/");
        await page.waitForLoadState("networkidle");
        await settle(page);
        const at = `at ${width} pixels`;
        expect(await page.evaluate(() => document.documentElement.dataset.theme), at).toBe(colorScheme);
        const mark = page.locator("header").getByRole("link", { name: "Early Access", exact: true });
        await expect(mark, at).toBeVisible();
        await expect(mark, at).toHaveAttribute("href", "/about#early-access");
        const own = await mark.evaluate(a => {
          const out: string[] = [], r = a.getBoundingClientRect();
          const probe = document.createElement("span");
          probe.style.color = "var(--accent)";
          document.body.append(probe);
          const accent = getComputedStyle(probe).color, colour = getComputedStyle(a).color;
          probe.remove();
          if (colour !== accent) out.push(`the mark's colour is ${colour}, not the accent's ${accent}`);
          if (r.left < 0 || r.right > innerWidth) out.push(`the mark leaves the window (${Math.round(r.left)} to ${Math.round(r.right)})`);
          const home = document.querySelector('header a[href="/"]')?.getBoundingClientRect();
          if (!home || r.left < home.right) out.push("the mark is not after the site's name");
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          if (!a.contains(hit)) out.push("something covers the mark");
          return out;
        });
        found.push(...[...own, ...(await problems(page)).map(p => p.problem)].map(p => `${at}: ${p}`));
        await mark.click();
        await page.waitForURL(/\/about#early-access$/);
        const heading = page.locator("#early-access");
        await expect(heading, at).toHaveText("Early access");
        await expect(heading, at).toBeInViewport();
        const under = await heading.evaluate(h =>
          h.getBoundingClientRect().top >= document.querySelector("header")!.getBoundingClientRect().bottom - 1);
        if (!under) found.push(`${at}: the header covers the About page's section`);
      }
      expect(found).toEqual([]);
    });
  }
}

// Cyanotype's Practice (its design 33, "Practice against Stamp Duty"), when CYANOTYPE_BASE_URL gives its preview. The
// page as the site's build gives it: the settings card with the engine's files (the Tests workflow's build has them),
// a notice without them (a build made before `npm run engine`). With the practice bot, a game in progress, the player
// to move: the lab's middle game, Stamp Duty's own moves (apps/cyanotype/src/lib/board/fixtures.json). Besides the
// sweep, design 06's window sizes, 2,560 x 1,440 among them.
// The page's own rules: the status line shows its whole text, the hands' panel stays on the board, and in one column
// (under 800 pixels) the field is at least as high as it is wide.
const CYANOTYPE_PRACTICE_SIZES = [[1376, 952], [1920, 1080], [2560, 1440], [390, 844]];
/** The problems at each of those sizes, with the page's own rules, one entry each with its size. A detail comes on
 *  lines of its own, under its problem's line. */
async function problemsAtSizes(page: Page, own?: OwnRules): Promise<string[]> {
  const found: string[] = [];
  for (const [width, height] of CYANOTYPE_PRACTICE_SIZES) {
    await page.setViewportSize({ width, height });
    await settle(page);
    for (const p of await allProblems(page, own)) found.push(`${width} x ${height}: ${p.problem}${p.detail ? `\n${p.detail}` : ""}`);
  }
  return found;
}
test("layout of Cyanotype's /practice", async ({ page }) => {
  test.skip(!CYANOTYPE, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
  await page.goto(new URL("/practice", CYANOTYPE).href);
  await page.evaluate(() => localStorage.removeItem("cyanotype:practice-game:1"));
  await page.reload();
  await expect(page.getByRole("button", { name: "Play as Blue" }).or(page.getByRole("alert"))).toBeVisible({ timeout: 60_000 });
  expect(await sweep(page, "Cyanotype's /practice")).toBe("");
});

test("layout of a practice game on Cyanotype", async ({ page }) => {
  test.skip(!CYANOTYPE, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
  const manifest = await page.request.get(new URL("/engine/manifest.json", CYANOTYPE).href).then(r => r.json()).catch(() => null);
  test.skip(!manifest?.artifacts?.some((a: { kind: string }) => a.kind === "practice-module"),
            "Cyanotype's preview has no practice bot: run `npm run engine` in apps/cyanotype before its build");
  const fixtures = JSON.parse(readFileSync("../cyanotype/src/lib/board/fixtures.json", "utf8")).fixtures as { name: string; moves: string[] }[];
  const moves = fixtures.find(f => f.name === "A middle game")!.moves; // Red to move
  await page.goto(new URL("/practice", CYANOTYPE).href);
  await page.evaluate(kept => localStorage.setItem("cyanotype:practice-game:1", JSON.stringify(kept)),
    { version: 1, bot: { network: manifest.artifacts.find((a: { kind: string }) => a.kind === "model").id, visits: 32, variety: "low" },
      human: 1, name: "", seed: 1, moves, builds: [], started: new Date().toISOString() });
  await page.reload();
  await expect(page.getByTestId("practice-status")).toHaveText(/^Your turn/, { timeout: 120_000 });
  const own = (p: Page) => p.evaluate(() => {
    const out: string[] = [], status = document.querySelector('[data-testid="practice-status"]');
    if (status && status.scrollHeight > status.clientHeight + 1) out.push(`the status line cuts its text (${status.scrollHeight} in ${status.clientHeight})`);
    const field = document.querySelector(".board .field")?.getBoundingClientRect(), panel = document.querySelector(".hands-panel")?.getBoundingClientRect();
    if (field && panel && (panel.left < field.left - 1 || panel.top < field.top - 1 || panel.right > field.right + 1 || panel.bottom > field.bottom + 1))
      out.push("the hands' panel leaves the board");
    if (innerWidth < 800 && field && field.height < field.width - 1) out.push(`the field is ${Math.round(field.width)} wide and ${Math.round(field.height)} high`);
    return out;
  });
  expect(await sweep(page, "a practice game on Cyanotype", own)).toBe("");
  expect(await problemsAtSizes(page, own)).toEqual([]);
});

// Cyanotype's review and Analysis board (its design 33), when CYANOTYPE_BASE_URL gives its preview with the engine's
// files: the review's test game up to turn 20, and the Analysis board on the practice bot's position of more views,
// with its candidates. Both cases load the stored review (cyanotype-review.ts, storeReview), and nothing searches
// here: only cyanotype-review.spec.ts reviews the test game with the engine. The review has the engine off. The board
// shows "Not analyzed yet." with the engine off, though the store holds the result of its position. So the board has
// the engine on, and its search takes the stored result. Each case checks that the page asked the engine for no
// search (expectNoSearch). Besides the sweep, design 06's window sizes.
for (const [name, path] of [["review", ""], ["Analysis board", SPREAD_BOARD]] as const) {
  test(`layout of Cyanotype's ${name}`, async ({ page }) => {
    const skip = await noReview(page);
    test.skip(!!skip, skip);
    if (path) {
      await storeReview(page, {}, { on: true });
      await page.goto(new URL(path, CYANOTYPE).href);
      await expect(page.locator("main.review")).not.toHaveAttribute("aria-busy", { timeout: 120_000 });
      const candidates = page.locator("table").filter({ hasText: "Visits" }).first().locator("[data-name]");
      await expect(candidates.first()).toBeVisible({ timeout: 120_000 });
    } else await reviewTestGame(page);
    await expectNoSearch(page);
    const found = await problemsAtSizes(page);
    expect([await sweep(page, `Cyanotype's ${name}`), ...found].filter(Boolean).join("\n")).toBe("");
  });
}

// Cyanotype's board with the player's notes (its design 33, "The player's notes"), on the Analysis board with the
// review's test game, the engine off: in each colour four hexes marked by a right drag with Shift and an arrow, at
// design 06's sizes. The notes stay with the board when the window's size changes, and stay inside the field.
test("layout of Cyanotype's board with notes", async ({ page }) => {
  const skip = await noReview(page);
  test.skip(!!skip, skip);
  await page.setViewportSize({ width: 1376, height: 952 });
  await analysisAt(page, 10);
  await drawEach(page);
  const own = (p: Page) => p.evaluate(() => {
    const out: string[] = [], field = document.querySelector(".board .field")!.getBoundingClientRect();
    const notes = [...document.querySelectorAll(".board .field g.note")];
    if (notes.length !== 20) out.push(`${notes.length} notes on the board, not 20`);
    for (const n of notes) {
      const r = n.getBoundingClientRect();
      if (r.left < field.left - 1 || r.top < field.top - 1 || r.right > field.right + 1 || r.bottom > field.bottom + 1)
        out.push(`a note leaves the field (${Math.round(r.left)}, ${Math.round(r.top)})`);
    }
    return out;
  });
  expect(await problemsAtSizes(page, own)).toEqual([]);
});

// The import page's choice for a tool's game (design 21), below the notice that an out-of-date userscript gets.
test("layout of the choice for a tool's game", async ({ page }) => {
  const record = '[Blue "Ann"]\n[Red "Bo"]\n\n1. D10-E13 2. Q10-R8 O11-Q10 *\n';
  await page.goto("/import#" + new URLSearchParams({ tool: "userscript", v: "old", site: "strategyjam.org", at: "1", record }));
  await expect(page.getByRole("button", { name: "Analyze on the board" })).toBeVisible();
  expect(await sweep(page, "/import, a tool's game")).toBe("");
});

// Cyanotype's import page (its design 33), when CYANOTYPE_BASE_URL gives its preview with the engine's files: the
// choice for the review's test game, below the notice that an out-of-date userscript gets, and a record that the engine
// refuses (REFUSED: an x on a move that captures nothing). Besides the sweep, design 06's window sizes.
const IMPORT_PAGES: [string, string | undefined, (p: Page) => Locator][] = [
  ["the choice", undefined, p => p.getByRole("button", { name: "Analyze on the board" })],
  ["a refused record", REFUSED, p => p.getByRole("alert")],
];
for (const [name, record, shown] of IMPORT_PAGES) {
  test(`layout of Cyanotype's import page: ${name}`, async ({ page }) => {
    const skip = await noReview(page);
    test.skip(!!skip, skip);
    await page.goto(toolLink({ tool: "userscript", v: "old", at: 5, record }));
    await expect(shown(page)).toBeVisible({ timeout: 120_000 });
    const found = await problemsAtSizes(page);
    expect([await sweep(page, `Cyanotype's /import, ${name}`), ...found].filter(Boolean).join("\n")).toBe("");
  });
}

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

// The book's table in the review's analysis column (design 32, items 3 and 10), after the game's first edge, by edge
// and by turn ("Review by"). By edge its six rows have edges of 6 and 7 characters. By turn it is turn 2's start, and
// its rows are whole turns of two edges: the best 8 and the best turn outside the book. The Report's end row turns the
// book on, and on a phone it opens the Analysis tab. At every size, the table fits its box, each head stays on one
// line, and the rows' quality label badges start at one place, after the edges' fixed width. By turn in a narrow box,
// a turn's second edge goes under its first. The test book is served by the dev and preview servers only, and the
// review shows the book in the early edition only: elsewhere the test is skipped.
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
  for (const [judge, rows] of [["edge", 6], ["turn", 9]] as const) {
    await page.setViewportSize({ width: 360, height: 700 });
    await page.evaluate(j => localStorage.setItem("learn-enclosure:review-display:1", JSON.stringify({ judge: j })), judge);
    await page.reload();
    await page.getByRole("button", { name: /^The game followed the book to its end/ }).click({ timeout: 300_000 });
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".mv.here")).toHaveText(/^A10-D9/);
    await expect(page.getByRole("region", { name: "Opening book" }).locator("tbody tr[data-move]")).toHaveCount(rows);
    const steady = await steadyMoveList(page, `/review by ${judge}, 360 pixels wide`);
    expect(await sweep(page, `/review, the book's table by ${judge}`, bookTableProblems)).toBe("");
    await page.setViewportSize({ width: 1400, height: 900 });
    steady.push(...await steadyMoveList(page, `/review by ${judge}, 1,400 pixels wide`));
    expect(steady).toEqual([]);
  }
});

/** The sentence under the book's table (design 32, item 6) keeps the move list in place: the move list's top does not
 *  move while the pointer goes over each row of the table, then while the focus does. The sentence changes on the way,
 *  else the check proves nothing. Gives the problems, each named by `where`. */
async function steadyMoveList(page: Page, where: string): Promise<string[]> {
  const book = page.getByRole("region", { name: "Opening book" });
  const rows = book.locator("tbody tr[data-item]");
  const count = await rows.count();
  if (!count) return [`${where}: the book's table has no rows`];
  // From the table's top, as a row that the pointer or the focus goes to scrolls the page on a phone
  const top = () => page.evaluate(() => {
    const list = document.querySelector(".movelist"), table = document.querySelector('[aria-label="Opening book"]');
    return list && table ? list.getBoundingClientRect().top - table.getBoundingClientRect().top : NaN;
  });
  const sentence = () => book.locator(".grid > div:not(.invisible)").first().textContent();
  await page.mouse.move(0, 0);
  const at = await top(), out: string[] = [], said = new Set([await sentence()]);
  for (const [how, go] of [["the pointer", (k: number) => rows.nth(k).hover()], ["the focus", (k: number) => rows.nth(k).focus()]] as const) {
    for (let k = 0; k < count; k++) {
      await go(k);
      said.add(await sentence());
      const now = await top();
      if (Math.abs(now - at) > 0.5) out.push(`${where}: with ${how} on row ${k + 1}, the move list moves ${Math.round(now - at)} pixels`);
    }
  }
  await page.keyboard.press("Escape");
  if (said.size < 2) out.push(`${where}: the sentence never changed, so the check proves nothing`);
  return out;
}

/** The book's table's own rules at the page's size: it fits its box, each head is one line box, and the rows' badges
 *  start at one place, though their edges differ in length. */
function bookTableProblems(page: Page) {
  return page.evaluate(() => {
    const table = document.querySelector('[aria-label="Opening book"] table');
    const heads = [...table?.querySelectorAll("thead th") ?? []];
    if (!table || !heads.length) return ["the book's table is not there"];
    const out: string[] = [];
    for (const head of heads) {
      const range = document.createRange();
      range.selectNodeContents(head);
      const lines = new Set([...range.getClientRects()].map(r => Math.round(r.top))).size;
      if (lines !== 1) out.push(`the head "${head.textContent?.trim()}" takes ${lines} lines`);
    }
    const box = table.parentElement!;
    if (table.scrollWidth > box.clientWidth) out.push(`the table is ${table.scrollWidth - box.clientWidth} pixels wider than its box`);
    // A row's badge is its second cell's image, whose name is its word
    const starts = new Set([...table.querySelectorAll('tbody td:nth-child(2) [role="img"]')]
      .map(b => Math.round(b.getBoundingClientRect().left)));
    if (starts.size !== 1) out.push(`the rows' badges start at ${starts.size} places`);
    const lengths = new Set([...table.querySelectorAll("tbody tr[data-move]")].map(r => r.getAttribute("data-move")!.length));
    if (lengths.size < 2) out.push("the rows' edges have one length, so the badges' places prove nothing");
    return out;
  });
}

// Openings (design 32, items 5 and 10): its first view at the start, with the book's table, and a fold of the move
// list open. Only where the build has Openings, which the test book's servers serve.
test("layout of /openings", async ({ page }) => {
  const served = await page.request.get("/test-book/prototype/index.json");
  test.skip(!served.ok() || !(served.headers()["content-type"] ?? "").includes("json"), "the site serves no test book");
  await page.addInitScript(() => {
    localStorage.setItem("hedge-school:consent:2", JSON.stringify({ analytics: "denied", games: "denied" }));
    localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false }));
  });
  await page.goto("/about");
  test.skip(!(await page.locator('header a[href="/openings"]').count()), "a build without Openings");
  await page.goto("/openings");
  await page.locator("button[aria-expanded]", { hasText: "instead of A10-D9" }).click({ timeout: 60_000 });
  await expect(page.locator('button[aria-expanded="true"]')).toHaveCount(1);
  expect(await sweep(page, "/openings")).toBe("");
});

// The sentence under the book's table keeps the move list in place (design 32, item 6), on Openings and on the
// Analysis board, by edge and by turn, at a desktop's size and a phone's: at turn 2's start, whose rows by turn are
// whole turns. The review's book table test checks the review. Only where the build has Openings.
test("the sentence under the book's table keeps the move list in place", async ({ browser }) => {
  test.setTimeout(240_000);
  const out: string[] = [];
  for (const size of [{ width: 1400, height: 900 }, { width: 360, height: 740 }]) {
    for (const judge of ["edge", "turn"]) {
      // A new browser each time: the Analysis board keeps its board and its choice of the book
      const phone = size.width < 400;
      const context = await browser.newContext({ viewport: size, isMobile: phone, hasTouch: phone });
      const page = await context.newPage();
      const served = await page.request.get("/test-book/prototype/index.json");
      if (!served.ok() || !(served.headers()["content-type"] ?? "").includes("json")) { await context.close(); test.skip(true, "the site serves no test book"); }
      await page.addInitScript(([d]) => {
        localStorage.setItem("hedge-school:consent:2", JSON.stringify({ analytics: "denied", games: "denied" }));
        localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false }));
        localStorage.setItem("learn-enclosure:review-display:1", d);
      }, [JSON.stringify({ judge })]);
      await page.goto("/about");
      if (!(await page.locator('header a[href="/openings"]').count())) { await context.close(); test.skip(true, "a build without Openings"); }
      await page.goto("/openings#record=A10-D9");
      await expect(page.locator('button.mv[aria-current="location"]')).toHaveAttribute("data-path", "A10-D9", { timeout: 60_000 });
      out.push(...await steadyMoveList(page, `/openings by ${judge}, ${size.width} pixels wide`));
      await page.goto("/analysis#" + new URLSearchParams({ record: "A10-D9", at: "1" }));
      await expect(page.locator('button.mv[aria-current="location"]')).toHaveAttribute("data-path", "A10-D9", { timeout: 60_000 });
      const book = page.getByRole("region", { name: "Opening book" });
      await book.getByRole("button", { name: "Book" }).click();
      out.push(...await steadyMoveList(page, `/analysis by ${judge}, ${size.width} pixels wide`));
      await context.close();
    }
  }
  expect(out).toEqual([]);
});

/** Opens Practice in a game in progress, kept in this browser (hedgefund.ts, KeptPractice): the fixture's first 20
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
// on the review, the Analysis board, Openings (where the build has it) and Practice. The visitor has answered the
// consent notice, which covers the bar until they choose: a build that stores practice games, as CI's, asks for it.
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
  // Openings, where the build has it (design 32, item 10)
  if (await page.locator('header a[href="/openings"]').count()) {
    await page.goto("/openings#" + new URLSearchParams({ record: "D10-G9 N11-Q10" }));
    await expect(page.locator('button.mv[aria-current="location"]')).toHaveAttribute("data-path", "D10-G9 N11-Q10", { timeout: 60_000 });
    for (const problem of await stepBarProblems(page)) found.push(`/openings: ${problem}`);
  }
  await practiceGame(page);
  for (const problem of await stepBarProblems(page)) found.push(`/practice: ${problem}`);
  await context.close();
  expect(found.join("\n")).toBe("");
});
