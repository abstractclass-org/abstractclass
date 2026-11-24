// A Tak position as the board draws it (docs/design/34-tak-site.md, "The board"), in the shape of the engine's position
// fields (request 31, item 4): each square's stack, each player's flats on top, the player to move and the ply. Until
// the engine gives them, they come from a TPS. The fields that a TPS does not hold, and that need the rules, stay out
// until then: the reserves, the end of the game and the legal moves. The board draws a position and does not judge it.
import { readPosition, type Position, type Stone } from "../game/tps.ts";

/** The players' names (the shared code's players 0 and 1): White moves first. */
export const PLAYER_NAMES = ["White", "Black"] as const;
export type Player = 0 | 1;
export const ownerOf = (stone: Stone): Player => (stone.player === 1 ? 0 : 1);

export interface BoardPosition {
  size: number;
  /** Each square's stack from the bottom to the top, from a1 along the bottom row, then the next row up (as TPS's). */
  squares: readonly (readonly Stone[])[];
  /** Each player's flats on top. */
  flats: readonly [number, number];
  mover: Player;
  /** The plies played before the position. */
  ply: number;
}

export function boardPosition({ size, squares, player, number }: Position): BoardPosition {
  const flats: [number, number] = [0, 0];
  for (const stack of squares) {
    const top = stack.at(-1);
    if (top?.kind === "flat") flats[ownerOf(top)]++;
  }
  return { size, squares, flats, mover: player === 1 ? 0 : 1, ply: 2 * (number - 1) + (player - 1) };
}

/** The position of a TPS of the site's own. A text that is no position throws its problem. */
export function positionOf(tps: string): BoardPosition {
  const position = readPosition(tps);
  if (typeof position === "string") throw new Error(`${tps}: ${position}`);
  return boardPosition(position);
}
