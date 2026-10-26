import { test } from "node:test";
import assert from "node:assert/strict";
import { moveName } from "../game/notation.ts";
import { center, type Hex } from "./hex.ts";
import { anchorsOf, clickBoard, clickHand, IDLE, inputStatus, legalOf, tapHex, targetsOf, type InputRules, type InputState } from "./input.ts";
import type { HandHex, SitePosition } from "./position.ts";

// Red to move. Blueprint 1: three cells in a row. Blueprint 2: one cell. Blueprint 3: empty.
const position: SitePosition = {
  ply: 9,
  cells: { "0,0": [1, "plain"], "5,0": [0, "plain"] },
  blueprints: [
    [{ "0,0": "plain" }, { "0,0": "plain" }, { "0,0": "plain" }],
    [{ "0,0": "plain", "1,0": "star", "2,0": "wall" }, { "0,0": "plain" }, {}],
  ],
  scores: [0, 0],
};
const rules: InputRules = {
  position, mover: 1,
  legal: ["1@1,0", "1@-3,0", "2@0,1", "1:2,0>1:0,1", "1:2,0>1:-1,1", "1:1,0>3:0,0", "2:0,0>1:3,0"],
};
const legal = legalOf(rules);
const hand = (blueprint: 1 | 2 | 3, hex: Hex): HandHex => ({ blueprint, hex });

/** Clicks in order, from nothing begun: each a hex of the board, or a hex of a hand. Returns the state and the moves
 *  made, by name. */
type Step = { board: Hex } | { player: 0 | 1; at: HandHex } | { touch: true };
function clicks(...steps: Step[]) {
  let state: InputState = IDLE, touch = false;
  const made: string[] = [];
  for (const s of steps) {
    if ("touch" in s) { touch = true; continue; }
    const c = "board" in s ? clickBoard(state, legal, s.board, touch) : clickHand(state, rules, legal, s.player, s.at, touch);
    state = c.state;
    if (c.move) made.push(moveName(c.move));
  }
  return { state, made };
}
const status = (state: InputState) => inputStatus({
  pending: state.begun, refused: state.refused, anchors: anchorsOf(state.begun, legal), targets: targetsOf(state.begun, legal),
}, 1);

test("the legal moves: each blueprint's anchor hexes, and each cell's new places", () => {
  assert.deepEqual(legal.placements.get(1), [[1, 0], [-3, 0]]);
  assert.deepEqual(legal.placements.get(3), undefined);
  assert.deepEqual(legal.edits.get("1:2,0"), [hand(1, [0, 1]), hand(1, [-1, 1])]);
});

test("a placement: a blueprint chosen in the hand, then a marked anchor hex", () => {
  const begun = clicks({ player: 1, at: hand(1, [2, 0]) });
  assert.deepEqual(anchorsOf(begun.state.begun, legal), [[1, 0], [-3, 0]]);
  assert.equal(status(begun.state), "To place blueprint 1, click a marked anchor hex. To move the cell, click a marked hex in a blueprint.");
  const done = clicks({ player: 1, at: hand(1, [0, 0]) }, { board: [-3, 0] });
  assert.deepEqual(done.made, ["1@-3,0"]);
  assert.deepEqual(done.state, IDLE);
});

test("a click in a blueprint's panel off its cells chooses the blueprint alone", () => {
  const { state } = clicks({ player: 1, at: hand(2, [1, 1]) });
  assert.deepEqual(state.begun, { blueprint: 2, cell: null, shown: null });
  assert.equal(targetsOf(state.begun, legal), null);
  assert.equal(status(state), "To place blueprint 2, click a marked anchor hex.");
  assert.deepEqual(clicks({ player: 1, at: hand(2, [1, 1]) }, { board: [0, 1] }).made, ["2@0,1"]);
});

test("an edit: a cell chosen, then a marked new place, also outside the blueprint's cells or in an empty blueprint", () => {
  const cell = { player: 1 as const, at: hand(1, [2, 0]) };
  assert.deepEqual(targetsOf(clicks(cell).state.begun, legal), [hand(1, [0, 1]), hand(1, [-1, 1])]);
  assert.deepEqual(clicks(cell, { player: 1, at: hand(1, [-1, 1]) }).made, ["1:2,0>1:-1,1"]);
  assert.deepEqual(clicks({ player: 1, at: hand(1, [1, 0]) }, { player: 1, at: hand(3, [0, 0]) }).made, ["1:1,0>3:0,0"]);
  // The cell's blueprint is chosen too: a marked anchor hex places it.
  assert.deepEqual(clicks(cell, { board: [1, 0] }).made, ["1@1,0"]);
});

test("another cell, or the same cell again", () => {
  const other = clicks({ player: 1, at: hand(1, [2, 0]) }, { player: 1, at: hand(2, [0, 0]) });
  assert.deepEqual(other.state.begun, { blueprint: 2, cell: [0, 0], shown: null });
  const again = clicks({ player: 1, at: hand(1, [2, 0]) }, { player: 1, at: hand(1, [2, 0]) });
  assert.deepEqual(again.state, IDLE);
});

test("Escape: the input starts again", () => {
  // Escape calls reset, which gives IDLE: the state that nothing begun has.
  const { state } = clicks({ player: 1, at: hand(1, [2, 0]) });
  assert.notDeepEqual(state, IDLE);
  assert.equal(status(IDLE), null);
});

test("a click that is not legal does nothing, and the status says why", () => {
  const nothing = clicks({ board: [1, 0] });
  assert.deepEqual(nothing.state, { begun: null, refused: "nothing" });
  assert.equal(status(nothing.state), "First, click a blueprint in Red's hand.");

  const off = clicks({ player: 1, at: hand(1, [0, 0]) }, { board: [2, 0] });
  assert.deepEqual(off.made, []);
  assert.deepEqual(off.state.begun, { blueprint: 1, cell: [0, 0], shown: null });
  assert.equal(status(off.state), "Blueprint 1 cannot have its anchor cell on this hex. Click a marked anchor hex.");

  const opponent = clicks({ player: 0, at: hand(1, [0, 0]) });
  assert.deepEqual(opponent.state, { begun: null, refused: "opponent" });
  assert.equal(status(opponent.state), "Red moves now. Click a blueprint in Red's hand.");
});

test("a blueprint that has no legal placement", () => {
  const { state } = clicks({ player: 1, at: hand(3, [0, 0]) });
  assert.deepEqual(anchorsOf(state.begun, legal), []);
  assert.equal(status(state), "Blueprint 3 has no legal placement. Click a different blueprint.");
  const board = clicks({ player: 1, at: hand(3, [0, 0]) }, { board: [1, 0] });
  assert.deepEqual(board.made, []);
  assert.equal(status(board.state), "Blueprint 3 has no legal placement. Click a different blueprint.");
  // A cell with no legal edit, in a blueprint with legal placements.
  const cell = clicks({ player: 1, at: hand(1, [0, 0]) });
  assert.deepEqual(targetsOf(cell.state.begun, legal), []);
  assert.equal(status(cell.state), "To place blueprint 1, click a marked anchor hex. The cell has no legal edit.");
  // A cell with legal edits, in a blueprint with no legal placement.
  const noPlace = clickHand(IDLE, rules, legalOf({ ...rules, legal: ["1:2,0>1:0,1"] }), 1, hand(1, [2, 0]), false);
  assert.equal(inputStatus({ pending: noPlace.state.begun, refused: null, anchors: [], targets: [hand(1, [0, 1])] }, 1),
    "Blueprint 1 has no legal placement. To move the cell, click a marked hex in a blueprint.");
});

test("on a touch screen, the first tap shows the move, and a second tap on the same hex makes it", () => {
  const shown = clicks({ touch: true }, { player: 1, at: hand(1, [2, 0]) }, { board: [1, 0] });
  assert.deepEqual(shown.made, []);
  assert.deepEqual(shown.state.begun?.shown, { type: "place", at: [1, 0] });
  assert.equal(status(shown.state), "To place blueprint 1 here, tap the footprint again.");
  assert.deepEqual(clicks({ touch: true }, { player: 1, at: hand(1, [2, 0]) }, { board: [1, 0] }, { board: [-3, 0] })
    .state.begun?.shown, { type: "place", at: [-3, 0] });
  assert.deepEqual(clicks({ touch: true }, { player: 1, at: hand(1, [2, 0]) }, { board: [1, 0] }, { board: [1, 0] }).made,
    ["1@1,0"]);

  const edit = clicks({ touch: true }, { player: 1, at: hand(2, [0, 0]) }, { player: 1, at: hand(1, [3, 0]) });
  assert.deepEqual(edit.state.begun?.shown, { type: "edit", to: hand(1, [3, 0]) });
  assert.equal(status(edit.state), "To move the cell here, tap the same hex again.");
  assert.deepEqual(clicks({ touch: true }, { player: 1, at: hand(2, [0, 0]) }, { player: 1, at: hand(1, [3, 0]) },
    { player: 1, at: hand(1, [3, 0]) }).made, ["2:0,0>1:3,0"]);
});

test("an edit back to the cell's own place, when it is legal, is a marked hex like the others", () => {
  const own: InputRules = { ...rules, legal: ["2:0,0>2:0,0"] };
  const ownLegal = legalOf(own);
  const first = clickHand(IDLE, own, ownLegal, 1, hand(2, [0, 0]), false);
  const second = clickHand(first.state, own, ownLegal, 1, hand(2, [0, 0]), false);
  assert.equal(second.move && moveName(second.move), "2:0,0>2:0,0");
});

test("a tap on the board: on the shown footprint, near a marked anchor hex, or else on its own hex", () => {
  const anchors: Hex[] = [[1, 0], [-3, 0]];
  const begun = { blueprint: 1 as const, cell: null, shown: { type: "place" as const, at: [1, 0] as Hex } };
  // On the footprint's third cell: the shown anchor hex.
  assert.deepEqual(tapHex([3, 0], center([3, 0]), begun, [[1, 0], [2, 0], [3, 0]], anchors), [1, 0]);
  // Nothing shown: the nearest marked anchor hex within 2 units (a touching hex is √3 away), else the hex.
  assert.deepEqual(tapHex([-2, 0], center([-2, 0]), null, [], anchors), [-3, 0]);
  assert.deepEqual(tapHex([-5, 0], center([-5, 0]), null, [], anchors), [-5, 0]);
  assert.deepEqual(tapHex([1, 0], center([1, 0]), null, [], anchors), [1, 0]);
});
