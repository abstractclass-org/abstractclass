// The area maps (design 30): the engine's ownership of each point, and the area that a mistake lost. Ownership is
// KataGo's, as the engine repository defines it for Enclosure (games/enclosure/docs/design/06-ownership-and-spatial-
// targets.md): for each point, the mean over the turn ends left of +1 inside Blue's regions and -1 inside Red's. The
// review keeps it in hundredths, from Blue's side (@abstractclass/analysis/reply.ts). The area lost follows KaTrain's
// loss grid (katrain/gui/badukpan.py, draw_board_contents): the ownership after the move played less the ownership
// before it, where it fell for the mover. The ownership before a move is the mean over its search's tree, which follows
// the engine's best line, so the difference is where the points lost went (the loss of design 10: the value before the
// move less the value after it, each from its own search).
import { PLAYER_NAME, moverScore, otherPlayer, type Player, type Unit } from "./enclosure.ts";

/** KaTrain's gamma on its territory's alpha (gui/theme.py, OWNERSHIP_GAMMA): a point held weakly still shows. */
const OWNERSHIP_GAMMA = 1.33;
/** How strongly the map shades a point of value `v` in hundredths, from 0 to 1, whatever its side: KaTrain's
 *  |v| ^ (1 / gamma), with the value capped at 1 as KaTrain caps it (a mistake's fall can reach 2). */
export const shade = (v: number) => Math.min(1, Math.abs(v) / 100) ** (1 / OWNERSHIP_GAMMA);

/** The area that a move lost: by point, how far the mover's ownership fell, in hundredths (0 where it did not fall),
 *  the falls in all in points of the board (`size`, a fall of 100 is one point), and who held that area before and
 *  after the move: the mover's ownership there, weighted by the fall, in hundredths. */
export interface LostArea { drop: number[]; size: number; before: number; after: number }

/** The area lost by `mover` from the ownership `before` the move to the ownership `after` it, both from Blue's side. */
export function lostArea(before: number[], after: number[], mover: Player): LostArea {
  const drop = before.map((b, i) => Math.max(0, moverScore(b - after[i], mover)));
  let weight = 0, held = 0, kept = 0;
  drop.forEach((d, i) => {
    weight += d;
    held += d * moverScore(before[i], mover);
    kept += d * moverScore(after[i], mover);
  });
  return { drop, size: weight / 100, before: weight ? held / weight : 0, after: weight ? kept / weight : 0 };
}

/** A point that falls by this much or more, in hundredths, shows clearly: at 0.6 × 0.3 ^ (1 / 1.33), about a quarter of
 *  full strength. */
const CLEAR_FALL = 30;
/** The share of the fall that must be in clear points for the area lost to show. On real games, the fall of a Mistake
 *  or a Blunder is often spread thin over the whole board, the more so in the opening: the map is then a haze with
 *  nothing to point at (decisions/product.md, "The area maps on real games"). */
const CLEAR_SHARE = 0.2;
/** The share of the fall in clear points (CLEAR_FALL), from 0 to 1: 0 when nothing fell. */
export function focusOf(lost: LostArea): number {
  const clear = lost.drop.reduce((sum, d) => sum + (d >= CLEAR_FALL ? d : 0), 0);
  return lost.size ? clear / (100 * lost.size) : 0;
}
/** Whether the area lost is clear enough to show: a fifth of its fall or more is in clear points. */
export const shownLost = (lost: LostArea) => focusOf(lost) >= CLEAR_SHARE;

/** The bands of a side's ownership, in hundredths: held for half the turns left or more (a mean of 0.5 or more needs
 *  the side's regions over the point at half the turn ends at least), for some of them, or about even (open). */
const band = (m: number) => (m >= 50 ? 2 : m >= 15 ? 1 : m > -15 ? 0 : m > -50 ? -1 : -2);
const HOW_LONG = { 2: "for half the turns left or more", 1: "for some of the turns left" } as const;

/** Who holds an area with the mover's ownership `m` there: the mover, the opponent, or neither. */
function holder(m: number, mover: Player): string {
  const b = band(m);
  return b === 0 ? "it stays open" : `${PLAYER_NAME[b > 0 ? mover : otherPlayer(mover)]} holds it ${HOW_LONG[Math.abs(b) as 1 | 2]}`;
}

/** The caption of the area lost, from engine facts alone (design 01, principle 11): who holds it with the engine's best
 *  move, and after the move played. Where both are in one band, open too, the second sentence says which way it went:
 *  the mover's ownership always fell there. */
export function areaCaption(lost: LostArea, mover: Player, unit: Unit): string {
  const was = band(lost.before), is = band(lost.after), opponent = PLAYER_NAME[otherPlayer(mover)];
  const after = was !== is ? holder(lost.after, mover)
    : is > 0 ? `${PLAYER_NAME[mover]} holds it for fewer of the turns left`
    : is < 0 ? `${opponent} holds it for more of the turns left`
    : `it stays open, but moves toward ${opponent}`;
  return `The area lost, shaded after the ${unit}: with the best ${unit}, ${holder(lost.before, mover)}. ` +
    `After the ${unit} played, ${after}.`;
}
