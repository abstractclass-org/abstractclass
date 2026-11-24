// The link preview picture (design 34, "The site's frame"): 1,200 × 630 pixels, Open Graph's size, in the form of
// Cyanotype's (its src/lib/brand/card.ts): on the right the site's name, what it is for and its address, in the site's
// dark theme. The left holds the logo's full drawing, large, until the board's work draws a corner of Tak's board there
// with the logo beside the name, as Cyanotype's card has (abscls-shfz.18.6). Drawn as SVG
// here, and to static/brand/card.png by scripts/brand.mjs. For Node: it reads the site's style sheets.
import { drawingMarkup } from "@abstractclass/site/brandGradient.ts";
import { siteTokens } from "@abstractclass/site/themeTokens.ts";
import { LOGO_LARGE } from "./logo.ts";

// The dark theme's colours: the site's tokens, from the style sheets that hold them, in the order that src/app.css
// imports them. The lead takes the accent's colour. The grey under the lead is Hedge School's card's own. A token that
// the sheets do not hold stops the drawing.
const token = siteTokens(new URL("../../app.css", import.meta.url), "dark");
const BG = token("--bg"), TEXT = token("--text"), MUTED = token("--muted"), LEAD = token("--accent"), ABOUT = "#c9cace";

/** The card's size, Open Graph's. */
export const CARD_WIDTH = 1200, CARD_HEIGHT = 630;

const text = (x: number, y: number, size: number, fill: string, weight: number, lines: string[]) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}">`
  + lines.map((l, i) => `<tspan x="${x}" dy="${i ? size * 1.35 : 0}">${l}</tspan>`).join("") + "</text>";

/** The link preview picture, as an SVG document. */
export function card(): string {
  const x = 600;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" width="${CARD_WIDTH}" `
    + `height="${CARD_HEIGHT}"><rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${BG}"/>`
    + `<g transform="translate(56 80) scale(4.7)">${drawingMarkup(LOGO_LARGE, "card")}</g>`
    + `<g font-family="'Segoe UI', system-ui, sans-serif">`
    + text(x, 190, 62, TEXT, 700, ["Mistak"])
    + text(x, 290, 46, LEAD, 600, ["Learn Tak"])
    + text(x, 360, 30, ABOUT, 400, ["Review your games and analyze any line,",
      "with an engine that runs in your browser."])
    + text(x, 508, 26, MUTED, 400, ["mistak.abstractclass.org"]) + "</g></svg>";
}
