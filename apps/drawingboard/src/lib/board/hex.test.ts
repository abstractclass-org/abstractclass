import { test } from "node:test";
import assert from "node:assert/strict";
import { anchorOf, ARROW, arrowPath, arrowPoints, boxOf, center, fromMiddle, hexAt, hexesAlong, hexKey, hexPath, inFrame,
  outlinePath, parseHex, TOUCHING, type Hex } from "./hex.ts";
import { footprintOf } from "./position.ts";

const near = (a: readonly number[], b: readonly number[]) =>
  assert.ok(a.every((v, i) => Math.abs(v - b[i]) < 1e-9), `${a} is not ${b}`);
/** The corners of the hex round the origin, as its path gives them. */
const corners = () => hexPath(0, 0).slice(1, -1).split("L").map(c => c.split(",").map(Number));

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
  const c = corners();
  assert.equal(c.length, 6);
  near(c[0], [0, -1]);
  for (const [x, y] of c) assert.ok(Math.abs(Math.hypot(x, y) - 1) < 1e-3);
});

test("a blueprint's anchor cell is the least r, then the least q, and its frame puts it at 0,0", () => {
  const ring: Hex[] = [[-5, 0], [-5, -1], [-6, -1], [-7, 0], [-7, 1], [-6, 1], [-6, 0]];
  assert.deepEqual(anchorOf(ring), [-6, -1]);
  assert.deepEqual(inFrame(ring).map(hexKey).sort(), ["-1,1", "-1,2", "0,0", "0,1", "0,2", "1,0", "1,1"]);
  assert.equal(anchorOf([]), null);
  assert.deepEqual(inFrame([]), []);
});

test("a placement's footprint has the blueprint's anchor cell on the anchor hex", () => {
  const cells = footprintOf({ "0,0": "plain", "0,1": "star", "-1,1": "wall" }, [-6, -1]);
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
  assert.equal(sides([[0, 0], ...TOUCHING]), 18); // a star with its ring
  // Side i joins corners i and i + 1, and faces the touching hex i: its middle is halfway to that hex's centre.
  const c = corners();
  TOUCHING.forEach((h, i) => {
    const [a, b] = [c[i], c[(i + 1) % 6]];
    const [x, y] = center(h).map(v => v / 2);
    assert.ok(Math.hypot((a[0] + b[0]) / 2 - x, (a[1] + b[1]) / 2 - y) < 1e-3, `side ${i}`); // a path rounds to 0.001
  });
});

test("hexes from their middle: the nearest the middle of their centres first", () => {
  assert.deepEqual(fromMiddle([[0, 0], [1, 0], [2, 0]])[0], [1, 0]);
  assert.deepEqual(fromMiddle([...TOUCHING, [0, 0]])[0], [0, 0]); // a star with its ring: the star
  assert.deepEqual(fromMiddle([[5, -2]]), [[5, -2]]);
});

test("a note's arrow runs from a hex's centre to the other's, its tip short of the centre, even between touching hexes", () => {
  for (const [a, b] of [[[0, 0], [1, 0]], [[0, 0], [-1, 1]], [[2, -3], [-4, 5]]] as [Hex, Hex][]) {
    const ps = arrowPoints(a, b), [ax, ay] = center(a), [bx, by] = center(b);
    const d = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / d, uy = (by - ay) / d;
    // Each point as its distance along the line from a's centre, and its offset across it.
    const along = ps.map(([x, y]) => (x - ax) * ux + (y - ay) * uy), across = ps.map(([x, y]) => (y - ay) * ux - (x - ax) * uy);
    assert.equal(ps.length, 7);
    near([along[3], across[3]], [d - ARROW.short, 0]); // the tip, on the line
    near([along[0], along[6]], [0, 0]); // the shaft starts at the centre
    for (let i = 0; i < 3; i++) near([along[i], across[i]], [along[6 - i], -across[6 - i]]); // the two sides mirror
    near([Math.abs(across[0]), Math.abs(across[2])], [ARROW.shaft, ARROW.head]);
    near([along[2]], [d - ARROW.short - ARROW.length]); // the head's base
    assert.ok(along[1] > 0.5, "the shaft shows between touching hexes");
  }
  // As a path: seven corners, rounded as the hexes' paths
  assert.match(arrowPath([0, 0], [-1, 1]), /^M(-?\d+(\.\d+)?,-?\d+(\.\d+)?L){6}-?\d+(\.\d+)?,-?\d+(\.\d+)?Z$/);
  assert.doesNotMatch(arrowPath([0, 0], [0, 1]), /-0[,L]/); // no -0
});

test("a stroke's hexes: each hex that it goes across, in order, each touching the one before", () => {
  // Along a row and along a diagonal, through the hexes' centres
  assert.deepEqual(hexesAlong(center([0, 0]), center([3, 0])), [[0, 0], [1, 0], [2, 0], [3, 0]]);
  assert.deepEqual(hexesAlong(center([2, -1]), center([2, 2])), [[2, -1], [2, 0], [2, 1], [2, 2]]);
  assert.deepEqual(hexesAlong([0.1, 0.2], [0.3, -0.1]), [[0, 0]]); // inside one hex
  // Any stroke: no hex missed between two that it goes across
  const hs = hexesAlong([0.3, 0.2], [7.1, -4.4]);
  assert.deepEqual(hs[0], [0, 0]);
  assert.deepEqual(hs.at(-1), hexAt(7.1, -4.4));
  for (let i = 1; i < hs.length; i++) {
    const dq = hs[i][0] - hs[i - 1][0], dr = hs[i][1] - hs[i - 1][1];
    assert.equal((Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2, 1, `${hexKey(hs[i - 1])} to ${hexKey(hs[i])}`);
  }
  assert.equal(new Set(hs.map(hexKey)).size, hs.length);
});

/** How far a stroke goes across each hex, by a walk in steps of a thousandth of a radius: each hex's key and length. */
function across([ax, ay]: [number, number], [bx, by]: [number, number]): Map<string, number> {
  const length = Math.hypot(bx - ax, by - ay), n = Math.ceil(length / 1e-3), out = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, k = hexKey(hexAt(ax + (bx - ax) * t, ay + (by - ay) * t));
    out.set(k, (out.get(k) ?? 0) + length / n);
  }
  return out;
}

test("a fast drag's hexes: each hex that it crosses for a tenth of a radius or more, and not a clipped corner", () => {
  // Through the hexes' middles, from a point to one 12 hexes away: every hex between
  assert.deepEqual(hexesAlong(center([-6, 0]), center([6, 0])), Array.from({ length: 13 }, (_, i) => [i - 6, 0]));
  // Past the corners where the rows r = 0 and r = -1 meet, 0.03 above them, from a point to one 30 radii away: the
  // stroke crosses a corner of each hex of the row r = -1 for 0.104 of the radius, and takes each one. A walk 0.12
  // apart or more leaves some out.
  const a: [number, number] = [0.1, -0.53], b: [number, number] = [30.1, -0.53];
  const crossed = across(a, b), corners = [...crossed].filter(([h]) => h.endsWith(",-1"));
  assert.equal(corners.length, 17);
  assert.ok(corners.every(([, length]) => length > 0.1 && length < 0.11));
  assert.deepEqual(hexesAlong(a, b).map(hexKey), [...crossed.keys()]);
  // 0.01 above the corner where the hexes (0, 0), (1, 0) and (1, -1) meet, at (√3 / 2, -0.5), 2 radii long: the
  // stroke crosses (1, -1) for 0.035 of the radius, between two of its points, and leaves it out
  const c = Math.sqrt(3) / 2, from: [number, number] = [c - 1.05, -0.51], to: [number, number] = [c + 0.95, -0.51];
  assert.ok(across(from, to).get("1,-1")! < 0.05);
  assert.deepEqual(hexesAlong(from, to), [[0, 0], [1, 0]]);
});
