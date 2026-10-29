// The hands' panel over the board (Board.svelte, `hands: "panel"`, design 33): its place, kept as fractions of the room
// that the board's area leaves it, and its size, which the player sets with the handle at its lower corner. The panel
// stays inside the area and off the zoom's buttons. A fit keeps every hex out from under it (view.ts, fitAround), and
// may move it to the corner where the fit is larger. Pure functions.
import type { Hex } from "./hex.ts";
import { clamp, fitAround, type Rect, type Size, type View } from "./view.ts";

/** The panel's place: its left and top edges, as fractions of the room that the area leaves round it (0, 0: the
 *  top-left corner; 1, 1: the bottom-right corner, above the zoom's buttons). */
export interface PanelPlace { fx: number; fy: number }
export const CORNERS: readonly PanelPlace[] = [{ fx: 1, fy: 0 }, { fx: 0, fy: 0 }, { fx: 1, fy: 1 }, { fx: 0, fy: 1 }];
/** The panel's first place: the top-right corner. */
export const FIRST_PLACE: PanelPlace = CORNERS[0];
/** The panel's room from the area's edges and from the zoom's buttons, in pixels. */
export const INSET = 6;

/** The panel's parts, in pixels: its padding, the strip at its top that drags it, the gap between its two hands, and
 *  its border. */
export const PANEL_PAD = 6, PANEL_GRIP = 16, HANDS_GAP = 6, BORDER = 1;
/** Each hand's room in a panel of this size: a row of three blueprints, Blue's hand above Red's. */
export const handsOf = (panel: Size): Size => ({
  width: panel.width - 2 * PANEL_PAD - 2 * BORDER,
  height: (panel.height - PANEL_GRIP - HANDS_GAP - PANEL_PAD - 2 * BORDER) / 2,
});
/** The panel's size round two hands of this size. */
export const panelOf = (hand: Size): Size => ({
  width: hand.width + 2 * PANEL_PAD + 2 * BORDER,
  height: PANEL_GRIP + 2 * hand.height + HANDS_GAP + PANEL_PAD + 2 * BORDER,
});
/** The panel's first size: each hand 312 × 100 pixels, about a side column's width. */
export const FIRST_SIZE: Size = panelOf({ width: 312, height: 100 });
/** The smallest panel: each hand 216 × 72 pixels. A blueprint as the game starts it (a star with a ring of six cells,
 *  and the ring of hexes round them) then has hexes 12 pixels across, which a mouse can still click. */
export const MIN_SIZE: Size = panelOf({ width: 216, height: 72 });

const meets = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const unit = (v: number) => clamp(v, 0, 1);

/** The panel's size within its limits: MIN_SIZE at the least, and at the most what the area holds inside its insets
 *  and above the zoom's buttons (`avoid`). */
export function panelSizeIn(size: Size, area: Size, avoid: Rect | null): Size {
  const width = Math.max(MIN_SIZE.width, area.width - 2 * INSET);
  const height = Math.max(MIN_SIZE.height, area.height - 2 * INSET - (avoid ? avoid.height + INSET : 0));
  return { width: clamp(size.width, MIN_SIZE.width, width), height: clamp(size.height, MIN_SIZE.height, height) };
}

/** The panel's rectangle in the area, at a place. A place over the zoom's buttons (`avoid`) moves up above them. */
export function panelRect(place: PanelPlace, area: Size, panel: Size, avoid: Rect | null): Rect {
  const x = INSET + unit(place.fx) * Math.max(0, area.width - panel.width - 2 * INSET);
  let y = INSET + unit(place.fy) * Math.max(0, area.height - panel.height - 2 * INSET);
  const rect = { x, y, width: panel.width, height: panel.height };
  if (avoid && meets(rect, { x: avoid.x - INSET, y: avoid.y - INSET, width: avoid.width + 2 * INSET, height: avoid.height + 2 * INSET }))
    y = Math.max(INSET, avoid.y - INSET - panel.height);
  return { ...rect, y };
}

/** The place of a panel of this size whose top-left corner is at (x, y) of the area: a drag's end. */
export function placeAt(x: number, y: number, area: Size, panel: Size): PanelPlace {
  const room = (a: number, p: number) => Math.max(1, a - p - 2 * INSET);
  return { fx: unit((x - INSET) / room(area.width, panel.width)), fy: unit((y - INSET) / room(area.height, panel.height)) };
}

/** The side of the panel's lower corner that holds its resize handle: the side towards the area's middle. */
export const handleSide = (rect: Rect, area: Size): "left" | "right" => (rect.x + rect.width / 2 > area.width / 2 ? "left" : "right");

/** The panel's rectangle while the player drags its resize handle by (dx, dy) pixels. The handle is at the lower corner
 *  on `side`, and the opposite corner stays where it is. The size stays within its limits (panelSizeIn), and the panel
 *  inside the area. */
export function resized(rect: Rect, side: "left" | "right", dx: number, dy: number, area: Size, avoid: Rect | null): Rect {
  const most = panelSizeIn({ width: Infinity, height: Infinity }, area, avoid);
  const room = side === "left" ? rect.x + rect.width - INSET : area.width - INSET - rect.x;
  const width = clamp(side === "left" ? rect.width - dx : rect.width + dx, MIN_SIZE.width, Math.max(MIN_SIZE.width, Math.min(most.width, room)));
  const height = clamp(rect.height + dy, MIN_SIZE.height, Math.max(MIN_SIZE.height, Math.min(most.height, area.height - INSET - rect.y)));
  return { x: side === "left" ? rect.x + rect.width - width : rect.x, y: rect.y, width, height };
}

/** The fit with the panel at its place, or at the corner where the fit has the larger scale. The panel stays where it
 *  is when no corner gives a larger scale. Corners of the same scale go in the order of CORNERS. */
export function fitWithPanel(hexes: readonly Hex[], area: Size, panel: Size, place: PanelPlace, avoid: Rect | null,
                             margin: number): { view: View; place: PanelPlace } {
  const at = (p: PanelPlace) => fitAround(hexes, area, panelRect(p, area, panel, avoid), margin);
  let best = { view: at(place), place };
  for (const corner of CORNERS) {
    if (corner.fx === place.fx && corner.fy === place.fy) continue;
    const view = at(corner);
    if (view.scale > best.view.scale * 1.001) best = { view, place: corner };
  }
  return best;
}
