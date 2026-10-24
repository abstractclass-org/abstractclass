// The board's view of the grid, which has no edge: the point of the plane at the view's centre, and the pixels per
// unit of the plane (a hex's radius is 1 unit). Pan, zoom and fit change it. Pure functions, for the board's pointer
// handling (Board.svelte).
import type { Box } from "./hex.ts";

export interface View { cx: number; cy: number; scale: number }
/** An area of the screen, in pixels. */
export interface Size { width: number; height: number }

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
