// The image of a line (design 07, item 17): the move menu's "Generate image" draws the board with a line numbered on
// it, and a caption under it. This file chooses the line for the move under the menu, and the frames of the animated
// image. The game draws the board and writes the caption and the file's name (the view's game interface, `image`).
import { branchLine, mainIndex, sharedLength } from "@abstractclass/analysis/tree.ts";
import { LINE_STEP_MS } from "./lineDrawing.svelte.ts";

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

/** The frames of the animated image of a line of `edges` edges: how many of its edges each draws, and for how long.
 *  The whole line first, for two seconds: an app that shows only an animation's first frame shows the line. Then the
 *  start with no edge for a second, and the edges one at a time, as the board draws a line (every LINE_STEP_MS, half a
 *  second). Then it plays again from the whole line. A line with no edge has no frames. */
export function lineFrames(edges: number): { edges: number; ms: number }[] {
  if (!edges) return [];
  return [{ edges, ms: 2000 }, { edges: 0, ms: 1000 }, ...Array.from({ length: edges }, (_, k) => ({ edges: k + 1, ms: LINE_STEP_MS }))];
}
