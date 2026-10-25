// Checks a record's capture marks against what each move did (docs/design/33-drawing-board.md, item 6), as Hedge
// School's check.ts checks the cut mark. What a move did comes from the engine: describe_game gives each move's
// captured cells and points (request 23). Until the engine's browser build exists, the caller gives them. Problems
// count moves from 1, as strategyjam.org's move list does.
import { captureText, moveText, type Capture } from "./notation.ts";
import type { GameRecord } from "./record.ts";

/** What a move did, from the engine: the opponent cells that it captured, and the points that it scored. */
export interface Effect { captured: number; points: number }

export interface Checked {
  problem: string | null; // what is wrong, or null when every mark is right
  captures: (Capture | null)[]; // by move: its capture mark, for the record (markCaptures)
}

/** Checks the record's marks against the moves' effects, one for each move of the record. A move's capture mark is `x`
 *  when it captures opponent cells, `x+N` when it also scores N points. */
export function checkCaptures(record: GameRecord, effects: Effect[]): Checked {
  if (effects.length !== record.moves.length) throw new Error(`${effects.length} effects for ${record.moves.length} moves`);
  const captures = effects.map(e => (e.captured > 0 || e.points > 0 ? { points: e.points } : null));
  const wrong = record.marked.findIndex((m, i) => m && captureText(m) !== captureText(captures[i]));
  if (wrong < 0) return { problem: null, captures };
  const mark = record.marked[wrong]!, actual = captures[wrong];
  const named = `Move ${wrong + 1} (${moveText(record.moves[wrong], mark)}) has the mark ${captureText(mark)}`;
  const points = (n: number) => (n ? `${n} point${n === 1 ? "" : "s"}` : "no points");
  const problem = !actual ? `${named}, but the move captures no opponent cells.`
    : `${named}. The move scores ${points(actual.points)}, so its mark is ${captureText(actual)}.`;
  return { problem, captures };
}
