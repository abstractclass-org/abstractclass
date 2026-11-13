// The review's display settings on Cyanotype (Hedge School's design 06), kept in this browser
// (@abstractclass/review/display.ts). They are the view's (@abstractclass/review/game.ts, Display, which says what each
// does), with Hedge School's defaults and its sets of move sounds (@abstractclass/site/sound.ts, Hedge School's
// design 08).
import { displayStore } from "@abstractclass/review/display.ts";
import type { Display as ViewDisplay } from "@abstractclass/review/game.ts";
import { isMoveSound, type MoveSound } from "@abstractclass/site/sound.ts";
import { readLocalJson } from "@abstractclass/storage/local.ts";
import { DISPLAY_KEY } from "../site.ts";

export type Display = ViewDisplay & { moveSound: MoveSound };

/** Hedge School's defaults (its review/display.ts says why each). */
export const DEFAULT_DISPLAY: Display = {
  judge: "turn",
  reviewFor: "both",
  win: "bar",
  layers: { candidates: true, marks: true },
  areaMap: { review: false, board: true },
  mapStyle: "ownership",
  mapMin: { ownership: 5, change: 5, difference: 5 },
  weakWalls: { review: false, board: false }, // Enclosure's: Blueprints has none, and the view offers no switch
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
  sound: true,
  moveSound: "button",
  volume: 0.4,
};

const store = displayStore(DISPLAY_KEY, DEFAULT_DISPLAY, isMoveSound);

/** The kept settings. Before Cyanotype had sounds, its builds kept `sound: false` with `moveSound: "none"`, and offered
 *  no switch: that was no choice of the player's, so the sounds then take the default. */
export function loadDisplay(): Display {
  const d = store.load();
  if (readLocalJson<{ moveSound?: unknown }>(DISPLAY_KEY)?.moveSound === "none") d.sound = DEFAULT_DISPLAY.sound;
  return d;
}
export const saveDisplay = store.save;
