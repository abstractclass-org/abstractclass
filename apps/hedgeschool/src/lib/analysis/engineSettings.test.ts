// Checks the networks that the settings offer, and the settings that a game reviews with (settingsFor): its own while
// the site ships their network, on the menu or off it, else the browser's. The review page, the Review tab's Export and
// the annotated record from the store take them from there. And the custom depth per move's range (inSteps), and the
// cache's budgets for the settings' depths (cache.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BUDGETS } from "./cache.ts";
import { CUSTOM_REVIEW, DEPTHS, NETWORKS, REVIEW_PRESETS, defaultEngine, inSteps, loadEngine, networkName, saveEngine,
         settingsFor } from "./engineSettings.ts";
import { LABEL_VISITS, momentVisits } from "./game.svelte.ts";

// The browser's local storage, in memory: Node has none.
const stored = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => stored.get(k) ?? null, setItem: (k: string, v: string) => void stored.set(k, v),
  removeItem: (k: string) => void stored.delete(k),
} as Storage;

const browser = { ...defaultEngine(), network: NETWORKS[0].id, review: "lite" as const };
const browserSettings = { network: NETWORKS[0].id, visits: REVIEW_PRESETS.lite };

test("the settings offer HedgeFund 0.2 Lite and HedgeFund 0.2, with 0.2 Lite the default", () => {
  assert.deepEqual(NETWORKS.map(n => networkName(n.id)), ["HedgeFund 0.2 Lite", "HedgeFund 0.2"]);
  assert.equal(networkName(defaultEngine().network), "HedgeFund 0.2 Lite");
});

test("the browser's settings kept with a network off the menu take the default, and keep a network on it", () => {
  saveEngine({ ...defaultEngine(), network: "b10c128-s66625408-d13350730" }); // HedgeFund 0.1 Lite
  assert.equal(networkName(loadEngine().network), "HedgeFund 0.2 Lite");
  saveEngine({ ...defaultEngine(), network: "b15c192-s90436608-d18027147" });
  assert.equal(networkName(loadEngine().network), "HedgeFund 0.2");
});

test("a game reviews with its own settings while the site ships their network", () => {
  const own = { network: NETWORKS[1].id, visits: REVIEW_PRESETS.standard };
  assert.deepEqual(settingsFor(own, browser), own);
});

test("a game keeps a network that the site ships off the menu: HedgeFund 0.1 Lite", () => {
  const own = { network: "b10c128-s66625408-d13350730", visits: REVIEW_PRESETS.lite };
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
