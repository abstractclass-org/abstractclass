// Blueprints' area map (Hedge School's design 30, design 33). The engine's ownership is the network's at the root, over
// the hexes of the rule's view of the position: a rhombus of 67 × 67 hexes round the mover's last placements, at the
// index y × 67 + x (the engine repository's games/blueprints/README.md, "The ownership"). The view's hex (x, y) is the
// board's hex (q, r) + R^o (x − 33, y − 33), where (q, r) is the view's middle, o its orientation, and R the turn by 60
// degrees, (q, r) → (−r, q + r). The view moves with the play, so a map keeps its place: its values, then the view's
// middle and orientation. Two positions' maps meet at their common hexes (alignMap), and a hex outside the view gets
// no mark. The engine's search of the root's views gives the rule's view's ownership too (request 24).
import type { EngineView } from "@abstractclass/engine/protocol.ts";
import { hexKey, type Hex } from "../board/hex.ts";
import type { Player, SitePosition } from "../board/position.ts";

/** The numbers after the values that give the view's place: its middle's q and r, and its orientation. */
const PLACE = 3;

/** A view's place, as a map keeps it, and the side of its rhombus. */
export interface MapPlace { q: number; r: number; orientation: number; side: number }

/** A map of the ownership (in hundredths) over the view `view`: the values, then the view's place. Without a view,
 *  the ownership alone, which no hex can read (placeOf). */
export const mapWithView = (ownership: number[], view: EngineView | undefined): number[] =>
  view ? [...ownership, view.q, view.r, view.orientation] : ownership;

/** The place of a map's view, or null when the map has none. */
export function placeOf(map: readonly number[]): MapPlace | null {
  const n = map.length - PLACE, side = Math.round(Math.sqrt(Math.max(0, n)));
  if (n <= 0 || side * side !== n) return null;
  return { q: map[n], r: map[n + 1], orientation: map[n + 2], side };
}

/** The turn by 60 degrees, `times` times: (q, r) → (−r, q + r). */
function turn([q, r]: Hex, times: number): Hex {
  let h: Hex = [q, r];
  for (let k = 0; k < ((times % 6) + 6) % 6; k++) h = [-h[1], h[0] + h[1]];
  return h;
}

/** The board's hex of the view's index `i`. */
export function hexOfIndex(p: MapPlace, i: number): Hex {
  const half = (p.side - 1) / 2, x = i % p.side, y = Math.floor(i / p.side);
  const [dq, dr] = turn([x - half, y - half], p.orientation);
  return [p.q + dq, p.r + dr];
}

/** The view's index of a board's hex, or −1 when the view does not hold it. */
export function indexOfHex(p: MapPlace, [q, r]: Hex): number {
  const half = (p.side - 1) / 2;
  const [dx, dy] = turn([q - p.q, r - p.r], 6 - p.orientation); // the turn back
  const x = dx + half, y = dy + half;
  return x >= 0 && x < p.side && y >= 0 && y < p.side ? y * p.side + x : -1;
}

/** A hex's index in a map: −1 where the map does not hold it. */
export const mapIndex = (hex: Hex, map: readonly number[]): number => {
  const p = placeOf(map);
  return p ? indexOfHex(p, hex) : -1;
};

/** The values of `map` at the hexes of the map `to`, in `to`'s form: NaN at a hex that `map`'s view does not hold.
 *  The forecast before a move, against the forecast after it. */
export function alignMap(map: readonly number[], to: readonly number[]): number[] {
  const from = placeOf(map), at = placeOf(to);
  if (!from || !at) return to.map(() => NaN);
  const n = at.side * at.side;
  const out = Array.from({ length: n }, (_, i) => {
    const j = indexOfHex(from, hexOfIndex(at, i));
    return j < 0 ? NaN : map[j];
  });
  return [...out, ...to.slice(n)];
}

/** A line's move as the board's state takes it: its mover, and, once the rules have played it, the hexes that it
 *  filled and the cells that it captured. */
export interface StateMove { player: Player; footprint?: readonly string[]; captured?: Readonly<Record<string, unknown>> }

/** Each hex of a map's view on the board after a line's moves, from Blue's side: 1 a cell of Blue's, −1 Red's, 0
 *  empty. Then the map's place, as zeros. */
export function boardState(from: Pick<SitePosition, "cells">, drawn: readonly StateMove[], map: readonly number[]): number[] {
  const p = placeOf(map);
  if (!p) return map.map(() => 0);
  const owner = new Map<string, Player>(Object.entries(from.cells).map(([k, [o]]) => [k, o]));
  for (const m of drawn) {
    for (const k of Object.keys(m.captured ?? {})) owner.delete(k);
    for (const k of m.footprint ?? []) owner.set(k, m.player);
  }
  const n = p.side * p.side;
  const state = Array.from({ length: n }, (_, i) => {
    const o = owner.get(hexKey(hexOfIndex(p, i)));
    return o === undefined ? 0 : o === 0 ? 1 : -1;
  });
  return [...state, ...Array(map.length - n).fill(0)];
}

/** The hexes of a map's view with their indices, for the board's drawing: the view's hexes in its index order. */
export function viewHexes(map: readonly number[]): Hex[] {
  const p = placeOf(map);
  return p ? Array.from({ length: p.side * p.side }, (_, i) => hexOfIndex(p, i)) : [];
}
