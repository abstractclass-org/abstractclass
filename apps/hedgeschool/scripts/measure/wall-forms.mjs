// The weak walls' ring forms for a look before a choice (design 30, "The weak walls", item 3; weakWalls.ts,
// `WALL_FORMS`): each form drawn in the real page, at the positions that show the walls (design 30, "Positions that
// show them"), with the strips and the numbers beside them.
// - The chances that the two positions show, read from form A's rings (their place on the ramp, to half a point).
// - A board image per form, position, window width (1400 and 390 pixels) and board (light, dark), by the look's switch
//   (`?walls=`): the Analysis board after Space six times from the start, and the review fixture after 40 edges.
// - A strip per form and board: a ring at 10, 20, ... 100% on a Blue and on a Red edge, with its number, at the board's
//   scale in a window 1400 pixels wide.
// - The numbers: for each form and board, the colour distance in OKLab (ΔE, × 100) between 70% and 85% and between 20%
//   and 35%, and each ring's contrast against the board (WCAG 2.2's ratio).
// In Playwright's Chromium, headless, with the layout test's launch options (off the GPU), and the engine's GPU off:
// the walls come from a CPU worker. The browser takes the build from the script, at an address that no server holds
// (ORIGIN), as a preview serves it (speed.mjs, `preview`): no port, so no other server can answer in its place. Run it
// in apps/hedgeschool, after a build:
//
//   node scripts/measure/wall-forms.mjs <build dir> <out dir> [workers]
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import config from "../../playwright.config.ts";
import { checkLaunch } from "../edge.mjs";
import { FIXTURE, headerRules, stepTo, watchSweep } from "./speed.mjs";
import { WALL_CLASSES, WALL_FORMS, wallInk } from "../../src/lib/review/weakWalls.ts";

const [dir, out, workersArg = "2"] = process.argv.slice(2);
const workers = Number(workersArg);
mkdirSync(out, { recursive: true });
const launchOptions = config.projects.find(p => p.name === "chromium").use.launchOptions;
checkLaunch(launchOptions);

// The colours, as Chromium mixes them: OKLab from sRGB (Björn Ottosson's matrices), and back, cut to sRGB's range
const lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const rgbOfHex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
function oklab(rgb) {
  const [r, g, b] = rgb.map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function rgbOf([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
          -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(c => Math.min(1, Math.max(0, gam(c))));
}
const luminance = rgb => { const [r, g, b] = rgb.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (x, y) => { const [a, b] = [luminance(x), luminance(y)].sort((p, q) => q - p); return (a + 0.05) / (b + 0.05); };
const hexOf = rgb => "#" + rgb.map(c => Math.round(c * 255).toString(16).padStart(2, "0")).join("");
/** A ring's stroke, a color-mix of two tokens in OKLab, as an OKLab colour: `tokens` gives each token's hex. */
function inkLab(stroke, tokens) {
  const [, hi, p, lo] = stroke.match(/var\((--[\w-]+)\) (\d+)%, var\((--[\w-]+)\)/);
  const [x, y] = [oklab(rgbOfHex(tokens[hi])), oklab(rgbOfHex(tokens[lo]))];
  return y.map((v, i) => v + (x[i] - v) * (Number(p) / 100));
}
const dE = (x, y) => 100 * Math.hypot(...x.map((v, i) => v - y[i]));
const TOKENS = ["--board-bg", "--board-dot", "--blue", "--red", "--wall-low", "--wall-high", "--wall-d-low", "--wall-d-mid",
                "--wall-d-high", "--text"];
const THEMES = ["light", "dark"];
const WIDTHS = [[1400, 900], [390, 844]];

// The build, served to the browser alone: a page at its path without `.html`, the folder's 404.html for a path that
// it lacks, and the headers of the folder's _headers
const ORIGIN = "https://hedge-school.test";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
                ".json": "application/json", ".wasm": "application/wasm", ".svg": "image/svg+xml", ".png": "image/png",
                ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml" };
const rules = headerRules(dir), isFile = p => (existsSync(p) && statSync(p).isFile() ? p : undefined);
const server = { url: ORIGIN };
const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const unserved = [];
await context.route(`${ORIGIN}/**`, route => {
  const path = decodeURIComponent(new URL(route.request().url()).pathname), base = join(dir, path);
  const found = isFile(base) ?? isFile(`${base}.html`) ?? isFile(join(base, "index.html")), sent = found ?? join(dir, "404.html");
  if (!found) unserved.push(path);
  const headers = { "Content-Type": TYPES[extname(sent)] ?? "application/octet-stream", "Cache-Control": "no-cache" };
  if (found) for (const { pattern, set } of rules) if (pattern.test(path)) Object.assign(headers, set);
  return route.fulfill({ status: found ? 200 : 404, headers, body: readFileSync(sent) });
});
await context.addInitScript(watchSweep, JSON.stringify({ workers, gpu: "off" }));
await context.addInitScript(() => {
  try {
    if (localStorage.getItem("learn-enclosure:review-display:1")) return;
    localStorage.setItem("learn-enclosure:review-display:1",
      JSON.stringify({ areaMap: { review: false, board: false }, weakWalls: { review: true, board: true } }));
    localStorage.setItem("hedge-school:consent:2", JSON.stringify({ analytics: "denied", games: "denied" }));
  } catch { /* none */ }
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
await page.goto(server.url);
if (!/Hedge School/.test(await page.title())) throw new Error(`the build serves "${await page.title()}"`);

const ended = () => page.waitForFunction(() => window.__searches.every(s => s.ended !== undefined), null, { timeout: 300_000 })
  .catch(() => console.log("  (a search still runs after 300 s)"));
const rings = page.locator("g.walls circle.wall-ring");
/** Waits until the rings show and their count holds for a second. */
async function ringsShown() {
  await rings.first().waitFor({ timeout: 180_000 });
  for (let last = -1, now = await rings.count(); now !== last; last = now, now = await rings.count()) await page.waitForTimeout(1000);
}
/** The chances of the rings on the page, read from form A's strokes (the place on the ramp from 10% to 1, in whole
 *  percent): to half a point. */
const chancesShown = () => rings.evaluateAll(cs => cs.map(c => Number(c.getAttribute("style").match(/ (\d+)%,/)[1])))
  .then(ms => ms.map(m => Math.round((0.1 + (0.9 * m) / 100) * 1000) / 1000).sort((a, b) => a - b));
/** The board with its top margin (the switches and the legend), as an image. */
async function boardShot(file) {
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  const box = await page.locator("svg.board").first().boundingBox();
  const margin = await page.locator(".map-margin").first().boundingBox().catch(() => null);
  const top = Math.max(0, Math.min(box.y, margin?.y ?? box.y));
  await page.screenshot({ path: join(out, file), clip: { x: box.x, y: top, width: box.width, height: box.y + box.height - top } });
}
/** The board's pixels per lattice unit, in this window. */
const unit = () => page.locator("svg.board").first().evaluate(s => s.getBoundingClientRect().width / s.viewBox.baseVal.width);

// The positions. The Analysis board: Home, then Space six times, each after the search ends, so that Space plays the
// engine's first choice. The board keeps its place, so each form's page opens there again.
const POSITIONS = {
  analysis6: { path: "/analysis", ready: async () => { await page.locator("svg.board").first().waitFor(); } },
  review40: { path: "/review", ready: async () => {
    await page.getByText(/^Review done/).first().waitFor({ timeout: 300_000 });
    await stepTo(page, 40);
  } },
};
await page.goto(`${server.url}/analysis?walls=A`);
await page.locator("svg.board").first().waitFor({ timeout: 60_000 });
await page.locator("body").click({ position: { x: 1, y: 1 } });
await page.keyboard.press("Home");
for (let k = 1; k <= 6; k++) {
  // The position's own search (more than the walls' one visit) has ended, and no other search runs
  await page.waitForFunction(n => window.__searches.some(s => s.visits > 1 && s.ended !== undefined &&
    s.moves.split(" ").filter(Boolean).length === n) && window.__searches.every(s => s.ended !== undefined), k - 1,
    { timeout: 300_000 });
  await page.keyboard.press("Space");
  await page.waitForFunction(n => document.querySelectorAll(".mv").length >= n, k, { timeout: 120_000 }).catch(async e => {
    await page.screenshot({ path: join(out, "failed.png") });
    console.log(`Space ${k} played nothing. Searches: ${JSON.stringify(await page.evaluate(() => window.__searches))}; ` +
                `page errors: ${errors.join("; ") || "none"}; paths not in the build: ${unserved.join(", ") || "none"}`);
    throw e;
  });
}
const analysisMoves = await page.locator(".mv").allTextContents();
console.log(`Analysis board: ${analysisMoves.map(t => t.trim()).join(" ")}`);
// The review fixture, imported once: each form's page opens the stored review
await page.goto(`${server.url}/review?walls=A`);
await page.locator('input[type="file"][accept*="json"]').and(page.locator("[data-ready]")).first().setInputFiles(FIXTURE);
await page.waitForURL(/#game=/, { timeout: 60_000 });
POSITIONS.review40.hash = new URL(page.url()).hash;
POSITIONS.analysis6.hash = "";

const chances = {}, tokens = {}, images = [];
let scale = 0;
for (const form of WALL_FORMS) {
  for (const [name, position] of Object.entries(POSITIONS)) {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`${server.url}${position.path}?walls=${form}${position.hash}`);
    await position.ready();
    if (name === "analysis6") await page.locator("body").click({ position: { x: 1, y: 1 } });
    await ended();
    await ringsShown();
    if (form === "A") chances[name] = await chancesShown();
    for (const [width, height] of WIDTHS) {
      await page.setViewportSize({ width, height });
      for (const theme of THEMES) {
        await page.evaluate(t => (document.documentElement.dataset.theme = t), theme);
        await page.waitForTimeout(400);
        if (!tokens[theme]) {
          tokens[theme] = await page.evaluate(names => Object.fromEntries(names.map(n =>
            [n, getComputedStyle(document.documentElement).getPropertyValue(n).trim()])), TOKENS);
        }
        if (width === 1400 && !scale) scale = await unit();
        const file = `walls-${form}-${name}-${width}-${theme}.png`;
        await boardShot(file);
        images.push(file);
      }
    }
    console.log(`form ${form}, ${name}: ${await rings.count()} rings`);
  }
}

// The strips, at the board's scale in a window 1400 pixels wide
const STEPS = Array.from({ length: 10 }, (_, i) => (i + 1) / 10);
const strip = await context.newPage();
for (const form of WALL_FORMS) {
  for (const theme of THEMES) {
    const t = tokens[theme], ink = s => s.replace(/var\((--[\w-]+)\)/g, (_, n) => t[n]);
    const cells = STEPS.map((c, i) => {
      const { stroke, width } = wallInk(c, form), w = width ?? 0.1, x = 1 + i * 1.6;
      return [0, 1].map(p => {
        const y = 0.9 + p * 1.1, edge = p ? t["--red"] : t["--blue"];
        return `<line x1="${x - 0.7}" y1="${y}" x2="${x + 0.7}" y2="${y}" stroke="${edge}" stroke-width="0.13" stroke-linecap="round"/>` +
          `<circle cx="${x}" cy="${y}" r="0.16" fill="${edge}"/>` +
          `<circle cx="${x}" cy="${y}" r="0.27" fill="none" stroke="${t["--board-bg"]}" stroke-width="${w + 0.08}"/>` +
          `<circle cx="${x}" cy="${y}" r="0.27" fill="none" stroke="${ink(stroke)}" stroke-width="${w}"/>`;
      }).join("") + `<text x="${x}" y="3" text-anchor="middle" font-size="0.42" fill="${t["--text"]}">${Math.round(c * 100)}%</text>`;
    }).join("");
    const W = 2 + 9 * 1.6, H = 3.4;
    await strip.setViewportSize({ width: Math.ceil(W * scale), height: Math.ceil(H * scale) });
    await strip.setContent(`<html><body style="margin:0;background:${t["--board-bg"]};font-family:system-ui,sans-serif">` +
      `<svg width="${W * scale}" height="${H * scale}" viewBox="0 0 ${W} ${H}">${cells}</svg></body></html>`);
    const file = `strip-${form}-${theme}.png`;
    await strip.screenshot({ path: join(out, file) });
    images.push(file);
  }
}

// The numbers
const numbers = {};
for (const form of WALL_FORMS) {
  numbers[form] = {};
  for (const theme of THEMES) {
    const t = tokens[theme], lab = c => inkLab(wallInk(c, form).stroke, t), bg = rgbOfHex(t["--board-bg"]);
    numbers[form][theme] = {
      dE70_85: dE(lab(0.7), lab(0.85)), dE20_35: dE(lab(0.2), lab(0.35)),
      rings: STEPS.map(c => ({ chance: c, ink: hexOf(rgbOf(lab(c))), contrast: contrast(rgbOf(lab(c)), bg),
                               width: wallInk(c, form).width ?? 0.1 })),
    };
  }
}
const f1 = x => x.toFixed(1), f2 = x => x.toFixed(2);
const lines = ["| Form | Board | ΔE 70–85% | ΔE 20–35% | " + STEPS.map(c => `${Math.round(c * 100)}%`).join(" | ") + " |",
               "|---|---|---|---|" + STEPS.map(() => "---").join("|") + "|"];
for (const form of WALL_FORMS) for (const theme of THEMES) {
  const n = numbers[form][theme];
  lines.push(`| ${form} | ${theme} | ${f1(n.dE70_85)} | ${f1(n.dE20_35)} | ${n.rings.map(r => f2(r.contrast)).join(" | ")} |`);
}
const count = cs => WALL_CLASSES.map((lo, i) => [lo, WALL_CLASSES[i + 1] ?? 1.01])
  .map(([lo, hi]) => `${Math.round(lo * 100)}–${Math.min(100, Math.round(hi * 100))}%: ${cs.filter(c => c >= lo && c < hi).length}`).join(", ");
const summary = [
  `Analysis board's moves: ${analysisMoves.map(t => t.trim()).join(" ")}`,
  ...Object.entries(chances).map(([n, cs]) => `${n}: ${cs.length} rings, chances ${cs.map(c => Math.round(c * 1000) / 10).join(" ")} (${count(cs)})`),
  `tokens: ${JSON.stringify(tokens)}`,
  `the board's scale at 1400 pixels: ${f1(scale)} pixels per lattice unit`,
  "", ...lines, "",
  `page errors: ${errors.length ? errors.join("; ") : "none"}`,
  `paths not in the build: ${unserved.length ? [...new Set(unserved)].join(", ") : "none"}`,
];
writeFileSync(join(out, "numbers.md"), summary.join("\n") + "\n");
writeFileSync(join(out, "numbers.json"), JSON.stringify({ analysisMoves, chances, tokens, scale, numbers, images }, null, 1));
console.log(summary.join("\n"));
await browser.close();
