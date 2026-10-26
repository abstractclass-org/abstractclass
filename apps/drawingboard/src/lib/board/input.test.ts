import { test } from "node:test";
import assert from "node:assert/strict";
import { moveName } from "../game/notation.ts";
import { FIXTURES, type Fixture } from "./fixtures.ts";
import { center, hexKey, parseHex, type Hex } from "./hex.ts";
import { anchorsOf, clickBoard, clickHand, firstStatus, IDLE, inputStatus, legalOf, tapHex, targetsOf, type InputState,
         type Legal } from "./input.ts";
import type { BlueprintNumber, HandHex } from "./position.ts";

// The lab's positions, with every legal move as Stamp Duty's early build gives it (fixtures.json). A fixture has the
// input's rules: its position, its mover and its legal moves.
const [start, middle, , , empty] = FIXTURES;
const legals = new Map<Fixture, Legal>(FIXTURES.map(f => [f, legalOf(f)]));
const handHex = (blueprint: BlueprintNumber, hex: Hex): HandHex => ({ blueprint, hex });
/** A hex of a blueprint's frame before its anchor cell: never a cell, and never an edit's new place in these lists. */
const offCells = (blueprint: BlueprintNumber) => handHex(blueprint, [0, -5]);

/** Clicks in order on a position, from nothing begun: each a hex of the board, or a hex of a hand. Returns the state
 *  and the moves made, by name. */
type Step = { board: Hex } | { player: 0 | 1; at: HandHex } | { touch: true };
function clicks(f: Fixture, ...steps: Step[]) {
  const legal = legals.get(f)!;
  let state: InputState = IDLE, touch = false;
  const made: string[] = [];
  for (const s of steps) {
    if ("touch" in s) { touch = true; continue; }
    const c = "board" in s ? clickBoard(state.begun, legal, s.board, touch) : clickHand(state.begun, f, legal, s.player, s.at, touch);
    state = c.state;
    if (c.move) made.push(moveName(c.move));
  }
  return { state, made };
}
const status = (f: Fixture, state: InputState, touch = false) => inputStatus({
  rules: f, pending: state.begun, refused: state.refused, touch,
  anchors: anchorsOf(state.begun, legals.get(f)!), targets: targetsOf(state.begun, legals.get(f)!),
}, f.mover);
const sorted = (names: Iterable<string>) => [...names].sort();

test("each blueprint's marked anchor hexes are its legal placements' anchor hexes, all of them and no others", () => {
  for (const f of FIXTURES) {
    const legal = legals.get(f)!;
    for (const k of [1, 2, 3] as const) {
      const { state } = clicks(f, { player: f.mover, at: offCells(k) });
      const expected = f.legal.filter(n => n.startsWith(`${k}@`)).map(n => n.slice(2));
      assert.deepEqual(sorted(anchorsOf(state.begun, legal)!.map(hexKey)), sorted(expected), `${f.name}: blueprint ${k}`);
    }
  }
});

test("each cell's marked new places are its legal edits, all of them and no others", () => {
  for (const f of FIXTURES) {
    const legal = legals.get(f)!;
    f.position.blueprints[f.mover].forEach((b, i) => {
      const k = (i + 1) as BlueprintNumber;
      for (const key of Object.keys(b)) {
        const { state } = clicks(f, { player: f.mover, at: handHex(k, parseHex(key)) });
        const from = `${k}:${key}>`, expected = f.legal.filter(n => n.startsWith(from)).map(n => n.slice(from.length));
        const targets = targetsOf(state.begun, legal)!.map(t => `${t.blueprint}:${hexKey(t.hex)}`);
        assert.deepEqual(sorted(targets), sorted(expected), `${f.name}: ${k}:${key}`);
        // The cell's blueprint is chosen too: its marked anchor hexes are its placements'.
        assert.deepEqual(anchorsOf(state.begun, legal), legal.placements.get(k) ?? [], `${f.name}: ${k}:${key}`);
      }
    });
  }
});

test("every legal move is made by clicks, and each click on a marked hex makes the move that it names", () => {
  for (const f of FIXTURES) {
    const legal = legals.get(f)!, made: string[] = [];
    for (const [k, anchors] of legal.placements)
      for (const a of anchors) made.push(...clicks(f, { player: f.mover, at: offCells(k) }, { board: a }).made);
    for (const [cell, targets] of legal.edits) {
      const [k, key] = cell.split(":"), from = handHex(Number(k) as BlueprintNumber, parseHex(key));
      for (const t of targets) made.push(...clicks(f, { player: f.mover, at: from }, { player: f.mover, at: t }).made);
    }
    assert.deepEqual(sorted(made), sorted(f.legal.filter(n => n !== "pass")), f.name);
  }
});

test("a placement: a blueprint chosen in the hand, then a marked anchor hex", () => {
  const begun = clicks(start, { player: 0, at: offCells(1) });
  assert.deepEqual(begun.state.begun, { blueprint: 1, cell: null, shown: null });
  assert.equal(anchorsOf(begun.state.begun, legals.get(start)!)!.length, 35);
  assert.equal(status(start, begun.state), "To place blueprint 1, click a marked anchor hex.");
  const done = clicks(start, { player: 0, at: offCells(1) }, { board: [-1, -4] });
  assert.deepEqual(done.made, ["1@-1,-4"]);
  assert.deepEqual(done.state, IDLE);
  assert.equal(status(start, done.state), null);
});

test("an edit: a cell chosen, then a marked new place, also before the blueprint's anchor cell or in an empty blueprint", () => {
  const cell = { player: 0 as const, at: handHex(1, [-1, 1]) };
  assert.equal(status(start, clicks(start, cell).state),
    "To place blueprint 1, click a marked anchor hex. To move the cell, click a marked hex in a blueprint.");
  assert.deepEqual(clicks(start, cell, { player: 0, at: handHex(1, [0, -1]) }).made, ["1:-1,1>1:0,-1"]);
  assert.deepEqual(clicks(middle, { player: 1, at: handHex(2, [0, 2]) }, { player: 1, at: handHex(2, [2, 0]) }).made, ["2:0,2>2:2,0"]);
  // Red's blueprint 3 is empty: each of its 21 cells can move to its hex 0,0.
  const toEmpty = empty.legal.filter(n => n.endsWith(">3:0,0"));
  assert.equal(toEmpty.length, 21);
  assert.deepEqual(clicks(empty, { player: 1, at: handHex(1, [0, 0]) }, { player: 1, at: handHex(3, [0, 0]) }).made, ["1:0,0>3:0,0"]);
  // The cell's blueprint is chosen too: a marked anchor hex places it.
  assert.deepEqual(clicks(start, cell, { board: [-1, -4] }).made, ["1@-1,-4"]);
});

test("another cell, or the same cell again", () => {
  const other = clicks(start, { player: 0, at: handHex(1, [-1, 1]) }, { player: 0, at: handHex(2, [0, 0]) });
  assert.deepEqual(other.state.begun, { blueprint: 2, cell: [0, 0], shown: null });
  const again = clicks(start, { player: 0, at: handHex(1, [-1, 1]) }, { player: 0, at: handHex(1, [-1, 1]) });
  assert.deepEqual(again.state, IDLE);
});

test("Escape: the input starts again", () => {
  // Escape calls reset, which gives IDLE: the state that nothing begun has.
  const { state } = clicks(start, { player: 0, at: handHex(1, [-1, 1]) });
  assert.notDeepEqual(state, IDLE);
  assert.equal(status(start, IDLE), null);
});

test("nothing begun: the status is null, and the first text asks for a blueprint or a cell of the mover", () => {
  assert.equal(status(middle, IDLE), null);
  assert.equal(firstStatus({ touch: false }, start.mover), "Click a blueprint or a cell in Blue's hand.");
  assert.equal(firstStatus({ touch: true }, middle.mover), "Tap a blueprint or a cell in Red's hand.");
});

test("a click that is not legal does nothing, and the status says why, only for the move tried", () => {
  const nothing = clicks(middle, { board: [3, -9] });
  assert.deepEqual(nothing.state, { begun: null, refused: "nothing" });
  assert.equal(status(middle, nothing.state), "First, click a blueprint or a cell in Red's hand.");

  const off = clicks(middle, { player: 1, at: offCells(2) }, { board: [0, 0] });
  assert.deepEqual(off.made, []);
  assert.deepEqual(off.state.begun, { blueprint: 2, cell: null, shown: null });
  assert.equal(status(middle, off.state), "Blueprint 2 cannot have its anchor cell on this hex. Click a marked anchor hex.");

  // A hex of a blueprint that is not one of the chosen cell's new places: the player tried an edit.
  const away = clicks(middle, { player: 1, at: handHex(2, [0, 2]) }, { player: 1, at: handHex(2, [5, 5]) });
  assert.deepEqual(away.made, []);
  assert.deepEqual(away.state.begun, { blueprint: 2, cell: [0, 2], shown: null });
  assert.equal(status(middle, away.state), "The cell cannot move to this hex. Click a marked hex in a blueprint.");

  const opponent = clicks(middle, { player: 0, at: handHex(1, [0, 0]) });
  assert.deepEqual(opponent.state, { begun: null, refused: "opponent" });
  assert.equal(status(middle, opponent.state), "Red moves now. Click a blueprint or a cell in Red's hand.");
});

/** The start, on the engine's list less the edits of Blue's cell 1:0,1 (the star in the ring's middle): a cell with no
 *  legal edit, as a cell whose blueprint would not stay connected has. */
const fixed: Fixture = { ...start, legal: start.legal.filter(n => !n.startsWith("1:0,1>")) };
legals.set(fixed, legalOf(fixed));

test("a cell with no legal edit: the status speaks of the placement until the player tries an edit", () => {
  const cell = { player: 0 as const, at: handHex(1, [0, 1]) };
  const { state } = clicks(fixed, cell);
  assert.deepEqual(targetsOf(state.begun, legals.get(fixed)!), []);
  assert.equal(status(fixed, state), "To place blueprint 1, click a marked anchor hex.");
  const tried = clicks(fixed, cell, { player: 0, at: handHex(2, [2, 0]) });
  assert.deepEqual(tried.made, []);
  assert.equal(status(fixed, tried.state), "This cell has no legal edit. To place blueprint 1, click a marked anchor hex.");
});

test("a blueprint that has no legal placement: an empty blueprint, or one whose placements the list does not have", () => {
  const { state } = clicks(empty, { player: 1, at: handHex(3, [0, 0]) });
  assert.deepEqual(state.begun, { blueprint: 3, cell: null, shown: null });
  assert.deepEqual(anchorsOf(state.begun, legals.get(empty)!), []);
  assert.equal(status(empty, state), "Blueprint 3 has no cells. To put a cell in it, first click a cell in a different blueprint.");
  const board = clicks(empty, { player: 1, at: handHex(3, [0, 0]) }, { board: [8, -2] });
  assert.deepEqual(board.made, []);
  assert.equal(status(empty, board.state), "Blueprint 3 has no cells. To put a cell in it, first click a cell in a different blueprint.");
  // The texts for a blueprint with cells and no legal placement, on the engine's list less blueprint 1's placements.
  const without: Fixture = { ...start, legal: start.legal.filter(n => !n.startsWith("1@")) };
  legals.set(without, legalOf(without));
  assert.equal(status(without, clicks(without, { player: 0, at: offCells(1) }).state),
    "Blueprint 1 has no legal placement. Click a different blueprint.");
  assert.equal(status(without, clicks(without, { player: 0, at: handHex(1, [-1, 1]) }).state),
    "To move the cell, click a marked hex in a blueprint.");
  assert.equal(status(without, clicks(without, { player: 0, at: handHex(1, [-1, 1]) }, { board: [-1, -4] }).state),
    "Blueprint 1 has no legal placement. To move the cell, click a marked hex in a blueprint.");
});

test("on a touch screen, the first tap shows the move, a second tap on the same hex makes it, and the texts say tap", () => {
  const shown = clicks(start, { touch: true }, { player: 0, at: handHex(1, [-1, 1]) }, { board: [-1, -4] });
  assert.deepEqual(shown.made, []);
  assert.deepEqual(shown.state.begun?.shown, { type: "place", at: [-1, -4] });
  assert.equal(status(start, shown.state, true), "To place blueprint 1 here, tap the footprint again.");
  assert.deepEqual(clicks(start, { touch: true }, { player: 0, at: handHex(1, [-1, 1]) }, { board: [-1, -4] }, { board: [-1, 1] })
    .state.begun?.shown, { type: "place", at: [-1, 1] });
  assert.deepEqual(clicks(start, { touch: true }, { player: 0, at: handHex(1, [-1, 1]) }, { board: [-1, -4] }, { board: [-1, -4] })
    .made, ["1@-1,-4"]);

  const edit = clicks(start, { touch: true }, { player: 0, at: handHex(1, [-1, 1]) }, { player: 0, at: handHex(1, [0, -1]) });
  assert.deepEqual(edit.state.begun?.shown, { type: "edit", to: handHex(1, [0, -1]) });
  assert.equal(status(start, edit.state, true), "To move the cell here, tap the same hex again.");
  assert.deepEqual(clicks(start, { touch: true }, { player: 0, at: handHex(1, [-1, 1]) }, { player: 0, at: handHex(1, [0, -1]) },
    { player: 0, at: handHex(1, [0, -1]) }).made, ["1:-1,1>1:0,-1"]);

  // Every text of a touch says "tap": the first one too.
  const tries: [Fixture, Step[]][] = [
    [middle, [{ board: [3, -9] }]], [middle, [{ player: 0, at: handHex(1, [0, 0]) }]],
    [middle, [{ player: 1, at: offCells(2) }]], [middle, [{ player: 1, at: handHex(2, [0, 2]) }]],
    [middle, [{ player: 1, at: offCells(2) }, { board: [0, 0] }]],
    [middle, [{ player: 1, at: handHex(2, [0, 2]) }, { player: 1, at: handHex(2, [5, 5]) }]],
    [empty, [{ player: 1, at: handHex(3, [0, 0]) }]], [empty, [{ player: 1, at: handHex(3, [0, 0]) }, { board: [8, -2] }]],
    [fixed, [{ player: 0, at: handHex(1, [0, 1]) }]], [fixed, [{ player: 0, at: handHex(1, [0, 1]) }, { player: 0, at: handHex(2, [2, 0]) }]],
  ];
  for (const [f, steps] of tries) {
    const text = status(f, clicks(f, { touch: true }, ...steps).state, true);
    assert.ok(text && /\btap\b/i.test(text) && !/click/i.test(text), String(text));
  }
});

test("a tap on the board: on the shown footprint, near a marked anchor hex, or else on its own hex", () => {
  const anchors: Hex[] = [[1, 0], [-3, 0]];
  const shown = { at: [1, 0] as Hex, hexes: [[1, 0], [2, 0], [3, 0]] as Hex[] };
  // On the footprint's third cell: the shown anchor hex.
  assert.deepEqual(tapHex([3, 0], center([3, 0]), shown, anchors), [1, 0]);
  // Nothing shown: the nearest marked anchor hex within 2 units (a touching hex is √3 away), else the hex.
  assert.deepEqual(tapHex([-2, 0], center([-2, 0]), null, anchors), [-3, 0]);
  assert.deepEqual(tapHex([-5, 0], center([-5, 0]), null, anchors), [-5, 0]);
  assert.deepEqual(tapHex([1, 0], center([1, 0]), null, anchors), [1, 0]);
});
