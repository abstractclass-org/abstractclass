// Blueprints' board in the image of a line (Hedge School's design 07, item 17; the frame, the caption's place and the
// GIF are @abstractclass/review/boardImage.ts): the board's component (Board.svelte) with the position where the line
// starts, the line's moves numbered, the hands after its last move, and the player's notes, with no candidates and no
// labels. The board is drawn square, 600 pixels on a side as the image's host is wide, with the hands in a row above
// and below the field, as on a phone. The board is three SVGs (the field and each hand), so its drawing joins them into
// one, each at its place on the board. The page under the gaps between them is the caption's background.
import type { ComponentProps } from "svelte";
import { STYLED, styledCopy, type BoardSvg } from "@abstractclass/review/boardImage.ts";
import type { ImageBoard } from "@abstractclass/review/game.ts";
import type { Blueprints } from "../review/blueprints.ts";
import { boardLine } from "../review/ReviewBoard.svelte";
import type Board from "./Board.svelte";

/** The board's area in the image: the image's host's width (boardImage.ts), square. */
const AREA = { width: 600, height: 600 } as const;

/** The board's properties for an image: the position, the move that led to it while no move of the line is drawn,
 *  the line, the notes, and the hands beside the field. A still board in a fixed area (`image`): no zoom's buttons,
 *  and a fit that holds the line's placements. */
export const imageBoard = (b: ImageBoard<Blueprints>): ComponentProps<typeof Board> => ({
  position: b.position,
  last: b.last?.drawn ?? null,
  line: b.line.length ? boardLine(b.line, b.position.blueprints) : null,
  notes: b.notes,
  layers: { candidates: false },
  hands: "box",
  still: true,
  image: AREA,
});

/** The properties that Blueprints' board sets in its style, past Hedge School's: the notes' joins and their arrows'
 *  stroke under the fill. */
const BLUEPRINTS_STYLED = [...STYLED, "stroke-linejoin", "paint-order"];
const SVG_NS = "http://www.w3.org/2000/svg";

/** The board's drawing: one SVG `width` pixels wide that holds a styled copy (styledCopy) of the field's SVG and of
 *  each hand's, at its place on the board. */
export const boardSvg: BoardSvg = (host, width) => {
  const board = host.querySelector<HTMLElement>(".board")!, at = board.getBoundingClientRect();
  const out = document.createElementNS(SVG_NS, "svg");
  const height = Math.round((width * at.height) / at.width);
  out.setAttribute("xmlns", SVG_NS);
  out.setAttribute("width", `${width}`);
  out.setAttribute("height", `${height}`);
  out.setAttribute("viewBox", `0 0 ${at.width} ${at.height}`);
  for (const svg of board.querySelectorAll<SVGSVGElement>(".hand-area > svg, .field > svg")) {
    const { left, top, width: w, height: h } = svg.getBoundingClientRect(), copy = styledCopy(svg, BLUEPRINTS_STYLED);
    copy.setAttribute("x", `${left - at.left}`);
    copy.setAttribute("y", `${top - at.top}`);
    copy.setAttribute("width", `${w}`);
    copy.setAttribute("height", `${h}`);
    out.append(copy);
  }
  return { markup: new XMLSerializer().serializeToString(out), height };
};
