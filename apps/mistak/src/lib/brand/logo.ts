// Mistak's logo (design 34, "The site's frame": a logo of the site's own, with no art of Tak's): a stack of flat
// stones under a capstone, each stone moved sideways, the lowest one drifting off into a mist, for the site's name.
// Cream on a dark pine tile. The flat stones of a drawing have one size. Two drawings by size, as Hedge School's
// collie and Cyanotype's print have (design 12). From 48 pixels up, the full drawing: three flat stones, the lowest
// one fading to the right (the About page's 96 pixels). Below that, two thicker flat stones in full colour, which
// read at 16 pixels (the header's 28 pixels, the favicon). The same in both themes: the tile carries its own colour.
// Logo.svelte draws the logo in the page, and scripts/brand.mjs draws the site's files from these drawings
// (src/lib/assets/favicon.svg, static/favicon.ico, static/apple-touch-icon.png, static/brand/card.png, and the head
// for partner sites' buttons, static/brand/mistak.svg). logo.test.ts keeps the favicon's file and the buttons' head
// equal to their drawing.
import type { Shape } from "@abstractclass/site/brand.ts";
import { drawingDocument, type Drawing, type Gradient } from "@abstractclass/site/brandGradient.ts";

/** The tile's pine, and the stones' cream. */
export const PINE = "#24443d";
const STONE = "#efe8d8";

/** The size from which the full drawing replaces the simple one, as the collie's. */
export const LARGE_FROM = 48;

/** The tile, with corners of radius `rx` (none for the iOS icon, which iOS rounds itself). */
const tile = (rx: number): Shape => ["rect", { width: 100, height: 100, ...(rx ? { rx } : {}), fill: PINE }];

/** A stone at (x, y), with corners of radius `rx`, in full colour. */
const stone = (x: number, y: number, width: number, height: number, rx: number): Shape =>
  ["rect", { x, y, width, height, rx, fill: STONE }];

/** The mist: the stone's cream over its left part, fading to nothing at its right. */
const MIST: Gradient = { stops: [[0, STONE], [0.18, STONE], [1, STONE, 0]] };

/** The full drawing: the capstone, and three flat stones of one size, the lowest one in the mist. */
const large = (rx: number): Drawing => [
  tile(rx),
  stone(49, 12, 20, 28, 9),
  stone(12, 43, 62, 12, 6),
  stone(26, 59, 62, 12, 6),
  ["rect", { x: 13, y: 75, width: 62, height: 12, rx: 6 }, MIST],
];

/** The full drawing, from 48 pixels up, in a view of 100 × 100. */
export const LOGO_LARGE = large(18);

/** The simple drawing, below 48 pixels: the capstone, and two thicker flat stones of one size in full colour. */
export const LOGO_SMALL: Drawing = [
  tile(18),
  stone(49, 13, 22, 30, 8),
  stone(12, 48, 64, 15, 6),
  stone(24, 68, 64, 15, 6),
];

/** The 180-pixel icon for iOS's home screen: the full drawing on a full square, with no transparent pixel: the fading
 *  stone lies on the pine. iOS rounds the corners itself and fills transparent ones with black. */
export const TOUCH_ICON = /* @__PURE__ */ large(0);

/** The drawing for a size. */
export const logoAt = (size: number): Drawing => (size < LARGE_FROM ? LOGO_SMALL : LOGO_LARGE);

/** The favicon's file (src/lib/assets/favicon.svg): the simple drawing, the same on light and dark tabs. The page
 *  never uses it or the iOS icon, and the marks of pure calls keep both out of the page's code. */
export const FAVICON_SVG = /* @__PURE__ */ drawingDocument(LOGO_SMALL, 32, "favicon",
  "Mistak's logo, the simple drawing (design 34, src/lib/brand/logo.ts): the same on light and dark tabs.");

/** The head for partner sites' buttons (static/brand/mistak.svg): the simple drawing, which the /developers page will
 *  offer with the links that send a game here, as Hedge School offers its collie's head. Its comment says where it
 *  may go. */
export const BUTTON_HEAD_SVG = /* @__PURE__ */ drawingDocument(LOGO_SMALL, 32, "head",
  "Mistak's logo (mistak.abstractclass.org). Use it, unchanged but for its size, only in a button or a\n"
  + "       link that leads to Mistak: mistak.abstractclass.org/developers#buttons.");
