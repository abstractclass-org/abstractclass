// The turns of a game whose first player opens with one move, then each player plays two moves a turn: Enclosure's
// and Blueprints' (design 33). Such a game gives this to the game interface as its `turn` (game.ts), and its record
// numbers its turns so (@abstractclass/record/record.ts). Both games end after 120 moves, so the board editors take the
// mover from the move count here too (Hedge School's design 21, item 10).
import type { Player } from "./game.ts";

/** The moves of a game: Enclosure's edges, and Blueprints' moves. */
export const LAST_COUNT = 120;

/** The turn of the next move from a position with `count` moves played, and whether that move opens its turn: the
 *  first player's first turn has one move, then turns of two. In a game of 120 moves, the first player's last turn
 *  (61) has one. The game says what a move counts: an Enclosure pass counts the edges it forfeits, a Blueprints pass
 *  one move. */
export function turnFromCount(count: number): { turn: number; first: boolean } {
  return count === 0 ? { turn: 1, first: true } : { turn: Math.floor((count - 1) / 2) + 2, first: (count - 1) % 2 === 0 };
}

/** The player to move and the moves left in the turn, from the move count (turnFromCount): the first player's first
 *  turn has one move, then turns of two, and the first player's last turn one. A finished game (120 moves) has the
 *  second player with none left (the notation's `r0`). */
export function moverOf(count: number): { player: Player; left: number } {
  if (count >= LAST_COUNT) return { player: 1, left: 0 };
  const { turn, first } = turnFromCount(count), single = turn === 1 || turn === 61;
  return { player: ((turn - 1) % 2) as Player, left: first && !single ? 2 : 1 };
}

/** The first count from `count` on with `player` to move, or the last before it near the game's end: a board editor's
 *  choice "Blue to play" or "Red to play". */
export function countWithMover(count: number, player: Player): number {
  for (let c = count; c < LAST_COUNT; c++) if (moverOf(c).player === player) return c;
  for (let c = count - 1; c > 0; c--) if (moverOf(c).player === player) return c;
  return count;
}
