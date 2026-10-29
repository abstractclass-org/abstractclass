// What the engine says of a game, as the board draws it (docs/design/33-drawing-board.md): the replies of describe and
// describe_game (the engine's README, "The fields"), and each move with what it did. The site has no rules: it reads
// the engine's positions, legal moves, footprints and captures, and only puts a move's cells on its anchor hex. The
// board's lab (fixtures.ts) reads them from its data file, and Practice from the engine's rules worker.
import { parseMove } from "../game/notation.ts";
import { anchorOf, hexKey, parseHex, type Hex } from "./hex.ts";
import { handHexOf } from "./input.ts";
import { footprintOf, type BoardMove, type Hand, type HandHex, type Kind, type Player, type SitePosition } from "./position.ts";

/** A position of describe_game: the site's game state (`cells`, `blueprints`, `scores` and `moveCount`, the site's
 *  ply), the mover (`b` Blue, `r` Red) with the moves left in its turn, the result at the end, and what the move to it
 *  did (null at the position before the moves). */
export interface GamePosition {
  position: string;
  mover: "b" | "r";
  movesLeft: number;
  moveCount: number;
  scores: [number, number];
  cells: SitePosition["cells"];
  blueprints: [Hand, Hand];
  outcome: { result: string } | null;
  footprint: string[] | null;
  captured: Record<string, [Player, Kind]> | null;
  points: number | null;
}
/** describe's reply: the position, with every legal move. */
export interface DescribeReply extends Omit<GamePosition, "footprint" | "captured" | "points"> { legal: string[] }

/** The engine's mover as the board's player. */
export const playerOf = (mover: "b" | "r"): Player => (mover === "b" ? 0 : 1);
/** The position as the board draws it. */
export const sitePosition = (p: Omit<GamePosition, "footprint" | "captured" | "points">): SitePosition =>
  ({ ply: p.moveCount, cells: p.cells, blueprints: p.blueprints, scores: p.scores });

/** What a move did, as the engine's describe_game gives it: the player who made it, the hexes that a placement filled,
 *  the cells that it captured (as they were before it), its points, and the hands after it. */
export interface EngineStep {
  move: string;
  player: Player;
  footprint: string[];
  captured: Record<string, [Player, Kind]>;
  points: number;
  blueprints: [Hand, Hand];
}
/** The step of a move, from describe_game's positions before and after it. */
export const stepOf = (move: string, before: Pick<GamePosition, "mover">, after: GamePosition): EngineStep => ({
  move, player: playerOf(before.mover), footprint: after.footprint ?? [], captured: after.captured ?? {}, points: after.points ?? 0,
  blueprints: after.blueprints,
});

const minus = (h: Hex, d: Hex): Hex => [h[0] - d[0], h[1] - d[1]];

/** An edit's two hexes in the frames after it. The string names them in the frames before it (design 33, item 5), and
 *  the two blueprints then go back to their frames: each moves by its anchor cell after the edit. */
function editAfter(hand: Hand, from: HandHex, to: HandHex): [Hex, Hex] {
  const cells = hand.map(b => Object.keys(b).map(parseHex));
  cells[from.blueprint - 1] = cells[from.blueprint - 1].filter(h => hexKey(h) !== hexKey(from.hex));
  cells[to.blueprint - 1] = [...cells[to.blueprint - 1], to.hex];
  const moved = (n: number): Hex => anchorOf(cells[n - 1]) ?? [0, 0];
  return [minus(from.hex, moved(from.blueprint)), minus(to.hex, moved(to.blueprint))];
}

/** The board's move of a step. A placement's footprint is its blueprint's cells on its anchor hex, in the hand before
 *  it (a placement leaves the hand as it is). An edit's hexes are in the frames before it (`frames` "before", as a
 *  candidate's name gives them), or after it. */
export function boardMove(s: EngineStep, before: readonly [Hand, Hand], frames: "before" | "after"): BoardMove {
  if (s.move === "pass") return { type: "pass", player: s.player };
  const m = parseMove(s.move), hand = before[s.player];
  if (m.kind === "place") {
    const anchor: Hex = [m.q, m.r];
    const captured = Object.entries(s.captured).map(([key, [owner, kind]]) => ({ hex: parseHex(key), owner, kind }));
    return { type: "place", player: s.player, blueprint: m.blueprint, at: anchor, footprint: footprintOf(hand[m.blueprint - 1], anchor), captured };
  }
  let from = handHexOf(m.from), to = handHexOf(m.to);
  const kind = hand[from.blueprint - 1][hexKey(from.hex)];
  if (frames === "after") {
    const [f, t] = editAfter(hand, from, to);
    [from, to] = [{ ...from, hex: f }, { ...to, hex: t }];
  }
  return { type: "edit", player: s.player, kind, from, to };
}
