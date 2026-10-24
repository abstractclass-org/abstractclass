// Checks a strategyjam.org game of Blueprints as a record (strategyjam.ts), on hand-made games from the standard start.
// Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { jamRecord, type JamGame } from "./strategyjam.ts";
import { parseRecord } from "./record.ts";

/** The standard start, as strategyjam.org gives a game's `initial`: each hex with its owner and kind, and each player's
 *  three blueprints in their own frames. Written out cell by cell, apart from the import's own way to make it. */
const plain = { "0,1": "star", "1,1": "plain", "1,0": "plain", "0,0": "plain", "-1,1": "plain", "-1,2": "plain", "0,2": "plain" };
const INITIAL = {
  ply: 0,
  cells: {
    "-6,0": [0, "star"], "-5,0": [0, "plain"], "-5,-1": [0, "plain"], "-6,-1": [0, "plain"], "-7,0": [0, "plain"], "-7,1": [0, "plain"], "-6,1": [0, "plain"],
    "-10,0": [0, "star"], "-9,0": [0, "wall"], "-9,-1": [0, "star"], "-10,-1": [0, "wall"], "-11,0": [0, "star"], "-11,1": [0, "wall"], "-10,1": [0, "star"],
    "-2,0": [0, "star"], "-1,0": [0, "plain"], "-1,-1": [0, "plain"], "-2,-1": [0, "plain"], "-3,0": [0, "plain"], "-3,1": [0, "plain"], "-2,1": [0, "plain"],
    "6,0": [1, "star"], "7,0": [1, "plain"], "7,-1": [1, "plain"], "6,-1": [1, "plain"], "5,0": [1, "plain"], "5,1": [1, "plain"], "6,1": [1, "plain"],
    "10,0": [1, "star"], "11,0": [1, "star"], "11,-1": [1, "wall"], "10,-1": [1, "star"], "9,0": [1, "wall"], "9,1": [1, "star"], "10,1": [1, "wall"],
    "2,0": [1, "star"], "3,0": [1, "plain"], "3,-1": [1, "plain"], "2,-1": [1, "plain"], "1,0": [1, "plain"], "1,1": [1, "plain"], "2,1": [1, "plain"],
  },
  blueprints: [
    [plain, { "0,1": "star", "1,1": "wall", "1,0": "star", "0,0": "wall", "-1,1": "star", "-1,2": "wall", "0,2": "star" }, plain],
    [plain, { "0,1": "star", "1,1": "star", "1,0": "wall", "0,0": "star", "-1,1": "wall", "-1,2": "star", "0,2": "wall" }, plain],
  ],
  scores: [0, 0],
};
/** A hand-made game of 120 moves: placements, edits and passes, in the site's strings. */
const MOVES = ["2@-6,-2", "1:0,0>3:1,-1", "2@5,-2", "1@-8,2", "pass", "2:0,0>2:1,2", "3@3,1"];
const WHOLE = Array.from({ length: 120 }, (_, i) => MOVES[i % MOVES.length]);
const STARTED = Date.UTC(2026, 9, 24, 21, 30);
const game = (more: Partial<JamGame> = {}): JamGame => ({
  id: "abc123", rules: "blueprints", version: 3, seats: ["ann", "bob"], initial: INITIAL, history: WHOLE,
  scores: [180, 204], result: { winner: 1, reason: "higher score" }, startedAt: STARTED,
  clock: { initialMs: 60000, incrementMs: 15000 }, ...more,
});

test("a whole game becomes its record: First is Blue, the site's strings as they are, the margin from the scores", () => {
  const text = jamRecord(game());
  assert.match(text, /\n\n1\. 2@-6,-2 2\. 1:0,0>3:1,-1 2@5,-2 3\. 1@-8,2 pass 4\. /); // one move, then two a turn
  assert.match(text, / 61\. \S+ r\+24\n$/); // 120 moves: the last turn has one
  const r = parseRecord(text); // which also checks the turns' numbers
  assert.deepEqual(r.moves, WHOLE);
  assert.deepEqual([r.tags.Site, r.tags.Date, r.tags.Blue, r.tags.Red, r.tags.Result],
                   ["https://strategyjam.org/blueprints/game/abc123", "2026.10.24", "ann", "bob", "r+24"]);
  assert.deepEqual([r.tags.GameId, r.tags.Scores, r.tags.Termination], ["abc123", "180/204", "normal"]);
});

test("the result: a resignation, a forfeit, a draw, an aborted game, and a game that goes on", () => {
  const early = WHOLE.slice(0, 31);
  const result = (winner: number | null, reason: string, more: Partial<JamGame> = {}) =>
    parseRecord(jamRecord(game({ history: early, result: { winner, reason }, ...more })));
  assert.deepEqual([result(1, "resignation").result, result(1, "resignation").tags.Termination], ["r+R", "resignation"]);
  assert.deepEqual([result(0, "no-show").result, result(0, "timeout").tags.Termination], ["b+F", "forfeit"]);
  assert.equal(result(null, "tournament-start adjudication").result, "0");
  assert.equal(result(null, "tied score", { history: WHOLE }).tags.Termination, "normal");
  assert.equal(parseRecord(jamRecord(game({ result: { winner: 1, reason: "higher score", aborted: true } }))).result, "*");
  const going = parseRecord(jamRecord(game({ history: early, result: null })));
  assert.deepEqual([going.result, going.tags.Scores], ["*", undefined]); // the scores so far are not the final scores
  assert.equal(parseRecord(jamRecord(game({ scores: null }))).result, "*"); // the rules ended it, but with no scores
});

test("the tags without a start time, and no TimeControl: strategyjam.org's increment is for each move", () => {
  const r = parseRecord(jamRecord(game({ startedAt: null, seats: [null, "bob"] })));
  assert.deepEqual([r.tags.Date, r.tags.TimeControl, r.tags.Blue], ["????.??.??", undefined, "?"]);
});

test("a game of another game, another rules version or another start, or with no moves, is refused", () => {
  assert.throws(() => jamRecord(game({ rules: "enclosure" })), /not of Blueprints/);
  assert.throws(() => jamRecord(game({ version: 2 })), /version 2/);
  assert.throws(() => jamRecord(game({ history: [] })), /no moves/);
  assert.throws(() => jamRecord(game({ history: ["2@-6,-2", "4@1,1"] })), /move 2 is not a move of Blueprints/);
  const cells = { ...INITIAL.cells, "-6,0": [0, "wall"] };
  assert.throws(() => jamRecord(game({ initial: { ...INITIAL, cells } })), /standard start/);
  const blueprints = [INITIAL.blueprints[1], INITIAL.blueprints[0]];
  assert.throws(() => jamRecord(game({ initial: { ...INITIAL, blueprints } })), /standard start/);
  assert.throws(() => jamRecord(game({ initial: null })), /standard start/);
});
