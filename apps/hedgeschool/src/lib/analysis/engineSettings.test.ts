// Checks the settings that a game reviews with (settingsFor): its own while the site ships their network, else the
// browser's. The review page, the Review tab's Export and the annotated record from the store take them from there.
// And the custom depth per move's range (inSteps), and the cache's budgets for the settings' depths (cache.ts).
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BUDGETS } from "./cache.ts";
import { CUSTOM_REVIEW, DEPTHS, NETWORKS, REVIEW_PRESETS, defaultEngine, inSteps, settingsFor } from "./engineSettings.ts";
import { LABEL_VISITS, momentVisits } from "./game.svelte.ts";

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

test("a custom depth per move is any whole number from 256 to 16,384 visits, as the Depth's", () => {
  for (const visits of [256, 3000, 8192, 16384]) assert.ok(inSteps(CUSTOM_REVIEW, visits), `${visits}`);
  for (const visits of [255, 16385, 1000.5]) assert.ok(!inSteps(CUSTOM_REVIEW, visits), `${visits}`);
});

test("the cache's budgets hold every depth of the settings, and twice each review depth, for the key moments", () => {
  const reviews = [...CUSTOM_REVIEW, ...Object.values(REVIEW_PRESETS)];
  for (const visits of [LABEL_VISITS, ...DEPTHS, ...reviews, ...reviews.map(momentVisits)]) {
    assert.ok(BUDGETS.includes(visits), `${visits}`);
  }
});
