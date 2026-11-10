// The weak walls' rings (design 30, "The weak walls", item 3; weakWalls.ts, `wallInk`): drawn in the real page, at the
// positions that show the walls (design 30, "Positions that show them"), with a strip and the numbers beside them.
// - The chances that the two positions show, read from the rings' strokes (each stroke's place on the ramp, in whole
//   percent: to half a point of chance).
// - A board image per position, window width (1400 and 390 pixels) and board (light, dark): the Analysis board after
//   Space six times from the start, and the review fixture after 40 edges.
// - A strip per board: a ring at 10, 20, ... 100% on a Blue and on a Red edge, with its number, at the board's scale in
//   a window 1400 pixels wide.
// - The numbers: for each board, the colour distance in OKLab (ΔE, × 100) between 70% and 85% and between 20% and 35%,
//   each ring's and each token's contrast against the board (WCAG 2.2's ratio), and how near a ring comes to the
//   players' blue and red and the signs' green and yellow (the least ΔE over the whole percentages from 10% to 100%).
// In Playwright's Chromium, headless, with the layout test's launch options (off the GPU), and the engine's GPU off:
// the walls come from a CPU worker. The browser takes the build from the script, at an address that no server holds
// (ORIGIN), as a preview serves it (speed.mjs, `preview`): no port, so no other server can answer in its place. Run it
// in apps/hedgeschool, after a build:
//
//   node scripts/measure/wall-rings.mjs <build dir> <out dir> [workers]
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import config from "../../playwright.config.ts";
import { headerRules, launch, searchesEnded, stepTo, storeReview, watchSweep } from "./speed.mjs";
import { WALL_MIN, wallInk } from "../../src/lib/review/weakWalls.ts";

const [dir, out, workersArg = "2"] = process.argv.slice(2);
const workers = Number(workersArg);
mkdirSync(out, { recursive: true });

// The colours, as Chromium mixes them: OKLab from sRGB (Björn Ottosson's matrices), and back to linear sRGB, kept in
// its range
const lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
/** OKLab, from a colour "#rrggbb". */
function oklab(hex) {
  const [r, g, b] = [1, 3, 5].map(i => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function linearOf([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
          -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(c => Math.min(1, Math.max(0, c)));
}
const luminance = lab => { const [r, g, b] = linearOf(lab); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (x, y) => { const [a, b] = [luminance(x), luminance(y)].sort((p, q) => q - p); return (a + 0.05) / (b + 0.05); };
const hexOf = lab => "#" + linearOf(lab).map(c => Math.round(gam(c) * 255).toString(16).padStart(2, "0")).join("");
const STROKE = /var\((--[\w-]+)\) (\d+)%, var\((--[\w-]+)\)/;
/** A ring's stroke, a color-mix of two tokens in OKLab, as an OKLab colour: `tokens` gives each token's hex. */
function inkLab(stroke, tokens) {
  const [, hi, p, lo] = stroke.match(STROKE);
  const [x, y] = [oklab(tokens[hi]), oklab(tokens[lo])];
  return y.map((v, i) => v + (x[i] - v) * (Number(p) / 100));
}
const dE = (x, y) => 100 * Math.hypot(...x.map((v, i) => v - y[i]));
/** A stroke's two tokens and its percentage, as one key. */
const strokeKey = stroke => stroke.match(STROKE)?.slice(1).join(" ");
/** The chance of each stroke that `wallInk` gives, by its key: the ramp's places, each whole percent of it from 10%. */
const CHANCE_OF = new Map(Array.from({ length: 101 }, (_, place) => {
  const chance = WALL_MIN + ((1 - WALL_MIN) * place) / 100;
  return [strokeKey(wallInk(chance)), chance];
}));
const NEAR = ["--blue", "--red", "--sign-green", "--sign-yellow"]; // the colours that a ring must not be taken for
const TOKENS = ["--board-bg", "--text", "--wall-low", "--wall-mid", "--wall-high", ...NEAR];
const THEMES = ["light", "dark"];
const WIDTHS = [[1400, 900], [390, 844]];

// The build, served to the browser alone: a page at its path without `.html`, the folder's 404.html for a path that
// it lacks, and the headers of the folder's _headers
const ORIGIN = "https://hedge-school.test";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
                ".json": "application/json", ".wasm": "application/wasm", ".svg": "image/svg+xml", ".png": "image/png",
                ".ico": "image/x-icon", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".txt": "text/plain; charset=utf-8",
                ".xml": "application/xml" };
const rules = headerRules(dir), isFile = p => (existsSync(p) && statSync(p).isFile() ? p : undefined);
const browser = await launch(config.projects.find(p => p.name === "chromium").use.launchOptions);
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
await page.goto(ORIGIN);
if (!/Hedge School/.test(await page.title())) throw new Error(`the build serves "${await page.title()}"`);

const ended = () => searchesEnded(page, 300_000).catch(() => console.log("  (a search still runs after 300 s)"));
const rings = page.locator("g.walls circle.wall-ring");
/** Waits until the rings show and their count holds for a second. */
async function ringsShown() {
  await rings.first().waitFor({ timeout: 180_000 });
  for (let last = -1, now = await rings.count(); now !== last; last = now, now = await rings.count()) await page.waitForTimeout(1000);
}
/** The chances of the rings on the page, from their strokes. A stroke that `wallInk` does not give stops the script. */
const chancesShown = async () => (await rings.evaluateAll(cs => cs.map(c => c.getAttribute("style")))).map(style => {
  const chance = CHANCE_OF.get(strokeKey(style));
  if (chance === undefined) throw new Error(`a ring's stroke that wallInk does not give: ${style}`);
  return Math.round(chance * 1000) / 1000;
}).sort((a, b) => a - b);
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

// The Analysis board: Home, then Space six times, each after the search ends, so that Space plays the engine's first
// choice
await page.goto(`${ORIGIN}/analysis`);
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
const analysisMoves = (await page.locator(".mv").allTextContents()).map(t => t.trim()).join(" ");
console.log(`Analysis board: ${analysisMoves}`);
// The review fixture, kept in this browser: the import's page loads itself again to review it, until "Review done"
await storeReview(page, ORIGIN);

// The positions, each at its address: the Analysis board keeps its place, so its page opens there again
const POSITIONS = {
  analysis6: { address: `${ORIGIN}/analysis`, ready: async () => {
    await page.locator("svg.board").first().waitFor();
    await page.locator("body").click({ position: { x: 1, y: 1 } });
  } },
  review40: { address: page.url(), ready: async () => {
    await page.getByText(/^Review done/).first().waitFor({ timeout: 300_000 });
    await stepTo(page, 40);
  } },
};
const chances = {}, tokens = {}, images = [];
let scale = 0;
for (const [name, position] of Object.entries(POSITIONS)) {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(position.address);
  await position.ready();
  await ended();
  await ringsShown();
  chances[name] = await chancesShown();
  scale ||= await unit();
  for (const [width, height] of WIDTHS) {
    await page.setViewportSize({ width, height });
    for (const theme of THEMES) {
      await page.evaluate(t => (document.documentElement.dataset.theme = t), theme);
      await page.waitForTimeout(400);
      tokens[theme] ??= await page.evaluate(names => {
        const style = getComputedStyle(document.documentElement);
        return Object.fromEntries(names.map(n => [n, style.getPropertyValue(n).trim()]));
      }, TOKENS);
      const file = `walls-${name}-${width}-${theme}.png`;
      await boardShot(file);
      images.push(file);
    }
  }
  console.log(`${name}: ${await rings.count()} rings`);
}

// The strips, at the board's scale in a window 1400 pixels wide
const STEPS = Array.from({ length: 10 }, (_, i) => (i + 1) / 10);
const strip = await context.newPage();
for (const theme of THEMES) {
  const t = tokens[theme], ink = s => s.replace(/var\((--[\w-]+)\)/g, (_, n) => t[n]);
  const cells = STEPS.map((c, i) => {
    const x = 1 + i * 1.6;
    return [0, 1].map(p => {
      const y = 0.9 + p * 1.1, edge = p ? t["--red"] : t["--blue"];
      return `<line x1="${x - 0.7}" y1="${y}" x2="${x + 0.7}" y2="${y}" stroke="${edge}" stroke-width="0.13" stroke-linecap="round"/>` +
        `<circle cx="${x}" cy="${y}" r="0.16" fill="${edge}"/>` +
        `<circle cx="${x}" cy="${y}" r="0.27" fill="none" stroke="${t["--board-bg"]}" stroke-width="0.18"/>` +
        `<circle cx="${x}" cy="${y}" r="0.27" fill="none" stroke="${ink(wallInk(c))}" stroke-width="0.1"/>`;
    }).join("") + `<text x="${x}" y="3" text-anchor="middle" font-size="0.42" fill="${t["--text"]}">${Math.round(c * 100)}%</text>`;
  }).join("");
  const W = 2 + 9 * 1.6, H = 3.4;
  await strip.setViewportSize({ width: Math.ceil(W * scale), height: Math.ceil(H * scale) });
  await strip.setContent(`<html><body style="margin:0;background:${t["--board-bg"]};font-family:system-ui,sans-serif">` +
    `<svg width="${W * scale}" height="${H * scale}" viewBox="0 0 ${W} ${H}">${cells}</svg></body></html>`);
  const file = `strip-${theme}.png`;
  await strip.screenshot({ path: join(out, file) });
  images.push(file);
}

// The numbers
/** The chances at each whole percentage from 10% to 100%. */
const EVERY_PERCENT = Array.from({ length: 91 }, (_, i) => WALL_MIN + i / 100);
const numbers = {};
for (const theme of THEMES) {
  const t = tokens[theme], lab = c => inkLab(wallInk(c), t), bg = oklab(t["--board-bg"]);
  numbers[theme] = {
    dE70_85: dE(lab(0.7), lab(0.85)), dE20_35: dE(lab(0.2), lab(0.35)),
    tokens: Object.fromEntries(["--wall-low", "--wall-mid", "--wall-high"].map(name => [name, contrast(oklab(t[name]), bg)])),
    rings: STEPS.map(c => ({ chance: c, ink: hexOf(lab(c)), contrast: contrast(lab(c), bg) })),
    nearest: Object.fromEntries(NEAR.map(name => {
      const [d, chance] = EVERY_PERCENT.map(c => [dE(lab(c), oklab(t[name])), c]).reduce((p, q) => (q[0] < p[0] ? q : p));
      return [name, { dE: d, chance }];
    })),
  };
}
const f1 = x => x.toFixed(1), f2 = x => x.toFixed(2);
const lines = ["| Board | ΔE 70–85% | ΔE 20–35% | " + STEPS.map(c => `${Math.round(c * 100)}%`).join(" | ") + " |",
               "|---|---|---|" + STEPS.map(() => "---").join("|") + "|"];
for (const theme of THEMES) {
  const n = numbers[theme];
  lines.push(`| ${theme} | ${f1(n.dE70_85)} | ${f1(n.dE20_35)} | ${n.rings.map(r => f2(r.contrast)).join(" | ")} |`);
}
const summary = [
  `Analysis board's moves: ${analysisMoves}`,
  ...Object.entries(chances).map(([n, cs]) => `${n}: ${cs.length} rings, chances ${cs.map(c => Math.round(c * 1000) / 10).join(" ")}`),
  `tokens: ${JSON.stringify(tokens)}`,
  `the board's scale at 1400 pixels: ${f1(scale)} pixels per lattice unit`,
  "", ...lines, "",
  ...THEMES.map(theme => `the tokens' contrasts on the ${theme} board: ` + Object.entries(numbers[theme].tokens)
    .map(([name, c]) => `${name} ${f2(c)}:1`).join(", ")),
  ...THEMES.map(theme => `nearest on the ${theme} board (ΔE, at a chance): ` + Object.entries(numbers[theme].nearest)
    .map(([name, { dE: d, chance }]) => `${name} ${f1(d)} at ${Math.round(chance * 100)}%`).join(", ")),
  "",
  `page errors: ${errors.length ? errors.join("; ") : "none"}`,
  `paths not in the build: ${unserved.length ? [...new Set(unserved)].join(", ") : "none"}`,
];
writeFileSync(join(out, "numbers.md"), summary.join("\n") + "\n");
writeFileSync(join(out, "numbers.json"), JSON.stringify({ analysisMoves, chances, tokens, scale, numbers, images }, null, 1));
console.log(summary.join("\n"));
await browser.close();
