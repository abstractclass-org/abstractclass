// The views of a scene of the home page's board (design 33, "Where it is"; HomeBoard.svelte): the box that the board's
// fit holds through the scene's frames, so that the board shows the scene's moves and stays still while they play,
// and on the frame that holds the labelled move's moment, a closer box round that move, so that its label reads.
// scripts/home-replay.mjs writes the box into each frame of the scene.
import { boxOf, type Box, type Hex } from "../board/hex.ts";
import type { BoardMove } from "../board/position.ts";

/** What a frame of a scene draws on the board, as far as its view goes: the last move and the earlier ones of its
 *  turn, the engine's candidates and the labelled moves. */
export interface SceneFrame { l: BoardMove | null; e: BoardMove[]; c: { move: BoardMove }[]; m: { move: BoardMove }[] }

/** The hexes of the board that a move draws on: a placement's footprint and the cells that it captured. An edit draws
 *  in a hand and a pass draws nothing. */
const hexesOf = (m: BoardMove | null): Hex[] =>
  (m?.type === "place" ? [...m.footprint.map(c => c.hex), ...m.captured.map(c => c.hex)] : []);

/** The box of the hexes that a scene's frames draw on: the moves played, the candidates and the labelled moves. Null
 *  when they draw on none. */
export const sceneBox = (frames: readonly SceneFrame[]): Box | null =>
  boxOf(frames.flatMap(f => [f.l, ...f.e, ...f.c.map(c => c.move), ...f.m.map(x => x.move)].flatMap(hexesOf)));

/** The room round the labelled move's view, in units of the plane: 2.5 hexes' widths. With 3, a turn of two
 *  placements far apart (the second scene's) left its badges under Hedge School's at 390 pixels. */
export const MOMENT_MARGIN = 2.5 * Math.sqrt(3);

/** The view of a scene's labelled move, on the frame that holds its moment: the footprints of the turn's moves, which
 *  the board marks, and of the labelled moves, with MOMENT_MARGIN round them, so that the label reads. No candidate
 *  shows there, and the cells that a move captured stay out. Null when the frame draws on no hex: an edit's label is
 *  in its hand, which the board shows at the hand's own size, so the scene's view stays. */
export function momentBox(f: SceneFrame): Box | null {
  const footprint = (m: BoardMove | null): Hex[] => (m?.type === "place" ? m.footprint.map(c => c.hex) : []);
  const box = boxOf([f.l, ...f.e, ...f.m.map(x => x.move)].flatMap(footprint));
  return box && { x0: box.x0 - MOMENT_MARGIN, y0: box.y0 - MOMENT_MARGIN, x1: box.x1 + MOMENT_MARGIN, y1: box.y1 + MOMENT_MARGIN };
}
