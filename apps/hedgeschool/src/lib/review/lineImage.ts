// The image of a line (design 07, item 17): the move menu's "Generate image" draws the board with a line
// numbered on it, and a caption under it. This file chooses the line for the move under the menu and writes the
// caption. The board's drawing is boardImage.ts.
import { branchLine, mainIndex, sharedLength } from "@abstractclass/analysis/tree.ts";
import { fmtScore, PLAYER_NAME, type Position } from "./enclosure.ts";

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

type CaptionNumbers = Pick<Position, "scores" | "areas">;
/** The place where the line starts, as the caption needs it: the turn of its next edge and whether that edge opens the
 *  turn, and the position's mover, edges left, end and numbers. */
export type CaptionStart = Pick<Position, "player" | "movesLeft" | "over"> & CaptionNumbers & { turn: number; first: boolean };

/** Each player's points and, when the position has them, the area that the player encloses now: a sentence each. */
const scoreText = ({ scores, areas }: CaptionNumbers) =>
  ([0, 1] as const).map(p => `${PLAYER_NAME[p]} has ${fmtScore(scores[p])} points${areas ? ` and an area of ${fmtScore(areas[p])}` : ""}.`)
    .join(" ");

/** The caption's lines (text that explains): the turn and who plays where the line starts, then each player's points
 *  and area there and after the line's last edge (`end`, after `edges` edges). With no line, the position's numbers. */
export function imageCaption(start: CaptionStart, end: CaptionNumbers | null, edges: number): string[] {
  const who = PLAYER_NAME[start.player];
  const turn = start.over ? "The game is over."
    : `Turn ${start.turn}. ${who} plays ${!start.first ? "the second edge of the turn" : start.movesLeft > 1 ? "two edges" : "one edge"}.`;
  if (!end || !edges) return [turn, scoreText(start)];
  return [turn, `Before edge 1: ${scoreText(start)}`, `After edge ${edges}: ${scoreText(end)}`];
}

/** The saved file's name: where the line starts, how many edges the image numbers, and whether it plays the line. */
export function imageName(start: string[], edges: number, animated = false): string {
  const from = start.length ? `after-edge-${start.length}` : "start";
  return `hedge-school-${from}${edges ? `-line-${edges}` : ""}${animated ? "-animated" : ""}.png`;
}

/** The frames of the animated image of a line of `edges` edges: how many of its edges each draws, and for how long.
 *  The start with no edge for a second, then the edges one at a time every half second, as the board draws a line
 *  (LINE_STEP_MS in lineDrawing.svelte.ts), and the whole line for two seconds. A line with no edge has no frames. */
export function lineFrames(edges: number): { edges: number; ms: number }[] {
  if (!edges) return [];
  return Array.from({ length: edges + 1 }, (_, k) => ({ edges: k, ms: k === 0 ? 1000 : k === edges ? 2000 : 500 }));
}
