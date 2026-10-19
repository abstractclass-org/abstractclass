// The review's display settings (docs/design/06-review-layout.md): what the labels judge (design 10), the win chance's
// form, the board's layers, the chart's score line, and how the engine's line and the branches show (design 07). Kept
// in this browser: there are no accounts yet. Storage can be blocked (a private window, blocked site data), so every
// read and write may fail, and the defaults then hold.
import { DEFAULT_LAYERS, type BoardLayers } from "#lib/board/Board.svelte";
import { MOVE_SOUNDS, type MoveSound } from "#lib/sound.ts";
import { readLocalJson, writeLocal } from "@abstractclass/storage/local.ts";

export interface Display {
  judge: "turn" | "edge"; // what the labels judge: each turn as a whole (the default), or each edge (design 10)
  // Whose moves the review explains: both players (the default), or one: its labels, numbers, notes and the engine's
  // lines show, the other's do not
  reviewFor: "both" | "blue" | "red";
  win: "bar" | "gauge"; // a bar above the board (Blue left, Red right), or a vertical gauge beside it
  layers: BoardLayers;
  scoreLine: boolean; // the Advantage chart's score line (Blue − Red)
  areaLine: boolean; // the Advantage chart's area line: the area each player encloses now (Blue − Red)
  // "Lines on the board": the engine's line and a branch's preview drawn one edge at a time (KaTrain's way, the
  // default), not all at once
  lineSteps: boolean;
  // How an edge shows in the branches and the listed line: a pill along the edge's direction (the default), a dot (Go's
  // way), or the record's notation. In the line, the pills and the dots carry the board's numbers.
  branchForm: "pills" | "dots" | "text";
  // A label in the move list and the branches: a badge (the default), its mark in white on its fill as in the report
  // and on the board, or the mark alone in the label's colour, as Lichess's move list shows it
  marks: "badges" | "text";
  notes: boolean; // the move list's one-line notes on Great edges, mistakes and blunders
  previewMoves: boolean; // the position after a played move on the board, while the pointer is on the move (design 07)
  previewBranches: boolean; // a branch's line on the board, while the pointer is on one of its moves (design 07)
  sound: boolean; // move sounds (design 08), on by default as on Lichess
  moveSound: MoveSound; // which set of sounds (src/lib/sound.ts): a button by default, or a pencil stroke
  volume: number; // the move sounds' volume, 0 to 1
}

const KEY = "learn-enclosure:review-display:1";

export const DEFAULT_DISPLAY: Display = {
  judge: "turn",
  reviewFor: "both",
  win: "bar",
  layers: DEFAULT_LAYERS,
  scoreLine: true,
  areaLine: true,
  lineSteps: true,
  branchForm: "pills",
  marks: "badges",
  notes: true,
  previewMoves: true,
  previewBranches: true,
  sound: true,
  moveSound: "button",
  volume: 0.4,
};

export function loadDisplay(): Display {
  const kept = readLocalJson<Partial<Display> & { branchText?: boolean }>(KEY);
  if (!kept) return structuredClone(DEFAULT_DISPLAY);
  return {
    judge: kept.judge === "edge" ? "edge" : "turn",
    reviewFor: kept.reviewFor === "blue" || kept.reviewFor === "red" ? kept.reviewFor : "both",
    win: kept.win === "gauge" ? "gauge" : "bar",
    layers: { ...DEFAULT_DISPLAY.layers, ...kept.layers },
    scoreLine: kept.scoreLine ?? DEFAULT_DISPLAY.scoreLine,
    areaLine: kept.areaLine ?? DEFAULT_DISPLAY.areaLine,
    lineSteps: kept.lineSteps ?? DEFAULT_DISPLAY.lineSteps,
    // Kept before the pills as `branchText`, true for the notation
    branchForm: kept.branchForm === "pills" || kept.branchForm === "dots" || kept.branchForm === "text" ? kept.branchForm
      : kept.branchText ? "text" : DEFAULT_DISPLAY.branchForm,
    marks: kept.marks === "text" ? "text" : "badges",
    notes: kept.notes ?? DEFAULT_DISPLAY.notes,
    previewMoves: kept.previewMoves ?? DEFAULT_DISPLAY.previewMoves,
    previewBranches: kept.previewBranches ?? DEFAULT_DISPLAY.previewBranches,
    sound: kept.sound ?? DEFAULT_DISPLAY.sound,
    moveSound: kept.moveSound && kept.moveSound in MOVE_SOUNDS ? kept.moveSound : DEFAULT_DISPLAY.moveSound,
    volume: typeof kept.volume === "number" ? Math.min(1, Math.max(0, kept.volume)) : DEFAULT_DISPLAY.volume,
  };
}

export const saveDisplay = (d: Display) => writeLocal(KEY, JSON.stringify(d));
