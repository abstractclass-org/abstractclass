// Mistak's logo (design 34, "The site's frame": a logo of the site's own, with no art of Tak's): a stack, Tak's own
// idea, drawn as plain shapes. Flat stones, a capstone on top, and the lower stones fading as into a mist, for the
// site's name. Cream on a dark pine tile. Two drawings by size, as Hedge School's collie and Cyanotype's print have
// (design 12). From 48 pixels up, the full drawing: three flat stones that fade, under the capstone (the About page's
// 96 pixels). Below that, two flat stones in full colour under the capstone, which reads at 16 pixels (the header's 28
// pixels, the favicon). The same in both themes: the tile carries its own colour. Logo.svelte draws the logo in the
// page, and scripts/brand.mjs draws the site's files from these drawings (src/lib/assets/favicon.svg,
// static/favicon.ico, static/apple-touch-icon.png, static/brand/card.png, and the head for partner sites' buttons,
// static/brand/mistak.svg). logo.test.ts keeps the favicon's file and the buttons' head equal to their drawing.
import { svgDocument, type Shape } from "@abstractclass/site/brand.ts";

/** The tile's pine, and the stones' cream. */
export const PINE = "#24443d";
const STONE = "#efe8d8";

/** The size from which the full drawing replaces the simple one, as the collie's. */
export const LARGE_FROM = 48;

/** The tile, with corners of radius `rx` (none for the iOS icon, which iOS rounds itself). */
const tile = (rx: number): Shape => ["rect", { width: 100, height: 100, ...(rx ? { rx } : {}), fill: PINE }];

/** A flat stone, seen from the side: a slab at height `y`. */
const flat = (x: number, y: number, width: number, height: number, rx: number, opacity = 1): Shape =>
  ["rect", { x, y, width, height, rx, fill: STONE, ...(opacity < 1 ? { opacity } : {}) }];

/** The full drawing: three flat stones, the lower two fading, and the capstone, a pillar. */
const large = (rx: number): readonly Shape[] => [
  tile(rx),
  flat(22, 73, 56, 11, 3, 0.45),
  flat(22, 60, 56, 11, 3, 0.72),
  flat(22, 47, 56, 11, 3),
  ["rect", { x: 39, y: 12, width: 22, height: 32, rx: 6, fill: STONE }],
];

/** The full drawing, from 48 pixels up, in a view of 100 × 100. */
export const LOGO_LARGE = large(16);

/** The simple drawing, below 48 pixels: two thicker flat stones in full colour, and the capstone. */
export const LOGO_SMALL: readonly Shape[] = [
  tile(18),
  flat(18, 67, 64, 15, 4),
  flat(18, 49, 64, 15, 4),
  ["rect", { x: 36, y: 12, width: 28, height: 34, rx: 7, fill: STONE }],
];

/** The 180-pixel icon for iOS's home screen: the full drawing on a full square, with no transparent pixel. iOS rounds
 *  the corners itself and fills transparent ones with black. */
export const TOUCH_ICON = /* @__PURE__ */ large(0);

/** The drawing for a size. */
export const logoAt = (size: number): readonly Shape[] => (size < LARGE_FROM ? LOGO_SMALL : LOGO_LARGE);

/** The favicon's file (src/lib/assets/favicon.svg): the simple drawing, the same on light and dark tabs. The page
 *  never uses it or the iOS icon, and the marks of pure calls keep both out of the page's code. */
export const FAVICON_SVG = /* @__PURE__ */ svgDocument(LOGO_SMALL, 32,
  "Mistak's logo, the simple drawing (design 34, src/lib/brand/logo.ts): the same on light and dark tabs.");

/** The head for partner sites' buttons (static/brand/mistak.svg): the simple drawing, which the /developers page will
 *  offer with the links that send a game here, as Hedge School offers its collie's head. Its comment says where it
 *  may go. */
export const BUTTON_HEAD_SVG = /* @__PURE__ */ svgDocument(LOGO_SMALL, 32,
  "Mistak's logo (mistak.abstractclass.org). Use it, unchanged but for its size, only in a button or a\n"
  + "       link that leads to Mistak: mistak.abstractclass.org/developers#buttons.");
