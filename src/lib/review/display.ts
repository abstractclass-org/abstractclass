// The review's display settings (docs/design/06-review-layout.md): the win chance's form, the board's layers, the
// chart's score line, and how the engine's line and the branches show (design 07). Kept in this browser: there are no accounts yet. Storage can be blocked (a private window,
// blocked site data), so every read and write may fail, and the defaults then hold.
import { DEFAULT_LAYERS, type BoardLayers } from "#lib/board/Board.svelte";

export interface Display {
  win: "bar" | "gauge"; // a bar above the board (Blue left, Red right), or a vertical gauge beside it
  layers: BoardLayers;
  scoreLine: boolean; // the Advantage chart's score-so-far line
  lineSteps: boolean; // the engine's line drawn one edge at a time (KaTrain's way, the default), not all at once
  branchText: boolean; // branches and the listed line in the record's notation, not as numbered circles (Go's way, the default)
  notes: boolean; // the move list's one-line notes on Great edges, mistakes and blunders
}

const KEY = "learn-enclosure:review-display:1";

export const DEFAULT_DISPLAY: Display = {
  win: "bar",
  layers: DEFAULT_LAYERS,
  scoreLine: true,
  lineSteps: true,
  branchText: false,
  notes: true,
};

export function loadDisplay(): Display {
  try {
    const kept = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Display> | null;
    if (!kept) return structuredClone(DEFAULT_DISPLAY);
    return {
      win: kept.win === "gauge" ? "gauge" : "bar",
      layers: { ...DEFAULT_DISPLAY.layers, ...kept.layers },
      scoreLine: kept.scoreLine ?? DEFAULT_DISPLAY.scoreLine,
      lineSteps: kept.lineSteps ?? DEFAULT_DISPLAY.lineSteps,
      branchText: kept.branchText ?? DEFAULT_DISPLAY.branchText,
      notes: kept.notes ?? DEFAULT_DISPLAY.notes,
    };
  } catch {
    return structuredClone(DEFAULT_DISPLAY);
  }
}

export function saveDisplay(d: Display) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // The settings then last for this page only.
  }
}
