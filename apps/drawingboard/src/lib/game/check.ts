// Checks a record's capture marks against what each move did (docs/design/33-drawing-board.md, item 6), as Hedge
// School's check.ts checks the cut mark. What a move did comes from the engine: describe_game gives each move's removed
// cells and points (request 23). Until the engine's browser build exists, the caller gives them. Problems count moves
// from 1, as strategyjam.org's move list does.
import { captureText, moveText, type Capture } from "./notation.ts";
import type { GameRecord } from "./record.ts";

/** What a move did, from the engine: the enemy cells that it removed, and the points that it scored. */
export interface Effect { removed: number; points: number }

export interface Checked {
  problem: string | null; // what is wrong, or null when every mark is right
  captures: (Capture | null)[]; // by move: its capture mark, for the record (markCaptures)
}

/** The capture mark of each move: `x` when it removes enemy cells, `x+N` when it also scores N points. */
export const capturesOf = (effects: Effect[]): (Capture | null)[] =>
  effects.map(e => (e.removed > 0 || e.points > 0 ? { points: e.points } : null));

/** Checks the record's marks against the moves' effects, one for each move of the record. */
export function checkCaptures(record: GameRecord, effects: Effect[]): Checked {
  if (effects.length !== record.moves.length) throw new Error(`${effects.length} effects for ${record.moves.length} moves`);
  const captures = capturesOf(effects);
  const wrong = record.marked.findIndex((m, i) => m && captureText(m) !== captureText(captures[i]));
  if (wrong < 0) return { problem: null, captures };
  const mark = record.marked[wrong]!, actual = captures[wrong];
  const named = `Move ${wrong + 1} (${moveText(record.moves[wrong], mark)}) has the mark ${captureText(mark)}`;
  const points = (n: number) => (n ? `${n} point${n === 1 ? "" : "s"}` : "no points");
  const problem = !actual ? `${named}, but the move removes no enemy cells.`
    : `${named}. The move scores ${points(actual.points)}, so its mark is ${captureText(actual)}.`;
  return { problem, captures };
}
