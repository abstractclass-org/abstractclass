// The image of a line (Hedge School's design 07, item 17), Blueprints' part: the caption under the board, and the saved
// file's name, as Hedge School's review/enclosureImage.ts writes them, with "move" for "edge" and each player's stars
// on the board for the area. The line that an image draws, its frames, the image's frame and the GIF are the review
// package's (@abstractclass/review/lineImage.ts, boardImage.ts, gif.ts). The board's drawing is board/image.ts.
import { fmtScore } from "@abstractclass/review/game.ts";
import { PLAYER_NAMES } from "../board/position.ts";
import type { Position } from "./blueprints.ts";

type CaptionNumbers = Pick<Position, "scores" | "stars">;
/** The place where the line starts, as the caption needs it: the turn of its next move and whether that move opens the
 *  turn, and the position's mover, moves left, end and numbers. */
export type CaptionStart = Pick<Position, "player" | "movesLeft" | "over"> & CaptionNumbers & { turn: number; first: boolean };

/** Each player's score and stars on the board: a sentence each. */
const scoreText = ({ scores, stars }: CaptionNumbers) =>
  ([0, 1] as const).map(p => `${PLAYER_NAMES[p]} has a score of ${fmtScore(scores[p])} and ${fmtScore(stars[p])} ` +
    `${stars[p] === 1 ? "star" : "stars"} on the board.`).join(" ");

/** The caption's lines (text that explains): the turn and who plays where the line starts, then each player's score
 *  and stars there and after the line's last move (`end`, after `moves` moves). With no line, the position's numbers. */
export function imageCaption(start: CaptionStart, end: CaptionNumbers | null, moves: number): string[] {
  const who = PLAYER_NAMES[start.player];
  const turn = start.over ? "The game is over."
    : `Turn ${start.turn}. ${who} plays ${!start.first ? "the second move of the turn" : start.movesLeft > 1 ? "two moves" : "one move"}.`;
  if (!end || !moves) return [turn, scoreText(start)];
  return [turn, `Before move 1: ${scoreText(start)}`, `After move ${moves}: ${scoreText(end)}`];
}

/** The saved file's name: where the line starts, how many moves the image numbers, and whether it plays the line (a
 *  GIF). */
export function imageName(start: string[], moves: number, animated = false): string {
  const from = start.length ? `after-move-${start.length}` : "start";
  return `cyanotype-${from}${moves ? `-line-${moves}` : ""}${animated ? "-animated.gif" : ".png"}`;
}
