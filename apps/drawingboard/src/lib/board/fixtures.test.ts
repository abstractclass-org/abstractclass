import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXTURE_DATA, FIXTURES } from "./fixtures.ts";
import { parseMove } from "../game/notation.ts";
import { anchorOf, hexKey, parseHex, shift, TOUCHING } from "./hex.ts";
import { footprintOf } from "./position.ts";

test("the lab's five positions: the start, a middle game, a capture, an edit, an empty blueprint", () => {
  assert.deepEqual(FIXTURES.map(f => f.name), ["The start", "A middle game", "A capture", "An edit", "An empty blueprint"]);
  assert.equal(FIXTURE_DATA.engine.tag, "engine-0d2a5416");
});

test("the start has 42 cells, a star with a ring of six for each of the six blueprints", () => {
  const start = FIXTURES[0].position;
  assert.equal(Object.keys(start.cells).length, 42);
  assert.deepEqual(start.cells["-6,0"], [0, "star"]);
  assert.deepEqual(start.cells["-9,0"], [0, "wall"]);
  assert.deepEqual(start.cells["10,-1"], [1, "star"]);
  assert.deepEqual(start.cells["11,-1"], [1, "wall"]);
  for (const hand of start.blueprints) assert.deepEqual(hand.map(b => Object.keys(b).length), [7, 7, 7]);
});

test("the movers: Blue at the start, then a turn of two", () => {
  assert.deepEqual(FIXTURES.map(f => [f.position.ply, f.mover]), [[0, 0], [9, 1], [10, 1], [1, 1], [14, 1]]);
});

test("every blueprint is in its frame: its anchor cell at 0,0, or no cell", () => {
  for (const f of FIXTURES)
    for (const hand of f.position.blueprints)
      for (const b of hand) {
        const anchor = anchorOf(Object.keys(b).map(parseHex));
        if (anchor) assert.equal(hexKey(anchor), "0,0", `${f.name}: ${Object.keys(b)}`);
      }
});

/** Each step that the engine played, with the board's move of it and the engine's own record of it. */
const played = FIXTURE_DATA.fixtures.flatMap((d, i) => {
  const f = FIXTURES[i];
  return [
    ...(d.last ? [{ name: d.name, step: d.last, move: f.last! }] : []),
    ...Object.entries(d.lines ?? {}).flatMap(([c, steps]) => steps.map((step, k) => ({ name: `${d.name}, ${c}`, step, move: f.lines![c][k].move }))),
  ];
});

test("a placement's footprint is the engine's, and its captured cells are the engine's", () => {
  for (const { name, step, move } of played) {
    if (move.type !== "place") continue;
    assert.deepEqual(move.footprint.map(s => hexKey(s.hex)).sort(), [...step.footprint].sort(), `${name}: ${step.move}`);
    assert.deepEqual(Object.fromEntries(move.captured.map(c => [hexKey(c.hex), [c.owner, c.kind]])), step.captured, name);
  }
  const capture = FIXTURES[2];
  assert.ok(capture.last?.type === "place");
  assert.equal(capture.last.captured.length, 3);
  assert.ok(capture.last.captured.some(c => c.kind === "star"));
  assert.equal(FIXTURE_DATA.fixtures[2].last?.points, 18);
  assert.deepEqual(capture.position.scores, [0, 18]);
  for (const s of capture.last.footprint) assert.deepEqual(capture.position.cells[hexKey(s.hex)], [1, s.kind]);
});

test("an edit's hexes are in the frames after it: the engine's hands have the cell at its new place, and none at its old", () => {
  for (const { name, step, move } of played) {
    if (move.type !== "edit") continue;
    const hand = step.blueprints[move.player];
    assert.equal(hand[move.to.blueprint - 1][hexKey(move.to.hex)], move.kind, `${name}: ${step.move}`);
    if (!(move.from.blueprint === move.to.blueprint && hexKey(move.from.hex) === hexKey(move.to.hex)))
      assert.equal(hand[move.from.blueprint - 1][hexKey(move.from.hex)], undefined, `${name}: ${step.move}`);
  }
  // Blue's first move took blueprint 3's anchor cell: the cell's old place is before the new anchor cell.
  const e = FIXTURES[3].last;
  assert.ok(e?.type === "edit");
  assert.deepEqual([e.from, e.to], [{ blueprint: 3, hex: [-1, 0] }, { blueprint: 1, hex: [2, 1] }]);
  assert.deepEqual(FIXTURES[4].position.blueprints[1][2], {});
});

test("the middle game's candidates are legal moves of Red, and each line starts with its candidate", () => {
  const f = FIXTURES[1];
  assert.deepEqual(f.candidates?.map(c => [c.name, c.rank, c.move.player]),
    [["2@3,-9", 1, 1], ["1@0,5", 2, 1], ["2:0,2>2:2,0", 3, 1], ["3@0,5", 4, 1], ["1@2,-9", 5, 1]]);
  for (const c of f.candidates ?? []) assert.ok(f.legal.includes(c.name), c.name);
  for (const [name, steps] of Object.entries(FIXTURE_DATA.fixtures[1].lines ?? {})) {
    assert.equal(steps[0].move, name);
    assert.equal(f.lines?.[name].length, steps.length);
  }
  // A placement candidate's footprint is on empty hexes.
  for (const c of f.candidates ?? [])
    if (c.move.type === "place") for (const s of c.move.footprint) assert.equal(f.position.cells[hexKey(s.hex)], undefined, c.name);
});

test("the legal lists: placements of each blueprint with cells, edits, and none to a hex that does not touch the cells", () => {
  for (const f of FIXTURES) {
    const hand = f.position.blueprints[f.mover];
    for (const [i, b] of hand.entries())
      assert.equal(f.legal.some(n => n.startsWith(`${i + 1}@`)), Object.keys(b).length > 0, `${f.name}: blueprint ${i + 1}`);
    for (const name of f.legal) {
      const m = parseMove(name);
      if (m.kind === "place") {
        for (const s of footprintOf(hand[m.blueprint - 1], [m.q, m.r]))
          assert.equal(f.position.cells[hexKey(s.hex)], undefined, `${f.name}: ${name}`);
        continue;
      }
      // An edit's new place touches its blueprint's cells, or is an empty blueprint's 0,0: the hands' boxes hold every
      // hex that touches a blueprint's cells (Hand.svelte, blueprintBoxes), so every new place is in view.
      const target = hand[m.to.blueprint - 1];
      const touches = Object.keys(target).length
        ? shift(TOUCHING, [m.to.q, m.to.r]).some(h => target[hexKey(h)])
        : m.to.q === 0 && m.to.r === 0;
      assert.ok(touches, `${f.name}: ${name}`);
    }
  }
  // Edits with a negative coordinate, and edits to an empty blueprint.
  assert.ok(FIXTURES[0].legal.includes("1:-1,1>1:0,-1"));
  assert.ok(FIXTURES[4].legal.some(n => n.endsWith(">3:0,0")));
});
