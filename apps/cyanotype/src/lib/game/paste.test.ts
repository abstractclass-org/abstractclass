// Checks the moves pasted in the Analysis board's Import (paste.ts): a record or a plain list of moves, from the
// standard start or from a position given apart, and where a record that cannot be read is wrong. The moves are Stamp
// Duty's own (the review's test game, review/fixtures/stamp-duty.txt). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FIXTURE_DATA } from "../board/fixtures.ts";
import { readPasted } from "./paste.ts";
import { STANDARD_START, writePosition } from "./position.ts";
import { parseRecord } from "./record.ts";

const game = parseRecord(readFileSync(join(import.meta.dirname, "..", "review", "fixtures", "stamp-duty.txt"), "utf8")).moves;
// The lab's middle game after 9 moves of Stamp Duty's own game: Red's first move of turn 6.
const middle = FIXTURE_DATA.fixtures.find(f => f.name === "A middle game")!;
const MIDDLE = writePosition(middle.position);

test("a pasted list of moves is the main line from the standard start", () => {
  const p = readPasted(game.slice(0, 5).join(" "));
  assert.deepEqual(p.record.moves, game.slice(0, 5));
  assert.equal(p.record.tags.Position, undefined);
});

test("moves pasted with a position start from it: the position becomes the record's Position tag", () => {
  const p = readPasted("2@5,-2 1:0,0>3:1,-1", MIDDLE);
  assert.equal(p.record.tags.Position, MIDDLE);
  assert.ok(p.recordText.startsWith(`[Position "${MIDDLE}"]\n`));
  assert.deepEqual(p.record.moves, ["2@5,-2", "1:0,0>3:1,-1"]);
  // A record with turn numbers takes the start's own turn: Red's move of turn 6 opens with "6."
  assert.deepEqual(readPasted("6. 2@5,-2 1:0,0>3:1,-1 *", MIDDLE).record.moves, ["2@5,-2", "1:0,0>3:1,-1"]);
  assert.throws(() => readPasted("1. 2@5,-2 *", MIDDLE), /turn 1\. where the notation gives turn 6\. \(line 1, column 1\)/);
});

test("a record's own Position tag must be the position given, or absent", () => {
  const tagged = `[Position "${MIDDLE}"]\n\n6. 2@5,-2 *`;
  assert.equal(readPasted(tagged, MIDDLE).record.tags.Position, MIDDLE);
  assert.equal(readPasted(tagged).record.tags.Position, MIDDLE); // no position given: the record's own start
  assert.throws(() => readPasted(tagged, STANDARD_START), /the record's Position tag is not the position that you gave/);
});

test("a record that cannot be read says where, in the pasted text", () => {
  assert.throws(() => readPasted("1. 2@-6,-2\n2. 2@5"), /not a move, a turn label or a result: 2@5 \(line 2, column 4\)/);
  // The start's tag, put before the pasted text, is not in its lines.
  assert.throws(() => readPasted("6. 2@5,-2\n2@5", MIDDLE), /not a move, a turn label or a result: 2@5 \(line 2, column 1\)/);
});
