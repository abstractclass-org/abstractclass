// The image of a line (design 07, item 17), Enclosure's part: the caption under the board, and the saved file's name.
// The line that an image draws, and its animation's frames, are the review package's (@abstractclass/review/
// lineImage.ts). The board's drawing is board/boardImage.ts.
import { fmtScore, PLAYER_NAME, type Position } from "./enclosure.ts";

type CaptionNumbers = Pick<Position, "scores" | "areas">;
/** The place where the line starts, as the caption needs it: the turn of its next edge and whether that edge opens the
 *  turn, and the position's mover, edges left, end and numbers. */
export type CaptionStart = Pick<Position, "player" | "movesLeft" | "over"> & CaptionNumbers & { turn: number; first: boolean };

/** Each player's score and, when the position has them, the area that the player encloses now: a sentence each. */
const scoreText = ({ scores, areas }: CaptionNumbers) =>
  ([0, 1] as const).map(p => `${PLAYER_NAME[p]} has a score of ${fmtScore(scores[p])}${areas ? ` and an area of ${fmtScore(areas[p])}` : ""}.`)
    .join(" ");

/** The caption's lines (text that explains): the turn and who plays where the line starts, then each player's score
 *  and area there and after the line's last edge (`end`, after `edges` edges). With no line, the position's numbers. */
export function imageCaption(start: CaptionStart, end: CaptionNumbers | null, edges: number): string[] {
  const who = PLAYER_NAME[start.player];
  const turn = start.over ? "The game is over."
    : `Turn ${start.turn}. ${who} plays ${!start.first ? "the second edge of the turn" : start.movesLeft > 1 ? "two edges" : "one edge"}.`;
  if (!end || !edges) return [turn, scoreText(start)];
  return [turn, `Before edge 1: ${scoreText(start)}`, `After edge ${edges}: ${scoreText(end)}`];
}

/** The saved file's name: where the line starts, how many edges the image numbers, and whether it plays the line (a
 *  GIF). */
export function imageName(start: string[], edges: number, animated = false): string {
  const from = start.length ? `after-edge-${start.length}` : "start";
  return `hedge-school-${from}${edges ? `-line-${edges}` : ""}${animated ? "-animated.gif" : ".png"}`;
}
