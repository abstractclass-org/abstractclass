// The test that each site runs on its review display settings (its src/lib/review/display.test.ts), with its own
// defaults and load (its display.ts): a setting that an earlier version kept, before the weak walls' field, loads with
// the walls off. The store's own tests are in display.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Display } from "../game.ts";

/** Adds the test of a site's display settings: `defaults` and `load` are its display.ts's. */
export function testSiteDisplay<D extends Display>(defaults: D, load: () => D) {
  // The browser's localStorage: the one setting that it keeps
  let kept: string | null = null;
  Object.assign(globalThis, { localStorage: { getItem: () => kept } });

  test("a setting kept before the weak walls' field loads with the walls off", () => {
    // Kept as the defaults but its area map, which shows that the setting loaded. JSON leaves out the undefined field
    const areaMap = { review: !defaults.areaMap.review, board: !defaults.areaMap.board };
    kept = JSON.stringify({ ...defaults, areaMap, weakWalls: undefined });
    const loaded = load();
    assert.deepEqual(loaded.areaMap, areaMap);
    assert.deepEqual(loaded.weakWalls, { review: false, board: false });
  });
}
