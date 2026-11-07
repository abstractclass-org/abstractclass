// The board editor's position (Hedge School's design 21, item 10, and design 33): Blueprints' own pieces set up by
// hand. The board's cells of each player and kind, each player's three blueprints, the moves played (which fix the
// mover) and the scores, written as a position's notation (game/position.ts). The editor computes no rules: the engine
// reads the position and says what is wrong with it. A hand's cells move, as an edit moves them, so that each hand
// keeps its cells (their number and their kinds). Only the notation's form and its turns are here.
import type { Player } from "@abstractclass/analysis/game.ts";
import { countWithMover, LAST_COUNT } from "@abstractclass/analysis/turns.ts";
import { hexKey, type Hex } from "../board/hex.ts";
import type { Hand, HandHex, Kind, SitePosition } from "../board/position.ts";
import { handAfter } from "../review/blueprints.ts";

/** Whether a hex of the board has a player's cell of a kind. */
export function hasCell(p: SitePosition, hex: Hex, player: Player, kind: Kind): boolean {
  const old = p.cells[hexKey(hex)];
  return !!old && old[0] === player && old[1] === kind;
}

/** The position after a click on a hex of the board with a player's cell of a kind: a new cell on an empty hex, the
 *  same cell again removes it, and another cell there changes to this one, as Hedge School's editor gives an edge to
 *  the other player. */
export const placeCell = (p: SitePosition, hex: Hex, player: Player, kind: Kind): SitePosition =>
  paintCell(p, hex, player, kind, hasCell(p, hex, player, kind));

/** The position after a drag with Shift passes a hex (design 33, "The board editor"). The drag's first hex sets what it
 *  does, as a click there would: it removes the player's cell of the kind (`remove`) or puts it. So a hex keeps any
 *  other cell when the drag removes, and a put changes another cell to this one, as a click does. The same position,
 *  the same object, when the hex does not change. */
export function paintCell(p: SitePosition, hex: Hex, player: Player, kind: Kind, remove: boolean): SitePosition {
  if (remove !== hasCell(p, hex, player, kind)) return p;
  const key = hexKey(hex), cells = { ...p.cells };
  if (remove) delete cells[key];
  else cells[key] = [player, kind];
  return { ...p, cells };
}

/** The position with no cell on the board: each player keeps the hand. */
export const removeAllCells = (p: SitePosition): SitePosition => ({ ...p, cells: {} });

/** The position after a player's cell in a hand moves from `from` to `to`, both in the frames before the move: the two
 *  blueprints then go back to their own frames, as after an edit (design 33, item 5). Null when no cell is at `from`, or
 *  when a cell is at `to`. The engine then says when a blueprint is no longer connected. */
export function moveHandCell(p: SitePosition, player: Player, from: HandHex, to: HandHex): SitePosition | null {
  const hand = p.blueprints[player];
  if (hand[to.blueprint - 1][hexKey(to.hex)]) return null;
  const next = handAfter(hand, { kind: "edit", from: { blueprint: from.blueprint, q: from.hex[0], r: from.hex[1] },
                                 to: { blueprint: to.blueprint, q: to.hex[0], r: to.hex[1] } });
  if (!next) return null;
  const blueprints: [Hand, Hand] = [...p.blueprints];
  blueprints[player] = next as unknown as Hand;
  return { ...p, blueprints };
}

/** The position with the moves played set: a whole number from 0 to 120. */
export const withCount = (p: SitePosition, count: number): SitePosition =>
  ({ ...p, ply: Math.max(0, Math.min(LAST_COUNT, Math.round(count) || 0)) });

/** The position after a choice "Blue to play" or "Red to play": the moves played go on to that player's next move, or
 *  to the last one before it near the game's end (countWithMover). */
export const withMover = (p: SitePosition, player: Player): SitePosition => ({ ...p, ply: countWithMover(p.ply, player) });

/** The position with a player's score set: a whole number, 0 or more. */
export function withScore(p: SitePosition, player: Player, score: number): SitePosition {
  const scores: [number, number] = [...p.scores];
  scores[player] = Math.max(0, Math.round(score) || 0);
  return { ...p, scores };
}
