// Constellation's export into this site's record (constellation.ts). Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { constellationRecord, isConstellation } from "./constellation.ts";
import { parseRecord } from "./record.ts";

// The first turns of an export from Constellation's analysis board: one edge, a path, two edges apart, a path.
const EXPORT = "[B:A10-D10 R:P10-S10] D10-A7 P10-M10-J7 A7-A10,A7-D4 J7-L10-J13";

test("an export is recognised by its start", () => {
  assert.ok(isConstellation(EXPORT));
  assert.ok(isConstellation("  [A:3 B:A10-D10 R:P10-S10] D10-A7"));
  assert.ok(!isConstellation('[Blue "you"] [Red "them"]\n1. D10-G10'));
  assert.ok(!isConstellation("D10-G10 N11-Q10"));
});

test("columns keep their place in the alphabet without I, and each edge is written lower point first", () => {
  // P10-M10-J7 is P10-M10 then M10-J7: Q10-N10 and N10-K7 here, written N10-Q10 and K7-N10.
  assert.equal(constellationRecord(EXPORT),
               '[Site "Constellation"]\n\n1. A7-D10 2. N10-Q10 K7-N10 3. A7-A10 A7-D4 4. K7-M10 K13-M10');
  assert.equal(constellationRecord("[B:A10-D10 R:P10-S10] I4-S1").split("\n").at(-1), "1. J4-T1");
});

test("the record it writes reads as any other", () => {
  const r = parseRecord(constellationRecord(EXPORT));
  assert.deepEqual(r.moves, ["A7-D10", "N10-Q10", "K7-N10", "A7-A10", "A7-D4", "K7-M10", "K13-M10"]);
  assert.equal(r.tags.Site, "Constellation");
});

test("what it refuses", () => {
  assert.throws(() => constellationRecord("[B:A9-D9 R:P10-S10] D9-A7"), /standard start/);
  assert.throws(() => constellationRecord("[B:A10-D10 R:P10-S10] D10-T7"), /Not a point/);
  assert.throws(() => constellationRecord("[B:A10-D10 R:P10-S10] D10-A7-A4-A1"), /two at most/);
  assert.throws(() => constellationRecord("[B:A10-D10 R:P10-S10]"), /no moves/);
});
