// A Tak move's text in PTN (docs/design/34-tak-site.md, items 4 and 5), and its one spelling, the short form, to which
// ptn.ninja normalizes a move: a placement's stone and its square (`a1`, `Sb3`, `Cc4`), or a stack move's count, square,
// direction and drops (`a1>`, `3b2+12`), with no `F`, no count of 1, and no drops when all the stones go to the next
// square. A move's text is a name: the rules, the size of the board and the carry limit among them, are the engine's.
//
// The reader takes each spelling that ptn.ninja and playtak's export write: letters in either case, the `F` of a flat,
// the explicit 1s (`1e4<1`), and the drops of a move that goes one square (`3c3>3`). It reads the evaluation marks (`!`,
// `?`, `'` for tak, `"` or `''` for Tinuë) and keeps none. It refuses the PTN page's other forms, which neither writes,
// and names the part that it does not read: the arrows (`a1→`), and the top stone's letter after a stack move (`a1>C`).
import type { ReadMove } from "@abstractclass/record/record.ts";

/** A move's text: a count, a stone's letter, a square, a direction with its drops (and the PTN page's letter of the top
 *  stone), the mark of a flattening, and the evaluation marks. */
const MOVE = /^([1-8])?([FSC])?([a-h][1-8])(?:([<>+↑↓←→-])([1-8]*)([FSC])?)?(\*)?(['"!?]*)$/i;

/** The move of a record's word, or what is wrong with it. The mark is whether the move flattens a wall (`*`). */
export function readMove(word: string): ReadMove<boolean> | string {
  const m = MOVE.exec(word);
  if (!m) return "not a move, a number or a result";
  const [, count, letter, square, direction, drops, top, star, marks] = m;
  const markAt = word.length - marks.length - (star ? 1 : 0), at = square.toLowerCase();
  if (!direction) {
    if (count) return "a placement has no count";
    if (star) return "only a stack move flattens a wall (*)";
    const stone = letter?.toUpperCase() ?? "";
    return { name: (stone === "F" ? "" : stone) + at, mark: false, markAt };
  }
  if (letter) return "a stack move has no piece's letter";
  if (/[↑↓←→]/.test(direction)) return `the arrow ${direction} is not read, and a direction is <, >, + or -`;
  if (top) return `the top piece's letter ${top} after a stack move is not read`;
  const carried = Number(count ?? 1), dropped = [...drops].reduce((sum, d) => sum + Number(d), 0);
  if (drops && dropped !== carried) return `the move takes ${carried} and drops ${dropped}`;
  return { name: (carried > 1 ? carried : "") + at + direction + (drops.length > 1 ? drops : ""), mark: Boolean(star), markAt };
}
