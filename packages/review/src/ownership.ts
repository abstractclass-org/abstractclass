// The area map (design 30). Ownership is KataGo's, as the engine repository defines it for each game (Enclosure's:
// games/enclosure/docs/design/06-ownership-and-spatial-targets.md): for each point, the mean over the turn ends left of
// +1 where Blue holds it and -1 where Red does. The review keeps it in hundredths, from Blue's side
// (@abstractclass/analysis/reply.ts), by the point's index (the view's game interface, `map.index`). The map has three
// styles: the ownership itself, each point shaded for the side that holds it as KaTrain shades its territory; the
// forecast against the board now (the game's `map.now`), where a point that its holder holds now and keeps gets
// nothing; and the difference between two forecasts, before and after a move or a line, as KaTrain's loss grid, with
// the rises too.
import type { Player } from "@abstractclass/analysis/game.ts";
import { PLAYER_NAME } from "./game.ts";

/** The map's style: the engine's ownership, the change from the board now to it, or the difference that a move or a
 *  line made to it. */
export type MapStyle = "ownership" | "change" | "difference";

/** A point that the map marks. The ownership style: `side` holds it, as strongly as `strength` says, from 0 to 1
 *  (shade), in that side's colour. The change style: open area that `side` will probably close, or closed area that
 *  the other side holds now and will probably lose to `side`, in that side's colour. The difference style: the
 *  forecast rose there for the player who moved, or fell, as strongly as `strength` says, in its sign's colour
 *  (`SIGN_COLOUR`), whichever side moved. */
export type AreaMark = { kind: "hold"; side: Player; strength: number } | { kind: "close" | "lose"; side: Player }
  | { kind: SignKind; strength: number };

/** The difference style's two signs: a plus where the forecast rose for the player who chose, a minus where it fell. */
export type SignKind = "rise" | "fall";
/** The colour of a sign of the difference style (design 30), by good or bad for the player who chose, the same for
 *  both sides: green for a rise and yellow for a fall, as the quality labels' green and yellow say good and
 *  inaccurate. Each is the colour's one name: the explanations say it, and the boards and the legend draw the sign in
 *  its token, `--sign-green` or `--sign-yellow` (review.css), by `signInk`. The plus and the minus carry the meaning
 *  too, for a player who cannot tell green from yellow. */
const SIGN_COLOUR = { rise: "green", fall: "yellow" } as const satisfies Record<SignKind, string>;
/** The colour that a board draws a sign of `kind` in: var(--sign-green) or var(--sign-yellow). */
export const signInk = (kind: SignKind) => `var(--sign-${SIGN_COLOUR[kind]})`;
/** The explanation of the difference style, the same in every game's explanation of the map's styles (its view's
 *  `styleHelp`), with the colours of its signs. */
export const DIFFERENCE_HELP = "After vs before: how the last move, or the line on the board, changed the forecast for " +
  `the player who moved. A ${SIGN_COLOUR.rise} plus shows a rise: good for that player. ` +
  `A ${SIGN_COLOUR.fall} minus shows a fall: bad for that player.`;

/** KaTrain's gamma on its territory's alpha (gui/theme.py, OWNERSHIP_GAMMA): a point held weakly still shows. */
const OWNERSHIP_GAMMA = 1.33;
/** How strongly the map shades a point of value `v` in hundredths, from 0 to 1, whatever its side: KaTrain's
 *  |v| ^ (1 / gamma), with the value capped at 1 as KaTrain caps it. */
export const shade = (v: number) => Math.min(1, Math.abs(v) / 100) ** (1 / OWNERSHIP_GAMMA);

/** The ownership style: by point, the side that the engine expects to hold it, where the ownership (the engine's,
 *  from Blue's side in hundredths) is not 0 and at least `min`, or null. */
export const ownershipMap = (ownership: number[], min: number): (AreaMark | null)[] =>
  ownership.map(o => (o && Math.abs(o) >= min ? { kind: "hold", side: o > 0 ? 0 : 1, strength: shade(o) } : null));

/** The change style: by point, its mark where the change from the board now (`now`: 1 Blue's, −1 Red's, 0 neither,
 *  the game's `map.now`) to the ownership is not 0 and at least `min`, or null. */
export function changeMap(ownership: number[], now: number[], min: number): (AreaMark | null)[] {
  return ownership.map((o, i) => {
    const change = o - 100 * now[i];
    if (!change || Math.abs(change) < min) return null;
    const side: Player = change > 0 ? 0 : 1;
    if (now[i] === 0) return { kind: "close", side };
    // A closed point only marks a loss: a change toward its owner is no change
    return (now[i] > 0) === (side === 1) ? { kind: "lose", side } : null;
  });
}

/** The difference style (KaTrain's loss grid, katrain/gui/badukpan.py, draw_board_contents: the ownership after the
 *  move less the ownership before it, where it fell for the mover): by point, where the forecast `after` fell or rose
 *  against the forecast `before`, from the side of `mover`, both from Blue's side in hundredths, where the change is not
 *  0 and at least `min`. KaTrain shows the falls alone: a move that trades area, losing in one place and gaining in
 *  another, would look like a pure loss. */
export function differenceMap(before: number[], after: number[], mover: Player, min: number): (AreaMark | null)[] {
  return before.map((b, i) => {
    const fall = (mover === 0 ? 1 : -1) * (b - after[i]);
    if (!fall || Math.abs(fall) < min) return null;
    return { kind: fall > 0 ? "fall" : "rise", strength: shade(fall) };
  });
}

/** A value in hundredths as the map's numbers show it, without its sign: 0.62. */
export const valueText = (v: number) => (Math.abs(v) / 100).toFixed(2);
/** A value from Blue's side, in hundredths, as the side that holds it: "Blue 0.62", or "even". */
export const held = (o: number) => (o ? `${PLAYER_NAME[o > 0 ? 0 : 1]} ${valueText(o)}` : "even");
/** A point's numbers in the difference style: the forecast before and after, each from Blue's side in hundredths, and
 *  how it fell or rose for `mover`. */
export function differenceReading(before: number, after: number, mover: Player): string {
  const fall = (mover === 0 ? 1 : -1) * (before - after);
  return `before ${held(before)} · after ${held(after)} · ` +
    (fall ? `${fall > 0 ? "fell" : "rose"} ${valueText(fall)} for ${PLAYER_NAME[mover]}` : "no change");
}

/** The step whose map the board shows after `k` drawn edges of a line, from `maps` by step (0: the line's start, j:
 *  after its edge j): step k, or, while step k's map is searched, the latest step before it that has one. Null when
 *  none has. */
export function mapStep(maps: (number[] | undefined)[], k: number): number | null {
  for (let j = k; j >= 0; j--) if (maps[j]) return j;
  return null;
}

/** The order in which a line of `n` edges, drawn up to its edge `k`, asks for its steps' maps: the step drawn now, the
 *  ones after it in the order of drawing, then the line's start. A step already drawn is not asked again, so that a
 *  search of it that still waits for a worker gives way to the steps to come. */
export const askOrder = (k: number, n: number) =>
  [...Array.from({ length: n - k + 1 }, (_, i) => k + i), ...(k > 0 ? [0] : [])];
