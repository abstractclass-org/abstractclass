// The board's view of the grid, which has no edge: the point of the plane at the view's centre, and the pixels per
// unit of the plane (a hex's radius is 1 unit). Pan, zoom and fit change it. Pure functions, for the board's pointer
// handling (Board.svelte).
import { boxOf, type Box, type Hex } from "./hex.ts";

export interface View { cx: number; cy: number; scale: number }
/** An area of the screen, in pixels. */
export interface Size { width: number; height: number }
/** A rectangle of the area, in pixels. */
export interface Rect { x: number; y: number; width: number; height: number }

/** The zoom's limits, in pixels per unit: a hex from 4 pixels across to about 130. */
export const SCALE_MIN = 2;
export const SCALE_MAX = 64;
/** A fit zooms in no further than a hex 72 pixels across: a few cells do not fill a large area. */
export const FIT_MAX = 36;
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const clampScale = (s: number, max = SCALE_MAX) => clamp(s, SCALE_MIN, max);

/** The view that shows the box whole and centred, with `margin` units round it. */
export function fit(box: Box, size: Size, margin = 1): View {
  const w = box.x1 - box.x0 + 2 * margin, h = box.y1 - box.y0 + 2 * margin;
  return { cx: (box.x0 + box.x1) / 2, cy: (box.y0 + box.y1) / 2, scale: clampScale(Math.min(size.width / w, size.height / h), FIT_MAX) };
}

const HALF_WIDTH = Math.sqrt(3) / 2; // a hex's half width, in units: its height is 2
const EPSILON = 1e-9; // a hex that only touches the cover's edge is not under it

/** The view that fits the hexes as `fit` fits their box, at the largest scale at which no hex lies under `cover` (a
 *  panel over the area, with `gap` pixels kept round it), and with its centre as near the box's centre as that scale
 *  lets it be. The fit's own view when no hex lies under the cover there. Hexes in a gap of the others can show round
 *  the cover. */
export function fitAround(hexes: readonly Hex[], size: Size, cover: Rect, margin = 1, gap = 4): View {
  const box = boxOf(hexes);
  if (!box) return fit(boxOf([[-2, -2], [2, 2]])!, size, margin);
  const base = fit(box, size, margin);
  // The hexes on a grid of whole numbers: the column 2q + r (half a hex's width apart) and the row r. The sums from
  // the grid's corner count the hexes in any block of it in four reads.
  const cols = hexes.map(([q, r]) => 2 * q + r), rows = hexes.map(([, r]) => r);
  const c0 = Math.min(...cols), r0 = Math.min(...rows), nc = Math.max(...cols) - c0 + 1, nr = Math.max(...rows) - r0 + 1;
  const sums = new Int32Array((nc + 1) * (nr + 1));
  for (let i = 0; i < hexes.length; i++) sums[(rows[i] - r0 + 1) * (nc + 1) + cols[i] - c0 + 1] = 1;
  for (let r = 1; r <= nr; r++)
    for (let c = 1; c <= nc; c++)
      sums[r * (nc + 1) + c] += sums[(r - 1) * (nc + 1) + c] + sums[r * (nc + 1) + c - 1] - sums[(r - 1) * (nc + 1) + c - 1];
  const at = (c: number, r: number) => sums[r * (nc + 1) + c];
  /** The hexes in the columns ca to cb and the rows ra to rb (the grid's numbers, both ends in). */
  const count = (ca: number, cb: number, ra: number, rb: number) => {
    ca = Math.max(ca - c0, 0); cb = Math.min(cb - c0, nc - 1); ra = Math.max(ra - r0, 0); rb = Math.min(rb - r0, nr - 1);
    return ca > cb || ra > rb ? 0 : at(cb + 1, rb + 1) - at(ca, rb + 1) - at(cb + 1, ra) + at(ca, ra);
  };
  const { width: w, height: h } = size;
  const left = cover.x - gap - w / 2, right = cover.x + cover.width + gap - w / 2;
  const top = cover.y - gap - h / 2, bottom = cover.y + cover.height + gap - h / 2;
  /** Whether a hex lies under the cover in the view (cx, cy, scale s). A hex's box is 2 half widths across and 2 high. */
  const covered = (cx: number, cy: number, s: number) => {
    const l = cx + left / s, rt = cx + right / s, t = cy + top / s, b = cy + bottom / s;
    return count(Math.floor(l / HALF_WIDTH - 1 + EPSILON) + 1, Math.ceil(rt / HALF_WIDTH + 1 - EPSILON) - 1,
                 Math.floor((t - 1) / 1.5 + EPSILON) + 1, Math.ceil((b + 1) / 1.5 - EPSILON) - 1) > 0;
  };
  if (!covered(base.cx, base.cy, base.scale)) return base;
  /** The centres that a view of scale s can have, nearest the box's centre first: the ends of the range that keeps the
   *  box in the area, the box's centre, and each centre that puts the cover's edge on the edge of a column or a row of
   *  hexes. A free view, if any, has a centre among them, on each axis. */
  const centres = (from: number, to: number, target: number, edges: number[]) =>
    [from, to, Math.min(to, Math.max(from, target)), ...edges.filter(x => x > from && x < to)]
      .sort((a, b) => Math.abs(a - target) - Math.abs(b - target));
  const place = (s: number): View | null => {
    const xs = centres(box.x1 + margin - w / 2 / s, box.x0 - margin + w / 2 / s, base.cx,
      Array.from({ length: nc }, (_, k) => HALF_WIDTH * (c0 + k)).flatMap(x => [x + HALF_WIDTH - left / s, x - HALF_WIDTH - right / s]));
    const ys = centres(box.y1 + margin - h / 2 / s, box.y0 - margin + h / 2 / s, base.cy,
      Array.from({ length: nr }, (_, k) => 1.5 * (r0 + k)).flatMap(y => [y + 1 - top / s, y - 1 - bottom / s]));
    let best: View | null = null, far = Infinity;
    for (const cx of xs) {
      if (Math.abs(cx - base.cx) >= far) break;
      for (const cy of ys) {
        const d = Math.hypot(cx - base.cx, cy - base.cy);
        if (d >= far) break;
        if (!covered(cx, cy, s)) { best = { cx, cy, scale: s }; far = d; }
      }
    }
    return best;
  };
  // The largest scale with a free view: a free view at one scale has a free view at each smaller one.
  let lo = SCALE_MIN, hi = base.scale;
  if (!place(lo)) return base;
  for (let k = 0; k < 20 && hi / lo > 1.002; k++) {
    const mid = Math.sqrt(lo * hi);
    if (place(mid)) lo = mid; else hi = mid;
  }
  return place(lo)!;
}

/** The point of the plane under a point of the area (px, py). */
export const toPlane = (v: View, size: Size, px: number, py: number): [number, number] =>
  [v.cx + (px - size.width / 2) / v.scale, v.cy + (py - size.height / 2) / v.scale];

/** The point of the area over a point of the plane. */
export const toArea = (v: View, size: Size, x: number, y: number): [number, number] =>
  [(x - v.cx) * v.scale + size.width / 2, (y - v.cy) * v.scale + size.height / 2];

/** The SVG's viewBox for the view: x, y, width and height in the plane's units. */
export const viewBox = (v: View, size: Size): [number, number, number, number] =>
  [v.cx - size.width / 2 / v.scale, v.cy - size.height / 2 / v.scale, size.width / v.scale, size.height / v.scale];

/** The view moved with a drag of (dx, dy) pixels: the plane follows the pointer. */
export const pan = (v: View, dx: number, dy: number): View => ({ ...v, cx: v.cx - dx / v.scale, cy: v.cy - dy / v.scale });

/** The view zoomed by `factor` round the point (px, py) of the area, which stays under it. */
export function zoomAt(v: View, size: Size, factor: number, px: number, py: number): View {
  const scale = clampScale(v.scale * factor);
  const [x, y] = toPlane(v, size, px, py);
  return { cx: x - (px - size.width / 2) / scale, cy: y - (py - size.height / 2) / scale, scale };
}

/** Two fingers: the view at their start, their midpoint and distance then and now. The plane's point under the start's
 *  midpoint follows the midpoint, and the zoom follows the distance. */
export function pinch(start: View, size: Size, from: { x: number; y: number; d: number }, to: { x: number; y: number; d: number }): View {
  const scale = clampScale(start.scale * (from.d > 0 ? to.d / from.d : 1));
  const [x, y] = toPlane(start, size, from.x, from.y);
  return { cx: x - (to.x - size.width / 2) / scale, cy: y - (to.y - size.height / 2) / scale, scale };
}
