// Blueprints' grid (docs/design/33-drawing-board.md, item 5): pointy-top hexes in axial coordinates (q, r), with r
// down the screen, as strategyjam.org draws them. A hex has the radius 1 (from its centre to a corner), so its centre
// is at x = √3 (q + r / 2), y = 1.5 r. Geometry only: the rules are the engine's.

/** A hex, in axial coordinates. */
export type Hex = readonly [q: number, r: number];

const SQRT3 = Math.sqrt(3);

/** A hex's centre. */
export const center = ([q, r]: Hex): [number, number] => [SQRT3 * (q + r / 2), 1.5 * r];

/** The hex whose centre is nearest a point: the cube coordinates' rounding (Red Blob Games, "Hexagonal Grids"). */
export function hexAt(x: number, y: number): Hex {
  const q = (SQRT3 / 3) * x - y / 3, r = (2 / 3) * y, s = -q - r;
  let rq = Math.round(q), rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return [rq + 0, rr + 0]; // + 0: no -0, so that a key reads "0,0"
}

/** A hex's key, as strategyjam.org's state names its cells: "q,r". */
export const hexKey = ([q, r]: Hex): string => `${q},${r}`;

/** The hex of a key "q,r". */
export function parseHex(key: string): Hex {
  const m = /^(-?\d+),(-?\d+)$/.exec(key);
  if (!m) throw new Error(`not a hex: "${key}"`);
  return [Number(m[1]) + 0, Number(m[2]) + 0];
}

export const sameHex = (a: Hex, b: Hex): boolean => a[0] === b[0] && a[1] === b[1];

/** The outline of a hex of radius `size` around the point (x, y): its six corners, the first one at the top. */
export function hexPath(x: number, y: number, size = 1): string {
  const corners = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${round(x + size * Math.cos(a))},${round(y + size * Math.sin(a))}`;
  });
  return `M${corners.join("L")}Z`;
}
const round = (v: number) => Math.round(v * 1000) / 1000 + 0;

/** A blueprint's first cell: the first in reading order, the least r, then the least q. It is the cell (0, 0) of the
 *  blueprint's own frame (design 33, item 5). Null for no hexes. */
export function firstHex(hexes: readonly Hex[]): Hex | null {
  let first: Hex | null = null;
  for (const h of hexes) if (!first || h[1] < first[1] || (h[1] === first[1] && h[0] < first[0])) first = h;
  return first;
}

/** Hexes moved by (dq, dr). */
export const shift = (hexes: readonly Hex[], [dq, dr]: Hex): Hex[] => hexes.map(([q, r]) => [q + dq, r + dr] as const);

/** The hexes in their frame: moved so that the first is at (0, 0). */
export function inFrame(hexes: readonly Hex[]): Hex[] {
  const first = firstHex(hexes);
  return first ? shift(hexes, [-first[0], -first[1]]) : [];
}

/** A rectangle of the plane, in the board's units. */
export interface Box { x0: number; y0: number; x1: number; y1: number }

/** The box around the hexes' shapes, or null for no hexes. */
export function boxOf(hexes: Iterable<Hex>): Box | null {
  let box: Box | null = null;
  for (const h of hexes) {
    const [x, y] = center(h);
    const b = { x0: x - SQRT3 / 2, y0: y - 1, x1: x + SQRT3 / 2, y1: y + 1 };
    box = box ? { x0: Math.min(box.x0, b.x0), y0: Math.min(box.y0, b.y0), x1: Math.max(box.x1, b.x1), y1: Math.max(box.y1, b.y1) } : b;
  }
  return box;
}

/** The grid as one tile of an SVG pattern, √3 wide and 3 high, with the hex (0, 0)'s centre at its corner: the
 *  outlines of the hexes that cross the tile. Repeated from the origin, it draws every hex of the plane. */
export const GRID_TILE = { width: SQRT3, height: 3 } as const;
export const gridTilePath = (): string =>
  ([[0, 0], [SQRT3, 0], [SQRT3 / 2, 1.5], [0, 3], [SQRT3, 3]] as const).map(([x, y]) => hexPath(x, y)).join("");
