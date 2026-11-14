// The image of a line (Hedge School's design 07, item 17), Blueprints' part: its words in the caption under the board
// and in the saved file's name: "move" for Hedge School's "edge", and each player's stars on the board for the area.
// The caption's and the name's rule, the line that an image draws, its frames, the image's frame and the GIF are the
// review package's (@abstractclass/review/boardImage.ts, lineImage.ts, gif.ts). The board is board/image.ts.
import { fmtScore } from "@abstractclass/review/game.ts";
import { lineCaption, lineImageName, type CaptionStart, type CaptionWords } from "@abstractclass/review/boardImage.ts";
import type { Position } from "./blueprints.ts";

type CaptionNumbers = Pick<Position, "scores" | "stars">;

/** Blueprints' words: "move", the file's "cyanotype", and each player's stars on the board. */
const WORDS: CaptionWords<CaptionNumbers> = {
  move: "move",
  moves: "moves",
  file: "cyanotype",
  more: ({ stars }, p) => ` and ${fmtScore(stars[p])} ${stars[p] === 1 ? "star" : "stars"} on the board`,
};

/** The caption's lines (@abstractclass/review/boardImage.ts, lineCaption): the turn and who plays where the line
 *  starts, then each player's score and stars there and after the line's last move (`end`, after `moves` moves). */
export const imageCaption =
  (start: CaptionStart<CaptionNumbers>, end: CaptionNumbers | null, moves: number): string[] =>
    lineCaption(WORDS, start, end, moves);

/** The saved file's name (lineImageName): "cyanotype-after-move-N-line-M.png", or "-animated.gif" for a GIF. */
export const imageName = (start: string[], moves: number, animated = false): string =>
  lineImageName(WORDS, start, moves, animated);
