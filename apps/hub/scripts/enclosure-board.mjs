// Enclosure's board on the hub's page: the first scene of Hedge School's home board
// (apps/hedgeschool/src/lib/home/replay.json, from scripts/home-replay.mjs there), drawn as Hedge School's Board.svelte
// draws it, and played in CSS alone, so that the page runs no script. The scene's first position shows, then each edge
// draws in from one end, one every 1.3 seconds, and each region fades in when it closes. Before the scene's last edge
// the engine's first choice shows, then the played edge and its label. Then the scene starts again. With
// reduced motion, the board shows that last moment, still (style.css).
//
//   node apps/hub/scripts/enclosure-board.mjs
// writes the board into apps/hub/public/index.html, between the two enclosure-board comments, and its animation into
// apps/hub/public/enclosure-board.css. Run it again after Hedge School's replay changes. With --check it writes
// nothing, and fails when the two files are not what it would write (npm run check:all). Either way it fails when a
// colour token of style.css is not Hedge School's (DESIGN.md: Hedge School's tokens, in the same names).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PLAYER_NAME } from "../../hedgeschool/src/lib/review/enclosure.ts";
import { LABEL_SHAPES } from "../../hedgeschool/src/lib/review/labelShapes.ts";

const hub = join(dirname(fileURLToPath(import.meta.url)), "..");
const fail = message => { throw new Error(`enclosure-board: ${message}`); };
const { scenes } = JSON.parse(readFileSync(join(hub, "../hedgeschool/src/lib/home/replay.json"), "utf8"));
// The scene up to its moment, the frame after the labelled edge (hold "moment"), as HomeReplay.svelte finds it. The
// frame before it is the hold before that edge (hold "before").
const last = scenes[0].frames.findIndex(f => f.hold === "moment");
if (last < 1 || scenes[0].frames[last - 1].hold !== "before") fail("replay.json's first scene has no moment");
const frames = scenes[0].frames.slice(0, last + 1);
// The moment's label, and the player whose edge it marks.
const mark = frames[last].m[0];
const player = frames[last].p.edges.findIndex(es => es.some(e => String(e) === String(mark.edge)));

const style = readFileSync(join(hub, "public/style.css"), "utf8");
if (!style.includes(`.board .mark.${mark.label} {`)) fail(`style.css gives the label ${mark.label} no colour`);
// The colour tokens, in each theme: a token that a theme does not set keeps the light theme's value. Hedge School's
// are the shared ones (packages/site/src/site.css) and its own (src/app.css).
const shared = readFileSync(join(hub, "../../packages/site/src/site.css"), "utf8");
const app = readFileSync(join(hub, "../hedgeschool/src/app.css"), "utf8");
const block = (css, open) => css.includes(open) ? css.slice(css.indexOf(open), css.indexOf("\n}", css.indexOf(open)))
  : fail(`no "${open}" block`);
const tokens = css => Object.fromEntries([...css.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
const themes = (light, dark) => ({ light: tokens(light), dark: { ...tokens(light), ...tokens(dark) } });
const hubTokens = themes(block(style, ":root {"), block(style, "@media (prefers-color-scheme: dark) {"));
const appTokens = themes(block(shared, ':root, [data-theme="light"] {') + block(app, ':root, [data-theme="light"] {'),
  block(shared, ':root[data-theme="dark"] {') + block(app, ':root[data-theme="dark"] {'));
const drift = Object.entries(hubTokens).flatMap(([theme, t]) => Object.entries(t)
  .filter(([name, value]) => value !== appTokens[theme][name])
  .map(([name, value]) => `--${name} (${theme}) is ${value}, and ${appTokens[theme][name] ?? "missing"} in Hedge School's`));
if (drift.length) fail(`style.css's tokens are not Hedge School's: ${drift.join("; ")}`);

// The timeline, in seconds: a hold on the first position, an edge a step, a hold before the last edge (with the
// engine's choice from CHOICE after the edge before it) and on its label, then the fade back to the first position.
const START = 2, STEP = 1.3, BEFORE = 2.6, MOMENT = 4.5, RESET = 0.8, CHOICE = 0.8;
const DRAW = 0.35, FADE = 0.4; // an edge's draw, and a region's, a node's or a mark's fade
const at = [0];
for (let k = 1; k <= last; k++) at[k] = k === 1 ? START : at[k - 1] + (k === last ? BEFORE : STEP);
const resetAt = at[last] + MOMENT, LOOP = resetAt + RESET;

// The badges (the engine's rank, the label) at 1.4 times Hedge School's size: the hub's board is 320 pixels wide, and
// Hedge School's home board about 420.
const BADGE = 1.4;
const N = 19, sy = y => N - 1 - y, r = x => +x.toFixed(3);
const pct = t => `${r((100 * t) / LOOP)}%`;
const ring = g => "M" + g.map(([x, y]) => `${r(x)} ${r(sy(y))}`).join("L") + "Z";
const line = e => `M${e[0]} ${sy(e[1])}L${e[2]} ${sy(e[3])}`;
const mid = e => [(e[0] + e[2]) / 2, sy((e[1] + e[3]) / 2)];
const PLAYER = ["blue", "red"];

// Each element, and the first and last frames that show it (a region shows until a larger one takes its place).
function spans(list) {
  const seen = new Map();
  frames.forEach((f, k) => {
    for (const [key, el] of list(f)) {
      if (!seen.has(key)) seen.set(key, { ...el, first: k });
      seen.get(key).last = k;
    }
  });
  return [...seen.values()];
}
const edges = spans(f => f.p.edges.flatMap((es, p) => es.map(e => [`${p}:${e}`, { p, e }])));
const nodes = spans(f => f.p.edges.flatMap((es, p) => es.flatMap(e => [[e[0], e[1]], [e[2], e[3]]])
  .map(([x, y]) => [`${p}:${x},${y}`, { p, x, y }])));
const regions = spans(f => f.p.regions.flatMap((rs, p) => rs.map(g => [`${p}:${JSON.stringify(g.rings)}`, { p, g }])));

// The classes of an element that comes at `appear` (null: in the first position) and goes after frame `until`: one
// keyframes rule for each kind and timing, and "gone" on an element that the last moment does not show.
const rules = new Map();
const EASE = "animation-timing-function:cubic-bezier(.16,1,.3,1)";
function timed(kind, appear, until) {
  const gone = until < last ? at[until + 1] + DRAW : null;
  if (appear === null && gone === null) return [];
  const name = `${kind}-${appear === null ? "start" : r(appear * 1000)}-${gone === null ? "end" : r(gone * 1000)}`;
  if (!rules.has(name)) {
    const draw = kind === "draw";
    const hide = draw ? "opacity:0;stroke-dashoffset:1" : "opacity:0";
    const show = draw ? "opacity:1;stroke-dashoffset:0" : "opacity:1";
    const k = appear === null ? [`0%{${show}}`]
      : [`0%,${pct(appear)}{${hide};${EASE}}`, `${pct(appear + (draw ? DRAW : FADE))}{${show}}`];
    if (gone === null) k.push(`${pct(resetAt)}{${show}}`);
    else k.push(`${pct(gone)}{${show}}`, `${pct(gone + FADE)},${pct(resetAt)}{${hide}}`);
    k.push(`100%{${appear === null ? show : hide}}`);
    rules.set(name, `@keyframes ${name}{${k.join("")}}`);
  }
  return gone === null ? [name] : [name, "gone"];
}
const cls = (...names) => `class="${names.flat().join(" ")}"`;

const id = s => `enclosure-${s}`;
// The sizes are Board.svelte's: the margin of 1.3 around the points, a dot's radius (0.07) and a node's (0.16), the
// rank's box and the label's disc (BADGE times theirs), and the badges' shadow.
const out = [];
out.push(`<svg class="board" viewBox="-1.3 -1.3 20.6 20.6" role="img" aria-label="An Enclosure game between two bots, ` +
  `played edge by edge, until the engine marks one of ${PLAYER_NAME[player]}'s edges ` +
  `${/^[AEIOU]/.test(mark.note) ? "an" : "a"} ${mark.note} and shows a better edge.">`);
out.push(`<defs><pattern id="${id("dots")}" width="1" height="1" patternUnits="userSpaceOnUse" x="-0.5" y="-0.5">` +
  `<circle cx="0.5" cy="0.5" r="0.07" class="dot"/></pattern>` +
  `<filter id="${id("shadow")}" x="-50%" y="-50%" width="200%" height="200%">` +
  `<feDropShadow dx="0.027" dy="0.046" stdDeviation="0.033" flood-opacity="0.5"/></filter></defs>`);
out.push(`<rect x="-1.3" y="-1.3" width="20.6" height="20.6" class="bg"/>`);
for (const g of regions) out.push(`<path d="${g.g.rings.map(ring).join("")}" fill-rule="evenodd" ` +
  cls("region", PLAYER[g.p], timed("fade", g.first ? at[g.first] + DRAW : null, g.last)) + "/>");
out.push(`<rect x="-0.5" y="-0.5" width="19" height="19" fill="url(#${id("dots")})"/>`);

// The engine's first choice for the scene's last edge, as the review draws it: its line, and its rank on a badge.
const choice = frames[last - 1].c.find(c => c.rank === 1).edge;
const [cx, cy] = mid(choice), half = 0.36 * BADGE;
out.push(`<g ${cls(timed("fade", at[last - 1] + CHOICE, last))}><path d="${line(choice)}" class="choice"/>` +
  `<rect x="${r(cx - half)}" y="${r(cy - half)}" width="${r(2 * half)}" height="${r(2 * half)}" rx="${r(0.17 * BADGE)}" ` +
  `class="rank"/><text x="${r(cx)}" y="${r(cy + 0.15 * BADGE)}" class="rank-text">1</text></g>`);

for (const e of edges) out.push(`<path d="${line(e.e)}" pathLength="1" ` +
  cls("edge", PLAYER[e.p], timed("draw", e.first ? at[e.first] : null, e.last)) + "/>");
for (const n of nodes) out.push(`<circle cx="${n.x}" cy="${sy(n.y)}" r="0.16" ` +
  cls("node", PLAYER[n.p], timed("fade", n.first ? at[n.first] : null, n.last)) + "/>");

// The label of the scene's last edge, where the board puts it: a disc in the label's colour, with a shadow, and its
// mark in white on a 24-unit square (LabelMark.svelte). On an edge of length 1 the disc moves off the line.
const MARK_R = 0.33 * BADGE, e = mark.edge, off = 0.8 * MARK_R;
let [bx, by] = mid(e);
if (Math.abs(e[0] - e[2]) + Math.abs(e[1] - e[3]) === 1) [bx, by] = e[1] === e[3] ? [bx, by - off] : [bx + off, by];
const t = s => (s.t ? ` transform="${s.t}"` : "");
const shape = s => s.kind === "stroke"
  ? `<path d="${s.d}" fill="none" stroke-width="${s.w}" stroke-linecap="butt" stroke-linejoin="${s.round ? "round" : "miter"}"${t(s)}/>`
  : s.kind === "fill" ? `<path d="${s.d}" stroke-width="${s.round}" stroke-linejoin="round"${t(s)}/>`
    : s.kind === "box"
      ? `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="${s.r}" stroke="none"${t(s)}/>`
      : fail(`labelShapes.ts has a shape of the kind ${s.kind}, which this script does not draw`);
out.push(`<g ${cls(timed("fade", at[last] + DRAW, last))}>` +
  `<circle cx="${r(bx)}" cy="${r(by)}" r="${r(MARK_R)}" class="mark ${mark.label}" filter="url(#${id("shadow")})"/>` +
  `<g class="glyph" transform="translate(${r(bx - MARK_R)} ${r(by - MARK_R)}) scale(${r((2 * MARK_R) / 24)})">` +
  `${LABEL_SHAPES[mark.label].map(shape).join("")}</g></g>`);
out.push(`</svg>`);

const css = `/* Written by apps/hub/scripts/enclosure-board.mjs from Hedge School's home board: do not edit. The board's
   animation, ${r(LOOP)} seconds a scene: a rule for each timing of the elements that come or go. */
.board :is(.${[...rules.keys()].join(", .")}) {
  animation-duration: ${r(LOOP)}s; animation-iteration-count: infinite; animation-timing-function: linear;
}
${[...rules.keys()].map(n => `.board .${n} { animation-name: ${n}; }`).join("\n")}
${[...rules.values()].join("\n")}
`;

const page = join(hub, "public/index.html");
const html = readFileSync(page, "utf8");
const START_MARK = "<!-- enclosure-board: start -->", END_MARK = "<!-- enclosure-board: end -->";
const i = html.indexOf(START_MARK), j = html.indexOf(END_MARK);
if (i < 0 || j < i) fail(`${page}: the enclosure-board comments are missing`);
const files = [
  [page, html.slice(0, i + START_MARK.length) + "\n" + out.join("\n") + "\n" + html.slice(j)],
  [join(hub, "public/enclosure-board.css"), css],
];
if (process.argv.includes("--check")) {
  const stale = files.filter(([file, text]) => readFileSync(file, "utf8") !== text).map(([file]) => file);
  if (stale.length) fail(`not current: ${stale.join(", ")}. Run node apps/hub/scripts/enclosure-board.mjs`);
  console.log("enclosure-board: the board is current");
} else {
  for (const [file, text] of files) writeFileSync(file, text);
  console.log(`enclosure-board: ${edges.length} edges, ${regions.length} regions, ${rules.size} timings, ${r(LOOP)} s`);
}
