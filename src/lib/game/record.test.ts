// Checks the game-record reader on the notation design's own examples (the engine repository's
// docs/design/04-notation-and-protocol.md) and on a round trip of the sample game. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalEdge, markCuts, parseRecord, withStart, writeRecord, RecordError } from "./record.ts";
import { readPasted } from "./paste.ts";

test("an edge has one spelling: the lower point first", () => {
  assert.equal(canonicalEdge("E11-D10"), "D10-E11");
  assert.equal(canonicalEdge("d10-e11"), "D10-E11");
  assert.equal(canonicalEdge("Q10-Q13"), "Q10-Q13");
  assert.throws(() => canonicalEdge("I10-J10")); // no I in GTP's columns
});

test("turns, a pass, and a result", () => {
  const r = parseRecord("1. D10-G10 2. N11-Q10 L10-N11 3. D10-G9 G9-H10 4. N9-Q10 pass b+28");
  assert.deepEqual(r.moves, ["D10-G10", "N11-Q10", "L10-N11", "D10-G9", "G9-H10", "N9-Q10", "pass"]);
  assert.equal(r.result, "b+28");
});

test("tags, evaluations and clocks in comments (the design's example)", () => {
  const text = `[Event "Casual"]\n[Blue "a \\"quoted\\" name"]\n\n1. D10-G10 { [%eval 0.55 +95 205] } 2. L10-N12 { [%eval 0.55 +95 205] } N12-P10 { [%eval 0.61 +130 200] [%clk 0:00:41] } *`;
  const r = parseRecord(text);
  assert.equal(r.tags.Event, "Casual");
  assert.equal(r.tags.Blue, 'a "quoted" name');
  assert.deepEqual(r.evals[2], { blueWin: 0.61, margin: 130, spread: 200 });
  assert.equal(r.clocks[2], "0:00:41");
  assert.equal(r.clocks[0], null);
});

test("branches are skipped, after the turn they change (the design's examples)", () => {
  const r = parseRecord("1. D10-G10 2. N11-Q10 L10-N11 3. D10-G9 G9-H10 (3. D10-F13 F13-G10) 4. N9-Q10 L10-N9 (4... M12-N9) (4. N9-Q11 M12-N9) 5. G9-H8");
  assert.deepEqual(r.moves.slice(3), ["D10-G9", "G9-H10", "N9-Q10", "L10-N9", "G9-H8"]);
});

test("quality marks: read after any edge, a pass or a cut mark, and dropped", () => {
  const text = "1. D10-G10! 2. N11-Q10x?! L10-N11?? 3. D10-G9? G9-H10!? 4. pass?? *";
  const r = parseRecord(text);
  assert.deepEqual(r.moves, ["D10-G10", "N11-Q10", "L10-N11", "D10-G9", "G9-H10", "pass"]);
  assert.deepEqual(r.marked, [false, true, false, false, false, false]);
  // The cut mark goes before a quality mark: G9-G12x??
  assert.equal(markCuts("1. D10-G10?? *", parseRecord("1. D10-G10?? *"), [true]), "1. D10-G10x?? *");
});

test("the cut mark: read with or without it, and written after the move", () => {
  const text = "1. D10-G10 2. N11-Q10x L10-N11 { [%clk 0:00:41] } 3. D10-G9 G9-H10 *";
  const r = parseRecord(text);
  assert.deepEqual(r.moves.slice(0, 3), ["D10-G10", "N11-Q10", "L10-N11"]);
  assert.deepEqual(r.marked, [false, true, false, false, false]);
  assert.equal(r.clocks[2], "0:00:41");
  assert.equal(markCuts(text, r, [false, true, true, false, true]),
               "1. D10-G10 2. N11-Q10x L10-N11x { [%clk 0:00:41] } 3. D10-G9 G9-H10x *");
});

test("a bare list of edges", () => {
  assert.deepEqual(parseRecord("D10-G10 N11-Q10 L10-N11").moves, ["D10-G10", "N11-Q10", "L10-N11"]);
});

test("errors name what is wrong and where", () => {
  for (const bad of ["1. D10-G10 3. N11-Q10", "1. D10-Z99", "1. D10-G10 (2. N11-Q10", "1. D10-G10 b+3 2. N11-Q10", ""])
    assert.throws(() => parseRecord(bad), RecordError, bad);
});

test("the sample game, written and read back", () => {
  const sample = JSON.parse(readFileSync(new URL("../mock/review.json", import.meta.url), "utf8"));
  const cols = "ABCDEFGHJKLMNOPQRST";
  const moves: string[] = sample.moves.map((m: { edge: number[] }) =>
    canonicalEdge(`${cols[m.edge[0]]}${m.edge[1] + 1}-${cols[m.edge[2]]}${m.edge[3] + 1}`));
  const turns: { number: number; moves: number }[] = [];
  sample.moves.forEach((m: { player: number }, i: number) => {
    if (i && m.player === sample.moves[i - 1].player) turns[turns.length - 1].moves++;
    else turns.push({ number: turns.length + 1, moves: 1 });
  });
  const text = writeRecord({ Blue: sample.players.blue, Red: sample.players.red }, moves, turns, "r+60.5");
  assert.match(text, /\n\n1\. \S+ 2\. \S+ \S+ 3\. /);
  const r = parseRecord(text);
  assert.deepEqual(r.moves, moves);
  assert.equal(r.tags.Blue, sample.players.blue);
  assert.equal(r.result, "r+60.5");
});

test("a record from a set-up start numbers its turns from the start's, as PGN numbers moves from a FEN", () => {
  // Edge count 3: Blue to play the first edge of turn 3.
  const opens = parseRecord('[Position "A10-D10 Q10-T10 b2 0/0 3"]\n\n3. D10-G10 G10-K9 4. N9-Q10 *');
  assert.deepEqual(opens.moves, ["D10-G10", "G10-K9", "N9-Q10"]);
  // Edge count 2: Red to play the second edge of turn 2, which annotate.ts writes as `2...`.
  const continues = parseRecord('[Position "A10-D10 Q10-T10 r1 0/0 2"]\n\n2... N9-Q10 3. D10-G10 *');
  assert.deepEqual(continues.moves, ["N9-Q10", "D10-G10"]);
  // Only the start's own number (the engine repository's design 04, request 19): numbered from 1, the first turn
  // would be Blue's turn 1, and at a turn's second edge the number needs its `...`.
  assert.throws(() => parseRecord('[Position "A10-D10 Q10-T10 b2 0/0 3"]\n\n1. D10-G10 G10-K9 2. N9-Q10 *'), /turn 1\. where turn 3\. was expected/);
  assert.throws(() => parseRecord('[Position "A10-D10 Q10-T10 r1 0/0 2"]\n\n2. N9-Q10 *'), /turn 2\. where turn 2\.\.\. was expected/);
  assert.throws(() => parseRecord("1... N9-Q10 *"), /turn 1\.\.\. where turn 1\. was expected/);
});

test("a start given apart is read as the record's own Position tag, so its turns count from the start's", () => {
  const start = "A10-D10 Q10-T10 b2 0/0 3";
  assert.equal(withStart("3. D10-G10 *", start), `[Position "${start}"]\n3. D10-G10 *`);
  assert.equal(withStart(`[Position "${start}"]\n\n3. D10-G10 *`, start), `[Position "${start}"]\n\n3. D10-G10 *`); // its own
  assert.equal(withStart("1. D10-G10 *", "A10-D10 Q10-T10 b1 0/0 0"), "1. D10-G10 *"); // the standard start
  assert.equal(withStart("1. D10-G10 *", null), "1. D10-G10 *");
  assert.deepEqual(readPasted("3. D10-G10 G10-K9 *", start).record.moves, ["D10-G10", "G10-K9"]);
  // The problem's place is in the pasted text, not in the tag put before it.
  assert.throws(() => readPasted("1. D10-G10 *", start), /turn 1\. where turn 3\. was expected \(line 1, column 1\)/);
});
