// The link preview picture for each logo option (abscls-8tl1.44): 1,200 × 630 pixels, Open Graph's size, in the form
// of Hedge School's (its scripts/social-card.html, design 23): a corner of a board on the left, and on the right the
// logo, the site's name, what it is for and its address, in the site's dark theme. Here as SVG, so that the lab page
// shows it at any width. The chosen option's picture would be drawn to static/brand/card.png, as Hedge School's.
import { center, hexPath, type Hex } from "#lib/board/hex.ts";
import { dataUrl, drawing, starPath, svg, type LogoOption } from "./logoOptions.ts";

// The dark theme's colours (packages/site/src/site.css, and the board's in src/app.css). The grey under the lead is
// Hedge School's card's own.
const BG = "#1d1e21", TEXT = "#e4e4e6", MUTED = "#9a9ca3", LEAD = "#b8a6e8", ABOUT = "#c9cace";
const BOARD = "#3a362e", GRID = "#6d6555", BLUE = "#5b8ff0", RED = "#e8635c", ON_CELL = "#16181c";

/** A corner of a game: each player's start blueprint, grown towards the other, a wall of each, and the last placement's
 *  outline. */
const CELLS: [Hex, 0 | 1, "plain" | "star" | "wall"][] = [
  [[-2, 1], 0, "star"], [[-1, 0], 0, "plain"], [[-1, 1], 0, "plain"], [[-2, 2], 0, "plain"], [[-3, 2], 0, "plain"],
  [[-3, 1], 0, "plain"], [[-2, 0], 0, "plain"], [[0, 0], 0, "plain"], [[0, 1], 0, "star"], [[-1, 2], 0, "wall"],
  [[2, -1], 1, "star"], [[3, -2], 1, "plain"], [[3, -1], 1, "plain"], [[2, 0], 1, "plain"], [[1, -1], 1, "plain"],
  [[2, -2], 1, "plain"], [[1, -2], 1, "wall"], [[3, 0], 1, "plain"], [[2, 1], 1, "star"],
];
const BRICKS = (x: number, y: number, k: number) =>
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
    if (kind === "wall") cells += `<path d="${BRICKS(x, y, k)}" fill="none" stroke="${ON_CELL}" stroke-width="${k * 0.07}"/>`;
  }
  return `<clipPath id="board"><rect x="${x0}" y="${y0}" width="${side}" height="${side}" rx="18"/></clipPath>`
    + `<rect x="${x0}" y="${y0}" width="${side}" height="${side}" rx="18" fill="${BOARD}"/>`
    + `<g clip-path="url(#board)"><path d="${grid}" fill="none" stroke="${GRID}" stroke-width="1.6" opacity="0.7"/>`
    + `${cells}</g>`;
}

const text = (x: number, y: number, size: number, fill: string, weight: number, lines: string[]) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}">`
  + lines.map((l, i) => `<tspan x="${x}" dy="${i ? size * 1.35 : 0}">${l}</tspan>`).join("") + "</text>";

/** The link preview picture with this option's logo. */
export function card(option: LogoOption): string {
  const x = 600;
  return svg(`<rect width="1200" height="630" fill="${BG}"/>${board(56, 80, 470, 31)}`
    + `<g font-family="'Segoe UI', system-ui, sans-serif">`
    + `<image href="${dataUrl(drawing(option, 92, "dark"))}" x="${x}" y="122" width="92" height="92"/>`
    + text(x + 110, 190, 62, TEXT, 700, ["Cyanotype"])
    + text(x, 290, 46, LEAD, 600, ["Learn Blueprints"])
    + text(x, 360, 30, ABOUT, 400, ["Review your games and analyze any", "position, with an engine that runs in",
      "your browser."])
    + text(x, 508, 26, MUTED, 400, ["cyanotype.abstractclass.org"]) + "</g>",
  "0 0 1200 630");
}
