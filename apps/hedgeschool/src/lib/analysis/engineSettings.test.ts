// Checks the networks that the settings offer, and the settings that a game reviews with (settingsFor): its own while
// the site ships their network, on the menu or off it (those it came with, else its last review's when that review's
// network left the menus), else the browser's. The review page, the Review tab's Export and the annotated record from
// the store take them from there. How the settings show and change a game's own settings (withOwn, changeOwn). And the
// custom depth per move's range (inSteps), and the cache's budgets for the settings' depths (cache.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BUDGETS, LABEL_VISITS } from "@abstractclass/analysis/cache.ts";
import { CUSTOM_REVIEW, DEPTHS, NETWORKS, REVIEW_PRESETS, changeOwn, defaultEngine, inSteps, loadEngine, networkName,
         ownSettings, saveEngine, settingsFor, withOwn } from "./engineSettings.ts";

// The browser's local storage, in memory: Node has none.
const stored = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => stored.get(k) ?? null, setItem: (k: string, v: string) => void stored.set(k, v),
  removeItem: (k: string) => void stored.delete(k),
} as Storage;

const browser = { ...defaultEngine(), network: NETWORKS[0].id, review: "lite" as const };
const browserSettings = { network: NETWORKS[0].id, visits: REVIEW_PRESETS.lite };
const EARLIER = "b10c128-s66625408-d13350730"; // HedgeFund 0.1 Lite, which the site ships off the menus

test("the settings offer HedgeFund 0.2 Lite and HedgeFund 0.2, with 0.2 Lite the default", () => {
  assert.deepEqual(NETWORKS.map(n => networkName(n.id)), ["HedgeFund 0.2 Lite", "HedgeFund 0.2"]);
  assert.equal(networkName(defaultEngine().network), "HedgeFund 0.2 Lite");
});

test("the browser's settings kept with a network off the menu take the default, and keep a network on it", () => {
  saveEngine({ ...defaultEngine(), network: EARLIER });
  assert.equal(networkName(loadEngine().network), "HedgeFund 0.2 Lite");
  saveEngine({ ...defaultEngine(), network: "b15c192-s90436608-d18027147" });
  assert.equal(networkName(loadEngine().network), "HedgeFund 0.2");
});

test("a game reviews with its own settings while the site ships their network", () => {
  const own = { network: NETWORKS[1].id, visits: REVIEW_PRESETS.standard };
  assert.deepEqual(settingsFor({ settings: own }, browser), own);
});

test("a game keeps a network that the site ships off the menu: HedgeFund 0.1 Lite", () => {
  const own = { network: EARLIER, visits: REVIEW_PRESETS.lite };
  assert.deepEqual(settingsFor({ settings: own }, browser), own);
});

test("a game without its own settings, or with a network the site no longer ships, reviews with the browser's", () => {
  assert.deepEqual(settingsFor(undefined, browser), browserSettings);
  assert.deepEqual(settingsFor({}, browser), browserSettings);
  assert.deepEqual(settingsFor({ settings: { network: "b6c96-s1000-d1", visits: 2048 } }, browser), browserSettings);
});

// The mark of a game's last review (game/store.ts, ReviewMark).
const mark = (network: string, visits: number) => ({ module: "m", model: "n", network, visits, at: "2026-10-17T12:00:00Z" });

test("a game reviewed with the browser's settings on a network off the menus keeps that review's network and depth", () => {
  const settings = { network: EARLIER, visits: REVIEW_PRESETS.standard };
  assert.deepEqual(ownSettings({ reviewed: mark(EARLIER, REVIEW_PRESETS.standard) }), { settings, from: "mark" });
});

test("a game's last review on a network of the menus, or on one the site no longer ships, gives it no own settings", () => {
  assert.deepEqual(settingsFor({ reviewed: mark(NETWORKS[1].id, REVIEW_PRESETS.standard) }, browser), browserSettings);
  assert.equal(ownSettings({ reviewed: mark("b6c96-s1000-d1", 2048) }), null);
});

test("the settings a game came with count before its last review's", () => {
  const settings = { network: NETWORKS[1].id, visits: REVIEW_PRESETS.lite };
  assert.deepEqual(ownSettings({ settings, reviewed: mark(EARLIER, REVIEW_PRESETS.standard) }), { settings, from: "stored" });
});

test("on a game that keeps its last review's 0.1 Lite, Custom at the browser's 512 stays chosen, with its box", () => {
  const own = ownSettings({ reviewed: mark(EARLIER, REVIEW_PRESETS.lite) })!;
  assert.equal(withOwn(browser, own).review, "lite");
  assert.equal(browser.customReview, REVIEW_PRESETS.lite);
  const custom = changeOwn(own, browser, { review: "custom" });
  assert.deepEqual(custom.settings, { network: EARLIER, visits: 512 });
  assert.deepEqual(withOwn(browser, custom), { ...browser, network: EARLIER, review: "custom", customReview: 512 });
});

test("on a game from a review file, a custom depth at Standard's visits stays Custom, and the game keeps it", () => {
  const own = ownSettings({ settings: { network: EARLIER, visits: REVIEW_PRESETS.lite } })!;
  const custom = changeOwn(own, { ...browser, customReview: 2048 }, { review: "custom" });
  const standard = changeOwn(custom, browser, { customReview: REVIEW_PRESETS.standard });
  assert.deepEqual(standard.settings, { network: EARLIER, visits: 1024 });
  assert.deepEqual(withOwn(browser, standard), { ...browser, network: EARLIER, review: "custom", customReview: 1024 });
});

test("a custom depth per move is any whole number from 256 to 16,384 visits, as the Depth's", () => {
  for (const visits of [256, 3000, 8192, 16384]) assert.ok(inSteps(CUSTOM_REVIEW, visits), `${visits}`);
  for (const visits of [255, 16385, 1000.5]) assert.ok(!inSteps(CUSTOM_REVIEW, visits), `${visits}`);
});

test("the cache's budgets hold every depth of the settings, and twice each review depth, where older reviews stored results", () => {
  const reviews = [...CUSTOM_REVIEW, ...Object.values(REVIEW_PRESETS)];
  for (const visits of [LABEL_VISITS, ...DEPTHS, ...reviews, ...reviews.map(v => 2 * v)]) {
    assert.ok(BUDGETS.includes(visits), `${visits}`);
  }
});
