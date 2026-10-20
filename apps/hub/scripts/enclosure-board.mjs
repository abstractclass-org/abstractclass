// Enclosure's board on the hub's page: the first scene of Hedge School's home board
// (apps/hedgeschool/src/lib/home/replay.json, from scripts/home-replay.mjs there), drawn as Hedge School's Board.svelte
// draws it, and played in CSS alone, so that the page runs no script. The scene's first position shows, then each edge
// draws in from one end, one every 1.3 seconds, and each region fades in when it closes. Before the scene's last edge
// the engine's first choice shows, then the played edge and its label (a Mistake). Then the scene starts again. With
// reduced motion, the board shows that last moment, still (style.css).
//
//   node apps/hub/scripts/enclosure-board.mjs
// writes the board into apps/hub/public/index.html, between the two enclosure-board comments, and its animation into
// apps/hub/public/enclosure-board.css. Run it again after Hedge School's replay changes.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LABEL_SHAPES } from "../../hedgeschool/src/lib/review/labelShapes.ts";

const hub = join(dirname(fileURLToPath(import.meta.url)), "..");
const { scenes } = JSON.parse(readFileSync(join(hub, "../hedgeschool/src/lib/home/replay.json"), "utf8"));
const frames = scenes[0].frames;
const last = frames.length - 1;

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
const out = [];
out.push(`<svg class="board" viewBox="-1.3 -1.3 20.6 20.6" role="img" aria-label="An Enclosure game between two bots, ` +
  `played edge by edge, until the engine marks one of Blue's edges a Mistake and shows a better edge.">`);
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
const [cx, cy] = [(choice[0] + choice[2]) / 2, sy((choice[1] + choice[3]) / 2)], half = 0.36 * BADGE;
out.push(`<g ${cls(timed("fade", at[last - 1] + CHOICE, last))}><path d="${line(choice)}" class="choice"/>` +
  `<rect x="${r(cx - half)}" y="${r(cy - half)}" width="${r(2 * half)}" height="${r(2 * half)}" rx="${r(0.17 * BADGE)}" ` +
  `class="rank"/><text x="${r(cx)}" y="${r(cy + 0.15 * BADGE)}" class="rank-text">1</text></g>`);

for (const e of edges) out.push(`<path d="${line(e.e)}" pathLength="1" ` +
  cls("edge", PLAYER[e.p], timed("draw", e.first ? at[e.first] : null, e.last)) + "/>");
for (const n of nodes) out.push(`<circle cx="${n.x}" cy="${sy(n.y)}" r="0.16" ` +
  cls("node", PLAYER[n.p], timed("fade", n.first ? at[n.first] : null, n.last)) + "/>");

// The label of the scene's last edge, where the board puts it: a disc in the label's colour, with a shadow, and its
// mark in white on a 24-unit square (LabelMark.svelte). On an edge of length 1 the disc moves off the line.
const mark = frames[last].m[0], MARK_R = 0.33 * BADGE, e = mark.edge, off = 0.8 * MARK_R;
let [bx, by] = [(e[0] + e[2]) / 2, sy((e[1] + e[3]) / 2)];
if (Math.abs(e[0] - e[2]) + Math.abs(e[1] - e[3]) === 1) [bx, by] = e[1] === e[3] ? [bx, by - off] : [bx + off, by];
const t = s => (s.t ? ` transform="${s.t}"` : "");
const shape = s => s.kind === "stroke"
  ? `<path d="${s.d}" fill="none" stroke-width="${s.w}" stroke-linecap="butt" stroke-linejoin="${s.round ? "round" : "miter"}"${t(s)}/>`
  : s.kind === "fill" ? `<path d="${s.d}" stroke-width="${s.round}" stroke-linejoin="round"${t(s)}/>`
    : `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="${s.r}" stroke="none"${t(s)}/>`;
out.push(`<g ${cls(timed("fade", at[last] + DRAW, last))}>` +
  `<circle cx="${r(bx)}" cy="${r(by)}" r="${MARK_R}" class="mark ${mark.label}" filter="url(#${id("shadow")})"/>` +
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
if (i < 0 || j < i) throw new Error(`${page}: the enclosure-board comments are missing`);
writeFileSync(page, html.slice(0, i + START_MARK.length) + "\n" + out.join("\n") + "\n" + html.slice(j));
writeFileSync(join(hub, "public/enclosure-board.css"), css);
console.log(`enclosure-board: ${edges.length} edges, ${regions.length} regions, ${rules.size} timings, ${r(LOOP)} s`);
