// The position symbols of the book (design 32, item 12 and "The book file"): Chess Informant's symbols, from Blue's win
// chance at a line's end. The cut-offs are chess.com's table of engine evaluations (= to 0.26 pawns, ⩲ to 0.7, ± to
// 1.5, +− beyond), turned into a win chance by Lichess's curve: 0.524, 0.564 and 0.635 of Blue's win chance, the same
// distance from 0.5 for Red. ∞ replaces = for an equal position whose complexity is hard (design 14). The words are
// Lichess's names for its glyphs, with Blue and Red. This module holds the one rule: the table and the sentences
// (sentences.ts) read every symbol from `symbol`, a book position's and a book move's through the two below it.
import { isHard } from "@abstractclass/analysis/model.ts";
import type { BookMove, BookPosition } from "./form.ts";

export type PositionSymbol = "=" | "⩲" | "⩱" | "±" | "∓" | "+−" | "−+" | "∞";
/** Blue's win chance up to which a position is equal, slightly better and better for Blue (inclusive). */
export const SYMBOL_CUTS = [0.524, 0.564, 0.635] as const;

/** A win chance or a loss of it, rounded to 6 decimals, so that the values' own decimals decide a band or a symbol, not
 *  the floating point's: 1 − 0.476 is 0.524, on the cut-off. */
export const rounded = (x: number) => Math.round(x * 1e6) / 1e6;

/** The symbol of Blue's win chance `blueWin` (0 to 1) at a position whose complexity is `complexity` (design 14). */
export function symbol(blueWin: number, complexity: number): PositionSymbol {
  const blue = blueWin > 0.5, w = rounded(Math.max(blueWin, 1 - blueWin)); // the leader's win chance
  if (w <= SYMBOL_CUTS[0]) return isHard(complexity) ? "∞" : "=";
  if (w <= SYMBOL_CUTS[1]) return blue ? "⩲" : "⩱";
  if (w <= SYMBOL_CUTS[2]) return blue ? "±" : "∓";
  return blue ? "+−" : "−+";
}

/** A position's own symbol: from its minimaxed value and its own complexity. The title row's symbol, and the one in
 *  "End of the book". */
export const positionSymbol = (p: BookPosition) => symbol(p.value.blueWin, p.complexity);
/** The symbol at the end of a book move's main line, a row's symbol: the move's values are those of its line's end. */
export const lineEndSymbol = (m: BookMove) => symbol(m.value.blueWin, m.end.complexity);

/** Each symbol's name: Lichess's, with Blue and Red. A row and the end of the book show it. */
export const SYMBOL_NAME: Record<PositionSymbol, string> = {
  "=": "Equal position", "⩲": "Blue is slightly better", "⩱": "Red is slightly better", "±": "Blue is better",
  "∓": "Red is better", "+−": "Blue is winning", "−+": "Red is winning", "∞": "Unclear position",
};

/** The side that each symbol names as better (0 Blue, 1 Red), none for = and ∞. A row's symbol takes its side's
 *  colour (design 32, item 3): Enclosure's sides are Blue and Red, so the colour names the side. */
export const SYMBOL_SIDE: Record<PositionSymbol, 0 | 1 | null> = {
  "=": null, "∞": null, "⩲": 0, "±": 0, "+−": 0, "⩱": 1, "∓": 1, "−+": 1,
};
