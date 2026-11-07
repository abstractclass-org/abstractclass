// Checks a position's notation (position.ts): written and read back for the standard start and the lab's positions,
// which are Stamp Duty's own games (board/fixtures.json, from the engine), its one spelling, the edge cases of its form,
// a cut position, the turn of a record's first move after a start, and the engine's one-line form. Run: npm test. The engine's own
// check of the notation is position.engine.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXTURE_DATA } from "../board/fixtures.ts";
import { enginePosition, readPosition, setUpStart, STANDARD_START, startTurn, writePosition } from "./position.ts";

test("the standard start is the lab's first position, as the engine describes it", () => {
  const start = FIXTURE_DATA.fixtures.find(f => !f.moves.length)!;
  assert.equal(writePosition(start.position), STANDARD_START);
  assert.equal(writePosition(readPosition(STANDARD_START)), STANDARD_START);
});

test("each position of Stamp Duty's games comes back the same from its notation", () => {
  for (const f of FIXTURE_DATA.fixtures) {
    const text = writePosition(f.position), back = readPosition(text);
    assert.equal(writePosition(back), text, f.name);
    assert.equal(back.ply, f.moves.length, f.name);
    assert.deepEqual(back.scores, f.position.scores, f.name);
    assert.deepEqual(Object.entries(back.cells).sort(), Object.entries(f.position.cells).sort(), f.name);
    for (const p of [0, 1] as const)
      back.blueprints[p].forEach((b, i) =>
        assert.deepEqual(Object.entries(b).sort(), Object.entries(f.position.blueprints[p][i]).sort(), `${f.name}: ${p} ${i + 1}`));
  }
});

test("an empty blueprint is a dash, in the lab's position with one", () => {
  const f = FIXTURE_DATA.fixtures.find(x => x.name === "An empty blueprint")!;
  const hands = writePosition(f.position).split(" ").slice(2, 4).join(" ");
  assert.match(hands, /(^|[| ])-([| ]|$)/);
  assert.equal(writePosition(readPosition(writePosition(f.position))), writePosition(f.position));
});

test("one position has one spelling: the cells in reading order, whatever order they come in", () => {
  const p = readPosition("1,0;0,0s;-1,1w - 1,0;0,0|-|0,1;0,0 -|-|- b1 0/0 0");
  assert.equal(writePosition(p), "0,0s;1,0;-1,1w - 0,0;1,0|-|0,0;0,1 -|-|- b1 0/0 0");
});

test("the edge cases of the form: no cells, a finished game, negative hexes, large scores", () => {
  assert.equal(writePosition(readPosition("- - -|-|- -|-|- r0 0/0 120")), "- - -|-|- -|-|- r0 0/0 120");
  const text = "-300,-7s - 0,0|-|- 0,0w|-|- r1 1206/987654321 22", p = readPosition(text);
  assert.deepEqual(p.cells["-300,-7"], [0, "star"]);
  assert.deepEqual(p.blueprints[1][0], { "0,0": "wall" });
  assert.deepEqual(p.scores, [1206, 987654321]);
  assert.equal(writePosition(p), text);
});

test("the reader says what is wrong with a position's form", () => {
  const wrong = (text: string, why: RegExp) => assert.throws(() => readPosition(text), why);
  wrong("- - b1 0/0 0", /seven fields/);
  wrong("0,0x - -|-|- -|-|- b1 0/0 0", /not a cell of Blue's cells: "0,0x"/);
  wrong("0,0;0,0s - -|-|- -|-|- b1 0/0 0", /two cells are at 0,0 in Blue's cells/);
  wrong("0,0 0,0 -|-|- -|-|- b1 0/0 0", /Blue and Red both have a cell at 0,0/);
  wrong("- - 1,0;2,0|-|- -|-|- b1 0/0 0", /Blue's blueprint 1 is not in its frame: its anchor cell, the first in reading order, is at 1,0/);
  wrong("- - -|- -|-|- b1 0/0 0", /Blue's hand is three blueprints/);
  wrong("- - -|-|- -|-|- b2 0/0 0", /the mover field is b2, but after 0 moves played it is b1/);
  wrong("- - -|-|- -|-|- r1 0/0 121", /not a count of moves played from 0 to 120/);
  wrong("- - -|-|- -|-|- b1 0/-1 0", /not two scores/);
  wrong("- - -|-|- -|-|- x1 0/0 0", /not a mover/);
});

test("a cut position says what is wrong, unless a cut inside its moves played leaves a count with the same mover", () => {
  // Each of the lab's positions, cut at each length: a field left out, or one that the reader refuses
  for (const f of FIXTURE_DATA.fixtures) {
    const text = writePosition(f.position), count = text.lastIndexOf(" ") + 1;
    for (let n = 0; n < text.length; n++) {
      let read = false;
      try { readPosition(text.slice(0, n)); read = true; } catch (e) { assert.ok(!(e instanceof TypeError), `${f.name}, cut at ${n}: ${e}`); }
      assert.ok(!read || n > count, `${f.name}, cut at ${n}: "${text.slice(n - 12, n)}" reads`);
    }
  }
  // 22 moves played cut to 2: Red's second move of its turn both times, so the cut reads as another position
  assert.equal(writePosition(readPosition("- - -|-|- -|-|- r1 0/0 2")), "- - -|-|- -|-|- r1 0/0 2");
  assert.throws(() => readPosition("- - -|-|- -|-|- r1 0/0 1"), /after 1 moves played it is r2/);
});

test("the standard start, written out, is no set-up start", () => {
  assert.equal(setUpStart(STANDARD_START), undefined);
  assert.equal(setUpStart(` ${STANDARD_START.replace(/ /g, "   ")} `), undefined);
  assert.equal(setUpStart("?"), undefined);
  assert.equal(setUpStart(null), undefined);
  // Another spelling of a set-up position gives its one spelling, and a text that the notation cannot read stays.
  assert.equal(setUpStart("1,0;0,0s - 0,0|-|- -|-|- r1 0/0 22"), "0,0s;1,0 - 0,0|-|- -|-|- r1 0/0 22");
  assert.equal(setUpStart("not  a position"), "not a position");
});

test("a record's first turn after a start comes from the start's moves played", () => {
  assert.deepEqual(startTurn(undefined), { turn: 1, first: true });
  assert.deepEqual(startTurn(STANDARD_START), { turn: 1, first: true });
  assert.deepEqual(startTurn(STANDARD_START.replace(/ b1 0\/0 0$/, " r1 0/0 22")), { turn: 12, first: false });
  assert.deepEqual(startTurn(STANDARD_START.replace(/ b1 0\/0 0$/, " b2 0/0 23")), { turn: 13, first: true });
});

test("the engine's one-line form: the cells from the middle of their box, the hands, no pick and no recent placements", () => {
  assert.equal(enginePosition("-2,0s;0,1 3,-1w 0,0;1,0|-|0,0s 0,0w|-|- r1 5/7 22"),
               "22 5 7 -2,0,s;0,1,p;3,-1,W 0,0,p;1,0,p|-|0,0,s 0,0,w|-|- - 0,0 -|-");
  assert.equal(enginePosition("- - -|-|- -|-|- b1 0/0 0"), "0 0 0 - -|-|- -|-|- - 0,0 -|-");
  // A wide board: the middle is the middle of the box, so each cell is within 255 of it.
  assert.equal(enginePosition("-300,0;210,4 - -|-|- -|-|- b1 0/0 0"), "0 0 0 -255,-2,p;255,2,p -|-|- -|-|- - -45,2 -|-");
  assert.throws(() => enginePosition("-300,0;211,4 - -|-|- -|-|- b1 0/0 0"),
                /the cells are 512 hexes from end to end, and the engine takes at most 511/);
});
