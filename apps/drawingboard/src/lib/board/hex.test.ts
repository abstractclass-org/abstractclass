import { test } from "node:test";
import assert from "node:assert/strict";
import { boxOf, center, firstHex, hexAt, hexKey, hexPath, inFrame, NEIGHBOURS, outlinePath, parseHex, type Hex } from "./hex.ts";
import { stamp } from "./position.ts";

const near = (a: readonly number[], b: readonly number[]) =>
  assert.ok(a.every((v, i) => Math.abs(v - b[i]) < 1e-9), `${a} is not ${b}`);

test("a hex's centre is strategyjam.org's: x = √3 (q + r / 2), y = 1.5 r, r down the screen", () => {
  near(center([0, 0]), [0, 0]);
  near(center([1, 0]), [Math.sqrt(3), 0]);
  near(center([0, 1]), [Math.sqrt(3) / 2, 1.5]);
  near(center([-6, 2]), [Math.sqrt(3) * -5, 3]);
});

test("the hex at a point is the one whose centre is nearest", () => {
  for (const h of [[0, 0], [3, -2], [-6, 0], [-10, 7], [12, -11]] as Hex[]) {
    const [x, y] = center(h);
    assert.deepEqual(hexAt(x, y), h);
    assert.deepEqual(hexAt(x + 0.8, y - 0.1), h); // inside the hex: its sides are √3/2 from its centre
    assert.deepEqual(hexAt(x, y + 0.95), h); // its lower corner is 1 below its centre
  }
  assert.deepEqual(hexAt(0.9, 0), [1, 0]); // past the side halfway to the next centre (√3/2 = 0.866)
  assert.equal(hexKey(hexAt(-0.1, -0.1)), "0,0"); // no "-0"
});

test("keys read and write strategyjam.org's form", () => {
  assert.deepEqual(parseHex("-6,-1"), [-6, -1]);
  assert.equal(hexKey([-6, -1]), "-6,-1");
  for (const bad of ["", "1", "1,", "1, 2", "a,b", "1.5,2", "1,2,3"]) assert.throws(() => parseHex(bad), /not a hex/);
});

test("a hex's outline has six corners at the radius, the first at the top", () => {
  const corners = hexPath(0, 0).slice(1, -1).split("L").map(c => c.split(",").map(Number));
  assert.equal(corners.length, 6);
  near(corners[0], [0, -1]);
  for (const [x, y] of corners) assert.ok(Math.abs(Math.hypot(x, y) - 1) < 1e-3);
});

test("a blueprint's first cell is the least r, then the least q, and its frame puts it at 0,0", () => {
  const ring: Hex[] = [[-5, 0], [-5, -1], [-6, -1], [-7, 0], [-7, 1], [-6, 1], [-6, 0]];
  assert.deepEqual(firstHex(ring), [-6, -1]);
  assert.deepEqual(inFrame(ring).map(hexKey).sort(), ["-1,1", "-1,2", "0,0", "0,1", "0,2", "1,0", "1,1"]);
  assert.equal(firstHex([]), null);
  assert.deepEqual(inFrame([]), []);
});

test("a placement stamps the blueprint with its first cell on the hex", () => {
  const cells = stamp({ "0,0": "plain", "0,1": "star", "-1,1": "wall" }, [-6, -1]);
  assert.deepEqual(cells, [{ hex: [-6, -1], kind: "plain" }, { hex: [-6, 0], kind: "star" }, { hex: [-7, 0], kind: "wall" }]);
});

test("a box holds the hexes' shapes", () => {
  assert.equal(boxOf([]), null);
  const b = boxOf([[0, 0], [1, 1]])!;
  near([b.x0, b.y0, b.x1, b.y1], [-Math.sqrt(3) / 2, -1, 1.5 * Math.sqrt(3) + Math.sqrt(3) / 2, 2.5]);
});

test("a group's outline is the sides that no other hex of the group shares", () => {
  const sides = (hexes: Hex[]) => outlinePath(hexes).split("M").length - 1;
  assert.equal(sides([[0, 0]]), 6);
  assert.equal(sides([[0, 0], [1, 0]]), 10);
  assert.equal(sides([[0, 0], ...NEIGHBOURS]), 18); // a star with its ring
  // Side i joins corners i and i + 1, and faces neighbour i: its middle is halfway to that neighbour's centre.
  const corners = hexPath(0, 0).slice(1, -1).split("L").map(c => c.split(",").map(Number));
  NEIGHBOURS.forEach((n, i) => {
    const [a, b] = [corners[i], corners[(i + 1) % 6]];
    const [x, y] = center(n).map(v => v / 2);
    assert.ok(Math.hypot((a[0] + b[0]) / 2 - x, (a[1] + b[1]) / 2 - y) < 1e-3, `side ${i}`); // a path rounds to 0.001
  });
});
