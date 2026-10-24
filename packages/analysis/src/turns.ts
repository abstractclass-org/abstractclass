// The turns of a game whose first player opens with one move, then each player plays two moves a turn: Enclosure's
// and Blueprints' (design 33). Such a game gives this to the game interface as its `turn` (game.ts), and its record
// numbers its turns so (@abstractclass/record/record.ts).

/** The turn of the next move from a position with `count` moves played, and whether that move opens its turn: the
 *  first player's first turn has one move, then turns of two. In a game of 120 moves, the first player's last turn
 *  (61) has one. The game says what a move counts: an Enclosure pass counts the edges it forfeits, a Blueprints pass
 *  one move. */
export function turnFromCount(count: number): { turn: number; first: boolean } {
  return count === 0 ? { turn: 1, first: true } : { turn: Math.floor((count - 1) / 2) + 2, first: (count - 1) % 2 === 0 };
}
