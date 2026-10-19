// A game for the packages' tests, unlike Enclosure (design 29): each move is a word ("a", "b", …), each turn one move,
// and the players take turns. Its engine's fields are the test's own: who moves, the scores, whether the game is over,
// the moves played so far, and the legal moves.
import type { Game, GameTypes, Played, Player, PositionInfo } from "../game.ts";

export interface WordFields { mover: Player; scores: [number, number]; over: boolean; count: number; legal?: string[] }

export interface Words extends GameTypes {
  move: string;
  position: PositionInfo;
  played: Played<string>;
  fields: WordFields;
  described: WordFields;
  rules: string[];
  step: number; // a line's move played: the moves played after it
}

export const words: Game<Words> = {
  equal: (a, b) => a === b,
  moveName: move => move ?? "pass",
  parseMove: name => name,
  position: f => ({ player: f.mover, scores: f.scores, over: f.over, count: f.count }),
  played: (name, before) => ({ player: before.mover, edge: name === "pass" ? null : name }),
  rules: d => d.legal ?? [],
  step: after => after.count,
  turn: count => ({ turn: count + 1, first: true }),
  scoreScale: 1,
};

/** The fields of the position after `count` moves from the start, the first player to move at the start. */
export const wordFields = (count: number, over = false): WordFields =>
  ({ mover: (count % 2) as Player, scores: [0, 0], over, count });
