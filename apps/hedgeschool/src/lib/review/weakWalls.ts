// The weak walls (design 30, "The weak walls"): a prototype of a map beside the area map. The engine gives, for each
// player, at each lattice point of the player's edges, the chance that an edge of this player at the point is cut
// before the game ends (protocol 0.6.2, `weakWalls`: the engine repository's docs/design/04-notation-and-protocol.md,
// "The root's maps"). The board marks the points, not the edges. A point's chance is the chance that some edge at the
// point is cut. An edge's own chance is at most the smallest chance on its points, so the board names no edge's chance.
// Each mark is a ring of one size whose colour gives the chance.
import type { WeakWalls } from "@abstractclass/engine/protocol.ts";
import { pointName } from "#lib/engine/notation.ts";
import { PLAYER_NAME } from "./enclosure.ts";

const N = 19;

/** A point's mark: the point, and the chance that an edge there is cut. */
export interface WallMark { x: number; y: number; chance: number }

/** The smallest chance marked: a tenth. Half the points on edges are under it in HedgeFund 0.2's self-play (the
 *  engine repository's games/enclosure/docs/decisions/inputs-and-targets.md, "The weak walls and the future nodes":
 *  133,207 of 277,348 points in the band from 0 to 10%, of which 1.6% were cut). */
export const WALL_MIN = 0.1;

const isChance = (v: number | null | undefined): v is number => typeof v === "number" && v >= 0 && v <= 1;
/** The wall at point `i`: its player and chance, or null where no edge passes. A point is on one player's edges only
 *  (an edge that touches the other player's edge removes it, or is illegal), so Blue's value comes first. */
function wallAt(walls: WeakWalls, i: number): { player: 0 | 1; chance: number } | null {
  const b = walls.b[i], r = walls.r[i];
  if (isChance(b)) return { player: 0, chance: b };
  return isChance(r) ? { player: 1, chance: r } : null;
}

/** The marks of the engine's weak walls: one at each point whose chance is at least WALL_MIN, weakest first, so that
 *  the strongest draw on top. */
export function wallMarks(walls: WeakWalls): WallMark[] {
  const marks: WallMark[] = [];
  for (let i = 0; i < N * N; i++) {
    const wall = wallAt(walls, i);
    if (wall && wall.chance >= WALL_MIN) marks.push({ x: i % N, y: Math.floor(i / N), chance: wall.chance });
  }
  return marks.sort((a, b) => a.chance - b.chance);
}

/** The place of a chance on the rings' ramp, in percent: from its faint end at the smallest chance marked to its bold
 *  end at 1. */
const wallMix = (chance: number) => Math.min(100, Math.max(0, Math.round(((chance - WALL_MIN) / (1 - WALL_MIN)) * 100)));

/** A ring's colour: a ramp of three hues, from `--wall-low` at the ramp's faint end through `--wall-mid` at its half
 *  to `--wall-high` at its bold end (the tokens in src/app.css): yellow, orange and brown on the light board, as
 *  ColorBrewer's YlOrBr, and brown, orange and yellow on the dark board, so that a bolder ring means a likelier cut
 *  on both. Two parts mixed in OKLab, each a straight line. A change of hue between the parts keeps near chances
 *  further apart than one hue does (design 30, "The weak walls", item 3). */
export function wallInk(chance: number): string {
  const mix = wallMix(chance);
  return mix <= 50
    ? `color-mix(in oklab, var(--wall-mid) ${mix * 2}%, var(--wall-low))`
    : `color-mix(in oklab, var(--wall-high) ${mix * 2 - 100}%, var(--wall-mid))`;
}

/** A chance as the readings write it: a whole percentage, and "under 1%" or "over 99%" near the ends. */
export function chanceText(chance: number): string {
  if (chance > 0 && chance < 0.005) return "under 1%";
  if (chance >= 0.995 && chance < 1) return "over 99%";
  return `${Math.round(chance * 100)}%`;
}

/** The reading of the point under the pointer: whose edges pass there, and the chance that one of them is cut, for
 *  example "E5 · Blue · cut chance 62%". Null where no edge passes. At most 203 pixels in DejaVu Sans, in the
 *  legend's 215 at a window 360 pixels wide ("M18 · Blue · cut chance under 1%"). */
export function wallReading([x, y]: [number, number], walls: WeakWalls): string | null {
  const wall = wallAt(walls, y * N + x);
  return wall && `${pointName(x, y)} · ${PLAYER_NAME[wall.player]} · cut chance ${chanceText(wall.chance)}`;
}
