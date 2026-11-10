// Checks a game's own network and depth (settings.ts, ownSettingsOf, withOwn and changeOwn) for a site with two
// networks on its menus and an earlier one that it still ships, as Hedge School's lock keeps them. Hedge School's
// engineSettings.test.ts checks them with its own networks. And the Analysis board's own network (an analysis file's,
// Hedge School's design 21). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { REVIEW_PRESETS, boardChange, changeOwn, ownSettingsOf, withBoardNetwork, withOwn, type EngineSettings } from "./settings.ts";

const MENU = ["lite", "full"], EARLIER = "earlier";
const { ownSettings, settingsFor } = ownSettingsOf({ offers: id => MENU.includes(id ?? ""),
                                                     ships: id => MENU.includes(id) || id === EARLIER });
const browser: EngineSettings = { on: true, visits: 1024, seconds: 30, review: "lite", customReview: 512, network: "lite",
                                  workers: 2, gpu: "off" };
const mark = (network: string, visits: number) => ({ module: "m", model: "n", network, visits, at: "2026-11-07" });

test("a game reviews with the settings it came with, while the site ships their network, else with the browser's", () => {
  const own = { network: "full", visits: 2048 };
  assert.deepEqual(settingsFor({ settings: own }, browser), own);
  assert.deepEqual(ownSettings({ settings: own }), { settings: own, from: "stored" });
  assert.deepEqual(settingsFor(undefined, browser), { network: "lite", visits: REVIEW_PRESETS.lite });
  assert.equal(ownSettings({ settings: { network: "gone", visits: 512 } }), null); // a network that the site no longer ships
});

test("a game whose last review's network left the menus keeps that review's network and depth", () => {
  assert.deepEqual(ownSettings({ reviewed: mark(EARLIER, 1024) }), { settings: { network: EARLIER, visits: 1024 }, from: "mark" });
  assert.equal(ownSettings({ reviewed: mark("full", 1024) }), null); // a network of the menu: the browser's settings
});

test("the settings show a game's own network and depth, and a change changes the game's", () => {
  const own = ownSettings({ settings: { network: "full", visits: REVIEW_PRESETS.standard } })!;
  assert.deepEqual(withOwn(browser, own), { ...browser, network: "full", review: "standard" });
  const custom = ownSettings({ settings: { network: "full", visits: 4096 } })!;
  assert.deepEqual(withOwn(browser, custom), { ...browser, network: "full", review: "custom", customReview: 4096 });
  const changed = changeOwn(own, browser, { review: "lite" });
  assert.deepEqual(changed.settings, { network: "full", visits: REVIEW_PRESETS.lite });
  assert.deepEqual(withOwn(browser, changed), { ...browser, network: "full", review: "lite", customReview: 512 });
});

test("the Analysis board searches with its own network, and a network chosen there leaves the browser's for every other page", () => {
  assert.deepEqual(withBoardNetwork(browser, "full"), { ...browser, network: "full" });
  assert.equal(withBoardNetwork(browser, null), browser);
  // With its own network: a network chosen is the board's, and the rest is the browser's
  assert.deepEqual(boardChange("full", { network: "lite" }), { network: "lite", browser: {} });
  assert.deepEqual(boardChange("full", { visits: 2048 }), { network: "full", browser: { visits: 2048 } });
  // Without one: all of it is the browser's
  assert.deepEqual(boardChange(null, { network: "full" }), { network: null, browser: { network: "full" } });
});
