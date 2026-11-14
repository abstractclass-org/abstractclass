// The review's display settings (docs/design/06-review-layout.md): what the labels judge (design 10), the win chance's
// form, the board's layers, the chart's score line, and how the engine's line and the variations show (design 07). Kept
// in this browser (@abstractclass/review/display.ts): there are no accounts yet.
import { DEFAULT_LAYERS, type BoardLayers } from "#lib/board/Board.svelte";
import { DISPLAY_KEY } from "#lib/keys.ts";
import { isMoveSound, type MoveSound } from "@abstractclass/site/sound.ts";
import { displayStore } from "@abstractclass/review/display.ts";
import type { Display as ViewDisplay } from "@abstractclass/review/game.ts";

/** The settings of the review's view (@abstractclass/review/game.ts, Display, which says what each does), with Hedge
 *  School's board's layers (board/Board.svelte: its regions and its invincible edges, beside the view's) and its sets of
 *  move sounds (@abstractclass/site/sound.ts). */
export interface Display extends ViewDisplay {
  layers: BoardLayers;
  moveSound: MoveSound;
}

/** The defaults. The labels judge each turn as a whole, for both players. The area map is off on the review, whose
 *  player reads the labels first, and on on the Analysis board, whose player reads the whole board. Its style is
 *  "Forecast". Each style marks from 5 hundredths: after the engine's best move, the difference at 0 marks a third of
 *  the board, faintly (decisions/product.md, "After vs before: the third style"). A browser's own stored value stays.
 *  The lines draw one edge at a time (KaTrain's way), an edge shows as a pill along its direction, and a label as a
 *  badge, a book move's on the book's brown, as chess.com's Book mark is a brown disc (design 32, item 4). The sounds
 *  are on, as on Lichess, with the button's set. The weak walls, a prototype, are off on both pages. */
export const DEFAULT_DISPLAY: Display = {
  judge: "turn",
  reviewFor: "both",
  win: "bar",
  layers: DEFAULT_LAYERS,
  areaMap: { review: false, board: true },
  mapStyle: "ownership",
  mapMin: { ownership: 5, change: 5, difference: 5 },
  weakWalls: { review: false, board: false },
  scoreLine: true,
  areaLine: true,
  lineSteps: true,
  branchForm: "pills",
  marks: "badges",
  bookMoves: "label",
  notes: true,
  previewMoves: true,
  previewBranches: true,
  sound: true,
  moveSound: "button",
  volume: 0.4,
};

export const { load: loadDisplay, save: saveDisplay } =
  displayStore(DISPLAY_KEY, DEFAULT_DISPLAY, isMoveSound);
