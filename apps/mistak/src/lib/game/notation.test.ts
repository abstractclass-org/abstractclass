// Checks a move's text in PTN (notation.ts). The moves are ours and the examples of ptn.ninja's documents. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readMove } from "./notation.ts";

const name = (word: string) => { const r = readMove(word); assert.ok(typeof r !== "string", `${word}: ${r}`); return r.name; };
const problem = (word: string) => { const r = readMove(word); assert.equal(typeof r, "string", word); return r; };

test("the short form is read as it is: the examples of ptn.ninja's documents too", () => {
  for (const move of ["a1", "h8", "Sb3", "Cc4", "c3", "Cc3", "a1>", "3b2+111", "5e4<23", "5b4>212", "3b2+12", "8a1+11111111"])
    assert.equal(name(move), move);
});

test("each other spelling is read as the short form", () => {
  const spellings: [string, string][] = [
    ["Fa1", "a1"], ["fa1", "a1"], ["A1", "a1"], ["F1", "f1"], ["sb3", "Sb3"], ["cc4", "Cc4"], ["SB3", "Sb3"], ["ff6", "f6"],
    ["1e4<1", "e4<"], ["e4<1", "e4<"], ["1e4<", "e4<"], ["2d4-2", "2d4-"], ["4c3>4", "4c3>"], ["3C3>12", "3c3>12"],
  ];
  for (const [word, short] of spellings) assert.equal(name(word), short, word);
});

test("a flattening's mark, and where it is written", () => {
  assert.deepEqual(readMove("a1>*"), { name: "a1>", mark: true, markAt: 3 });
  assert.deepEqual(readMove("1e4<1*'"), { name: "e4<", mark: true, markAt: 5 });
  assert.deepEqual(readMove("3b2+12"), { name: "3b2+12", mark: false, markAt: 6 });
  assert.deepEqual(readMove("3b2+12!'"), { name: "3b2+12", mark: false, markAt: 6 }); // before the evaluation marks
  assert.equal(problem("a1*"), "only a stack move flattens a wall (*)");
  assert.equal(problem("Ca1*"), "only a stack move flattens a wall (*)");
});

test("the evaluation marks are read and kept nowhere", () => {
  for (const marks of ["!", "?", "!?", "'", '"', "''", "'!", "!'", '"??'])
    assert.deepEqual(readMove(`a1>${marks}`), { name: "a1>", mark: false, markAt: 3 }, marks);
});

test("a word that is no move of PTN's is refused, with what is wrong", () => {
  for (const word of ["", "a", "i1", "a9", "a0", "pass", "a1b2", "9a1>", "0a1>", "a1>0", "a1>9", "a1↑", "a1>C", "a1>!*", "Sa1>S", "a1-a2", "x"])
    assert.equal(problem(word), "not a move, a number or a result", word);
  assert.equal(problem("2a1"), "a placement has no count");
  assert.equal(problem("1a1"), "a placement has no count");
  assert.equal(problem("Sa1>"), "a stack move has no stone's letter");
  assert.equal(problem("Fa1>"), "a stack move has no stone's letter");
  assert.equal(problem("3c3>11"), "the move takes 3 and drops 2");
  assert.equal(problem("c3>11"), "the move takes 1 and drops 2");
  assert.equal(problem("2c3>3"), "the move takes 2 and drops 3");
});
