// The board's squares: their names, where the screen shows them, the walk with the arrow keys, their words for a
// screen reader, and the line that gives the whole stack of one. A square is its index from a1 along the bottom row
// (BoardPosition).
import type { Stone } from "../game/tps.ts";
import { ownerOf, PLAYER_NAMES } from "./position.ts";

export const fileName = (file: number): string => String.fromCharCode(97 + file);
export const squareName = (size: number, square: number): string =>
  `${fileName(square % size)}${Math.floor(square / size) + 1}`;

/** The square at a column and a row of the screen, from its top left. `turned`: seen from Black's side, half a turn. */
export const squareAt = (size: number, column: number, row: number, turned: boolean): number =>
  turned ? row * size + (size - 1 - column) : (size - 1 - row) * size + column;

/** A square's column and row on the screen. */
export function placeOf(size: number, square: number, turned: boolean): { column: number; row: number } {
  const file = square % size, rank = Math.floor(square / size);
  return turned ? { column: size - 1 - file, row: rank } : { column: file, row: size - 1 - rank };
}

/** The square that a key goes to from a square: the arrows one step on the screen, Home and End to the ends of the
 *  row. At the board's edge, the square itself. Null for another key. */
export function squareByKey(size: number, square: number, key: string, turned: boolean): number | null {
  const { column, row } = placeOf(size, square, turned), last = size - 1;
  const to = key === "ArrowLeft" ? [column - 1, row] : key === "ArrowRight" ? [column + 1, row]
    : key === "ArrowUp" ? [column, row - 1] : key === "ArrowDown" ? [column, row + 1]
    : key === "Home" ? [0, row] : key === "End" ? [last, row] : null;
  if (!to) return null;
  const [c, r] = to.map(v => Math.min(last, Math.max(0, v)));
  return squareAt(size, c, r, turned);
}

/** A piece in words: "White's capstone". */
export const pieceWords = (stone: Stone): string => `${PLAYER_NAMES[ownerOf(stone)]}'s ${stone.kind}`;

/** A square in words: its name, its top piece, and the pieces under it from the top down, a run of one player's flats
 *  as one: "c3: White's wall on a stack of 4. Under it, from the top: 2 of Black's flats, White's flat". */
export function squareWords(size: number, square: number, stack: readonly Stone[]): string {
  const name = squareName(size, square), top = stack.at(-1);
  if (!top) return `${name}: empty`;
  if (stack.length === 1) return `${name}: ${pieceWords(top)}`;
  const runs: { stone: Stone; count: number }[] = [];
  for (const stone of stack.slice(0, -1).reverse()) {
    const run = runs.at(-1);
    if (run && run.stone.player === stone.player && run.stone.kind === stone.kind) run.count++;
    else runs.push({ stone, count: 1 });
  }
  const under = runs.map(({ stone, count }) => (count === 1 ? pieceWords(stone) : `${count} of ${pieceWords(stone)}s`));
  return `${name}: ${pieceWords(top)} on a stack of ${stack.length}. Under it, from the top: ${under.join(", ")}`;
}

/** A square's whole stack as one line, for the page to show under the board: "d4, 8 pieces, from the top: WS B B W W B |
 *  W B". A top wall or capstone has PTN's letter, S or C. The | stands after the last piece that one move can carry, where
 *  the stack is taller. Empty for an empty square. */
export function stackLine(size: number, square: number, stack: readonly Stone[]): string {
  const top = stack.at(-1);
  if (!top) return "";
  const letters = stack.map(stone => "WB"[ownerOf(stone)]).reverse();
  letters[0] += { flat: "", wall: "S", capstone: "C" }[top.kind];
  if (letters.length > size) letters.splice(size, 0, "|");
  const name = squareName(size, square);
  return stack.length === 1 ? `${name}, 1 piece: ${letters[0]}`
    : `${name}, ${stack.length} pieces, from the top: ${letters.join(" ")}`;
}
