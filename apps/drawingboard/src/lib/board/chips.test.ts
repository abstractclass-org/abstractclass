import { test } from "node:test";
import assert from "node:assert/strict";
import { chipRow } from "./chips.ts";

// A hand's chips: 16 pixels with 2 between (Hand.svelte), in the room that a blueprint's panel leaves beside its number
// (its width less 3 pixels at each side, the number's 16 and 2).
const room = (panel: number) => panel - 2 * 3 - 16 - 2;
const ranks = [1, 2, 3, 4, 5]; // five candidates on one blueprint

test("five candidates on one blueprint: the best that fit, then how many more", () => {
  assert.deepEqual(chipRow(ranks, room(72), 16, 2), { shown: [1], more: 4 }); // the panel's smallest hand, 216 px
  assert.deepEqual(chipRow(ranks, room(104), 16, 2), { shown: [1, 2, 3], more: 2 }); // its first size, 312 px
  assert.deepEqual(chipRow(ranks, room(150), 16, 2), { shown: ranks, more: 0 });
});

test("a row that holds every chip shows them all, and the chip of the others fits always", () => {
  assert.deepEqual(chipRow([1, 2], room(72), 16, 2), { shown: [1, 2], more: 0 });
  assert.deepEqual(chipRow(ranks, 10, 16, 2), { shown: [], more: 5 });
  assert.deepEqual(chipRow([], 10, 16, 2), { shown: [], more: 0 });
});

test("the chip of the others takes the room of its text", () => {
  const many = Array.from({ length: 27 }, (_, i) => i + 1), wide = (n: number) => 7 + 5.5 * `+${n}`.length; // "+26": 23.5
  assert.deepEqual(chipRow(many, room(72), 16, 2, wide), { shown: [1], more: 26 }); // 18 + 23.5 <= 48
  assert.deepEqual(chipRow(many, room(104), 16, 2, wide), { shown: [1, 2, 3], more: 24 }); // 54 + 23.5 <= 80
});
