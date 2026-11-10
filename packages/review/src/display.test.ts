// The display settings kept in the browser (display.ts): a setting that an earlier version kept, before the weak
// walls' field, loads with the walls off and keeps its own values. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Display } from "./game.ts";

// The browser's localStorage, which the store reads
const kept = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => kept.get(k) ?? null,
    setItem: (k: string, v: string) => void kept.set(k, v),
    removeItem: (k: string) => void kept.delete(k),
  },
});
const { displayStore } = await import("./display.ts");

// Each site's defaults, as its src/lib/review/display.ts gives them: a package's test cannot import a site (design 29,
// item 1). Both keep the weak walls off on both pages. Hedge School's board has three more layers, and its sounds.
type HedgeSchoolDisplay = Display & { layers: { regions: boolean; protected: boolean; coordinates: boolean } };
const shared = {
  judge: "turn", reviewFor: "both", win: "bar", areaMap: { review: false, board: true }, mapStyle: "ownership",
  mapMin: { ownership: 5, change: 5, difference: 5 }, weakWalls: { review: false, board: false }, scoreLine: true,
  areaLine: true, lineSteps: true, branchForm: "pills", marks: "badges", bookMoves: "label", notes: true,
  previewMoves: true, previewBranches: true, volume: 0.4,
} as const;
const hedgeSchool: HedgeSchoolDisplay = {
  ...shared, layers: { regions: true, protected: true, candidates: true, marks: true, coordinates: true },
  sound: true, moveSound: "button",
};
const cyanotype: Display = {
  ...shared, layers: { candidates: true, marks: true }, notation: "glyphs", sound: false, moveSound: "none",
};
const sites: { site: string; key: string; defaults: Display; sounds: string[] }[] = [
  { site: "Hedge School", key: "test:review-display:hedgeschool", defaults: hedgeSchool, sounds: ["button", "pencil"] },
  { site: "Cyanotype", key: "test:review-display:cyanotype", defaults: cyanotype, sounds: ["none"] },
];

for (const { site, key, defaults, sounds } of sites) {
  const store = displayStore(key, defaults, (s): s is string => typeof s === "string" && sounds.includes(s));

  test(`${site}: a setting kept before the weak walls' field loads with the walls off`, () => {
    // An earlier version kept every field but weakWalls, some of them changed from the defaults
    const changed: Display = { ...defaults, areaMap: { review: true, board: false }, sound: !defaults.sound };
    const earlier: Partial<Display> = { ...changed };
    delete earlier.weakWalls;
    kept.set(key, JSON.stringify(earlier));
    const loaded = store.load();
    assert.deepEqual(loaded.weakWalls, { review: false, board: false });
    // The rest as kept. The store gives the notation's field, unset where the site has none (Hedge School)
    assert.deepEqual(loaded, { ...changed, notation: changed.notation });
  });

  test(`${site}: a setting kept with the weak walls keeps them`, () => {
    kept.set(key, JSON.stringify({ ...defaults, weakWalls: { review: true, board: false } }));
    assert.deepEqual(store.load().weakWalls, { review: true, board: false });
  });
}
