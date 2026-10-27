// The move list's look, in the review, on the Analysis board and in Practice: one row a turn, its number, then its
// moves in two equal columns (Lichess's move list), each at least a move wide, so that the moves line up down the list.
// A move's text has one width, the game's widest move (the view's game interface, `moveText`), in a monospaced font,
// the same on every system (@abstractclass/site/site.css). The move on the board is outlined in the accent colour, and
// a move under the pointer in the line colour.
import type { Player } from "@abstractclass/analysis/game.ts";
import { SIDE_TEXT } from "@abstractclass/site/side.ts";

/** The list is a container, so that a row can follow its box (`turnRow`). */
export const MOVE_LIST = "movelist @container flex-1 min-h-0 overflow-y-auto pt-1.5 text-sm border-t border-line";
/** A turn's row. `judged`: a last column for the turn's own label (the review by turn). By edge each move holds its
 *  label, ◆ and loss (139 pixels at 14), so the two moves and the number need 20.02 rem. In a box narrower than 21.5 rem
 *  the second move goes under the first, in the first move's column, so that no number hides sideways. The query reads
 *  the box before its scroll bar, which takes up to 17 pixels (1.06 rem) of the room that the rows then have. */
export const turnRow = (judged = false) => ["grid items-baseline gap-x-1",
  judged ? "grid-cols-[2.2rem_repeat(2,minmax(max-content,1fr))_auto]"
    : "grid-cols-[2.2rem_repeat(2,minmax(max-content,1fr))] @max-[21.5rem]:grid-cols-[2.2rem_minmax(max-content,1fr)] @max-[21.5rem]:[&>.mv]:col-start-2"];
/** A turn's row, in rem: 22 pixels, as Chromium lays out the turn's number and its moves on one baseline. The review's
 *  grey bars before its rows are this far apart (ReviewView.svelte, rowsDrawn). */
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
