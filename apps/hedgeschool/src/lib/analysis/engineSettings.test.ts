// Checks the settings that a game reviews with (settingsFor): its own while the site ships their network, else the
// browser's. The review page, the Review tab's Export and the annotated record from the store take them from there.
// And the custom depth per move that the browser keeps (loadEngine). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CUSTOM_REVIEW, NETWORKS, REVIEW_PRESETS, defaultEngine, loadEngine, nearestStep, saveEngine, settingsFor } from "./engineSettings.ts";

// The browser's localStorage, which Node lacks.
const kept = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (key: string) => kept.get(key) ?? null,
  setItem: (key: string, value: string) => void kept.set(key, value),
  removeItem: (key: string) => void kept.delete(key),
};

const browser = { ...defaultEngine(), network: NETWORKS[0].id, review: "lite" as const };
const browserSettings = { network: NETWORKS[0].id, visits: REVIEW_PRESETS.lite };

test("a game reviews with its own settings while the site ships their network", () => {
  const own = { network: NETWORKS[1].id, visits: REVIEW_PRESETS.standard };
  assert.deepEqual(settingsFor(own, browser), own);
});

test("a game without its own settings, or with a network the site no longer ships, reviews with the browser's", () => {
  assert.deepEqual(settingsFor(undefined, browser), browserSettings);
  assert.deepEqual(settingsFor(null, browser), browserSettings);
  assert.deepEqual(settingsFor({ network: "b6c96-s1000-d1", visits: 2048 }, browser), browserSettings);
});

test("a kept custom depth per move is any whole number from 256 to 16,384 visits, as the Depth's", () => {
  const keptCustom = (customReview: number) => {
    saveEngine({ ...defaultEngine(), review: "custom", customReview });
    return loadEngine().customReview;
  };
  for (const visits of [256, 3000, 8192, 16384]) assert.equal(keptCustom(visits), visits);
  for (const visits of [255, 16385, 1000.5]) assert.equal(keptCustom(visits), defaultEngine().customReview);
});

test("the custom depth's slider shows a typed number at the nearest doubling, up to 16,384", () => {
  assert.equal(CUSTOM_REVIEW[nearestStep(CUSTOM_REVIEW, 3000)], 4096);
  assert.equal(CUSTOM_REVIEW[nearestStep(CUSTOM_REVIEW, 12000)], 16384);
});
