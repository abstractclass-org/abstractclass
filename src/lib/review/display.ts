// The review's display settings (docs/design/06-review-layout.md): the win chance's form, the board's layers and the
// chart's score line. Kept in this browser: there are no accounts yet. Storage can be blocked (a private window,
// blocked site data), so every read and write may fail, and the defaults then hold.
import { DEFAULT_LAYERS, type BoardLayers } from "#lib/board/Board.svelte";

export interface Display {
  win: "bar" | "gauge"; // a bar above the board (Blue left, Red right), or a vertical gauge beside it
  layers: BoardLayers;
  scoreLine: boolean; // the Advantage chart's score-so-far line
  lineSteps: boolean; // the engine's line drawn one edge at a time (KaTrain's way, the default), not all at once
}

const KEY = "learn-enclosure:review-display:1";

export const DEFAULT_DISPLAY: Display = {
  win: "bar",
  layers: DEFAULT_LAYERS,
  scoreLine: true,
  lineSteps: true,
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
