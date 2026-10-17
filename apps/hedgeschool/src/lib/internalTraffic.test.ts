// Checks the flag that marks this browser's visits as internal traffic (design 17): the address's `internal`
// parameter sets it, removes it or leaves it, and always leaves the address. Run: npm test.
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { isInternal, takeInternal } from "./internalTraffic.ts";

const site = "https://hedgeschool.abstractclass.org";

// The browser's localStorage, which Node lacks.
const kept = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (key: string) => kept.get(key) ?? null,
  setItem: (key: string, value: string) => void kept.set(key, value),
  removeItem: (key: string) => void kept.delete(key),
};
beforeEach(() => kept.clear());

test("?internal=on sets the flag, and the address loses the parameter alone", () => {
  assert.equal(takeInternal(`${site}/review?internal=on&game=abc#at=4`), `${site}/review?game=abc#at=4`);
  assert.equal(isInternal(), true);
});

test("?internal=off removes the flag", () => {
  takeInternal(`${site}/?internal=on`);
  assert.equal(takeInternal(`${site}/practice?internal=off`), `${site}/practice`);
  assert.equal(isInternal(), false);
});

test("an address without the parameter stays as it is, and so does the flag", () => {
  assert.equal(takeInternal(`${site}/review?game=abc`), null);
  assert.equal(isInternal(), false);
  takeInternal(`${site}/?internal=on`);
  assert.equal(takeInternal(`${site}/analysis#internal=off`), null);
  assert.equal(isInternal(), true);
});

test("any other value leaves the flag as it was, and the address loses the parameter", () => {
  for (const was of [false, true]) {
    takeInternal(`${site}/?internal=${was ? "on" : "off"}`);
    for (const query of ["?internal=yes", "?internal=ON", "?internal=", "?internal"]) {
      assert.equal(takeInternal(`${site}/about${query}`), `${site}/about`, query);
      assert.equal(isInternal(), was, query);
    }
  }
});
