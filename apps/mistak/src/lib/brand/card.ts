// The link preview picture (design 34, "The site's frame"): 1,200 × 630 pixels, Open Graph's size, in the form of
// Cyanotype's (its src/lib/brand/card.ts): on the right the site's name, what it is for and its address, in the site's
// dark theme, and on the left Tak's board, drawn as the page's board draws it (src/lib/board/pieces.ts).
// Drawn as SVG here, and to static/brand/card.png by scripts/brand.mjs. For Node: it reads the site's style sheets.
import { drawingMarkup } from "@abstractclass/site/brandGradient.ts";
import { shapeMarkup } from "@abstractclass/site/brand.ts";
import { siteTokens } from "@abstractclass/site/themeTokens.ts";
import { drawStack } from "../board/pieces.ts";
import { positionOf } from "../board/position.ts";
import { squareAt } from "../board/squares.ts";
import { LOGO_LARGE } from "./logo.ts";

// The dark theme's colours: the site's tokens, from the style sheets that hold them, in the order that src/app.css
// imports them. The lead takes the accent's colour. The grey under the lead is Hedge School's card's own. A token that
// the sheets do not hold stops the drawing.
const token = siteTokens(new URL("../../app.css", import.meta.url), "dark");
const BG = token("--bg"), TEXT = token("--text"), MUTED = token("--muted"), LEAD = token("--accent"), ABOUT = "#c9cace";
const BOARD = token("--board-bg"), LINE = token("--board-line");
const FILL = [token("--piece-white"), token("--piece-black")], EDGE = [token("--piece-white-line"), token("--piece-black-line")];

/** The card's size, Open Graph's. */
export const CARD_WIDTH = 1200, CARD_HEIGHT = 630;

const text = (x: number, y: number, size: number, fill: string, weight: number, lines: string[]) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}">`
  + lines.map((l, i) => `<tspan x="${x}" dy="${i ? size * 1.35 : 0}">${l}</tspan>`).join("") + "</text>";

const EDGE_WIDTH = { raised: 2.4, top: 1.6, pile: 1.2, bar: 1 };
/** The logo's size on the card, before the site's name. */
const LOGO_PIXELS = 92;

/** The board of the picture: a position made by hand. */
export const CARD_TPS = "x,2,1,1S,x/2,12121,1C,x,2/1,1,211212,2,x/x,12,2,1212C,1/1,x,2S,1,x 1 22";

/** The board, `side` pixels, with rounded corners. */
function board(x0: number, y0: number, side: number): string {
  const { size, squares } = positionOf(CARD_TPS), scale = side / (size * 100);
  let out = "";
  for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) {
    const { shapes } = drawStack(squares[squareAt(size, column, row, false)], size);
    out += `<g transform="translate(${column * 100} ${row * 100})">`
      + `<rect width="100" height="100" fill="${BOARD}" stroke="${LINE}" stroke-width="2"/>`
      + shapes.map(({ shape: [tag, attributes], owner, part }) =>
        shapeMarkup([[tag, { ...attributes, fill: FILL[owner], stroke: EDGE[owner], "stroke-width": EDGE_WIDTH[part] }]])).join("")
      + "</g>";
  }
  return `<clipPath id="board"><rect width="${size * 100}" height="${size * 100}" rx="18"/></clipPath>`
    + `<g transform="translate(${x0} ${y0}) scale(${scale})">`
    + `<g clip-path="url(#board)">${out}</g></g>`;
}

/** The link preview picture, as an SVG document. */
export function card(): string {
  const x = 600;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" width="${CARD_WIDTH}" `
    + `height="${CARD_HEIGHT}"><rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${BG}"/>`
    + board(56, 80, 470)
    + `<g transform="translate(${x} 122) scale(${LOGO_PIXELS / 100})">${drawingMarkup(LOGO_LARGE, "card")}</g>`
    + `<g font-family="'Segoe UI', system-ui, sans-serif">`
    + text(x + 110, 190, 62, TEXT, 700, ["Mistak"])
    + text(x, 290, 46, LEAD, 600, ["Learn Tak"])
    + text(x, 360, 30, ABOUT, 400, ["Review your games and analyze any line,",
      "with an engine that runs in your browser."])
    + text(x, 508, 26, MUTED, 400, ["mistak.abstractclass.org"]) + "</g></svg>";
}
