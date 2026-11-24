// Checks the board's modules: the position of a TPS, the squares' places and walk, their words and the stacks' drawing.
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyBoard, type Stone } from "../game/tps.ts";
import { FIXTURES } from "./fixtures.ts";
import { BARS, drawStack, FLAT, overhang, pieceShape, raisedLine, STEP } from "./pieces.ts";
import { positionOf } from "./position.ts";
import { placeOf, squareAt, squareByKey, squareName, squareWords, stackLine } from "./squares.ts";

const flats = (text: string): Stone[] => [...text].map(c => ({ player: c === "1" ? 1 : 2, kind: "flat" }));
const SIZES = [3, 4, 5, 6, 7, 8];

test("a TPS gives each stack, the flats on top, the mover and the ply", () => {
  const p = positionOf("x3/x,12S,2C/1,x,21 2 4");
  assert.equal(p.size, 3);
  assert.deepEqual(p.squares[0], flats("1"));
  assert.deepEqual(p.squares[4], [{ player: 1, kind: "flat" }, { player: 2, kind: "wall" }]);
  assert.deepEqual(p.flats, [2, 0]);
  assert.deepEqual([p.mover, p.ply], [1, 7]);
  const start = positionOf(emptyBoard(5));
  assert.deepEqual([start.mover, start.ply, start.flats], [0, 0, [0, 0]]);
  assert.throws(() => positionOf("x3/x3 1 1"));
});

test("a1 is at the lower left, and at the upper right when the board is turned", () => {
  for (const size of SIZES) {
    assert.deepEqual(placeOf(size, 0, false), { column: 0, row: size - 1 });
    assert.deepEqual(placeOf(size, 0, true), { column: size - 1, row: 0 });
    for (const turned of [false, true]) for (let s = 0; s < size * size; s++) {
      const { column, row } = placeOf(size, s, turned);
      assert.equal(squareAt(size, column, row, turned), s);
    }
  }
  assert.equal(squareName(8, 63), "h8");
  assert.equal(squareName(5, 7), "c2");
});

test("the arrow keys walk the screen's squares, and stop at the board's edge", () => {
  const go = (from: number, key: string, turned: boolean) => squareByKey(5, from, key, turned);
  const a1 = 0, e1 = 4, a2 = 5, b1 = 1;
  assert.equal(go(a1, "ArrowUp", false), a2);
  assert.equal(go(a1, "ArrowRight", false), b1);
  assert.equal(go(a1, "ArrowDown", false), a1);
  assert.equal(go(a1, "ArrowDown", true), a2);
  assert.equal(go(a1, "ArrowLeft", true), b1);
  assert.equal(go(a1, "End", false), e1);
  assert.equal(go(a1, "Home", true), e1);
  assert.equal(go(a1, "x", false), null);
});

test("a square says its stack in words, from the top", () => {
  assert.equal(squareWords(5, 7, []), "c2: empty");
  assert.equal(squareWords(5, 7, [{ player: 2, kind: "capstone" }]), "c2: Black's capstone");
  assert.equal(squareWords(5, 7, [...flats("122"), { player: 1, kind: "wall" }]),
    "c2: White's wall on a stack of 4. Under it, from the top: 2 of Black's flats, White's flat");
});

test("the pieces that one move carries stand as a pile, each a step higher, from one baseline", () => {
  const ys = (n: number, size: number) => drawStack(flats("1".repeat(n)), size).shapes
    .filter(s => s.part !== "bar").map(s => Number(s.shape[1].y));
  for (const size of SIZES) for (let n = 1; n <= size + 2; n++) {
    const pile = ys(n, size);
    assert.equal(pile.length, Math.min(n, size));
    pile.forEach((y, i) => assert.equal(y, ys(1, size)[0] - STEP * i));
  }
  // Painted from the lowest up, each in its owner's colour, the top one last.
  const { shapes } = drawStack(flats("1221"), 5);
  assert.deepEqual(shapes.map(s => s.owner), [0, 1, 1, 0]);
  assert.deepEqual(shapes.map(s => s.part), ["pile", "pile", "pile", "top"]);
  assert.deepEqual(drawStack([], 5), { shapes: [], count: null });
});

test("the top ten of the pieces under the carry limit are bars, in one column from the pile's foot up", () => {
  for (const size of SIZES) {
    const foot = Number(drawStack(flats("1"), size).shapes[0].shape[1].y) + FLAT;
    for (let n = 0; n <= 30; n++) {
      const under = "1221212211".repeat(3).slice(0, n);
      const { shapes } = drawStack([...flats(under + "1".repeat(size - 1)), { player: 1, kind: n % 2 ? "wall" : "flat" }], size);
      const bars = shapes.filter(s => s.part === "bar");
      assert.deepEqual(bars.map(s => s.owner), [...under].slice(-10).map(c => Number(c) - 1)); // the nearest to the pile
      bars.forEach((bar, k) => {
        const { x, y, width, height } = bar.shape[1];
        assert.ok(Number(x) > 50 + FLAT / 2 && Number(x) + Number(width) <= 100);
        assert.ok(Number(y) > 0 && Math.abs(Number(y) + Number(height) - (foot - BARS.pitch * k)) < 1e-9);
      });
    }
  }
  assert.ok(BARS.height < BARS.pitch); // a gap between bars
});

test("a line gives a square's whole stack, with the carry limit", () => {
  assert.equal(stackLine(5, 7, []), "");
  assert.equal(stackLine(5, 7, [{ player: 2, kind: "capstone" }]), "c2, 1 piece: BC");
  assert.equal(stackLine(5, 7, flats("1")), "c2, 1 piece: W");
  assert.equal(stackLine(5, 7, flats("12")), "c2, 2 pieces, from the top: B W");
  assert.equal(stackLine(3, 4, [...flats("1221"), { player: 1, kind: "wall" }]),
    "b2, 5 pieces, from the top: WS W B | B W");
});

test("a full pile does not touch the piece in the square behind it, for each width", () => {
  const SMALLEST = 37, LINE = 1.25; // pixels: the squares of 8x8 at a width of 360, and the line around a piece
  for (const size of SIZES) {
    const single = drawStack(flats("1"), size).shapes[0].shape[1];
    const top = Number(drawStack(flats("1".repeat(size)), size).shapes.at(-1)!.shape[1].y);
    const behind = Number(single.y) + FLAT - 100; // the bottom of the piece behind, in the pile's square
    assert.ok((top - behind) * SMALLEST / 100 > LINE, `${size}: ${top - behind}`);
  }
  // A wall stays in a flat's box, so the rule holds for it too.
  const { width, height } = pieceShape({ player: 1, kind: "wall" }, 50, 50)[1];
  assert.ok((Number(width) + Number(height)) * Math.SQRT1_2 <= FLAT);
});

test("the number stands on the top piece, and left of the pile's foot when that is a wall", () => {
  for (const size of SIZES) for (let n = 2; n <= size + 12; n++) {
    for (const [player, kind] of [[1, "flat"], [2, "flat"], [2, "capstone"]] as const) {
      const { count } = drawStack([...flats("1".repeat(n - 1)), { player, kind }], size, 40);
      assert.ok(count && count.text === String(n) && count.x === 50);
      assert.equal(count.on, player - 1);
      const lift = STEP * (Math.min(n, size) - 1);
      // The digits lie inside the top piece's box, which is FLAT high and lifted by the pile's steps.
      assert.ok(count.y - count.size * 0.75 > 56 - FLAT / 2 - lift && count.y < 56 + FLAT / 2 - lift);
    }
    const { count, shapes } = drawStack([...flats("1".repeat(n - 1)), { player: 1, kind: "wall" }], size, 40);
    const foot = Math.max(...shapes.filter(s => s.part === "pile").map(s => Number(s.shape[1].y) + FLAT));
    assert.ok(count && count.on === null && count.y - count.size * 0.75 > foot); // under the pile
    assert.ok(count.x + count.size * 1.12 < 50 - FLAT / 2 + 1); // clear of the pile of the square in front
  }
  assert.equal(drawStack(flats("1"), 5).count, null);
  // Two thirds of the first size, and at least 9 pixels on small squares, where the piece has the room.
  const size = (pixels: number, kind: "flat" | "wall") =>
    drawStack([...flats("11"), { player: 1, kind }], 8, pixels).count!.size;
  assert.deepEqual([90, 49.5].map(p => Math.round(size(p, "flat") * p / 100 * 10) / 10), [15.3, 9]);
  assert.ok(Math.abs(size(37.1, "flat") * 37.1 / 100 - 9) < 1e-9);
  assert.equal(size(37.1, "wall"), 20);
});

test("a top wall or capstone has a stronger line, and a pile with it still clears the piece behind", () => {
  for (const kind of ["wall", "capstone"] as const) {
    assert.equal(drawStack([...flats("1"), { player: 1, kind }], 6).shapes.at(-1)!.part, "raised");
  }
  assert.deepEqual([raisedLine(37), raisedLine(90)], [1.75, 2.25]);
  // A full pile's capstone (48 high) before a capstone and before a flat, on 8x8 at 37 pixels a square: the halves of the
  // two lines fit between them.
  for (const [half, line] of [[24, raisedLine(37)], [FLAT / 2, 1.25]]) {
    assert.ok((100 - 7 * STEP - 24 - half) * 37 / 100 > (raisedLine(37) + line) / 2);
  }
});

test("the tallest pile stays in the room over the farthest row", () => {
  for (const size of SIZES) {
    const top = drawStack(flats("1".repeat(size)), size).shapes.at(-1)!;
    assert.ok(Number(top.shape[1].y) >= -overhang(size));
  }
});

test("each kind has its own shape, the players' walls lean opposite ways, and a wall stands one step lower", () => {
  const wall = (player: 1 | 2): Stone => ({ player, kind: "wall" });
  const shapes = (["flat", "wall", "capstone"] as const).map(kind => JSON.stringify(pieceShape({ player: 1, kind }, 50, 50)));
  assert.equal(new Set(shapes).size, 3);
  assert.match(String(pieceShape(wall(1), 50, 50)[1].transform), /^rotate[(]45 /);
  assert.match(String(pieceShape(wall(2), 50, 50)[1].transform), /^rotate[(]-45 /);
  const alone = drawStack([wall(1)], 6).shapes[0].shape, onOne = drawStack([...flats("2"), wall(1)], 6).shapes[1].shape;
  assert.deepEqual(alone, onOne);
});

test("each lab position is a position, and the hand-made ones say so", () => {
  for (const f of FIXTURES) {
    assert.ok(positionOf(f.tps).size >= 3, f.name);
    assert.match(f.source, /^(Made by hand|From a game of the alpha-beta bot)/);
  }
  const heights = positionOf(FIXTURES.find(f => f.name.includes("stacks of 10 and 20"))!.tps).squares.map(s => s.length);
  assert.ok(heights.includes(10) && heights.includes(20));
  assert.ok(positionOf(FIXTURES.find(f => f.name === "8x8, full")!.tps).squares.every(s => s.length > 0));
});
