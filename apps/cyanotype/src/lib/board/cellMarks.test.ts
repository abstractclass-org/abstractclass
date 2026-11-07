import { test } from "node:test";
import assert from "node:assert/strict";
import { sixPointStar, stripes } from "./cellMarks.ts";
import { hexPath } from "./hex.ts";

/** The points of a closed path of straight lines (M…L…Z), as numbers. */
const points = (d: string) => d.slice(1, -1).split("L").map(p => p.split(" ").map(Number));
/** The closed paths of a path. */
const shapes = (d: string) => d.split("M").filter(Boolean).map(s => points(`M${s}`));
const near = (a: number, b: number) => Math.abs(a - b) < 0.002;

test("the star's six points lie on the lines from the centre to the hex's corners", () => {
  const corners = hexPath(0, 0).slice(1, -1).split("L").map(c => c.split(",").map(Number));
  const star = points(sixPointStar(0.64));
  assert.equal(star.length, 12);
  for (let i = 0; i < 6; i++) {
    const [x, y] = star[2 * i], [cx, cy] = corners[i];
    assert.ok(near(Math.hypot(x, y), 0.64), `point ${i} is ${Math.hypot(x, y)} from the centre`);
    assert.ok(near(x * cy - y * cx, 0) && x * cx + y * cy > 0, `point ${i} does not face corner ${i}`);
  }
});

test("the star's notches make two equilateral triangles: each notch at r / √3", () => {
  const star = points(sixPointStar(0.6));
  for (let i = 1; i < 12; i += 2) assert.ok(near(Math.hypot(...star[i]), 0.6 / Math.sqrt(3)));
});

test("the stripes are bands at 45°, rising to the right, inside the hex", () => {
  const bands = shapes(stripes(0.76, 0.17, [-0.38, 0, 0.38]));
  assert.equal(bands.length, 3);
  bands.forEach((band, i) => {
    const middle = [-0.38, 0, 0.38][i];
    for (const [x, y] of band) {
      // x + y is constant along a band (the screen's y runs down, so the band rises to the right): within half its width.
      assert.ok(Math.abs((x + y) * Math.SQRT1_2 - middle) <= 0.085 + 0.002, `band ${i} has the point ${x},${y}`);
      // inside the hex of radius 0.76: no farther from the centre than its corners.
      assert.ok(Math.hypot(x, y) <= 0.76 + 0.002);
    }
  });
});

test("a band that misses the hex draws nothing", () => {
  assert.equal(stripes(0.5, 0.1, [2]), "");
});
