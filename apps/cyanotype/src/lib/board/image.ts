// Blueprints' board in the image of a line (Hedge School's design 07, item 17; the frame, the board's drawing, the
// caption's place and the GIF are @abstractclass/review/boardImage.ts): the board's component (Board.svelte) with the
// position where the line starts, the line's moves numbered, the hands after its last move, and the player's notes,
// with no candidates and no labels. The board is drawn square, 600 pixels on a side, with the hands in a row above and
// below the field, as on a phone. The board is three SVGs (the field and each hand), so its drawing joins them into
// one (`joinedSvg`), each at its place on the board.
import type { ComponentProps } from "svelte";
import { joinedSvg } from "@abstractclass/review/boardImage.ts";
import type { ImageBoard } from "@abstractclass/review/game.ts";
import type { Blueprints } from "../review/blueprints.ts";
import { boardLine } from "../review/ReviewBoard.svelte";
import type Board from "./Board.svelte";
import type { Hex } from "./hex.ts";

/** The board's size as it is drawn for an image, square. It sets the scale of the parts that the board sizes in
 *  pixels (the hands, their text, the gaps): the canvas then scales the drawing to the image's width. */
const AREA = { width: 600, height: 600 } as const;

/** A board's line as the board draws it. */
const lineOf = (b: ImageBoard<Blueprints>) => (b.line.length ? boardLine(b.line, b.position.blueprints) : null);

/** The hexes that the view holds besides the position's cells, the same for each board of an image (`all`): each
 *  board's placements of the line, and the captures of the move that led to the position where a board draws that
 *  move. So the frames of an animated image keep one view, as the board on the page keeps its view while a line
 *  plays. Kept for each image, as each of its frames asks. */
const fits = new WeakMap<readonly ImageBoard<Blueprints>[], Hex[]>();
function fitOf(all: readonly ImageBoard<Blueprints>[]): Hex[] {
  let hexes = fits.get(all);
  if (!hexes) {
    hexes = all.flatMap(b => [...(b.last?.drawn.type === "place" ? b.last.drawn.captured : []),
                              ...(lineOf(b) ?? []).flatMap(l => (l.move.type === "place" ? l.move.footprint : []))])
      .map(c => c.hex);
    fits.set(all, hexes);
  }
  return hexes;
}

/** The board's properties for an image: the position, the move that led to it while no move of the line is drawn,
 *  the line, and the notes. The hands are in rows above and below the field (the board's "box" in a square). A still
 *  board in a fixed area (`image`): no zoom's buttons, and a fit that holds the line's placements in each board of the
 *  image. With no candidates given, the board draws none. */
export const imageBoard = (b: ImageBoard<Blueprints>, all: readonly ImageBoard<Blueprints>[] = [b]):
  ComponentProps<typeof Board> => ({
  position: b.position,
  last: b.last?.drawn ?? null,
  line: lineOf(b),
  notes: b.notes,
  still: true,
  image: { ...AREA, fit: fitOf(all) },
});

/** The board's drawing: the field's SVG and each hand's, joined into one SVG in the board's proportions. */
export const boardSvg = joinedSvg(".board", ".hand-area > svg, .field > svg");
