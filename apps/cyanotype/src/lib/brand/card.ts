// The link preview picture (design 33, "The logo"): 1,200 × 630 pixels, Open Graph's size, in the form of Hedge
// School's (its scripts/social-card.html, design 23): a corner of a board on the left, and on the right the logo, the
// site's name, what it is for and its address, in the site's dark theme. Drawn as SVG here, and to
// static/brand/card.png by scripts/brand.mjs.
import { center, hexPath, type Hex } from "#lib/board/hex.ts";
import type { Kind, Player } from "#lib/board/position.ts";
import { LOGO_LARGE, shapeMarkup, starPath } from "./logo.ts";

// The dark theme's colours (packages/site/src/site.css, and the board's in src/app.css). The grey under the lead is
// Hedge School's card's own.
const BG = "#1d1e21", TEXT = "#e4e4e6", MUTED = "#9a9ca3", LEAD = "#b8a6e8", ABOUT = "#c9cace";
const BOARD = "#3a362e", GRID = "#6d6555", BLUE = "#5b8ff0", RED = "#e8635c", ON_CELL = "#16181c";

/** The card's size, Open Graph's. */
export const CARD_WIDTH = 1200, CARD_HEIGHT = 630;

/** A corner of a game, drawn by hand: each player's start blueprint, grown towards the other, a wall of each. Blue's
 *  last placement, at (0, 0) and (0, 1), captured the two cells of Red's ring that touched it. As in a game, no
 *  player's cell touches the opponent's, but for walls. logo.test.ts checks this. */
export const CELLS: [Hex, Player, Kind][] = [
  [[-2, 1], 0, "star"], [[-1, 0], 0, "plain"], [[-1, 1], 0, "plain"], [[-2, 2], 0, "plain"], [[-3, 2], 0, "plain"],
  [[-3, 1], 0, "plain"], [[-2, 0], 0, "plain"], [[0, 0], 0, "plain"], [[0, 1], 0, "star"], [[-1, 2], 0, "wall"],
  [[2, -1], 1, "star"], [[3, -2], 1, "plain"], [[3, -1], 1, "plain"], [[2, 0], 1, "plain"],
  [[2, -2], 1, "plain"], [[1, -2], 1, "wall"], [[3, 0], 1, "plain"], [[2, 1], 1, "star"],
];
/** A wall's bricks on the cell at (x, y), of radius `k`: the card's own drawing of a wall, not the board's stripes
 *  (design 33, "The cells' marks"). */
const bricks = (x: number, y: number, k: number) =>
  [[-0.45, -0.3, 0.45, -0.3], [0.45, -0.3, 0.45, 0.3], [0.45, 0.3, -0.45, 0.3], [-0.45, 0.3, -0.45, -0.3],
   [-0.45, -0.1, 0.45, -0.1], [-0.45, 0.1, 0.45, 0.1], [0, -0.3, 0, -0.1], [-0.22, -0.1, -0.22, 0.1],
   [0.22, -0.1, 0.22, 0.1], [0, 0.1, 0, 0.3]]
    .map(([a, b, c, d]) => `M${x + k * a},${y + k * b}L${x + k * c},${y + k * d}`).join("");

function board(x0: number, y0: number, side: number, k: number): string {
  const mx = x0 + side / 2, my = y0 + side / 2;
  const at = (h: Hex) => { const [cx, cy] = center(h); return [mx + k * cx, my + k * cy] as const; };
  // The grid: every hex whose centre is inside the board's square.
  const n = Math.ceil(side / k);
  let grid = "";
  for (let r = -n; r <= n; r++) for (let q = -2 * n; q <= 2 * n; q++) {
    const [x, y] = at([q, r]);
    if (x > x0 - k && x < x0 + side + k && y > y0 - k && y < y0 + side + k) grid += hexPath(x, y, k);
  }
  let cells = "";
  for (const [h, owner, kind] of CELLS) {
    const [x, y] = at(h);
    cells += `<path d="${hexPath(x, y, k * 0.93)}" fill="${owner ? RED : BLUE}"/>`;
    if (kind === "star") cells += `<path d="${starPath(x, y, k * 0.52)}" fill="${ON_CELL}"/>`;
    if (kind === "wall") cells += `<path d="${bricks(x, y, k)}" fill="none" stroke="${ON_CELL}" stroke-width="${k * 0.07}"/>`;
  }
  const square = `x="${x0}" y="${y0}" width="${side}" height="${side}" rx="18"`;
  return `<clipPath id="board"><rect ${square}/></clipPath><rect ${square} fill="${BOARD}"/>`
    + `<g clip-path="url(#board)"><path d="${grid}" fill="none" stroke="${GRID}" stroke-width="1.6" opacity="0.7"/>`
    + `${cells}</g>`;
}

const text = (x: number, y: number, size: number, fill: string, weight: number, lines: string[]) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}">`
  + lines.map((l, i) => `<tspan x="${x}" dy="${i ? size * 1.35 : 0}">${l}</tspan>`).join("") + "</text>";

/** The link preview picture, as an SVG document. */
export function card(): string {
  const x = 600;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" width="${CARD_WIDTH}" `
    + `height="${CARD_HEIGHT}"><rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${BG}"/>${board(56, 80, 470, 31)}`
    + `<g transform="translate(${x} 122) scale(0.92)">${shapeMarkup(LOGO_LARGE)}</g>`
    + `<g font-family="'Segoe UI', system-ui, sans-serif">`
    + text(x + 110, 190, 62, TEXT, 700, ["Cyanotype"])
    + text(x, 290, 46, LEAD, 600, ["Learn Blueprints"])
    + text(x, 360, 30, ABOUT, 400, ["Review your games and analyze any line,",
      "with an engine that runs in your browser."])
    + text(x, 508, 26, MUTED, 400, ["cyanotype.abstractclass.org"]) + "</g></svg>";
}
