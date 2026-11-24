// The drawing of a square's stack, in the square's own view of 100 × 100, for the board (Board.svelte) and the link
// preview picture (brand/card.ts). Only shapes: each has its owner, and the page or the picture gives the colours. The
// pieces that one move can carry stand as a pile, each a step higher than the one below it, so that each shows its front
// edge. The top ten pieces under those are bars beside the pile, from the pile's foot up, and the lower ones are only in
// the line of text. The pile and the bars at its side are ptn.ninja's and playtak's way to show a stack
// (docs/design/34-tak-site.md, "The board"). The shapes, the measures and the colours are the site's own.
import type { Shape } from "@abstractclass/site/brand.ts";
import { capstonePath } from "../brand/logo.ts";
import type { Stone } from "../game/tps.ts";
import { ownerOf, type Player } from "./position.ts";

/** A shape of a stack, with its owner. `part`: a top flat, a top wall or capstone ("raised"), a piece of the pile under
 *  the top one, or a bar. */
export interface PieceShape { shape: Shape; owner: Player; part: "top" | "raised" | "pile" | "bar" }
export interface StackDrawing {
  /** In the order to paint: the bars from the lowest piece up, then the pile from its lowest piece up. */
  shapes: PieceShape[];
  /**
   * The height of a stack of two pieces or more: the number's middle, baseline and size, and the owner of the piece that
   * it stands on. A wall has no room for it, so there it stands on the square, left of the pile's foot: `on` is null,
   * and x is its left end. The board shows it while the square is pointed at.
   */
  count: { text: string; x: number; y: number; size: number; on: Player | null } | null;
}

/** The box of every piece: a flat's side. */
export const FLAT = 50;
/** A flat's corners' radius, and the middle of the pile's lowest piece, the same for each height. */
const CORNER = 7, BASE = 56;
/**
 * The step from a piece to the next one. A full pile must not touch the piece in the square behind it, which stands on
 * the same baseline: (width - 1) x STEP + FLAT < 100. On 8x8 this leaves 4.5, which is more than the pieces' lines on
 * the smallest squares (37 pixels, where 4.5 is 1.7 pixels and a line 1.25). A step of 7 leaves 1, less than the lines.
 */
export const STEP = 6.5;
/**
 * The line of a top wall or capstone, in pixels, on a square of `pixels`: on a flat of its own colour this line alone
 * shows it, and a wall on an own flat decides a road. The other pieces' line is 1.25.
 */
export const raisedLine = (pixels: number): number => Math.max(1.75, pixels * 0.025);
/** The bars: the pile's foot, where the lowest one stands, the column's place and a bar's width and height, the step from
 *  a bar to the next one, and how many there are at most. */
export const BARS = { foot: BASE + FLAT / 2, x: 79, width: 15, height: 6.4, pitch: 7.6, most: 10 };
/** The number's size, and its least height in pixels, where the piece has the room for it. */
const NUMBER = 17, NUMBER_PIXELS = 9, NUMBER_LARGEST = 26;

/** How far the tallest pile stands over its square's top, on a board of this size. */
export const overhang = (size: number): number => Math.max(0, (size - 1) * STEP + FLAT / 2 - BASE);

const rect = (x: number, y: number, width: number, height: number, rx: number, transform?: string): Shape =>
  ["rect", { x, y, width, height, rx, ...(transform ? { transform } : {}) }];

/** A piece with its middle at (x, y), in a box of FLAT. White's walls lean to the left and Black's to the right. A
 *  capstone has the logo's form. */
export function pieceShape({ player, kind }: Stone, x: number, y: number): Shape {
  if (kind === "wall") return rect(x - 26.5, y - 8.5, 53, 17, 3, `rotate(${player === 1 ? 45 : -45} ${x} ${y})`);
  if (kind === "capstone") return ["path", { d: capstonePath(x - 17.5, y - 24, 35, 48, 4.5) }];
  return rect(x - FLAT / 2, y - FLAT / 2, FLAT, FLAT, CORNER);
}

/** The number of a stack: on the top piece, or left of the pile's foot under a wall. */
function heightNumber(stack: readonly Stone[], pile: number, pixels: number): StackDrawing["count"] {
  const top = stack[stack.length - 1], text = String(stack.length);
  const size = Math.min(NUMBER_LARGEST, Math.max(NUMBER, NUMBER_PIXELS * 100 / pixels));
  if (top.kind === "wall") return { text, x: 1.5, y: 97, size: Math.min(20, size), on: null };
  return { text, x: 50, y: BASE - STEP * (pile - 1) + size * 0.35, size, on: ownerOf(top) };
}

/** A square's stack on a board of `size`, the most pieces that one move carries: as a pile the pieces that one move can
 *  carry, and as bars the top ten of the pieces under them. `pixels`: the square's side on the screen, for the number. */
export function drawStack(stack: readonly Stone[], size: number, pixels = Infinity): StackDrawing {
  const pile = stack.slice(-size), bars = stack.slice(0, -size).slice(-BARS.most);
  return {
    shapes: [
      ...bars.map((stone, i): PieceShape => ({
        shape: rect(BARS.x, BARS.foot - BARS.pitch * i - BARS.height, BARS.width, BARS.height, 1.5),
        owner: ownerOf(stone), part: "bar",
      })),
      ...pile.map((stone, i): PieceShape => {
        // A wall stands one step lower, on the piece under it.
        const steps = stone.kind === "wall" ? Math.max(0, i - 1) : i;
        return {
          shape: pieceShape(stone, 50, BASE - STEP * steps), owner: ownerOf(stone),
          part: i < pile.length - 1 ? "pile" : stone.kind === "flat" ? "top" : "raised",
        };
      }),
    ],
    count: stack.length > 1 ? heightNumber(stack, pile.length, pixels) : null,
  };
}
