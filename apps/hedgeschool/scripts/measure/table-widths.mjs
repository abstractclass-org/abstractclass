// The candidates table's column widths on Cyanotype or Hedge School (packages/review/src/ReviewView.svelte,
// engineTable): how well each column of the shared colgroup fits its content (decisions/product.md, "The candidates
// table's column widths, measured on Cyanotype"). On Cyanotype the script opens the review of the test game from the
// stored review (tests/cyanotype-review.ts, reviewTestGame: Stamp Duty against itself, up to turn 20, with the engine
// on at Lite and the GPU off, so the page asks the engine for no search). Then it reads the table at every position of
// the game, by move, at each window width (in the Analysis tab where the window has one), in each "Move notation"
// (Glyphs, the default, and Text). With `--site hedgeschool` it opens Hedge School's stored review instead (the review
// file of the layout test, tests/fixtures/hedgefund-review.json, from the Review tab), and reads the table at every
// position by edge, in the site's default edge notation (one notation: "edges"). For each column it gives:
//
// - the column's width, its header's width, and the widest value of its cells (the text's measured width);
// - the cells cut (content wider than the cell's content box), and the room left over (the median and the least);
// - for the Move column: the names at full size, the names made smaller (fitName) and their least size, the names cut,
//   and the widest name at full size;
// - the widest value that the column can show, measured in the first row's semibold: "Blue +1.2k" (a lead from 1,000
//   on), "100.0%" and a 5-digit visit count (the position on screen goes to 16,384 visits: settings.ts). Lead's are
//   measured in Arial too, a wider font than Segoe UI, as a stand-in for other systems' fonts (not a measure of them);
// - the table's width and the side column's width, and the position whose Lead value is the widest.
//
// A window is `W` (its height from HEIGHT) or `WxH`: on Cyanotype the board is a square as high as the window allows,
// so the height sets the side column's width (364 to 460 pixels) and the Move column's.
//
// With `--lab`, the page takes the proposal (LAB_CSS, below) before it loads, as a style sheet. It is a lab switch in
// this script, not in the site's code. The proposal of the wide Lead column is in the site's code since then (its
// colgroup), so `--lab` on a build that has it changes nothing. With `--crops DIR`, the script takes crops of the table
// instead of the measure: at the `--crop-sizes` windows, light and dark, in the first notation (Glyphs on
// Cyanotype), at the position after move (or edge) `--crop-move`. A crop's file is `<site>-table-<window>-<scheme>-<tag>.png`, its tag "after" with `--lab` and else
// "before", or `--crop-tag`'s.
//
//   node scripts/measure/table-widths.mjs [--site hedgeschool] [--lab] [--json FILE] [--widths 360,1376x768,...]
//                                         [--notations glyphs,text]
//   node scripts/measure/table-widths.mjs [--site hedgeschool] [--lab] --crops DIR [--crop-move K]
//                                         [--crop-sizes 390,1376] [--crop-tag TAG]
//   node scripts/measure/table-widths.mjs --from FILE      the report again, from a run's --json, with no browser
//
// Run it in apps/hedgeschool, with CYANOTYPE_BASE_URL at a Cyanotype build that has the engine's files, or, for Hedge
// School, BASE_URL at its build (playwright.config.ts's address by default). Headless Chromium only, with
// playwright.config.ts's launch options (off the GPU on Windows).
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import config from "../../playwright.config.ts";
import { CYANOTYPE, DISPLAY, MOVES, noReview, reviewTestGame } from "../../tests/cyanotype-review.ts";
import { loadReviewFile } from "../../tests/review-file.ts";

const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const LAB = process.argv.includes("--lab");
const JSON_OUT = arg("--json"), CROPS = arg("--crops"), FROM = arg("--from");
/** The site: "cyanotype" (the default) or "hedgeschool". Hedge School's address is the layout test's (BASE_URL). */
const SITE = arg("--site") ?? "cyanotype", HEDGE = SITE === "hedgeschool";
if (!["cyanotype", "hedgeschool"].includes(SITE)) throw new Error(`--site: cyanotype or hedgeschool, not ${SITE}`);
const HEDGE_URL = config.use.baseURL, HEDGE_REVIEW = "tests/fixtures/hedgefund-review.json";
/** The word of the position's line ("Move 3 of 39" on Cyanotype, "Edge 3 of 120" on Hedge School). */
const WORD = HEDGE ? "Edge" : "Move";
/** The number of positions read: the game's moves (Cyanotype's stored review), or its edges (read from the page). */
let positionCount = MOVES;
/** Each width's window height: a phone's, a tablet's, then computers'. */
const HEIGHT = { 360: 780, 390: 844, 768: 1024, 1024: 768, 1280: 800, 1376: 952, 1920: 1080 };
/** The windows: `W` (its height from HEIGHT, else 900) or `WxH`, each with its label as given. */
const sizes = list => list.split(",").map(s => {
  const [w, h] = s.split("x").map(Number);
  return { w, h: h || HEIGHT[w] || 900, label: s };
});
const WIDTHS = sizes(arg("--widths") ?? "360,390,768,1024,1280,1376,1920");
const CROP_SIZES = sizes(arg("--crop-sizes") ?? "390,1376");
const NOTATIONS = (arg("--notations") ?? (HEDGE ? "edges" : "glyphs,text")).split(",");
/** The columns, by short keys, and their names in the glossary (GLOSSARY.md, "The engine's candidates" and "The
 *  engine's numbers"). */
const COLUMNS = ["#", "Move", "win%", "Lead", "Visits"];
const NAMES = { "#": "Rank (#)", Move: "Move", "win%": "Win chance", Lead: "Lead", Visits: "Visits" };
/** The widest values that each column can show (the first row's semibold measures them). */
const WORST = { "#": [], "win%": ["100.0%"], Lead: ["Blue +1.2k", "Blue +999", "Red +1.2k"], Visits: ["16384"] };
/** Shorter headers for the Win chance column, measured in the header's font. */
const HEADS = ["Blue wins", "Blue %", "Win %", "Win", "%"];
/** The proposal: the Lead column at LEAD_WIDE where the table is at least TABLE_LEAST wide, so that the Move column
 *  keeps the widest name at full size (Glyphs: 139.4 pixels and the cell's 8 of padding) after the other columns.
 *  Narrower, Lead keeps its 4.75rem. The table's box is the query's container, as the colgroup's classes would have it
 *  (`@container` on the box, `@min-[24rem]:w-22` on the col). */
const LEAD_WIDE = "5.5rem", TABLE_LEAST = "24rem";
const PROPOSAL = { Lead: `4.75rem; ${LEAD_WIDE} where the table is ${TABLE_LEAST} wide or more` };
const LAB_CSS = `div:has(> table.table-fixed) { container-type: inline-size; }
@container (min-width: ${TABLE_LEAST}) { table.table-fixed > colgroup > col:nth-child(4) { width: ${LEAD_WIDE} !important; } }`;
/** The position of the crops: after this move. After move 7, four of the five names in view are cut at 390 pixels
 *  and smaller at 1,376 pixels, in Glyphs. */
const CROP_MOVE = Number(arg("--crop-move") ?? 7);
/** The crops' tag in their files' names. */
const CROP_TAG = arg("--crop-tag") ?? (LAB ? "after" : "before");

const launchOptions = config.projects.find(p => p.name === "chromium").use.launchOptions;

/** In the page: the visible candidates table, read. */
function readTable({ worst, heads: heads_ }) {
  const box = [...document.querySelectorAll("div:has(> table.table-fixed)")]
    .find(d => d.offsetParent && [...d.querySelectorAll("th")].some(t => t.textContent.trim() === "Visits"));
  if (!box) return null;
  const table = box.querySelector("table");
  const textWidth = el => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width; };
  const room = td => { const s = getComputedStyle(td); return td.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight); };
  const heads = [...table.querySelectorAll("thead th")];
  const head = heads.map(th => ({ col: th.getBoundingClientRect().width, room: room(th), text: th.textContent.trim(),
                                  width: textWidth(th) }));
  const rows = [...table.querySelectorAll("tbody tr")].filter(tr => tr.children.length === 5).map((tr, i) => {
    const tds = [...tr.children];
    return tds.map((td, c) => {
      if (c !== 1) return { room: room(td), width: textWidth(td), text: td.textContent.trim(), first: i === 0 };
      const name = td.querySelector("[data-name]"), mark = td.querySelector("[data-name] + span");
      const size = parseFloat(getComputedStyle(name).fontSize) / parseFloat(getComputedStyle(name.parentElement).fontSize);
      const width = textWidth(name);
      return { room: room(td), width: width + (mark ? mark.getBoundingClientRect().width + 4 : 0), full: width / size, size,
               cut: width > name.clientWidth + 0.5, mark: !!mark, text: name.textContent.trim(), first: i === 0 };
    });
  });
  // The widest values each column can show, in the first row's font (semibold): a span in the row's cell, hidden
  const first = table.querySelector("tbody tr");
  const probe = {};
  for (const [c, texts] of Object.entries(worst)) {
    const td = first.children[{ "#": 0, "win%": 2, Lead: 3, Visits: 4 }[c]];
    probe[c] = texts.map(t => {
      const s = document.createElement("span");
      s.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
      s.textContent = t;
      td.append(s);
      const w = s.getBoundingClientRect().width;
      s.style.fontFamily = "Arial";
      const arial = s.getBoundingClientRect().width;
      s.remove();
      return { text: t, width: w, arial };
    });
  }
  probe.heads = heads_.map(t => {
    const s = document.createElement("span");
    s.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
    s.textContent = t;
    heads[2].append(s);
    const w = s.getBoundingClientRect().width;
    s.remove();
    return { text: t, width: w };
  });
  return { head, rows, probe, font: getComputedStyle(table).fontFamily, scroll: box.scrollWidth > box.clientWidth + 1,
           table: table.getBoundingClientRect().width, side: box.closest("section.side")?.getBoundingClientRect().width };
}

const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };
const r1 = x => (Number.isFinite(x) ? Math.round(x * 10) / 10 : "–");

async function openAt(page, { w, h }, notation) {
  // Cyanotype's "Move notation". Hedge School keeps its default edge notation.
  if (!HEDGE)
    await page.evaluate(([k, d]) => localStorage.setItem(k, JSON.stringify({ ...JSON.parse(localStorage.getItem(k) ?? "{}"), ...d })),
                        [DISPLAY, { notation }]);
  await page.setViewportSize({ width: w, height: h });
  await page.reload();
  await page.locator("main.review:not([aria-busy])").waitFor({ timeout: 120_000 });
  // The Analysis tab: on a phone, and in a window too narrow for three columns (below 1,260 pixels)
  const tab = page.getByRole("tab", { name: "Analysis", exact: true });
  if (await tab.isVisible()) await tab.click();
}

/** The table at the position after move `k` once it holds still: the same reading twice, 150 ms apart. */
async function settled(page, k) {
  await page.locator("section.side").filter({ hasText: `${WORD} ${k + 1} of ${positionCount}` }).waitFor({ timeout: 20_000 });
  let last = "";
  for (let i = 0; i < 40; i++) {
    const t = await page.evaluate(readTable, { worst: WORST, heads: HEADS });
    const s = JSON.stringify(t);
    if (t && t.rows.length && s === last) return t;
    last = s;
    await page.waitForTimeout(150);
  }
  throw new Error(`the table after move ${k} does not hold still`);
}

async function start(browser) {
  const context = await browser.newContext({ viewport: { width: 1376, height: 952 } });
  const page = await context.newPage();
  // The lab: the proposal as a style sheet
  if (LAB) await page.addInitScript(css => {
    document.addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style"); s.textContent = css; document.head.append(s);
    });
  }, LAB_CSS);
  if (HEDGE) {
    // The layout test's review: the review file, from the Review tab, which stores the game and opens its review
    await page.goto(new URL("/review", HEDGE_URL).href);
    if (!/Hedge School/.test(await page.title())) throw new Error(`${HEDGE_URL} serves no Hedge School`);
    await loadReviewFile(page, HEDGE_REVIEW);
    await page.waitForURL(/#game=/);
    await page.locator("main.review:not([aria-busy])").waitFor({ timeout: 120_000 });
    const line = await page.locator("section.side").filter({ hasText: new RegExp(`${WORD} \\d+ of \\d+`) }).first().innerText();
    positionCount = Number(line.match(new RegExp(`${WORD} \\d+ of (\\d+)`))[1]);
    return { context, page };
  }
  const why = await noReview(page);
  if (why) throw new Error(why);
  await reviewTestGame(page, {}, { on: true });
  return { context, page };
}

/** The positions after move 0 to MOVES − 1, by the keys. */
async function* positions(page) {
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.keyboard.press("Home");
  for (let k = 0; k < positionCount; k++) {
    if (k) await page.keyboard.press("ArrowRight");
    yield [k, await settled(page, k)];
  }
}

function summarize(readings) {
  // readings: [{ w, notation, k, t }], w a window's label
  const out = [];
  const notations = [...new Set(readings.map(r => r.notation))], windows = [...new Set(readings.map(r => String(r.w)))];
  for (const notation of notations) for (const w of windows) {
    const at = readings.filter(r => String(r.w) === w && r.notation === notation);
    if (!at.length) continue;
    for (let c = 0; c < 5; c++) {
      const col = COLUMNS[c];
      const cells = at.flatMap(r => r.t.rows.map(row => ({ ...row[c], k: r.k })));
      const heads = at.map(r => r.t.head[c]);
      const rooms = cells.map(x => x.room - x.width), head = heads.reduce((a, h) => (h.width > a.width ? h : a));
      const value = cells.reduce((a, x) => (x.width > a.width ? x : a));
      const row = { notation, w, col, colWidth: median(heads.map(h => h.col)), contentBox: median(heads.map(h => h.room)),
                    cells: cells.length, head: { text: head.text, width: head.width }, value: { text: value.text, width: value.width, k: value.k },
                    cut: c === 1 ? cells.filter(x => x.cut).length : cells.filter(x => x.width > x.room + 0.5).length,
                    headCut: heads.filter(h => h.width > h.room + 0.5).length,
                    roomMedian: median(rooms), roomLeast: Math.min(...rooms) };
      if (c === 1) {
        const sizes = cells.map(x => x.size);
        Object.assign(row, { table: median(at.map(r => r.t.table)), side: median(at.map(r => r.t.side)),
                             full: cells.filter(x => x.size > 0.999 && !x.cut).length,
                             shrunk: cells.filter(x => x.size <= 0.999 && !x.cut).length,
                             leastSize: Math.min(...sizes), medianShrunk: median(sizes.filter(s => s <= 0.999)),
                             widestFull: Math.max(...cells.map(x => x.full + (x.mark ? x.width - x.full * x.size : 0))),
                             roomMedian: median(cells.map(x => x.room - x.full)), roomLeast: Math.min(...cells.map(x => x.room - x.full)) });
      }
      const probe = at[0].t.probe[col];
      if (probe?.length) row.worst = probe.reduce((a, p) => (p.width > a.width ? p : a));
      // The width that shows the header and every value, seen or possible, with the cell's padding
      row.fits = Math.max(row.head.width, row.value.width, row.worst?.width ?? 0) + (row.colWidth - row.contentBox);
      out.push(row);
    }
  }
  return out;
}

function markdown(rows) {
  const lines = [];
  lines.push("| Notation | Width | Column | Column px | Room px | Header px | Widest value seen px | Cut | Left over: median / least px | Widest possible px | Fits all px |");
  lines.push("|---|---:|---|---:|---:|---|---|---:|---|---|---:|");
  // A column whose numbers are the same at every width and in each notation (its width is fixed): one line
  const same = (a, b) => JSON.stringify({ ...a, notation: 0, w: 0 }) === JSON.stringify({ ...b, notation: 0, w: 0 });
  const fixed = rows.filter(r => r.col !== "Move");
  for (const r of fixed.filter((r, i) => !fixed.slice(0, i).some(q => same(q, r)))) {
    const alike = fixed.filter(q => q.col === r.col && same(q, r)), all = alike.length === fixed.filter(q => q.col === r.col).length;
    const notations = [...new Set(alike.map(q => q.notation))], windows = [...new Set(alike.map(q => q.w))];
    lines.push(`| ${all ? "both" : notations.join(", ")} | ${all ? "all" : windows.join(", ")} | ${NAMES[r.col]} | ${r1(r.colWidth)} | ${r1(r.contentBox)} | ${r1(r.head.width)} (${r.head.text}) | ` +
               `${r1(r.value.width)} (${r.value.text}, after move ${r.value.k}) | ${r.cut}${r.headCut ? ` + header ${r.headCut}` : ""} of ${r.cells} | ` +
               `${r1(r.roomMedian)} / ${r1(r.roomLeast)} | ` +
               `${r.worst ? `${r1(r.worst.width)} (${r.worst.text}${r.worst.arial ? `; Arial ${r1(r.worst.arial)}` : ""})` : "–"} | ${r1(r.fits)} |`);
  }
  lines.push("");
  lines.push("| Notation | Width | Side px | Table px | Move px | Room px | Names | Full size | Smaller | Least size | Median smaller size | Cut | Widest at full size px | Left over at full size: median / least px |");
  lines.push("|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|");
  for (const r of rows.filter(r => r.col === "Move"))
    lines.push(`| ${r.notation} | ${r.w} | ${r1(r.side)} | ${r1(r.table)} | ${r1(r.colWidth)} | ${r1(r.contentBox)} | ${r.cells} | ${r.full} | ${r.shrunk} | ` +
               `${Math.floor(100 * r.leastSize)}% | ${Number.isFinite(r.medianShrunk) ? `${Math.floor(100 * r.medianShrunk)}%` : "–"} | ` +
               `${r.cut} | ${r1(r.widestFull)} | ${r1(r.roomMedian)} / ${r1(r.roomLeast)} |`);
  return lines.join("\n");
}

/** The report of a run's readings: its tables, and the Win chance column's headers. */
function report(readings, lab) {
  return `${lab ? `With the proposal (${JSON.stringify(lab)})` : "The current widths"}, ` +
         `${new Set(readings.map(r => r.k)).size} positions a width, font ${readings[0].t.font}\n\n${markdown(summarize(readings))}\n\n` +
         `The Win chance column's header, in its font: ` +
         `${readings[0].t.probe.heads.map(h => `"${h.text}" ${r1(h.width)} px`).join(", ")}`;
}

if (FROM) {
  const { lab, proposal, readings } = JSON.parse(readFileSync(FROM, "utf8"));
  console.log(report(readings, lab && proposal));
  process.exit(0);
}
if (!HEDGE && !CYANOTYPE) throw new Error("Set CYANOTYPE_BASE_URL to the Cyanotype build's address");
const browser = await chromium.launch(launchOptions);
try {
  const { context, page } = await start(browser);
  if (CROPS) {
    mkdirSync(CROPS, { recursive: true });
    for (const scheme of ["light", "dark"]) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const size of CROP_SIZES) {
        await openAt(page, size, NOTATIONS[0]);
        let found = false;
        for await (const [k] of positions(page)) if (k === CROP_MOVE) { found = true; break; }
        if (!found) throw new Error(`no position after move ${CROP_MOVE}`);
        await page.mouse.move(1, 1);
        const box = page.locator('div:has(> table.table-fixed)').filter({ visible: true }).filter({ has: page.locator("th", { hasText: "Visits" }) }).first();
        const file = join(CROPS, `${SITE}-table-${size.label}-${scheme}-${CROP_TAG}.png`);
        await box.screenshot({ path: file });
        console.log(file);
      }
    }
  } else {
    const readings = [];
    for (const notation of NOTATIONS) for (const size of WIDTHS) {
      const w = size.label;
      // A slow load can miss a wait: one more try
      for (let attempt = 1; ; attempt++) {
        try {
          const read = [];
          await openAt(page, size, notation);
          for await (const [k, t] of positions(page)) read.push({ w, notation, k, t });
          readings.push(...read);
          break;
        } catch (e) {
          if (attempt === 2) throw e;
          console.error(`${notation} ${w}: ${String(e).split("\n")[0]}; again`);
        }
      }
      console.error(`${notation} ${w}: ${positionCount} positions read`);
    }
    if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ lab: LAB, proposal: LAB ? PROPOSAL : null, readings }));
    console.log(report(readings, LAB && PROPOSAL));
  }
  await context.close();
} finally {
  await browser.close();
}
