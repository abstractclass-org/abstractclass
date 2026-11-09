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

/** A ring's colour: the place of the chance on the ramp, in percent, from its faint end at the smallest chance marked
 *  to its bold end at 1 (the board's color-mix of `--wall-low` and `--wall-high`). */
export const wallMix = (chance: number) => Math.min(100, Math.max(0, Math.round(((chance - WALL_MIN) / (1 - WALL_MIN)) * 100)));

/** The rings' forms for a look before a choice (design 30, "The weak walls", item 3): A, the ramp above, is the page's
 *  form. The others show only behind the look's switch (`lookForm`):
 *  - B: classes of the ramp's hue (`WALL_CLASSES`), their colours evenly spaced on the ramp, which is a straight line in
 *    OKLab, so that each class is as far from the next in lightness.
 *  - C: B's classes, the ring wider with each class (`CLASS_WIDTH`).
 *  - D: a ramp of three hues, yellow, orange and brown (`--wall-d-low`, `--wall-d-mid` and `--wall-d-high`), as
 *    ColorBrewer's YlOrBr, apart from the players' blue and red and the signs' green.
 *  - E: B's classes on D's ramp: steps of hue and lightness together. */
export const WALL_FORMS = ["A", "B", "C", "D", "E"] as const;
export type WallForm = (typeof WALL_FORMS)[number];

/** The classes' lower ends, for the forms B, C and E: a class takes the chances from its end up to the next. Each end
 *  lies in a gap between the chances that the positions of design 30 show (the review fixture after 40 edges: 19 to
 *  26%; the Analysis board after Space six times: 24, 41 to 50, 59 to 72, and 80%): 30, so that 24% and 25% stay
 *  together; 50, even odds; 75, between 72 and 80, which puts 70% and 85% apart. */
export const WALL_CLASSES = [WALL_MIN, 0.3, 0.5, 0.75];
/** The ring's width in each class, in the form C: today's ring, 0.1, at the second class. */
const CLASS_WIDTH = [0.06, 0.1, 0.14, 0.18];

/** The class of a chance: the index of the last class end at or under it. */
export const wallClass = (chance: number) => WALL_CLASSES.findLastIndex(end => chance >= end);

/** A place on D's ramp, from 0 (`--wall-d-low`) to 100 (`--wall-d-high`), through `--wall-d-mid` at 50. */
const threeHues = (mix: number) => mix <= 50
  ? `color-mix(in oklab, var(--wall-d-mid) ${mix * 2}%, var(--wall-d-low))`
  : `color-mix(in oklab, var(--wall-d-high) ${mix * 2 - 100}%, var(--wall-d-mid))`;

/** A ring's ink in the form `form`: its colour, and its width where the form sets one (null: the board's 0.1). */
export function wallInk(chance: number, form: WallForm): { stroke: string; width: number | null } {
  const cls = wallClass(chance), steps = WALL_CLASSES.length - 1;
  const classMix = Math.round((Math.max(0, cls) / steps) * 100);
  const mix = form === "A" || form === "D" ? wallMix(chance) : classMix;
  const stroke = form === "D" || form === "E" ? threeHues(mix)
    : `color-mix(in oklab, var(--wall-high) ${mix}%, var(--wall-low))`;
  return { stroke, width: form === "C" ? CLASS_WIDTH[Math.max(0, cls)] : null };
}

const LOOK_KEY = "hedge-school:wall-form";
/** The look's switch: the form that the address asks for (`?walls=B`), kept for the tab's visit, as the pages drop
 *  the address's query. Read when this module loads, before a page replaces its address. A for any other value. */
const lookAsked: WallForm = (() => {
  if (typeof location === "undefined") return "A";
  try {
    const asked = new URLSearchParams(location.search).get("walls");
    if (asked) sessionStorage.setItem(LOOK_KEY, asked);
    const form = asked ?? sessionStorage.getItem(LOOK_KEY);
    return (WALL_FORMS as readonly string[]).includes(form ?? "") ? (form as WallForm) : "A";
  } catch { return "A"; }
})();
export const lookForm = (): WallForm => lookAsked;

/** A chance as the readings write it:a whole percentage, and "under 1%" or "over 99%" near the ends. */
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
