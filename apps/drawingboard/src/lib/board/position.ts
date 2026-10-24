// A Blueprints position and a move, as the board draws them (docs/design/33-drawing-board.md). The position's form is
// strategyjam.org's game state, which is also its archive's form, until the engine's describe gives one (request 23).
// A move carries what the board draws of it: the move's data gives the cells that a placement removes, not the rules.
import { type Hex, parseHex, shift } from "./hex.ts";

/** Blue moves first. */
export type Player = 0 | 1;
export type Kind = "plain" | "star" | "wall";
/** A blueprint, in its own frame: its cells by "q,r", with its first cell at "0,0". An empty blueprint has none. */
export type Blueprint = Record<string, Kind>;
/** A player's three blueprints, numbered 1 to 3. */
export type Hand = readonly [Blueprint, Blueprint, Blueprint];
export type BlueprintNumber = 1 | 2 | 3;

/** A position, in strategyjam.org's form: the cells by "q,r" with their owner and kind, each player's hand, the
 *  scores, and the moves played. */
export interface SitePosition {
  ply: number;
  cells: Record<string, readonly [Player, Kind]>;
  blueprints: readonly [Hand, Hand];
  scores: readonly [number, number];
}

/** A cell of the board, or of a blueprint (whose owner is the hand's). */
export interface Cell { hex: Hex; owner: Player; kind: Kind }
export interface Piece { hex: Hex; kind: Kind }

/** A hex of a blueprint: blueprint I's cell at (q, r) of its frame, as an edit names it (`I:q,r`). */
export interface HandHex { blueprint: BlueprintNumber; hex: Hex }

/** A move, with what the board draws of it.
 *  - A placement (`K@q,r`): blueprint K with its first cell on `at`, the cells that it stamped, and the cells that it
 *    removed, as they were before the move.
 *  - An edit (`I:q,r>J:q,r`): the cell of the kind `kind` that went from `from` to `to`. Both hexes are in the frames
 *    of the hands that the board shows with the move: the position's after the move played, a line's after its last
 *    move drawn, and the position's own for a candidate (where they are the frames before the edit, as its name gives
 *    them).
 *  - A pass. */
export type BoardMove =
  | { type: "place"; player: Player; blueprint: BlueprintNumber; at: Hex; stamped: Piece[]; removed: Cell[] }
  | { type: "edit"; player: Player; kind: Kind; from: HandHex; to: HandHex }
  | { type: "pass"; player: Player };

/** The board's cells. */
export const cellsOf = (p: SitePosition): Cell[] =>
  Object.entries(p.cells).map(([key, [owner, kind]]) => ({ hex: parseHex(key), owner, kind }));

/** A blueprint's cells, in its frame. */
export const piecesOf = (b: Blueprint): Piece[] => Object.entries(b).map(([key, kind]) => ({ hex: parseHex(key), kind }));

/** A blueprint's cells on the board, with its first cell on `at`: what a placement stamps. */
export const stamp = (b: Blueprint, at: Hex): Piece[] => {
  const pieces = piecesOf(b);
  const hexes = shift(pieces.map(p => p.hex), at);
  return pieces.map((p, i) => ({ hex: hexes[i], kind: p.kind }));
};
