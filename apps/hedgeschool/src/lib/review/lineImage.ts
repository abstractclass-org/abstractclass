// The image of a line (design 07, item 17): the move menu's "Copy image" and "Save image" draw the board with a line
// numbered on it, and a caption under it. This file chooses the line for the move under the menu and writes the
// caption. The board's drawing is boardImage.ts.
import { branchLine, mainIndex, sharedLength } from "@abstractclass/analysis/tree.ts";
import type { Player, Position } from "./enclosure.ts";

/** The line that an image draws: the position where it starts, and the path after each of its edges, numbered from 1.
 *  No edges: the image is the position at `start`. */
export interface ImageLine { start: string[]; paths: string[][] }

/** The line of the move at `target` (its path). A branch's move: the branch's line from where it leaves the game, as
 *  its preview numbers it (branchLine). A move of the game ahead of the position on screen (`here`): the line from
 *  there to the move, as a position made in the board editor has only a main line. Any other move of the game: the
 *  position after it. */
export function imageLine(target: string[], here: string[], main: string[]): ImageLine {
  const ahead = target.length > here.length && sharedLength(target, here) === here.length;
  const start = mainIndex(target, main) === null ? branchLine(target, main).start : ahead ? here : target;
  return { start, paths: target.slice(start.length).map((_, k) => target.slice(0, start.length + k + 1)) };
}

/** The place where the line starts, as the caption needs it: the turn of its next edge and whether that edge opens the
 *  turn, and the position's mover, edges left, end and numbers. */
export interface CaptionStart extends CaptionNumbers {
  turn: number;
  first: boolean;
  player: Player;
  movesLeft: number;
  over?: boolean;
}
type CaptionNumbers = Pick<Position, "scores" | "areas">;

const NAME = ["Blue", "Red"] as const;
const WHOLE = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
/** Each player's points and, when the position has them, the area that the player encloses now. */
const numbers = ({ scores, areas }: CaptionNumbers) =>
  ([0, 1] as const).map(p => `${NAME[p]} ${WHOLE.format(Math.round(scores[p]))} points${areas ? `, ${WHOLE.format(Math.round(areas[p]))} area` : ""}.`)
    .join(" ");

/** The caption's lines (text that explains): the turn and who plays where the line starts, then each player's points
 *  and area there and after the line's last edge (`end`, after `edges` edges). With no line, the position's numbers. */
export function imageCaption(start: CaptionStart, end: CaptionNumbers | null, edges: number): string[] {
  const who = NAME[start.player];
  const turn = start.over ? "The game is over."
    : `Turn ${start.turn}. ${who} plays ${!start.first ? "the second edge of the turn" : start.movesLeft > 1 ? "two edges" : "one edge"}.`;
  if (!end || !edges) return [turn, numbers(start)];
  return [turn, `Before edge 1: ${numbers(start)}`, `After edge ${edges}: ${numbers(end)}`];
}

/** The site's name, small, at the caption's foot. */
export const IMAGE_SITE = "Hedge School";

/** The saved file's name: where the line starts, and how many edges it has. */
export function imageName({ start, paths }: ImageLine): string {
  const from = start.length ? `after-edge-${start.length}` : "start";
  return `hedge-school-${from}${paths.length ? `-line-${paths.length}` : ""}.png`;
}
