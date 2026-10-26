import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXTURES } from "./fixtures.ts";
import { parseMove } from "../game/notation.ts";
import { anchorOf, hexKey, parseHex } from "./hex.ts";
import { footprintOf } from "./position.ts";

test("the lab's five positions: the start, a middle game, a capture, an edit, an empty blueprint", () => {
  assert.deepEqual(FIXTURES.map(f => f.name), ["The start", "A middle game", "A capture", "An edit", "An empty blueprint"]);
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

test("every blueprint is in its frame: its anchor cell at 0,0, or no cell", () => {
  for (const f of FIXTURES)
    for (const hand of f.position.blueprints)
      for (const b of hand) {
        const anchor = anchorOf(Object.keys(b).map(parseHex));
        if (anchor) assert.equal(hexKey(anchor), "0,0", `${f.name}: ${Object.keys(b)}`);
      }
});

test("a placement's footprint has the mover's cells after it, and its captured cells are off the board", () => {
  const moves = FIXTURES.flatMap(f => [
    { position: f.position, move: f.last },
    ...Object.values(f.lines ?? {}).flat().map(l => ({ position: null, move: l.move })),
  ]);
  for (const { position, move } of moves) {
    if (move?.type !== "place" || !position) continue;
    for (const s of move.footprint) assert.deepEqual(position.cells[hexKey(s.hex)], [move.player, s.kind]);
    for (const c of move.captured) assert.equal(position.cells[hexKey(c.hex)], undefined);
  }
  const capture = FIXTURES[2];
  assert.equal(capture.last?.type === "place" && capture.last.captured.length, 3);
  assert.deepEqual(capture.position.scores, [96, 125]);
});

test("an edit's hexes are in the frames after it: the cell at its new place, its old place empty", () => {
  for (const f of FIXTURES) {
    const m = f.last;
    if (m?.type !== "edit") continue;
    const hand = f.position.blueprints[m.player];
    assert.equal(hand[m.to.blueprint - 1][hexKey(m.to.hex)], m.kind, f.name);
    assert.equal(hand[m.from.blueprint - 1][hexKey(m.from.hex)], undefined, f.name);
  }
  const e = FIXTURES[3].last;
  assert.ok(e?.type === "edit");
  assert.deepEqual([e.from, e.to], [{ blueprint: 3, hex: [-1, 0] }, { blueprint: 1, hex: [2, 1] }]);
  const empty = FIXTURES[4];
  assert.deepEqual(empty.position.blueprints[1][2], {});
});

test("the middle game's candidates are Red's, and each line starts with its candidate", () => {
  const f = FIXTURES[1];
  assert.equal(f.position.ply, 9);
  assert.deepEqual(f.candidates?.map(c => [c.name, c.rank, c.move.player]),
    [["3@3,1", 1, 1], ["1@1,-6", 2, 1], ["2:0,2>2:2,0", 3, 1], ["2@4,2", 4, 1], ["1@3,2", 5, 1]]);
  for (const [name, line] of Object.entries(f.lines ?? {}))
    assert.deepEqual(line[0].move, f.candidates?.find(c => c.name === name)?.move);
});

test("each position's hand-made legal moves hold together: footprints on empty hexes, an edit's cell to an empty hex", () => {
  for (const f of FIXTURES) {
    const p = f.position, hand = p.blueprints[f.mover];
    const placed = new Set<number>();
    let edits = 0;
    for (const name of f.legal) {
      const m = parseMove(name);
      if (m.kind === "place") {
        placed.add(m.blueprint);
        const fp = footprintOf(hand[m.blueprint - 1], [m.q, m.r]);
        assert.ok(fp.length, `${f.name}: ${name} places an empty blueprint`);
        for (const s of fp) assert.equal(p.cells[hexKey(s.hex)], undefined, `${f.name}: ${name} on ${hexKey(s.hex)}`);
      } else {
        edits++;
        assert.ok(hand[m.from.blueprint - 1][`${m.from.q},${m.from.r}`], `${f.name}: ${name} moves no cell`);
        assert.equal(hand[m.to.blueprint - 1][`${m.to.q},${m.to.r}`], undefined, `${f.name}: ${name} to a cell`);
      }
    }
    // Several placements of each blueprint that has cells, and several edits.
    for (const [i, b] of hand.entries()) assert.equal(placed.has(i + 1), Object.keys(b).length > 0, `${f.name}: blueprint ${i + 1}`);
    assert.ok(edits >= 3, f.name);
    for (const c of f.candidates ?? []) assert.ok(f.legal.includes(c.name), `${f.name}: candidate ${c.name}`);
  }
  // An edit with a negative coordinate, and edits to an empty blueprint.
  assert.ok(FIXTURES.some(f => f.legal.some(n => /:-|,-\d+$/.test(n.split(">")[1] ?? ""))));
  const empty = FIXTURES[4];
  assert.equal(empty.mover, 1);
  assert.deepEqual(empty.legal.filter(n => n.endsWith(">3:0,0")), ["1:2,0>3:0,0", "2:1,0>3:0,0"]);
});

test("the movers: Blue at the start, then Red's turn of two", () => {
  assert.deepEqual(FIXTURES.map(f => [f.position.ply, f.mover]), [[0, 0], [9, 1], [42, 1], [1, 1], [58, 1]]);
});
