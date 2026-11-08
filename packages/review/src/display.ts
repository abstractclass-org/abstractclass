// The review's display settings as a site keeps them in its browser (design 06): each site's under its own key, with
// its defaults, its board's layers and its game's sets of move sounds (Hedge School's review/display.ts,
// Cyanotype's). Storage can be blocked (a private window, blocked site data), so every read and write may fail, and the
// defaults then hold. A kept value that is not one of the setting's values gives way to the default.
import { readLocalJson, writeLocal } from "@abstractclass/storage/local.ts";
import { WALL_FORMS, type Display } from "./game.ts";
import type { MapStyle } from "./ownership.ts";

/** The display settings kept under `key`, with the site's defaults. `isSound`: whether a kept set of move sounds is one
 *  of the game's. The board's layers that a browser kept are taken over the defaults, one by one. */
export function displayStore<D extends Display>(key: string, defaults: D, isSound: (s: unknown) => s is D["moveSound"]) {
  /** A kept smallest value of the map's style: a whole number of hundredths from 0 to 100, or else the default. */
  const hundredths = (v: unknown, style: MapStyle) =>
    typeof v === "number" && v >= 0 && v <= 100 ? Math.round(v) : defaults.mapMin[style];

  function load(): D {
    const kept = readLocalJson<Partial<D> & { branchText?: boolean }>(key);
    if (!kept) return structuredClone(defaults);
    return {
      ...structuredClone(defaults),
      judge: kept.judge === "edge" ? "edge" : "turn",
      reviewFor: kept.reviewFor === "blue" || kept.reviewFor === "red" ? kept.reviewFor : "both",
      win: kept.win === "gauge" ? "gauge" : "bar",
      layers: { ...defaults.layers, ...kept.layers },
      areaMap: { ...defaults.areaMap, ...kept.areaMap },
      mapStyle: kept.mapStyle === "change" || kept.mapStyle === "difference" ? kept.mapStyle : "ownership",
      mapMin: { ownership: hundredths(kept.mapMin?.ownership, "ownership"), change: hundredths(kept.mapMin?.change, "change"),
                difference: hundredths(kept.mapMin?.difference, "difference") },
      scoreLine: kept.scoreLine ?? defaults.scoreLine,
      areaLine: kept.areaLine ?? defaults.areaLine,
      lineSteps: kept.lineSteps ?? defaults.lineSteps,
      // Kept before the pills as `branchText`, true for the notation
      branchForm: kept.branchForm === "pills" || kept.branchForm === "dots" || kept.branchForm === "text" ? kept.branchForm
        : kept.branchText ? "text" : defaults.branchForm,
      marks: kept.marks === "text" ? "text" : "badges",
      bookMoves: kept.bookMoves === "book" ? "book" : "label",
      notes: kept.notes ?? defaults.notes,
      notation: kept.notation === "glyphs" || kept.notation === "text" ? kept.notation : defaults.notation,
      previewMoves: kept.previewMoves ?? defaults.previewMoves,
      previewBranches: kept.previewBranches ?? defaults.previewBranches,
      sound: kept.sound ?? defaults.sound,
      moveSound: isSound(kept.moveSound) ? kept.moveSound : defaults.moveSound,
      volume: typeof kept.volume === "number" ? Math.min(1, Math.max(0, kept.volume)) : defaults.volume,
      // A game with weak walls has them in its defaults
      ...(defaults.weakWalls ? {
        weakWalls: { ...defaults.weakWalls, ...kept.weakWalls },
        wallForm: WALL_FORMS.find(f => f === kept.wallForm) ?? defaults.wallForm,
      } : {}),
    };
  }

  return { load, save: (d: D) => writeLocal(key, JSON.stringify(d)) };
}
