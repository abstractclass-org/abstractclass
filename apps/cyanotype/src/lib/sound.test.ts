import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MOVE_SOUNDS } from "@abstractclass/site/sound.ts";
import type { BoardMove } from "./board/position.ts";
import { captures } from "./sound.ts";

const placement = (captured: number): BoardMove => ({
  type: "place", player: 0, blueprint: 2, at: [-3, 1], footprint: [{ hex: [-3, 1], kind: "star" }],
  captured: Array.from({ length: captured }, (_, i) => ({ hex: [-2 + i, 1], owner: 1, kind: "plain" })),
});

test("a placement that captures plays the removal's sound", () => {
  assert.equal(captures(placement(1)), true);
  assert.equal(captures(placement(3)), true);
});

test("a placement that captures nothing, an edit and a pass play the move's sound", () => {
  assert.equal(captures(placement(0)), false);
  assert.equal(captures({ type: "edit", player: 1, kind: "wall", from: { blueprint: 1, hex: [0, 0] },
                         to: { blueprint: 3, hex: [1, 0] } }), false);
  assert.equal(captures({ type: "pass", player: 0 }), false);
  assert.equal(captures(undefined), false);
});

test("Cyanotype ships Hedge School's clips, byte for byte", () => {
  const clip = (site: string, url: string) => readFileSync(new URL(`../../../${site}/static${url}`, import.meta.url));
  for (const set of Object.values(MOVE_SOUNDS))
    for (const { url } of Object.values(set)) assert.ok(clip("cyanotype", url).equals(clip("hedgeschool", url)), url);
});
