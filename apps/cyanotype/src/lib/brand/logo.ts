// Cyanotype's logo (design 33, "The logo"): the contact print. A blueprint of four cells, printed in the paper's white
// on Prussian blue, as a cyanotype prints what lies on its paper. One drawing at every size: its cells are filled, with
// gaps between them, so it reads at 16 pixels (the favicon) as at 56 (the Support Us dialog). The same in both themes:
// the tile carries its own colour. Logo.svelte draws the logo in the page, svgElement on the strategyjam.org tools'
// button, and scripts/brand.mjs draws the site's files from it (src/lib/assets/favicon.svg, static/favicon.ico,
// static/apple-touch-icon.png, static/brand/card.png, and the head for partner sites' buttons,
// static/brand/cyanotype.svg). logo.test.ts keeps the favicon's file and the buttons' head equal to the drawing.
import { svgDocument, type Shape } from "@abstractclass/site/brand.ts";

// The drawing tools, which every site's logo shares: from @abstractclass/site/brand.ts.
export { shapeMarkup, svgDocument, svgElement, type Shape } from "@abstractclass/site/brand.ts";

/** The print's Prussian blue, and the paper's white of its cells. */
export const PRUSSIAN_BLUE = "#123e65";
const PAPER = "#f5f2e9";

/** The logo's own file draws in a view of `FILE_VIEW` × `FILE_VIEW`. The sites' drawings take a view of 100 × 100
 *  (@abstractclass/site/brand.ts), so each number below is scaled by 100 / `FILE_VIEW` when drawn. */
export const FILE_VIEW = 156;

/** The tile's corners' radius, in the file's view. */
const CORNER = 4.2;

/** The blueprint's four cells, as the file gives them: hexagons with a point at the top, 27.3 from the centre to each
 *  corner, and gaps between them. One cell at the top, two in the middle row and one at the bottom right. */
export const LOGO_CELLS = [
  "61.372,5.700 85.015,19.350 85.015,46.650 61.372,60.300 37.730,46.650 37.730,19.350",
  "35.392,50.700 59.034,64.350 59.034,91.650 35.392,105.300 11.749,91.650 11.749,64.350",
  "87.353,50.700 110.996,64.350 110.996,91.650 87.353,105.300 63.711,91.650 63.711,64.350",
  "113.334,95.700 136.976,109.350 136.976,136.650 113.334,150.300 89.691,136.650 89.691,109.350",
] as const;

/** A number of the file's view in the sites' view of 100, to a thousandth. */
export const scaled = (v: number) => Math.round((v * 100) / FILE_VIEW * 1000) / 1000;

/** A cell's outline as a path in the view of 100. */
const cellPath = (points: string) =>
  "M" + points.split(" ").map(p => p.split(",").map(v => scaled(Number(v))).join(",")).join("L") + "Z";

/** The blue tile with its cells, its corners of radius `rx` in the file's view (none for the iOS icon, which iOS rounds
 *  itself). */
const drawing = (rx: number): readonly Shape[] => [
  ["rect", { width: 100, height: 100, ...(rx ? { rx: scaled(rx) } : {}), fill: PRUSSIAN_BLUE }],
  ...LOGO_CELLS.map((points): Shape => ["path", { d: cellPath(points), fill: PAPER }]),
];

/** The logo, at every size. */
export const LOGO = drawing(CORNER);

/** The 180-pixel icon for iOS's home screen: the logo on a full square, with no transparent pixel. iOS rounds the
 *  corners itself and fills transparent ones with black. */
export const TOUCH_ICON = /* @__PURE__ */ drawing(0);

/** The favicon's file (src/lib/assets/favicon.svg): the logo, the same on light and dark tabs. The page never uses it
 *  or the iOS icon, and the marks of pure calls keep both out of the page's code. */
export const FAVICON_SVG = /* @__PURE__ */ svgDocument(LOGO, 32,
  "Cyanotype's logo (design 33, src/lib/brand/logo.ts): the same on light and dark tabs.");

/** The head for partner sites' buttons (static/brand/cyanotype.svg, design 33, "Partner sites", item 11): the logo,
 *  which the /developers page offers, as Hedge School offers its collie's head. Its comment says where it may go. */
export const BUTTON_HEAD_SVG = /* @__PURE__ */ svgDocument(LOGO, 32,
  "Cyanotype's logo (cyanotype.abstractclass.org). Use it, unchanged but for its size, only in a button or a\n"
  + "       link that leads to Cyanotype: cyanotype.abstractclass.org/developers#buttons.");
