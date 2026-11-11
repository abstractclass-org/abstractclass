// A game's result by the scores: one rule for a draw, the same in every game (docs/design/29-shared-packages.md, "The
// result by the scores"). It is in the analysis package because the analysis's value at the game's end takes it
// (model.ts, resultWin), and the analysis does not import the review.
import type { Player } from "./game.ts";

/** A game's result by the scores: the winner, or null for a draw, and the margin (the winner's score less the loser's)
 *  as a record writes it. */
export interface ScoreResult { winner: Player | null; margin: number }

/** A result from its winner and its margin, by the one rule for a draw: the margin as a record writes it, rounded to
 *  six decimals (`r+377.651497`), and a draw when that is 0. Enclosure's areas are exact rationals, so a margin can be
 *  any number at any komi (docs/design/24-practice.md, "Whole points"), and a win by 0.03 is a win. The rounding takes
 *  away only the error of a floating-point sum. A record's result and the words then always agree. */
function byMargin(winner: Player, m: number): ScoreResult {
  const margin = Math.round(m * 1e6) / 1e6;
  return margin === 0 ? { winner: null, margin } : { winner, margin };
}

/** The result by the scores (Blue's, then Red's), in every game: the review, the board, Practice and its record, and
 *  the analysis's value at the game's end. Rounding for display stays apart from it. */
export const resultOfScores = (scores: readonly [number, number]): ScoreResult =>
  byMargin(scores[0] > scores[1] ? 0 : 1, Math.abs(scores[0] - scores[1]));

/** The result that a record gives by the scores (`b+28.5`, `r+3`, `0`), by the same rule. Null for any other: a
 *  resignation (`b+R`), a forfeit (`r+F`), or no result (`*`). */
export function resultOfRecord(result: string): ScoreResult | null {
  if (result === "0") return { winner: null, margin: 0 };
  const m = /^([br])\+(\d+(?:\.\d+)?)$/.exec(result);
  return m ? byMargin(m[1] === "b" ? 0 : 1, Number(m[2])) : null;
}
