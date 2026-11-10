// The display settings kept in the browser (display.ts): a setting that an earlier version kept, before the weak
// walls' field, takes the defaults' weak walls and keeps its own values. Each site tests its own defaults with
// testing/display.ts. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { displayStore } from "./display.ts";
import type { Display } from "./game.ts";

// The browser's localStorage, which the store reads
const kept = new Map<string, string>();
Object.assign(globalThis, { localStorage: { getItem: (k: string) => kept.get(k) ?? null } });

// A test's defaults, not a site's. The weak walls differ on the two pages, so that the test tells the defaults' value
// from a fixed one
const KEY = "test:review-display";
const DEFAULTS: Display = {
  judge: "turn", reviewFor: "both", win: "bar", layers: { candidates: true, marks: true },
  areaMap: { review: false, board: true }, mapStyle: "ownership", mapMin: { ownership: 5, change: 5, difference: 5 },
  weakWalls: { review: false, board: true }, scoreLine: true, areaLine: true, lineSteps: true, branchForm: "pills",
  marks: "badges", bookMoves: "label", notes: true, notation: "glyphs", previewMoves: true, previewBranches: true,
  sound: false, moveSound: "none", volume: 0.4,
};
const store = displayStore(KEY, DEFAULTS, (s): s is string => s === "none");

test("a setting kept before the weak walls' field takes the defaults' walls and keeps its own values", () => {
  const changed: Display = { ...DEFAULTS, areaMap: { review: true, board: false }, sound: true };
  kept.set(KEY, JSON.stringify({ ...changed, weakWalls: undefined })); // JSON leaves out the undefined field
  assert.deepEqual(store.load(), changed);
});

test("a setting kept with the weak walls keeps them", () => {
  kept.set(KEY, JSON.stringify({ ...DEFAULTS, weakWalls: { review: true, board: false } }));
  assert.deepEqual(store.load().weakWalls, { review: true, board: false });
});
