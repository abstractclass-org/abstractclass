import { test } from "node:test";
import assert from "node:assert/strict";
import { STAR, STRIPES, stripes } from "./cellMarks.ts";
import { hexPath } from "./hex.ts";

// The marks' sizes are design 33's ("The cells' marks"), for a hex of radius 1: a change here changes the design.

/** The closed shapes of a path of lines (M…L…Z), each as its points: "x,y" (hexPath) or "x y" (the marks). */
const shapes = (d: string) =>
  d.split("Z").filter(Boolean).map(s => s.slice(1).split("L").map(p => p.split(/[ ,]/).map(Number)));
const near = (a: number, b: number) => Math.abs(a - b) < 0.002;
/** The corners of the board's hex of radius r round (0, 0), clockwise on the screen from the top one. */
const corners = (r: number) => shapes(hexPath(0, 0, r))[0];

test("the star: six points 0.64 towards the hex's corners, notches at 0.64 / √3 (two equilateral triangles)", () => {
  const star = shapes(STAR)[0];
  assert.equal(star.length, 12);
  corners(1).forEach(([cx, cy], i) => {
    const [x, y] = star[2 * i];
    assert.ok(near(x, 0.64 * cx) && near(y, 0.64 * cy), `point ${i} is at ${x},${y}`);
    assert.ok(near(Math.hypot(...star[2 * i + 1]), 0.64 / Math.sqrt(3)), `notch ${i} is at ${star[2 * i + 1]}`);
  });
});

test("the stripes: three bands 0.17 wide at 45°, rising to the right, 0.38 apart, in the hex of radius 0.76", () => {
  const hex = corners(0.76);
  // On the inner side of each of the hex's sides, or on it: the hex is convex, its corners clockwise on the screen.
  const inside = ([x, y]: number[]) => hex.every(([ax, ay], i) => {
    const [bx, by] = hex[(i + 1) % 6];
    return (bx - ax) * (y - ay) - (by - ay) * (x - ax) >= -0.002;
  });
  const bands = shapes(STRIPES);
  assert.equal(bands.length, 3);
  bands.forEach((band, i) => {
    // x + y is constant along a band (the screen's y runs down, so the band rises to the right): its points run from
    // half its width on one side of its middle line to half its width on the other.
    const across = band.map(([x, y]) => (x + y) * Math.SQRT1_2 - 0.38 * (i - 1));
    assert.ok(near(Math.min(...across), -0.085) && near(Math.max(...across), 0.085), `band ${i} spans ${across}`);
    assert.ok(band.every(inside), `band ${i} leaves the hex`);
  });
});

test("a band that misses the hex draws nothing", () => {
  assert.equal(stripes(0.5, 0.1, [2]), "");
});
