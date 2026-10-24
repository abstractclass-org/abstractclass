// The position symbols of the book (design 32, item 12 and "The book file"): Chess Informant's symbols, from Blue's win
// chance at a line's end. The cut-offs are chess.com's table of engine evaluations (= to 0.26 pawns, ⩲ to 0.7, ± to
// 1.5, +− beyond), turned into a win chance by Lichess's curve: 0.524, 0.564 and 0.635 of Blue's win chance, the same
// distance from 0.5 for Red. ∞ replaces = for an equal position whose complexity is hard (design 14). The words are
// Lichess's names for its glyphs, with Blue and Red.
import { isHard } from "@abstractclass/analysis/model.ts";
import type { BookMove, BookPosition } from "./form.ts";

export type PositionSymbol = "=" | "⩲" | "⩱" | "±" | "∓" | "+−" | "−+" | "∞";
/** Blue's win chance up to which a position is equal, slightly better and better for Blue (inclusive). */
export const SYMBOL_CUTS = [0.524, 0.564, 0.635] as const;

/** The symbol of Blue's win chance `blueWin` (0 to 1) at a position whose complexity is `complexity` (design 14). */
export function symbol(blueWin: number, complexity: number): PositionSymbol {
  // The leader's win chance, rounded so that a value on a cut-off (0.476 for Red as 0.524 for Blue) stays on it
  const blue = blueWin > 0.5, w = Math.round(Math.max(blueWin, 1 - blueWin) * 1e6) / 1e6;
  if (w <= SYMBOL_CUTS[0]) return isHard(complexity) ? "∞" : "=";
  if (w <= SYMBOL_CUTS[1]) return blue ? "⩲" : "⩱";
  if (w <= SYMBOL_CUTS[2]) return blue ? "±" : "∓";
  return blue ? "+−" : "−+";
}

/** A position's own symbol: from its minimaxed value and its own complexity. At the book's end, the symbol in "End of
 *  the book". */
export const positionSymbol = (p: BookPosition) => symbol(p.value.blueWin, p.complexity);
/** The symbol at the end of a book move's main line: the move's values are those of its line's end. */
export const lineEndSymbol = (m: BookMove) => symbol(m.value.blueWin, m.end.complexity);

/** Each symbol's name: Lichess's, with Blue and Red. A row and the end of the book show it. */
export const SYMBOL_NAME: Record<PositionSymbol, string> = {
  "=": "Equal position", "⩲": "Blue is slightly better", "⩱": "Red is slightly better", "±": "Blue is better",
  "∓": "Red is better", "+−": "Blue is winning", "−+": "Red is winning", "∞": "Unclear position",
};
/** Each symbol as a clause in a sentence: "After it, Blue is better." */
export const SYMBOL_CLAUSE: Record<PositionSymbol, string> = {
  ...SYMBOL_NAME, "=": "the game is equal", "∞": "the game is unclear",
};
/** Each symbol after "keeps" or "leaves": "keeps the game equal", "leaves Red winning". */
export const SYMBOL_STATE: Record<PositionSymbol, string> = {
  "=": "the game equal", "⩲": "Blue slightly better", "⩱": "Red slightly better", "±": "Blue better",
  "∓": "Red better", "+−": "Blue winning", "−+": "Red winning", "∞": "the game unclear",
};
