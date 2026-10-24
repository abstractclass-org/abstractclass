import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXTURES } from "./fixtures.ts";
import { firstHex, hexKey, parseHex } from "./hex.ts";

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

test("every blueprint is in its frame: its first cell at 0,0, or no cell", () => {
  for (const f of FIXTURES)
    for (const hand of f.position.blueprints)
      for (const b of hand) {
        const first = firstHex(Object.keys(b).map(parseHex));
        if (first) assert.equal(hexKey(first), "0,0", `${f.name}: ${Object.keys(b)}`);
      }
});

test("a placement's stamped cells are the mover's after it, and its removed cells are gone", () => {
  const moves = FIXTURES.flatMap(f => [
    { position: f.position, move: f.last },
    ...Object.values(f.lines ?? {}).flat().map(l => ({ position: null, move: l.move })),
  ]);
  for (const { position, move } of moves) {
    if (move?.type !== "place" || !position) continue;
    for (const s of move.stamped) assert.deepEqual(position.cells[hexKey(s.hex)], [move.player, s.kind]);
    for (const r of move.removed) assert.equal(position.cells[hexKey(r.hex)], undefined);
  }
  const capture = FIXTURES[2];
  assert.equal(capture.last?.type === "place" && capture.last.removed.length, 3);
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
