// The review's display settings (docs/design/06-review-layout.md): what the labels judge (design 10), the win chance's
// form, the board's layers, the chart's score line, and how the engine's line and the branches show (design 07). Kept
// in this browser: there are no accounts yet. Storage can be blocked (a private window, blocked site data), so every
// read and write may fail, and the defaults then hold.
import { DEFAULT_LAYERS, type BoardLayers } from "#lib/board/Board.svelte";
import { MOVE_SOUNDS, type MoveSound } from "#lib/sound.ts";
import { readLocalJson, writeLocal } from "@abstractclass/storage/local.ts";
import type { MapStyle } from "./ownership.ts";

export interface Display {
  judge: "turn" | "edge"; // what the labels judge: each turn as a whole (the default), or each edge (design 10)
  // Whose moves the review explains: both players (the default), or one: its labels, numbers, notes and the engine's
  // lines show, the other's do not
  reviewFor: "both" | "blue" | "red";
  win: "bar" | "gauge"; // a bar above the board (Blue left, Red right), or a vertical gauge beside it
  // The board's layers, but the area map, which each page keeps on its own
  layers: Omit<BoardLayers, "areaMap">;
  // The area map (design 30), on each page: off on the review, whose player reads the labels first, and on on the
  // Analysis board, whose player reads the whole board. The key t shows or hides it on the page.
  areaMap: { review: boolean; board: boolean };
  // The map's style: the engine's ownership of each point ("Forecast", the default, as KaTrain's territory), the
  // forecast against the board now ("Forecast vs board"), or the forecast after the last move or the line drawn against
  // the forecast before it ("After vs before", KaTrain's loss grid with the rises)
  mapStyle: MapStyle;
  // For each style, the smallest value that gets a mark, in hundredths: 0 marks every point with a value. 5 by default
  // for all three: after the engine's best move, the difference at 0 marks a third of the board, faintly
  // (decisions/product.md, "After vs before: the third style"). A browser's own stored value stays.
  mapMin: Record<MapStyle, number>;
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

/** The layers that the display keeps: all but the area map. */
function withoutMap<T extends Partial<BoardLayers>>(layers: T): Omit<T, "areaMap"> {
  const kept = { ...layers };
  delete kept.areaMap;
  return kept;
}

export const DEFAULT_DISPLAY: Display = {
  judge: "turn",
  reviewFor: "both",
  win: "bar",
  layers: withoutMap(DEFAULT_LAYERS),
  areaMap: { review: false, board: true },
  mapStyle: "ownership",
  mapMin: { ownership: 5, change: 5, difference: 5 },
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
    layers: { ...DEFAULT_DISPLAY.layers, ...withoutMap(kept.layers ?? {}) },
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
    notes: kept.notes ?? DEFAULT_DISPLAY.notes,
    previewMoves: kept.previewMoves ?? DEFAULT_DISPLAY.previewMoves,
    previewBranches: kept.previewBranches ?? DEFAULT_DISPLAY.previewBranches,
    sound: kept.sound ?? DEFAULT_DISPLAY.sound,
    moveSound: kept.moveSound && kept.moveSound in MOVE_SOUNDS ? kept.moveSound : DEFAULT_DISPLAY.moveSound,
    volume: typeof kept.volume === "number" ? Math.min(1, Math.max(0, kept.volume)) : DEFAULT_DISPLAY.volume,
  };
}

export const saveDisplay = (d: Display) => writeLocal(KEY, JSON.stringify(d));
