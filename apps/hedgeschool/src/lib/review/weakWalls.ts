// The weak walls (design 30, "The weak walls"): a prototype of a map beside the area map. The engine gives, for each
// player, at each lattice point of the player's edges, the chance that an edge of this player at the point is cut
// before the game ends (protocol 0.6.2, `weakWalls`: the engine repository's docs/design/04-notation-and-protocol.md,
// "The root's maps"). The board marks the points, not the edges. A point's chance is the chance that some edge at the
// point is cut. An edge's own chance is at most the smallest chance on its points, so the board names no edge's chance.
// Three forms of the marks are drawn for comparison (the display setting "Weak walls' form", WallForm): a disc whose
// size gives the chance, a ring whose colour gives it, and a gauge filled as far as it.
import type { WeakWalls } from "@abstractclass/engine/protocol.ts";
import { pointName } from "#lib/engine/notation.ts";
import { PLAYER_NAME } from "./enclosure.ts";

const N = 19;

/** A point's mark: the point, the player whose edges pass there (0 Blue, 1 Red), and the chance that one is cut. */
export interface WallMark { x: number; y: number; player: 0 | 1; chance: number }

/** The smallest chance marked: a tenth. Half the points on edges are under it in HedgeFund 0.2's self-play (the
 *  engine repository's games/enclosure/docs/decisions/inputs-and-targets.md, "The weak walls and the future nodes":
 *  133,207 of 277,348 points in the band from 0 to 10%, of which 1.6% were cut). */
export const WALL_MIN = 0.1;

const isChance = (v: number | null | undefined): v is number => typeof v === "number" && v >= 0 && v <= 1;
/** The wall at point `i`: its player and chance, or null where no edge passes. A point on both players' maps, which
 *  the engine never gives (an edge that touches the other player's edge removes it, or is illegal), keeps the larger
 *  chance. */
function wallAt(walls: WeakWalls, i: number): { player: 0 | 1; chance: number } | null {
  const b = walls.b[i], r = walls.r[i];
  if (isChance(r) && !(isChance(b) && b >= r)) return { player: 1, chance: r };
  return isChance(b) ? { player: 0, chance: b } : null;
}

/** The marks of the engine's weak walls: one at each point whose chance is at least `min`, weakest first, so that the
 *  strongest draw on top. */
export function wallMarks(walls: WeakWalls, min = WALL_MIN): WallMark[] {
  const marks: WallMark[] = [];
  for (let i = 0; i < N * N; i++) {
    const wall = wallAt(walls, i);
    if (wall && wall.chance >= min) marks.push({ x: i % N, y: Math.floor(i / N), ...wall });
  }
  return marks.sort((a, b) => a.chance - b.chance);
}

/** The size form: a disc whose area grows with the chance, of radius 0.36 at 1 (a little more than a third of the
 *  points' spacing, so that two neighbours' discs do not touch). At the smallest chance marked it is 0.11, larger than
 *  the board's dot. */
export const wallRadius = (chance: number) => 0.36 * Math.sqrt(chance);

/** The colour form: the place of the chance on the ramp, in percent, from its light end at the smallest chance marked
 *  to its dark end at 1 (the board's color-mix of `--wall-low` and `--wall-high`). */
export const wallMix = (chance: number) => Math.min(100, Math.max(0, Math.round(((chance - WALL_MIN) / (1 - WALL_MIN)) * 100)));

const num = (v: number) => +v.toFixed(3);
/** The gauge form: the arc of a ring of radius `r` round (cx, cy), in the SVG's coordinates (y down), from the top,
 *  clockwise, as far as the chance. At 1, the whole ring, in two halves: one arc cannot end where it starts. */
export function gaugePath(cx: number, cy: number, r: number, chance: number): string {
  const top = `${num(cx)},${num(cy - r)}`, arc = (large: number, x: number, y: number) => `A${r},${r} 0 ${large} 1 ${num(x)},${num(y)}`;
  if (chance >= 1) return `M${top}${arc(1, cx, cy + r)}${arc(1, cx, cy - r)}`;
  const a = 2 * Math.PI * Math.max(0, chance);
  return `M${top}${arc(chance > 0.5 ? 1 : 0, cx + r * Math.sin(a), cy - r * Math.cos(a))}`;
}

/** A chance as the readings write it: a whole percentage, and "under 1%" or "over 99%" near the ends. */
export function chanceText(chance: number): string {
  if (chance > 0 && chance < 0.005) return "under 1%";
  if (chance >= 0.995 && chance < 1) return "over 99%";
  return `${Math.round(chance * 100)}%`;
}

/** The reading of the point under the pointer: whose edges pass there, and the chance that one of them is cut, for
 *  example "E5 · Blue's wall here: cut chance 62%". Null where no edge passes. */
export function wallReading([x, y]: [number, number], walls: WeakWalls): string | null {
  const wall = wallAt(walls, y * N + x);
  return wall && `${pointName(x, y)} · ${PLAYER_NAME[wall.player]}'s wall here: cut chance ${chanceText(wall.chance)}`;
}
