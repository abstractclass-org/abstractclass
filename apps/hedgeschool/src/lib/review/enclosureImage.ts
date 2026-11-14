// The image of a line (design 07, item 17), Enclosure's part: its words in the caption under the board and in the saved
// file's name. The caption's and the name's rule, the line that an image draws, its animation's frames, the board's
// drawing apart from the page, the caption's place and the GIF are the review package's
// (@abstractclass/review/boardImage.ts, lineImage.ts, gif.ts). The board is board/Board.svelte, with the properties of
// enclosureView.ts's `imageBoard`.
import { lineCaption, lineImageName, type CaptionStart, type CaptionWords } from "@abstractclass/review/boardImage.ts";
import { fmtScore, type Position } from "./enclosure.ts";

type CaptionNumbers = Pick<Position, "scores" | "areas">;

/** Enclosure's words: "edge", the file's "hedge-school", and the area that each player encloses now, when the position
 *  has them. */
const WORDS: CaptionWords<CaptionNumbers> = {
  move: "edge",
  moves: "edges",
  file: "hedge-school",
  more: ({ areas }, p) => (areas ? ` and an area of ${fmtScore(areas[p])}` : ""),
};

/** The caption's lines (@abstractclass/review/boardImage.ts, lineCaption): the turn and who plays where the line
 *  starts, then each player's score and area there and after the line's last edge (`end`, after `edges` edges). */
export const imageCaption =
  (start: CaptionStart<CaptionNumbers>, end: CaptionNumbers | null, edges: number): string[] =>
    lineCaption(WORDS, start, end, edges);

/** The saved file's name (lineImageName): "hedge-school-after-edge-N-line-M.png", or "-animated.gif" for a GIF. */
export const imageName = (start: string[], edges: number, animated = false): string =>
  lineImageName(WORDS, start, edges, animated);
