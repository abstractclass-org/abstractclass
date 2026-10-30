// The move list's look, in the review, on the Analysis board and in Practice: one row a turn, its number, then its
// moves in two equal columns (Lichess's move list), each at least a move wide, so that the moves line up down the list.
// Where two moves do not fit, a turn's second move goes under its first (`turnRow`). A move's text has one width, the
// game's widest move (the view's game interface, `moveText`), in a monospaced font, the same on every system
// (@abstractclass/site/site.css). The move on the board is outlined in the accent colour, and a move under the pointer
// in the line colour.
import type { Player } from "@abstractclass/analysis/game.ts";
import { SIDE_TEXT } from "@abstractclass/site/side.ts";

export const MOVE_LIST = "movelist flex-1 min-h-0 overflow-y-auto pt-1.5 text-sm border-t border-line";
/** A turn's row. `judged`: a last column for the turn's own quality label (the review by turn). Otherwise the moves
 *  wrap. Where the number and two moves do not fit, the second move goes under the first, so that nothing hides
 *  sideways. By edge a move holds its quality label, ◆ and loss too, so its rows wrap in a wider box. The number hangs
 *  in the row's left padding (2.45rem: its 2.2rem and the gap), so a second line starts in the first move's column.
 *  Each move takes half the room after the number (50%, less half the gap), and at least its own width. A continued
 *  turn's … takes a move's place. The half pixel less keeps rounding from wrapping two moves that fit. */
export const turnRow = (judged = false) => judged
  ? ["grid items-baseline gap-x-1 grid-cols-[2.2rem_repeat(2,minmax(max-content,1fr))_auto]"]
  : ["flex flex-wrap items-baseline gap-x-1 pl-[2.45rem]",
     "[&>:first-child]:flex-none [&>:first-child]:w-[2.2rem] [&>:first-child]:-ml-[2.45rem]",
     "[&>:not(:first-child)]:flex-[0_0_calc(50%-0.125rem-0.5px)] [&>:not(:first-child)]:min-w-max"];
/** A turn's row on one line, in rem: 22 pixels, as Chromium lays out the turn's number and its moves on one baseline.
 *  The review's grey bars before its rows are this far apart (ReviewView.svelte, rowsDrawn), also where the rows by
 *  edge take two lines (`turnRow`). */
export const TURN_REM = 1.375;
export const TURN_NUMBER = "text-muted tabular-nums";
const MOVE = "mv flex items-baseline gap-1 px-[0.2rem] py-px font-mono text-[0.95em] text-left whitespace-nowrap bg-transparent border-0";
export const MOVE_HERE = "here bg-panel-2 outline outline-accent -outline-offset-1";
export const MOVE_HOVER = "hover:bg-panel-2 hover:outline hover:outline-line hover:-outline-offset-1";
/** A move's button: the mover's colour, and its state, by default the pointer's outline. */
export const moveButton = (player: Player, state: string = MOVE_HOVER) => [MOVE, SIDE_TEXT[player], state];

/** Keeps the move on the board (`.mv.here`) four rows from the list's top, as the position changes. A click on a move
 *  does not focus it (Lichess's moves take no focus): the lists keep a move's mouse-down from focusing it. */
export function keepInView(list: HTMLElement | null) {
  if (!list) return;
  const move = list.querySelector<HTMLElement>(".mv.here");
  if (!move) { list.scrollTop = 0; return; }
  const top = move.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
  list.scrollTop = top - 4 * move.offsetHeight;
}
