// A Blueprints position and a move, as the board draws them (docs/design/33-drawing-board.md). The position's form is
// strategyjam.org's game state, which is also its archive's form, until the engine's describe gives one (request 23).
// A move carries what the board draws of it: the move's data gives the cells that a placement captures, not the rules.
import type { Player } from "@abstractclass/analysis/game.ts";
import type { BlueprintNumber } from "../game/notation.ts";
import { type Hex, parseHex, sameHex, shift } from "./hex.ts";

// A player (0 or 1, the shared code's) and a blueprint's number (1, 2 or 3, the notation's).
export type { BlueprintNumber, Player };
/** The players' names: Blue moves first. */
export const PLAYER_NAMES = ["Blue", "Red"] as const;
export type Kind = "plain" | "star" | "wall";
/** A blueprint, in its own frame: its cells by "q,r", with its anchor cell at "0,0". An empty blueprint has none. */
export type Blueprint = Record<string, Kind>;
/** A player's three blueprints, numbered 1 to 3. */
export type Hand = readonly [Blueprint, Blueprint, Blueprint];

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
export const sameHandHex = (a: HandHex, b: HandHex): boolean => a.blueprint === b.blueprint && sameHex(a.hex, b.hex);

/** A move, with what the board draws of it.
 *  - A placement (`K@q,r`): blueprint K with its anchor cell on `at`, the cells of its footprint, and the cells that it
 *    captured, as they were before the move.
 *  - An edit (`I:q,r>J:q,r`): the cell of the kind `kind` that went from `from` to `to`. Both hexes are in the frames
 *    of the hands that the board shows with the move: the position's after the move played, a line's after its last
 *    move drawn, and the position's own for a candidate (where they are the frames before the edit, as its name gives
 *    them).
 *  - A pass. */
export type BoardMove =
  | { type: "place"; player: Player; blueprint: BlueprintNumber; at: Hex; footprint: Piece[]; captured: Cell[] }
  | { type: "edit"; player: Player; kind: Kind; from: HandHex; to: HandHex }
  | { type: "pass"; player: Player };

/** The board's cells. */
export const cellsOf = (p: SitePosition): Cell[] =>
  Object.entries(p.cells).map(([key, [owner, kind]]) => ({ hex: parseHex(key), owner, kind }));

/** A blueprint's cells, in its frame. */
export const piecesOf = (b: Blueprint): Piece[] => Object.entries(b).map(([key, kind]) => ({ hex: parseHex(key), kind }));

/** A blueprint's cells on the board, with its anchor cell on `at`: a placement's footprint. */
export const footprintOf = (b: Blueprint, at: Hex): Piece[] => {
  const pieces = piecesOf(b);
  const hexes = shift(pieces.map(p => p.hex), at);
  return pieces.map((p, i) => ({ hex: hexes[i], kind: p.kind }));
};
