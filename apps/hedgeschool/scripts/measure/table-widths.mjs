// The candidates table's column widths on Cyanotype (packages/review/src/ReviewView.svelte, engineTable): how well
// each column of the shared colgroup fits its content (decisions/product.md, "The candidates table's column widths,
// measured on Cyanotype"). The script opens the review of the test game from the stored review
// (tests/cyanotype-review.ts, reviewTestGame: Stamp Duty against itself, up to turn 20, with the engine on at Lite and
// the GPU off, so the page asks the engine for no search). Then it reads the table at every position of the game, by
// move, at each window width (in the Analysis tab where the window has one), in each "Move notation" (Glyphs, the
// default, and Text). For each column it gives:
//
// - the column's width, its header's width, and the widest value of its cells (the text's measured width);
// - the cells cut (content wider than the cell's content box), and the room left over (the median and the least);
// - for the Move column: the names at full size, the names made smaller (fitName) and their least size, the names cut,
//   and the widest name at full size;
// - the widest value that the column can show, measured in the first row's semibold: "Blue +1.2k" (a lead from 1,000
//   on), "100.0%" and a 5-digit visit count (the position on screen goes to 16,384 visits: settings.ts).
//
// With `--lab`, the page takes the proposal (PROPOSAL and PROPOSED_HEAD, below) before it loads: the widths as a style
// sheet, and the Win chance column's header as text. It is a lab switch in this script, not in the site's code. With
// `--crops DIR`, the script takes crops of the table instead of the measure: at 390 and 1,376 pixels, light and dark,
// in Glyphs, at the position after move `--crop-move`.
//
//   node scripts/measure/table-widths.mjs [--lab] [--json FILE] [--widths 360,390,...] [--notations glyphs,text]
//   node scripts/measure/table-widths.mjs [--lab] --crops DIR [--crop-move K]
//   node scripts/measure/table-widths.mjs --from FILE      the report again, from a run's --json, with no browser
//
// Run it in apps/hedgeschool, with CYANOTYPE_BASE_URL at a Cyanotype build that has the engine's files. Headless
// Chromium only, with playwright.config.ts's launch options (off the GPU on Windows).
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import config from "../../playwright.config.ts";
import { CYANOTYPE, DISPLAY, MOVES, noReview, reviewTestGame } from "../../tests/cyanotype-review.ts";

const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const LAB = process.argv.includes("--lab");
const JSON_OUT = arg("--json"), CROPS = arg("--crops"), FROM = arg("--from");
const WIDTHS = (arg("--widths") ?? "360,390,768,1024,1280,1376,1920").split(",").map(Number);
/** Each width's window height: a phone's, a tablet's, then computers'. */
const HEIGHT = { 360: 780, 390: 844, 768: 1024, 1024: 768, 1280: 800, 1376: 952, 1920: 1080 };
const NOTATIONS = (arg("--notations") ?? "glyphs,text").split(",");
/** The columns, by short keys, and their names in the glossary (GLOSSARY.md, "The engine's candidates" and "The
 *  engine's numbers"). */
const COLUMNS = ["#", "Move", "win%", "Lead", "Visits"];
const NAMES = { "#": "Rank (#)", Move: "Move", "win%": "Win chance", Lead: "Lead", Visits: "Visits" };
/** The widest values that each column can show (the first row's semibold measures them). */
const WORST = { "#": [], "win%": ["100.0%"], Lead: ["Blue +1.2k", "Blue +999", "Red +1.2k"], Visits: ["16384"] };
/** Shorter headers for the Win chance column, measured in the header's font. */
const HEADS = ["Blue wins", "Blue %", "Win %", "Win", "%"];
/** The proposed widths, as the colgroup's classes would give them (Tailwind's spacing: 0.25rem a step), and the
 *  proposed header of the Win chance column. */
const PROPOSAL = { "#": "1.75rem", "win%": "3.5rem", Lead: "4.75rem", Visits: "3rem" };
const PROPOSED_HEAD = "Win %";
/** The position of the crops: after this move. After move 7, four of the five names in view are cut at 390 pixels
 *  and smaller at 1,376 pixels, in Glyphs. */
const CROP_MOVE = Number(arg("--crop-move") ?? 7);

const launchOptions = config.projects.find(p => p.name === "chromium").use.launchOptions;
const labStyle = () => {
  const n = { "#": 1, "win%": 3, Lead: 4, Visits: 5 };
  return Object.entries(PROPOSAL).map(([c, w]) => `table.table-fixed > colgroup > col:nth-child(${n[c]}) { width: ${w} !important; }`).join("\n");
};

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
      s.remove();
      return { text: t, width: w };
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
  return { head, rows, probe, font: getComputedStyle(table).fontFamily, scroll: box.scrollWidth > box.clientWidth + 1 };
}

const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };
const r1 = x => (Number.isFinite(x) ? Math.round(x * 10) / 10 : "–");

async function openAt(page, w, notation) {
  await page.evaluate(([k, d]) => localStorage.setItem(k, JSON.stringify({ ...JSON.parse(localStorage.getItem(k) ?? "{}"), ...d })),
                      [DISPLAY, { notation }]);
  await page.setViewportSize({ width: w, height: HEIGHT[w] ?? 900 });
  await page.reload();
  await page.locator("main.review:not([aria-busy])").waitFor({ timeout: 120_000 });
  // The Analysis tab: on a phone, and in a window too narrow for three columns (below 1,260 pixels)
  const tab = page.getByRole("tab", { name: "Analysis", exact: true });
  if (await tab.isVisible()) await tab.click();
}

/** The table at the position after move `k` once it holds still: the same reading twice, 150 ms apart. */
async function settled(page, k) {
  await page.locator("section.side").filter({ hasText: `Move ${k + 1} of ${MOVES}` }).waitFor({ timeout: 20_000 });
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
  // The lab: the proposed widths as a style sheet, and the proposed header, written again each time the page writes
  // the mover's name there
  if (LAB) await page.addInitScript(([css, head]) => {
    document.addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style"); s.textContent = css; document.head.append(s);
      const rename = () => {
        for (const th of document.querySelectorAll("table.table-fixed thead th:nth-child(3)"))
          if (/^(Blue|Red) wins$/.test(th.textContent.trim())) th.textContent = head;
      };
      new MutationObserver(rename).observe(document.body, { subtree: true, childList: true, characterData: true });
    });
  }, [labStyle(), PROPOSED_HEAD]);
  const why = await noReview(page);
  if (why) throw new Error(why);
  await reviewTestGame(page, {}, { on: true });
  return { context, page };
}

/** The positions after move 0 to MOVES − 1, by the keys. */
async function* positions(page) {
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.keyboard.press("Home");
  for (let k = 0; k < MOVES; k++) {
    if (k) await page.keyboard.press("ArrowRight");
    yield [k, await settled(page, k)];
  }
}

function summarize(readings) {
  // readings: [{ w, notation, k, t }]
  const out = [];
  for (const notation of NOTATIONS) for (const w of WIDTHS) {
    const at = readings.filter(r => r.w === w && r.notation === notation);
    if (!at.length) continue;
    for (let c = 0; c < 5; c++) {
      const col = COLUMNS[c];
      const cells = at.flatMap(r => r.t.rows.map(row => row[c]));
      const heads = at.map(r => r.t.head[c]);
      const rooms = cells.map(x => x.room - x.width), head = heads.reduce((a, h) => (h.width > a.width ? h : a));
      const value = cells.reduce((a, x) => (x.width > a.width ? x : a));
      const row = { notation, w, col, colWidth: median(heads.map(h => h.col)), contentBox: median(heads.map(h => h.room)),
                    cells: cells.length, head: { text: head.text, width: head.width }, value: { text: value.text, width: value.width },
                    cut: c === 1 ? cells.filter(x => x.cut).length : cells.filter(x => x.width > x.room + 0.5).length,
                    headCut: heads.filter(h => h.width > h.room + 0.5).length,
                    roomMedian: median(rooms), roomLeast: Math.min(...rooms) };
      if (c === 1) {
        const sizes = cells.map(x => x.size);
        Object.assign(row, { full: cells.filter(x => x.size > 0.999 && !x.cut).length,
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
    const all = fixed.filter(q => q.col === r.col).every(q => same(q, r));
    lines.push(`| ${all ? "both" : r.notation} | ${all ? "all" : r.w} | ${NAMES[r.col]} | ${r1(r.colWidth)} | ${r1(r.contentBox)} | ${r1(r.head.width)} (${r.head.text}) | ` +
               `${r1(r.value.width)} (${r.value.text}) | ${r.cut}${r.headCut ? ` + header ${r.headCut}` : ""} of ${r.cells} | ` +
               `${r1(r.roomMedian)} / ${r1(r.roomLeast)} | ${r.worst ? `${r1(r.worst.width)} (${r.worst.text})` : "–"} | ${r1(r.fits)} |`);
  }
  lines.push("");
  lines.push("| Notation | Width | Move px | Room px | Names | Full size | Smaller | Least size | Median smaller size | Cut | Widest at full size px | Left over at full size: median / least px |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|");
  for (const r of rows.filter(r => r.col === "Move"))
    lines.push(`| ${r.notation} | ${r.w} | ${r1(r.colWidth)} | ${r1(r.contentBox)} | ${r.cells} | ${r.full} | ${r.shrunk} | ` +
               `${Math.floor(100 * r.leastSize)}% | ${Number.isFinite(r.medianShrunk) ? `${Math.floor(100 * r.medianShrunk)}%` : "–"} | ` +
               `${r.cut} | ${r1(r.widestFull)} | ${r1(r.roomMedian)} / ${r1(r.roomLeast)} |`);
  return lines.join("\n");
}

/** The report of a run's readings: its tables, and the Win chance column's headers. */
function report(readings, lab) {
  return `${lab ? `With the proposal (${JSON.stringify(PROPOSAL)}, header "${PROPOSED_HEAD}")` : "The current widths"}, ` +
         `${MOVES} positions a width, font ${readings[0].t.font}\n\n${markdown(summarize(readings))}\n\n` +
         `The Win chance column's header, in its font: ` +
         `${readings[0].t.probe.heads.map(h => `"${h.text}" ${r1(h.width)} px`).join(", ")}`;
}

if (FROM) {
  const { lab, readings } = JSON.parse(readFileSync(FROM, "utf8"));
  console.log(report(readings, lab));
  process.exit(0);
}
if (!CYANOTYPE) throw new Error("Set CYANOTYPE_BASE_URL to the Cyanotype build's address");
const browser = await chromium.launch(launchOptions);
try {
  const { context, page } = await start(browser);
  if (CROPS) {
    mkdirSync(CROPS, { recursive: true });
    for (const scheme of ["light", "dark"]) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const w of [390, 1376]) {
        await openAt(page, w, "glyphs");
        let found = false;
        for await (const [k] of positions(page)) if (k === CROP_MOVE) { found = true; break; }
        if (!found) throw new Error(`no position after move ${CROP_MOVE}`);
        await page.mouse.move(1, 1);
        const box = page.locator('div:has(> table.table-fixed)').filter({ visible: true }).filter({ has: page.locator("th", { hasText: "Visits" }) }).first();
        const file = join(CROPS, `table-${w}-${scheme}-${LAB ? "after" : "before"}.png`);
        await box.screenshot({ path: file });
        console.log(file);
      }
    }
  } else {
    const readings = [];
    for (const notation of NOTATIONS) for (const w of WIDTHS) {
      // A slow load can miss a wait: one more try
      for (let attempt = 1; ; attempt++) {
        try {
          const read = [];
          await openAt(page, w, notation);
          for await (const [k, t] of positions(page)) read.push({ w, notation, k, t });
          readings.push(...read);
          break;
        } catch (e) {
          if (attempt === 2) throw e;
          console.error(`${notation} ${w}: ${String(e).split("\n")[0]}; again`);
        }
      }
      console.error(`${notation} ${w}: ${MOVES} positions read`);
    }
    if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ lab: LAB, proposal: LAB ? PROPOSAL : null, readings }));
    console.log(report(readings, LAB));
  }
  await context.close();
} finally {
  await browser.close();
}
