// The review's display settings (display.ts), by the sites' test (@abstractclass/review/testing/display.ts), and the
// move sounds of a setting kept before Cyanotype had them. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { testSiteDisplay } from "@abstractclass/review/testing/display.ts";
import { DEFAULT_DISPLAY, loadDisplay } from "./display.ts";

testSiteDisplay(DEFAULT_DISPLAY, loadDisplay);

/** The settings loaded from what the browser kept. */
function loadKept(kept: object) {
  Object.assign(globalThis, { localStorage: { getItem: () => JSON.stringify(kept) } });
  return loadDisplay();
}

test("a setting kept before the move sounds loads with the sounds on, with the button", () => {
  const loaded = loadKept({ ...DEFAULT_DISPLAY, sound: false, moveSound: "none", judge: "edge" });
  assert.equal(loaded.sound, true);
  assert.equal(loaded.moveSound, "button");
  assert.equal(loaded.judge, "edge"); // the other settings stay as kept
});

test("the player's own choice of no sounds stays", () => {
  const loaded = loadKept({ ...DEFAULT_DISPLAY, sound: false, moveSound: "pencil" });
  assert.equal(loaded.sound, false);
  assert.equal(loaded.moveSound, "pencil");
});
