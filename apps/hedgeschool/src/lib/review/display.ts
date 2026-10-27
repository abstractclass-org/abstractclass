// The review's display settings (docs/design/06-review-layout.md): what the labels judge (design 10), the win chance's
// form, the board's layers, the chart's score line, and how the engine's line and the variations show (design 07). Kept
// in this browser: there are no accounts yet. Storage can be blocked (a private window, blocked site data), so every
// read and write may fail, and the defaults then hold.
import { DEFAULT_LAYERS, type BoardLayers } from "#lib/board/Board.svelte";
import { MOVE_SOUNDS, type MoveSound } from "#lib/sound.ts";
import { readLocalJson, writeLocal } from "@abstractclass/storage/local.ts";
import type { MapStyle } from "@abstractclass/review/ownership.ts";
import type { Display as ViewDisplay } from "@abstractclass/review/game.ts";

/** The settings of the review's view (@abstractclass/review/game.ts, Display, which says what each does), with Hedge
 *  School's board's layers (board/Board.svelte: its regions and its invincible edges, beside the view's) and its sets of
 *  move sounds (src/lib/sound.ts). */
export interface Display extends ViewDisplay {
  layers: BoardLayers;
  moveSound: MoveSound;
}

const KEY = "learn-enclosure:review-display:1";

/** The defaults. The labels judge each turn as a whole, for both players. The area map is off on the review, whose
 *  player reads the labels first, and on on the Analysis board, whose player reads the whole board. Its style is
 *  "Forecast". Each style marks from 5 hundredths: after the engine's best move, the difference at 0 marks a third of
 *  the board, faintly (decisions/product.md, "After vs before: the third style"). A browser's own stored value stays.
 *  The lines draw one edge at a time (KaTrain's way), an edge shows as a pill along its direction, and a label as a
 *  badge, a book move's on the book's brown, as chess.com's Book mark is a brown disc (design 32, item 4). The sounds are on, as on Lichess, with the button's set. */
export const DEFAULT_DISPLAY: Display = {
  judge: "turn",
  reviewFor: "both",
  win: "bar",
  layers: DEFAULT_LAYERS,
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
  previewMoves: true,
  previewBranches: true,
  sound: true,
  moveSound: "button",
  volume: 0.4,
};

/** A kept smallest value of the map's style: a whole number of hundredths from 0 to 100, or else the default. */
const hundredths = (v: unknown, style: MapStyle) =>
  typeof v === "number" && v >= 0 && v <= 100 ? Math.round(v) : DEFAULT_DISPLAY.mapMin[style];

export function loadDisplay(): Display {
  const kept = readLocalJson<Partial<Display> & { branchText?: boolean }>(KEY);
  if (!kept) return structuredClone(DEFAULT_DISPLAY);
  return {
    judge: kept.judge === "edge" ? "edge" : "turn",
    reviewFor: kept.reviewFor === "blue" || kept.reviewFor === "red" ? kept.reviewFor : "both",
    win: kept.win === "gauge" ? "gauge" : "bar",
    layers: { ...DEFAULT_DISPLAY.layers, ...kept.layers },
    areaMap: { ...DEFAULT_DISPLAY.areaMap, ...kept.areaMap },
    mapStyle: kept.mapStyle === "change" || kept.mapStyle === "difference" ? kept.mapStyle : "ownership",
    mapMin: { ownership: hundredths(kept.mapMin?.ownership, "ownership"), change: hundredths(kept.mapMin?.change, "change"),
              difference: hundredths(kept.mapMin?.difference, "difference") },
    scoreLine: kept.scoreLine ?? DEFAULT_DISPLAY.scoreLine,
    areaLine: kept.areaLine ?? DEFAULT_DISPLAY.areaLine,
    lineSteps: kept.lineSteps ?? DEFAULT_DISPLAY.lineSteps,
    // Kept before the pills as `branchText`, true for the notation
    branchForm: kept.branchForm === "pills" || kept.branchForm === "dots" || kept.branchForm === "text" ? kept.branchForm
      : kept.branchText ? "text" : DEFAULT_DISPLAY.branchForm,
    marks: kept.marks === "text" ? "text" : "badges",
    bookMoves: kept.bookMoves === "book" ? "book" : "label",
    notes: kept.notes ?? DEFAULT_DISPLAY.notes,
    previewMoves: kept.previewMoves ?? DEFAULT_DISPLAY.previewMoves,
    previewBranches: kept.previewBranches ?? DEFAULT_DISPLAY.previewBranches,
    sound: kept.sound ?? DEFAULT_DISPLAY.sound,
    moveSound: kept.moveSound && kept.moveSound in MOVE_SOUNDS ? kept.moveSound : DEFAULT_DISPLAY.moveSound,
    volume: typeof kept.volume === "number" ? Math.min(1, Math.max(0, kept.volume)) : DEFAULT_DISPLAY.volume,
  };
}

export const saveDisplay = (d: Display) => writeLocal(KEY, JSON.stringify(d));
