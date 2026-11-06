// The logo's options for Cyanotype (abscls-8tl1.44), for the owner to choose one: each drawn as SVG here, in the forms
// that Hedge School's collie has (design 12). The lab page (/lab/logos) shows each in the site's header, as a favicon,
// as the iOS icon and on the link preview picture. Nothing outside the lab uses them yet.
//
// Each option has two drawings by size, as the collie has: the full drawing from 48 pixels up, and below that a
// simpler one that reads at 16 pixels (the header's 28 pixels, the favicon). Each drawing has a light and a dark form,
// for the page's two themes. The favicon and the iOS icon are one drawing each, the same in both themes.
import { center, hexPath, TOUCHING, type Hex } from "#lib/board/hex.ts";

/** A drawing for each theme of the page. */
export interface Themed { light: string; dark: string }

export interface LogoOption {
  id: string;
  name: string;
  /** The idea, in one line. */
  idea: string;
  /** The full drawing, from 48 pixels up. */
  large: Themed;
  /** The simple drawing, below 48 pixels: the header, the favicon. */
  small: Themed;
  /** The favicon: one drawing for both themes of the browser's tab. */
  favicon: string;
  /** The 180-pixel icon for iOS's home screen: a full square, with no transparent pixel. */
  touch: string;
  /** For a mascot: the brief for an image generator, after which a finished drawing would be traced. */
  brief?: string;
}

/** The size from which the full drawing replaces the simple one, as the collie's. */
export const LARGE_FROM = 48;

const INK = "#0b0c0e"; // the collie's near-black coat
const WHITE = "#ffffff";
/** The cyanotype's Prussian blue, and the white of its lines. */
export const CYAN_BLUE = "#163f6f";
const CYAN_WHITE = "#f2f6fb";
/** Hedge School's lavender, the site's accent in each theme (src/app.css). */
const LAVENDER = { light: "#6f5aa8", dark: "#b8a6e8" };

const r2 = (v: number) => Math.round(v * 100) / 100 + 0;

/** An SVG document, which an `<img>` shows and a canvas draws. */
export const svg = (body: string, viewBox = "0 0 100 100") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;

/** A drawing placed in another, in the square of side `size` at (x, y). */
export const nest = (doc: string, x: number, y: number, size: number) =>
  doc.replace(/^<svg xmlns="[^"]*"/, `<svg x="${x}" y="${y}" width="${size}" height="${size}"`);

/** A drawing as an address that an `<img>` takes. */
export const dataUrl = (doc: string) => `data:image/svg+xml,${encodeURIComponent(doc)}`;

/** A five-pointed star's outline, its points `r` from (x, y), as the board's star cell (Cell.svelte) draws it. */
export function starPath(x: number, y: number, r: number): string {
  return "M" + Array.from({ length: 10 }, (_, k) => {
    const a = (Math.PI / 5) * k - Math.PI / 2, d = k % 2 ? r * 0.42 : r;
    return `${r2(x + d * Math.cos(a))},${r2(y + d * Math.sin(a) + r * 0.06)}`;
  }).join("L") + "Z";
}

/** Hexes of the board's grid, their centres `k` apart, round (x, y): the outline of each, of radius `size`. */
function hexes(list: readonly Hex[], x: number, y: number, k: number, size: number): string {
  return list.map(h => { const [cx, cy] = center(h); return hexPath(x + k * cx, y + k * cy, size); }).join("");
}

/** The start's blueprint: a star with its ring of six cells. */
const START: readonly Hex[] = [[0, 0], ...TOUCHING];

// ---- 1. The cyanotype: the start's blueprint as a print, white lines on Prussian blue ----

const cyanTile = (rx: number) => `<rect width="100" height="100" rx="${rx}" fill="${CYAN_BLUE}"/>`;
/** The full print: the seven hexes in white lines, the star in the middle one, and the print's border. */
const cyanLarge = (rx: number) => svg(cyanTile(rx)
  + `<rect x="7" y="7" width="86" height="86" rx="${Math.max(rx - 6, 3)}" fill="none" stroke="${CYAN_WHITE}" stroke-width="1.2" opacity="0.55"/>`
  + `<path d="${hexes(START, 50, 50, 14.4, 14.4)}" fill="none" stroke="${CYAN_WHITE}" stroke-width="2.8" stroke-linejoin="round"/>`
  + `<path d="${starPath(50, 50, 8.5)}" fill="${CYAN_WHITE}"/>`);
/** The simple print: the seven hexes filled white with gaps, the star cut out of the middle one. */
const cyanSmall = (rx: number) => svg(cyanTile(rx)
  + `<path d="${hexes(START, 50, 50, 14.2, 12.9)}" fill="${CYAN_WHITE}"/>`
  + `<path d="${starPath(50, 50, 8.6)}" fill="${CYAN_BLUE}"/>`);

// ---- 2. The stamp: a revenue stamp, which paid stamp duty, with the star cell on it ----

/** A square with perforated edges: `n` half-round notches on each side, clockwise from the top left corner. */
function perforated(x0: number, size: number, n: number, r: number): string {
  const x1 = x0 + size, step = size / n;
  const at = (i: number) => x0 + step * (i + 0.5);
  let d = `M${x0},${x0}`;
  for (let i = 0; i < n; i++) d += `L${r2(at(i) - r)},${x0}A${r} ${r} 0 0 0 ${r2(at(i) + r)},${x0}`;
  d += `L${x1},${x0}`;
  for (let i = 0; i < n; i++) d += `L${x1},${r2(at(i) - r)}A${r} ${r} 0 0 0 ${x1},${r2(at(i) + r)}`;
  d += `L${x1},${x1}`;
  for (let i = n - 1; i >= 0; i--) d += `L${r2(at(i) + r)},${x1}A${r} ${r} 0 0 0 ${r2(at(i) - r)},${x1}`;
  d += `L${x0},${x1}`;
  for (let i = n - 1; i >= 0; i--) d += `L${x0},${r2(at(i) + r)}A${r} ${r} 0 0 0 ${x0},${r2(at(i) - r)}`;
  return d + "Z";
}
/** The stamp: white paper with a dark keyline, and the star cell printed on it in black. The same on both pages: the
 *  keyline gives the paper its edge on a light page, and the paper stands out on a dark one. */
const stampLarge = svg(
  `<path d="${perforated(5, 90, 6, 4.2)}" fill="${WHITE}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`
  + `<rect x="17" y="17" width="66" height="66" fill="none" stroke="${INK}" stroke-width="2.4"/>`
  + `<path d="${hexPath(50, 50, 25)}" fill="${INK}"/><path d="${starPath(50, 50, 13)}" fill="${WHITE}"/>`);
const stampSmall = svg(
  `<path d="${perforated(4, 92, 3, 7.5)}" fill="${WHITE}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
  + `<path d="${hexPath(50, 50, 29)}" fill="${INK}"/><path d="${starPath(50, 50, 15.5)}" fill="${WHITE}"/>`);

// ---- 3. The bee: the mascot, as the collie is Hedge School's ----
// A honeybee builds its comb as cells on a hexagonal grid, as a player of Blueprints builds with cells. Drawn from above,
// in flight, in black and white with a thick white outline, as the collie's small head. A simple drawing by hand: a
// finished one would be traced from an image generator's drawings, as the collie was (BEE_BRIEF).

interface BeeShape { wings: string; hind: string; body: string; stripes: string; antennae: string }
const ellipse = (cx: number, cy: number, rx: number, ry: number, rot = 0) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ""}/>`;
const BEE_LARGE: BeeShape = {
  wings: ellipse(32, 33, 10.5, 20, -52) + ellipse(68, 33, 10.5, 20, 52),
  hind: ellipse(35, 49, 7, 13, -72) + ellipse(65, 49, 7, 13, 72),
  body: `<circle cx="50" cy="24" r="8.5"/><circle cx="50" cy="40" r="11"/>` + ellipse(50, 66, 14.5, 20)
    + `<path d="M46 84 L50 93 L54 84Z"/>`,
  stripes: `<rect x="34" y="59" width="32" height="4.6"/><rect x="34" y="70" width="32" height="4.6"/>`,
  antennae: `<path d="M46.5 17 Q43 9 36 7 M53.5 17 Q57 9 64 7"/>`,
};
const BEE_SMALL: BeeShape = {
  wings: ellipse(30, 35, 13, 22, -55) + ellipse(70, 35, 13, 22, 55),
  hind: "",
  body: `<circle cx="50" cy="23" r="10"/><circle cx="50" cy="41" r="12.5"/>` + ellipse(50, 68, 16.5, 22),
  stripes: `<rect x="32" y="62" width="36" height="7"/>`,
  antennae: `<path d="M45 15 Q42 8 35 6 M55 15 Q58 8 65 6"/>`,
};
/** The bee: a white outline round all of it, white wings drawn in black, a black body with white bands. The same on
 *  both pages, as the collie's head: the outline merges with a light page and frames the bee on a dark one. */
function bee(s: BeeShape, outline: number, line: number, antenna: number): string {
  const all = s.wings + s.hind + s.body;
  return svg(
    `<g fill="${WHITE}" stroke="${WHITE}" stroke-width="${outline}" stroke-linejoin="round">${all}</g>`
    + `<g fill="none" stroke="${WHITE}" stroke-width="${antenna + outline}" stroke-linecap="round">${s.antennae}</g>`
    + `<g fill="none" stroke="${INK}" stroke-width="${antenna}" stroke-linecap="round">${s.antennae}</g>`
    + `<g fill="${WHITE}" stroke="${INK}" stroke-width="${line}">${s.hind}${s.wings}</g>`
    + `<g fill="${INK}">${s.body}</g>`
    + `<g fill="${WHITE}" clip-path="url(#abdomen)">${s.stripes}</g>`
    + `<defs><clipPath id="abdomen">${s.body.match(/<ellipse[^>]*\/>/)?.[0] ?? ""}</clipPath></defs>`,
    "-4 -4 108 108");
}
const beeLarge = bee(BEE_LARGE, 7, 2.6, 2.6);
const beeSmall = bee(BEE_SMALL, 10, 4.5, 4.5);

/** The brief for an image generator, after the collie's (after Lichess's knight). */
export const BEE_BRIEF = [
  "A logo of a honeybee, seen from above, in flight, its wings spread, for a website's favicon and header.",
  "Black and white only, with no colour and no grey, in the style of the knight in Lichess's logo: flat, bold"
    + " shapes, no gradient, no texture, no hatching.",
  "The body black, with two white bands across the abdomen. The wings white, each with a black line. A small"
    + " black head with two short antennae.",
  "A thick white outline round the whole bee, so that the black body shows on a dark page.",
  "Centred on a plain square background, with nothing else in the picture: no comb, no flowers, no text.",
  "Simple enough to read at 16 pixels: few large masses, no thin parts, no fine detail.",
  "Ten variations: from above, and at a slight angle as if flying up and to the right.",
];

// ---- 4. The letter: a C built of hexes, in the site's accent ----

/** The C: the ring of hexes 2 from the middle, less its three on the right. */
const C_HEXES: readonly Hex[] = [[2, -2], [1, -2], [0, -2], [-1, -1], [-2, 0], [-2, 1], [-2, 2], [-1, 2], [0, 2]];
const C_K = 11.1; // the hexes' spacing, so that the C is 88 high in 100
const C_X = 50 + 0.866 * C_K; // the C's middle, less the gap on its right
/** The C's hexes: apart, as cells, in the full drawing; touching in the simple one, where gaps blur the C into beads.
 *  The touching hexes overlap a little, so that no seam shows between them. */
const C_CELLS = 0.92, C_SOLID = 1.03;
const letter = (fill: string, starred: boolean) => svg(
  `<path d="${hexes(C_HEXES, C_X, 50, C_K, C_K * (starred ? C_CELLS : C_SOLID))}" fill="${fill}"/>`
  + (starred ? `<path d="${starPath(C_X, 50, 9)}" fill="${fill}"/>` : ""));
/** On a tile, for the favicon and the iOS icon: the C in white on the light theme's lavender. */
const letterTile = (rx: number, scale: number) => svg(`<rect width="100" height="100" rx="${rx}" fill="${LAVENDER.light}"/>`
  + `<g transform="translate(50 50) scale(${scale}) translate(-50 -50)">`
  + `<path d="${hexes(C_HEXES, C_X, 50, C_K, C_K * C_SOLID)}" fill="${WHITE}"/></g>`);

export const LOGO_OPTIONS: readonly LogoOption[] = [
  {
    id: "cyanotype",
    name: "The cyanotype",
    idea: "The start's blueprint, a star in its ring of six cells, printed as a cyanotype: white on Prussian blue.",
    large: { light: cyanLarge(16), dark: cyanLarge(16) },
    small: { light: cyanSmall(18), dark: cyanSmall(18) },
    favicon: cyanSmall(18),
    touch: cyanLarge(0),
  },
  {
    id: "stamp",
    name: "The stamp",
    idea: "A revenue stamp, which paid stamp duty, with the game's star cell on it: Stamp Duty's mark.",
    large: { light: stampLarge, dark: stampLarge },
    small: { light: stampSmall, dark: stampSmall },
    favicon: stampSmall,
    touch: svg(`<rect width="100" height="100" fill="#1d1e21"/>` + nest(stampLarge, 13, 13, 74)),
  },
  {
    id: "bee",
    name: "The bee",
    idea: "A honeybee, the mascot: it builds its comb in cells on a hex grid, as the collie herds sheep into pens.",
    large: { light: beeLarge, dark: beeLarge },
    small: { light: beeSmall, dark: beeSmall },
    favicon: beeSmall,
    touch: svg(`<rect width="100" height="100" fill="${WHITE}"/>` + nest(beeLarge, 12, 12, 76)),
    brief: BEE_BRIEF.join(" "),
  },
  {
    id: "letter",
    name: "The hex C",
    idea: "The site's initial, a C built of nine hex cells, in the site's lavender: a lettermark in the accent.",
    large: { light: letter(LAVENDER.light, true), dark: letter(LAVENDER.dark, true) },
    small: { light: letter(LAVENDER.light, false), dark: letter(LAVENDER.dark, false) },
    favicon: letterTile(18, 0.8),
    touch: letterTile(0, 0.68),
  },
];

/** The drawing for a size and a theme. */
export const drawing = (option: LogoOption, size: number, theme: keyof Themed): string =>
  (size < LARGE_FROM ? option.small : option.large)[theme];
