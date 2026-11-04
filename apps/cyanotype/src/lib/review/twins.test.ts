import { test } from "node:test";
import assert from "node:assert/strict";
import { distinctCandidates, judgeBranchMove, judgeTurn, otherCandidate, rankOf, sameMove, twinsOf, withTwins,
         type Analysis } from "@abstractclass/analysis/model.ts";
import { sameNodes } from "@abstractclass/analysis/tree.ts";
import { afterKey, blueprints, handAfter, shortNote, type MoveReview, type Position } from "./blueprints.ts";
import type { Hand } from "../board/position.ts";
import type { Move } from "../game/notation.ts";

// Two moves with different names that give one position are one move in the review (design 33, item 9): the key of
// the position that a move gives (afterKey), and each place of the review that compares two moves of one position.
// The position: the review's test game (fixtures/stamp-duty.txt) after 83 moves, Blue to move. Blue's blueprint 1 is
// a star with a plain cell beside it. The engine's first choice moves the star (1:0,0>1:2,-1), and its fourth moves
// the plain cell (1:1,0>1:-1,1): both leave the plain cell at -1,1 of the star, the same hand. The candidates are the
// engine's reply there at 512 visits (engine-70dfdc0f, b6c96-s22323968-d845223), cut to their first two moves.
const BLUE: Hand = [
  { "0,0": "star", "1,0": "plain" },
  { "-1,2": "star", "-1,3": "wall", "-2,2": "plain", "-2,4": "plain", "-3,5": "plain", "0,0": "plain", "0,1": "wall",
    "0,2": "star", "0,3": "star", "1,1": "star", "1,2": "wall", "2,2": "plain" },
  { "-1,1": "plain", "-1,2": "plain", "0,0": "plain", "0,1": "star", "0,2": "plain", "1,0": "plain", "1,1": "plain" },
];
const RED: Hand = [
  { "0,0": "star", "1,0": "plain" },
  { "-1,2": "wall", "-1,3": "star", "-2,2": "plain", "0,0": "plain", "0,1": "star", "0,2": "star", "0,3": "wall",
    "0,4": "plain", "1,1": "wall", "1,2": "star", "2,2": "plain", "3,1": "plain" },
  { "-1,1": "plain", "-1,2": "plain", "0,0": "plain", "0,1": "star", "0,2": "plain", "1,0": "plain", "1,1": "plain" },
];
const AT_83 = { player: 0, blueprints: [BLUE, RED], stars: [0, 0] } as unknown as Position;
const move = (name: string) => blueprints.parseMove(name);
const STAR = "1:0,0>1:2,-1", PLAIN = "1:1,0>1:-1,1", OTHER = "1:0,0>1:1,-1"; // OTHER: the plain cell below the star

const ENGINE: [string, number, number, number, number, string][] = [ // move, visits, win, lead, prior, next move
  [STAR, 76, 0.152558369, -223.524532, 0.124106668, "1@8,-1"],
  ["1@3,-3", 41, 0.126854258, -216.208469, 0.0632815063, "2@7,-9"],
  ["2@-13,1", 51, 0.129171727, -214.177313, 0.109088846, "2@21,19"],
  [PLAIN, 16, 0.128644407, -255.948633, 0.135326281, "1@8,-1"],
];
const analysis = (only = ENGINE): Analysis<Move> => ({
  blueWin: 0.152558369, visits: 514, lead: -223.524532,
  candidates: only.map(([m, visits, blueWin, lead, prior, next]) => ({ edge: move(m), visits, blueWin, lead, prior, line: [move(m), move(next)] })),
});
const names = (a: Analysis<Move>) => a.candidates.map(c => `${blueprints.moveName(c.edge)}${c.twinOf ? ` = ${blueprints.moveName(c.twinOf)}` : ""}`);

test("two edits that give one hand have one key, and an edit that gives another hand has its own", () => {
  assert.deepEqual(handAfter(BLUE, move(STAR) as Extract<Move, { kind: "edit" }>)?.[0], { "-1,1": "plain", "0,0": "star" });
  assert.deepEqual(handAfter(BLUE, move(PLAIN) as Extract<Move, { kind: "edit" }>)?.[0], { "0,0": "star", "-1,1": "plain" });
  assert.equal(afterKey(move(STAR), AT_83), afterKey(move(PLAIN), AT_83));
  assert.notEqual(afterKey(move(STAR), AT_83), afterKey(move(OTHER), AT_83));
  // The other player's hand is not the mover's: the same edit from Red's hand gives another position
  assert.notEqual(afterKey(move(STAR), { player: 1, blueprints: [BLUE, RED] }), afterKey(move(STAR), AT_83));
  // At the start, blueprints 1 and 3 are equal: placed on one anchor hex, they give one position, and blueprint 2 another
  const start = { player: 0, blueprints: [[BLUE[2], BLUE[1], BLUE[2]], RED] } as unknown as Position;
  assert.equal(afterKey(move("1@-1,-4"), start), afterKey(move("3@-1,-4"), start));
  assert.notEqual(afterKey(move("1@-1,-4"), start), afterKey(move("2@-1,-4"), start));
  // A move that the hand cannot make keeps its name: an empty blueprint's two placements are two moves
  const empty = { player: 0, blueprints: [[{}, {}, {}], RED] } as unknown as Position;
  assert.notEqual(afterKey(move("1@-1,-4"), empty), afterKey(move("1@0,-4"), empty));
});

test("the engine's two candidates that give one hand are one move: one row, one rank, Best for either", () => {
  const raw = analysis(), a = withTwins(blueprints, raw, AT_83);
  // The engine's fourth choice is the twin of its first: one row of the table, and their rank on the board
  assert.deepEqual(names(a), [STAR, "1@3,-3", "2@-13,1", `${PLAIN} = ${STAR}`]);
  assert.deepEqual(distinctCandidates(a).map(c => blueprints.moveName(c.edge)), [STAR, "1@3,-3", "2@-13,1"]);
  assert.deepEqual(twinsOf(blueprints, a, a.candidates[0]).map(c => blueprints.moveName(c.edge)), [PLAIN]);
  assert.equal(rankOf(blueprints, a, move(PLAIN)), 1);
  assert.equal(sameMove(blueprints, a, move(STAR), move(PLAIN)), true);
  assert.equal(sameMove(blueprints, a, move(STAR), move(OTHER)), false);
  // The best other move than the one played (a Great's confirmation): not the first choice, the same move
  assert.equal(blueprints.moveName(otherCandidate(blueprints, a, [move(PLAIN)])!.edge), "1@3,-3");
  // The label: the move played gives the first choice's position, so it is Best
  const after = { blueWin: 0.152558369, blueScore: -223.524532, visits: 512 };
  assert.equal(judgeBranchMove(blueprints, a, after, 0, move(PLAIN)), "best");
  assert.equal(judgeBranchMove(blueprints, a, after, 0, move(OTHER)), "excellent");
  // A turn of two, the first choice's line with the other edit first: Best, though the middle has no search yet
  assert.equal(judgeTurn(blueprints, 0, [move(PLAIN), move("1@8,-1")], a, undefined, after, false, undefined, undefined,
                         undefined)?.label, "best");
  // The engine's analysis as it came, without the game's key, keeps them two
  assert.equal(rankOf(blueprints, raw, move(PLAIN)), 4);
});

test("a move of the tree that gives a candidate's hand under another name is that candidate's twin", () => {
  // The engine's reply without its fourth choice, and the game's move that gives the first choice's hand
  const a = withTwins(blueprints, analysis(ENGINE.slice(0, 3)), AT_83, [move(PLAIN), move(OTHER)]);
  assert.deepEqual(names(a), [STAR, `${PLAIN} = ${STAR}`, "1@3,-3", "2@-13,1"]);
  const twin = a.candidates[1];
  assert.equal(twin.prior, undefined); // the network gave its prior to the first choice: the meter counts it once
  assert.deepEqual(twin.line?.map(m => blueprints.moveName(m)), [PLAIN, "1@8,-1"]);
  assert.equal(rankOf(blueprints, a, move(PLAIN)), 1);
  assert.equal(rankOf(blueprints, a, move(OTHER)), 0); // another hand: not a candidate
  assert.equal(withTwins(blueprints, analysis(ENGINE.slice(0, 3)), AT_83, [move(OTHER)]).candidates.length, 3);
});

test("the move list's note names the engine's choice only for a move that gives another position", () => {
  const best = withTwins(blueprints, analysis(), AT_83).candidates[0];
  const note = (edge: string) => shortNote({ player: 0, edge: move(edge), label: null, best } as unknown as MoveReview, AT_83);
  assert.equal(note(PLAIN), "Not analyzed yet.");
  assert.notEqual(note(OTHER), "Not analyzed yet.");
});

test("the tree takes a move that gives the same hand as a move of the tree along that move", () => {
  // The tree has the first choice from position 83; the other edit goes along it, and an edit of another hand does not
  const children = (path: string[]) => (path.length ? [] : [STAR]);
  const keyAt = (path: string[], name: string) => (path.length ? null : afterKey(move(name), AT_83));
  assert.deepEqual(sameNodes([PLAIN, "1@8,-1"], children, keyAt), [STAR, "1@8,-1"]);
  assert.deepEqual(sameNodes([OTHER], children, keyAt), [OTHER]);
});
