// Checks a position in TPS (tps.ts). The positions are ours and the examples of ptn.ninja's documents. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyBoard, readPosition, setUpStart, writePosition, type Position } from "./tps.ts";

const read = (text: string): Position => { const p = readPosition(text); assert.ok(typeof p !== "string", `${text}: ${p}`); return p; };
const problem = (text: string) => { const p = readPosition(text); assert.equal(typeof p, "string", text); return p; };

test("a position written and read back is the same text: the examples of ptn.ninja's documents too", () => {
  for (const tps of [
    "x5/x5/x5/x5/x5 1 1", "x3/x3/x3 2 1", "x8/x8/x8/x8/x8/x8/x8/x8 1 9", "x3/x,1,x/2S,x,12C 2 3",
    "x3,12,2S/x,22S,22C,11,21/121,212,12,1121C,1212S/21S,1,21,211S,12S/x,21S,2,x2 1 26",
  ]) assert.equal(writePosition(read(tps)), tps);
});

test("a position's stacks: from a1, each from the bottom to the top, and only the top can be a wall or a capstone", () => {
  const p = read("x3/x,1,x/2S,x,12C 2 3");
  assert.deepEqual([p.size, p.player, p.number], [3, 2, 3]);
  assert.deepEqual(p.squares[0], [{ player: 2, kind: "wall" }]); // a1
  assert.deepEqual(p.squares[2], [{ player: 1, kind: "flat" }, { player: 2, kind: "capstone" }]); // c1
  assert.deepEqual(p.squares[4], [{ player: 1, kind: "flat" }]); // b2
  assert.equal(p.squares.filter(s => s.length).length, 3);
});

test("each other spelling is read as the one spelling", () => {
  for (const other of ["X3/x,1,X/2s,x,12c 2 3", "x,x,x/x,1,x/2S,x,12C 2 3", "x2,x/x1,1,x/2S,x,12C  2  3", " x3-x,1,x-2S,x,12C 2 3\n"])
    assert.equal(writePosition(read(other)), "x3/x,1,x/2S,x,12C 2 3");
});

test("text that is no position is refused, with what is wrong", () => {
  for (const text of ["", "x5/x5/x5/x5/x5", "x3/x3/x3 1", "x3/x3/x3 3 1", "x3/x3/x3 1 1 0", "x3/x3/x3 1 a", "a3/x3/x3 1 1"])
    assert.equal(problem(text), "a position must look like x5/x5/x5/x5/x5 1 1", text);
  assert.equal(problem("x3/x3/x3 1 0"), "a position's number of the move starts at 1");
  assert.equal(problem("x3/x3 1 1"), "a board has 3 to 8 rows, and this one has 2");
  assert.equal(problem("x3/x2/x3 1 1"), "a board of 3 rows has 3 squares in each, and one row has 2");
  assert.equal(problem("x3/x4/x3 1 1"), "a board of 3 rows has 3 squares in each, and one row has 4");
  for (const [square, text] of [["S1", "S1"], ["1SC", "1SC"], ["1S2", "1S2"], ["13", "13"], ["X0", "X0"], ["S", "S"]])
    assert.equal(problem(`x3/${square},x2/x3 1 1`), `not a square of a position: ${text}`);
  assert.equal(problem("x3/1,,x/x3 1 1"), "not a square of a position: nothing between two commas");
});

test("a size's empty board at move 1 is its standard start, and every other start is set up", () => {
  assert.equal(emptyBoard(5), "x5/x5/x5/x5/x5 1 1");
  assert.equal(emptyBoard(6), "x6/x6/x6/x6/x6/x6 1 1");
  for (const standard of [undefined, null, "", " ", "x6/x6/x6/x6/x6/x6 1 1", "x5-x5-x5-x5-x2,x3 1 1"]) assert.equal(setUpStart(standard), undefined);
  assert.equal(setUpStart("X3/x,1,x/x3 2 1"), "x3/x,1,x/x3 2 1");
  assert.equal(setUpStart("x5/x5/x5/x5/x5 2 1"), "x5/x5/x5/x5/x5 2 1");
  assert.equal(setUpStart(" nonsense "), "nonsense");
});
