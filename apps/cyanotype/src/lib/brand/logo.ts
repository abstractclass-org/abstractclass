// Cyanotype's logo (design 33, "The logo"): the start's blueprint, a star in its ring of six cells, printed as a
// cyanotype: white on Prussian blue. Two drawings by size, as Hedge School's collie has (design 12). From 48 pixels up,
// the full print: the cells in white lines and the print's border (the About page's 96 pixels). Below that, the cells
// filled white with the star cut out, which reads at 16 pixels (the header's 28 pixels, the favicon, the
// strategyjam.org tools' button). The same in both themes: the tile carries its own colour. Logo.svelte draws the logo
// in the page, svgElement on the tools' button, and scripts/brand.mjs draws the site's files from these drawings
// (src/lib/assets/favicon.svg, static/favicon.ico, static/apple-touch-icon.png, static/brand/card.png). logo.test.ts
// keeps the favicon's file equal to its drawing.
import { center, hexPath, TOUCHING, type Hex } from "#lib/board/hex.ts";

/** The print's Prussian blue, and the white of its lines. */
const PRUSSIAN_BLUE = "#163f6f";
const LINE = "#f2f6fb";

/** The size from which the full drawing replaces the simple one, as the collie's. */
export const LARGE_FROM = 48;

/** One shape of a drawing: its SVG element and its attributes. */
export type Shape = readonly ["rect" | "path", Readonly<Record<string, string | number>>];

const r2 = (v: number) => Math.round(v * 100) / 100;

/** A five-pointed star's outline, its points `r` from (x, y): the logo's and the card's own star. The board's star
 *  cells have six points (design 33, "The cells' marks"). */
export function starPath(x: number, y: number, r: number): string {
  return "M" + Array.from({ length: 10 }, (_, k) => {
    const a = (Math.PI / 5) * k - Math.PI / 2, d = k % 2 ? r * 0.42 : r;
    return `${r2(x + d * Math.cos(a))},${r2(y + d * Math.sin(a) + r * 0.06)}`;
  }).join("L") + "Z";
}

/** The start's blueprint: a star with its ring of six cells. */
const START: readonly Hex[] = [[0, 0], ...TOUCHING];

/** The blueprint's cells, their centres `k` apart round the view's centre: the outline of each, of radius `size`. */
const cells = (k: number, size: number) =>
  START.map(h => { const [cx, cy] = center(h); return hexPath(50 + k * cx, 50 + k * cy, size); }).join("");

/** The blue tile, with corners of radius `rx` (none for the iOS icon, which iOS rounds itself). */
const tile = (rx: number): Shape => ["rect", { width: 100, height: 100, ...(rx ? { rx } : {}), fill: PRUSSIAN_BLUE }];

/** The full print: the seven cells in white lines, the star in the middle one, and the print's border. */
const large = (rx: number): readonly Shape[] => [
  tile(rx),
  ["rect", { x: 7, y: 7, width: 86, height: 86, rx: Math.max(rx - 6, 3), fill: "none", stroke: LINE,
             "stroke-width": 1.2, opacity: 0.55 }],
  ["path", { d: cells(14.4, 14.4), fill: "none", stroke: LINE, "stroke-width": 2.8, "stroke-linejoin": "round" }],
  ["path", { d: starPath(50, 50, 8.5), fill: LINE }],
];

/** The full drawing, from 48 pixels up, in a view of 100 × 100. */
export const LOGO_LARGE = large(16);

/** The simple drawing, below 48 pixels: the seven cells filled white with gaps, the star cut out of the middle one. */
export const LOGO_SMALL: readonly Shape[] = [
  tile(18),
  ["path", { d: cells(14.2, 12.9), fill: LINE }],
  ["path", { d: starPath(50, 50, 8.6), fill: PRUSSIAN_BLUE }],
];

/** The 180-pixel icon for iOS's home screen: the full print on a full square, with no transparent pixel. iOS rounds
 *  the corners itself and fills transparent ones with black. */
export const TOUCH_ICON = /* @__PURE__ */ large(0);

/** The drawing for a size. */
export const logoAt = (size: number): readonly Shape[] => (size < LARGE_FROM ? LOGO_SMALL : LOGO_LARGE);

/** A drawing's shapes as SVG elements, each after `indent`. */
export const shapeMarkup = (shapes: readonly Shape[], indent = "") =>
  shapes.map(([tag, a]) => `${indent}<${tag}${Object.entries(a).map(([k, v]) => ` ${k}="${v}"`).join("")}/>`).join("");

/** A drawing as an SVG document of `size` pixels, which a browser draws as a file and an `<img>` shows. */
export const svgDocument = (shapes: readonly Shape[], size = 100, comment = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">`
  + (comment && `\n  <!-- ${comment} -->`) + shapeMarkup(shapes, "\n  ") + "\n</svg>\n";

/** A drawing as one SVG element of `size` pixels, on one line and hidden from screen readers, for a page that is not
 *  the site's own: the strategyjam.org tools' button and Tampermonkey's lists show the simple drawing
 *  (src/lib/game/tools.ts). */
export const svgElement = (shapes: readonly Shape[], size: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">`
  + shapeMarkup(shapes) + "</svg>";

/** The favicon's file (src/lib/assets/favicon.svg): the simple drawing, the same on light and dark tabs. The page
 *  never uses it or the iOS icon, and the marks of pure calls keep both out of the page's code. */
export const FAVICON_SVG = /* @__PURE__ */ svgDocument(LOGO_SMALL, 32,
  "Cyanotype's logo, the simple drawing (design 33, src/lib/brand/logo.ts): the same on light and dark tabs.");
