// Checks the settings that a game reviews with (settingsFor): its own while the site ships their network, else the
// browser's. The review page, the Review tab's Export and the annotated record from the store take them from there.
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { NETWORKS, REVIEW_PRESETS, defaultEngine, settingsFor } from "./engineSettings.ts";

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
