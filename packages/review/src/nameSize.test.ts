import { test } from "node:test";
import assert from "node:assert/strict";
import { nameSize } from "./nameSize.ts";

test("a name that fits its cell keeps its full size", () => {
  assert.equal(nameSize(93, 50, 0.65), 1);
  assert.equal(nameSize(93, 93, 0.65), 1);
});

test("a name wider than its cell gets just as small as it must be", () => {
  assert.equal(nameSize(93, 109.2, 0.65), 0.851);
  assert.ok(109.2 * 0.851 <= 93);
});

test("below the least size, a name keeps the least size and is cut", () => {
  assert.equal(nameSize(62, 139.4, 0.65), 0.65);
  assert.ok(139.4 * 0.65 > 62);
});

test("a cell with no width (a hidden tab's) keeps the name's full size", () => {
  assert.equal(nameSize(0, 120, 0.65), 1);
});
