// Checks Blueprints' game record (record.ts) and its capture marks' check (check.ts) on hand-made games, with the moves'
// effects given by hand where the engine will give them. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { markCaptures, parseRecord, RecordError, setUpProblem, withStart, writeRecord } from "./record.ts";
import { STANDARD_START } from "./position.ts";
import { checkCaptures, type Effect } from "./check.ts";

const GAME = `[Event "Casual"]\n[Blue "ann"]\n[Red "bob"]\n\n` +
  `1. 2@-6,-2 { [%clk 0:00:58] } 2. 1:0,0>3:1,-1?! 2@5,-2x+24 { [%eval 0.42 -30 120] } ` +
  `(2. 3@4,-1 1@4,1) 3. 1@-8,2x pass 4. 2:0,0>2:1,2 3@3,1!! r+R`;

test("a record: the tags, the turns, the moves with their marks, the commands and the result", () => {
  const r = parseRecord(GAME);
  assert.deepEqual([r.tags.Blue, r.tags.Red], ["ann", "bob"]);
  assert.deepEqual(r.moves, ["2@-6,-2", "1:0,0>3:1,-1", "2@5,-2", "1@-8,2", "pass", "2:0,0>2:1,2", "3@3,1"]);
  assert.deepEqual(r.marked, [null, null, { points: 24 }, { points: 0 }, null, null, null]);
  assert.equal(r.clocks[0], "0:00:58");
  assert.deepEqual(r.evals[2], { blueWin: 0.42, margin: -30, spread: 120 });
  assert.equal(r.result, "r+R");
});

test("a pass is one move: the turns go on in twos after it", () => {
  assert.deepEqual(parseRecord("1. pass 2. 2@5,-2 pass 3. 1@-8,2 *").moves, ["pass", "2@5,-2", "pass", "1@-8,2"]);
  assert.throws(() => parseRecord("1. pass 3. 2@5,-2"), /turn 3 where the notation gives turn 2/);
});

test("a malformed move is refused with its place in the text", () => {
  const at = (text: string) => {
    try { parseRecord(text); } catch (e) { assert.ok(e instanceof RecordError); return [e.message, e.offset]; }
    assert.fail(`no error: ${text}`);
  };
  assert.deepEqual(at("1. 2@-6,-2 2. 4@1,1"), ["a blueprint's number is 1, 2 or 3: 4@1,1", 14]);
  assert.deepEqual(at("1. 2@-6,-2x+0?"), ["a placement that scores no points has the mark x, not x+0: 2@-6,-2x+0?", 3]);
  assert.deepEqual(at("1. 1:0,0>3:1,-1x"), ["only a placement has a capture mark: an edit captures no cells: 1:0,0>3:1,-1x", 3]);
  assert.deepEqual(at("1. 2@-6 *"), ["not a move, a turn label or a result: 2@-6", 3]);
});

test("the Komi tag: up to the engine's limit, 90,980 points either way, and beyond it an error that names it", () => {
  // The frame's check and its message: packages/record's record.test.ts. Here, Blueprints' limit.
  assert.equal(parseRecord('[Komi "90980"]\n\n1. 2@-6,-2 *').komi, 90980);
  assert.equal(parseRecord('[Komi "-6000"]\n\n1. 2@-6,-2 *').komi, -6000); // beyond Enclosure's limit
  assert.throws(() => parseRecord('[Komi "-90980.5"]\n\n1. 2@-6,-2 *'),
                /: the Komi tag must be from -90,980 to 90,980 points: -90980\.5$/);
});

test("a record from a set-up start numbers its turns from the start's moves played", () => {
  // The standard start's board and hands, at Red's second move of turn 12 (22 moves played).
  const start = STANDARD_START.replace(/ b1 0\/0 0$/, " r1 0/0 22");
  const r = parseRecord(`[Position "${start}"]\n\n12... 2@5,-2 13. 2@-6,-2 1@-8,2 *`);
  assert.equal(r.tags.Position, start);
  assert.deepEqual(r.moves, ["2@5,-2", "2@-6,-2", "1@-8,2"]);
  assert.throws(() => parseRecord(`[Position "${start}"]\n\n1. 2@5,-2 *`), /turn 1\. where the notation gives turn 12\.\.\./);
  // A plain list of moves takes the start's turns too, and the Import's start given apart becomes the record's tag.
  assert.equal(parseRecord(withStart("2@5,-2 2@-6,-2", start)).tags.Position, start);
  assert.equal(withStart("2@5,-2", STANDARD_START), "2@5,-2"); // the standard start is no set-up start
  assert.equal(parseRecord('[Position "?"]\n\n1. 2@-6,-2 *').moves.length, 1);
  // The review takes games from the standard start only, and says where a set-up start opens.
  assert.match(setUpProblem(r, "Cyanotype") ?? "", /^This game starts from another position\. Cyanotype reviews games from the standard start only: open it on the Analysis board\.$/);
  assert.equal(setUpProblem(parseRecord(`[Position "${STANDARD_START}"]\n\n1. 2@-6,-2 *`), "Cyanotype"), null);
});

test("a record written and read back", () => {
  const moves = ["2@-6,-2", "1:0,0>3:1,-1", "2@5,-2x+24", "pass"];
  const text = writeRecord({ Blue: "ann", Red: "bob" }, moves, [{ number: 1, moves: 1 }, { number: 2, moves: 2 }, { number: 3, moves: 1 }]);
  assert.match(text, /\n\n1\. 2@-6,-2 2\. 1:0,0>3:1,-1 2@5,-2x\+24 3\. pass \*\n$/);
  assert.deepEqual(parseRecord(text).marked, [null, null, { points: 24 }, null]);
});

/** The moves' effects in GAME, as the engine would give them: 1@-8,2 captures cells and scores nothing. */
const EFFECTS: Effect[] = [
  { captured: 0, points: 0 }, { captured: 0, points: 0 }, { captured: 3, points: 24 }, { captured: 2, points: 0 },
  { captured: 0, points: 0 }, { captured: 0, points: 0 }, { captured: 1, points: 6 },
];

test("the capture marks: confirmed by the moves' effects, and written where the record has none", () => {
  const r = parseRecord(GAME);
  const checked = checkCaptures(r, EFFECTS);
  assert.equal(checked.problem, null);
  const marked = markCaptures(GAME, r, checked.captures);
  assert.match(marked, / 3@3,1x\+6!! r\+R$/); // after the move, before its quality mark
  assert.match(marked, / 2@5,-2x\+24 /); // a mark that the record has stays as it is
  assert.deepEqual(parseRecord(marked).marked, checked.captures);
});

test("a capture mark that the move's effects do not confirm is refused", () => {
  const problem = (text: string, effects: Effect[]) => checkCaptures(parseRecord(text), effects).problem;
  const none = { captured: 0, points: 0 }, captures = { captured: 2, points: 0 }, scores = { captured: 2, points: 24 };
  assert.equal(problem("1. 2@-6,-2x", [none]), "Move 1 (2@-6,-2x) has the mark x, but the move captures no opponent cells.");
  assert.equal(problem("1. 2@-6,-2 2. 2@5,-2x", [none, scores]),
               "Move 2 (2@5,-2x) has the mark x. The move scores 24 points, so its mark is x+24.");
  assert.equal(problem("1. 2@-6,-2x+24", [captures]),
               "Move 1 (2@-6,-2x+24) has the mark x+24. The move scores no points, so its mark is x.");
  assert.equal(problem("1. 2@-6,-2x+2", [{ captured: 1, points: 1 }]),
               "Move 1 (2@-6,-2x+2) has the mark x+2. The move scores 1 point, so its mark is x+1.");
  assert.equal(problem("1. 2@-6,-2", [scores]), null); // no mark: the record gets one
  assert.throws(() => checkCaptures(parseRecord("1. 2@-6,-2"), []), /0 effects for 1 moves/);
});
