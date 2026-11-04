// The review's display settings on Cyanotype (Hedge School's design 06), kept in this browser
// (@abstractclass/review/display.ts). They are the view's (@abstractclass/review/game.ts, Display, which says what each
// does), with Hedge School's defaults. Cyanotype has no move sounds yet (design 33), so its sound settings stay off
// and the view does not offer them.
import { displayStore } from "@abstractclass/review/display.ts";
import type { Display as ViewDisplay } from "@abstractclass/review/game.ts";
import { DISPLAY_KEY } from "../site.ts";

export type Display = ViewDisplay & { moveSound: "none" };

/** Hedge School's defaults (its review/display.ts says why each), without the sounds. */
export const DEFAULT_DISPLAY: Display = {
  judge: "turn",
  reviewFor: "both",
  win: "bar",
  layers: { candidates: true, marks: true },
  areaMap: { review: false, board: true },
  mapStyle: "ownership",
  mapMin: { ownership: 5, change: 5, difference: 5 },
  scoreLine: true,
  areaLine: true,
  lineSteps: true,
  branchForm: "pills",
  marks: "badges",
  bookMoves: "label",
  notes: true,
  notation: "glyphs", // the moves as the board's hands show them: the blueprint's number in a box
  previewMoves: true,
  previewBranches: true,
  sound: false,
  moveSound: "none",
  volume: 0.4,
};

export const { load: loadDisplay, save: saveDisplay } =
  displayStore(DISPLAY_KEY, DEFAULT_DISPLAY, (s): s is "none" => s === "none");
