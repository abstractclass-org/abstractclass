// A Tak position in TPS (docs/design/34-tak-site.md, item 7): the board's rows from the top, with `/` between them, then
// the player to move and the number of the move (`x5/x5/x5/x5/x5 1 1`). A square is `x` when it is empty (`x3` for three
// in a row) or its stack from the bottom to the top, 1 for White's stone and 2 for Black's, with `S` or `C` after a top
// stone that is a wall or a capstone (`121S`). TPS holds no komi, no opening and no draw clock.
//
// The one spelling is ptn.ninja's: capitals, `x` in lower case, and each run of empty squares as one number. The reader
// takes what ptn.ninja's reader takes: either case, `-` between the rows, and runs that are written apart (`x,x2`). It
// refuses a board that is not a square of 3 to 8 squares a side, and text that is not TPS. Whether a game can reach the
// position, and the counts of its stones, are the engine's to check.

export type StoneKind = "flat" | "wall" | "capstone";
/** A stone: 1 is White's and 2 is Black's, as TPS writes them. */
export interface Stone { player: 1 | 2; kind: StoneKind }
/** A position: each square's stack from the bottom to the top, from a1 along the bottom row, then the next row up. */
export interface Position { size: number; squares: Stone[][]; player: 1 | 2; number: number }

const TPS = /^([X12SC,/\d-]+)\s+([12])\s+(\d+)$/;

/** The position of a TPS text, or what is wrong with it. */
export function readPosition(text: string): Position | string {
  const m = TPS.exec(text.trim().toUpperCase());
  if (!m) return "a position must look like x5/x5/x5/x5/x5 1 1";
  const number = Number(m[3]);
  if (number < 1) return "a position's number of the move starts at 1";
  const rows: Stone[][][] = [];
  for (const row of m[1].split(/[/-]/)) {
    const squares: Stone[][] = [];
    for (const square of row.split(",")) {
      const run = /^X([1-8])?$/.exec(square);
      if (run) for (let n = Number(run[1] ?? 1); n > 0; n--) squares.push([]);
      else {
        const stack = /^([12]+)([SC])?$/.exec(square);
        if (!stack) return `not a square of a position: ${square || "nothing between two commas"}`;
        squares.push([...stack[1]].map((c, i): Stone => ({
          player: c === "1" ? 1 : 2,
          kind: i < stack[1].length - 1 || !stack[2] ? "flat" : stack[2] === "S" ? "wall" : "capstone",
        })));
      }
    }
    rows.push(squares);
  }
  const size = rows.length;
  if (size < 3 || size > 8) return `a board has 3 to 8 rows, and this one has ${size}`;
  for (const row of rows) if (row.length !== size) return `a board of ${size} rows has ${size} squares in each, and one row has ${row.length}`;
  return { size, squares: rows.reverse().flat(), player: m[2] === "1" ? 1 : 2, number };
}

/** A position in its one spelling. */
export function writePosition({ size, squares, player, number }: Position): string {
  const rows: string[] = [];
  for (let y = size - 1; y >= 0; y--) {
    const row = squares.slice(y * size, (y + 1) * size).map(stack => {
      const top = stack.at(-1)?.kind;
      return stack.map(s => s.player).join("") + (top === "wall" ? "S" : top === "capstone" ? "C" : "") || "x";
    }).join(",");
    rows.push(row.replace(/x(?:,x)+/g, run => `x${(run.length + 1) / 2}`));
  }
  return `${rows.join("/")} ${player} ${number}`;
}

/** The empty board of a size: its game's standard start. */
export const emptyBoard = (size: number): string => writePosition({ size, squares: Array.from({ length: size * size }, () => []), player: 1, number: 1 });

/** A start in its one spelling when it is a set-up start, or undefined: no start, or an empty board at move 1, which is
 *  the standard start of its size. A text that is no position is a start as it is, so that its reader refuses it. */
export function setUpStart(text: string | null | undefined): string | undefined {
  const start = text?.trim();
  if (!start) return undefined;
  const position = readPosition(start);
  if (typeof position === "string") return start;
  const written = writePosition(position);
  return written === emptyBoard(position.size) ? undefined : written;
}
