// Checks the game-record reader on the notation design's own examples (the engine repository's
// docs/design/04-notation-and-protocol.md) and on a round trip of the sample game. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalEdge, parseRecord, writeRecord, RecordError } from "./record.ts";

test("an edge has one spelling: the lower point first", () => {
  assert.equal(canonicalEdge("E11-D10"), "D10-E11");
  assert.equal(canonicalEdge("d10-e11"), "D10-E11");
  assert.equal(canonicalEdge("Q10-Q13"), "Q10-Q13");
  assert.throws(() => canonicalEdge("I10-J10")); // no I in GTP's columns
});

test("turns, a pass, and a result", () => {
  const r = parseRecord("1b. D10-G10 2r. N11-Q10 L10-N11 3b. D10-G9 G9-H10 4r. N9-Q10 pass b+28");
  assert.deepEqual(r.moves, ["D10-G10", "N11-Q10", "L10-N11", "D10-G9", "G9-H10", "N9-Q10", "pass"]);
  assert.equal(r.result, "b+28");
});

test("tags, evaluations and clocks in comments (the design's example)", () => {
  const text = `[Event "Casual"]\n[Blue "a \\"quoted\\" name"]\n\n1b. D10-G10 { [%eval 0.55 +95 205] } 2r. L10-N12 { [%eval 0.55 +95 205] } N12-P10 { [%eval 0.61 +130 200] [%clk 0:00:41] } *`;
  const r = parseRecord(text);
  assert.equal(r.tags.Event, "Casual");
  assert.equal(r.tags.Blue, 'a "quoted" name');
  assert.deepEqual(r.evals[2], { blueWin: 0.61, margin: 130, spread: 200 });
  assert.equal(r.clocks[2], "0:00:41");
  assert.equal(r.clocks[0], null);
});

test("branches are skipped, at a turn's start and at its second edge (the design's example)", () => {
  const r = parseRecord("1b. D10-G10 2r. N11-Q10 L10-N11 3b. D10-G9 G9-H10 4r. N9-Q10 (4r... M12-N9) L10-N9 (4r. N9-Q11 M12-N9) 5b. G9-H8");
  assert.deepEqual(r.moves.slice(5), ["N9-Q10", "L10-N9", "G9-H8"]);
});

test("a bare list of edges", () => {
  assert.deepEqual(parseRecord("D10-G10 N11-Q10 L10-N11").moves, ["D10-G10", "N11-Q10", "L10-N11"]);
});

test("errors name what is wrong and where", () => {
  for (const bad of ["1b. D10-G10 3r. N11-Q10", "1r. D10-G10", "1b. D10-Z99", "1b. D10-G10 (2r. N11-Q10", "1b. D10-G10 b+3 2r. N11-Q10", ""])
    assert.throws(() => parseRecord(bad), RecordError, bad);
});

test("the sample game, written and read back", () => {
  const sample = JSON.parse(readFileSync(new URL("../mock/review.json", import.meta.url), "utf8"));
  const cols = "ABCDEFGHJKLMNOPQRST";
  const moves: string[] = sample.moves.map((m: { edge: number[] }) =>
    canonicalEdge(`${cols[m.edge[0]]}${m.edge[1] + 1}-${cols[m.edge[2]]}${m.edge[3] + 1}`));
  const turns: { number: number; player: "b" | "r"; moves: number }[] = [];
  sample.moves.forEach((m: { player: number }) => {
    const p = m.player === 0 ? "b" : "r";
    const last = turns.at(-1);
    if (last && last.player === p) last.moves++; else turns.push({ number: turns.length + 1, player: p, moves: 1 });
  });
  const text = writeRecord({ Blue: sample.players.blue, Red: sample.players.red }, moves, turns, "r+60.5");
  const r = parseRecord(text);
  assert.deepEqual(r.moves, moves);
  assert.equal(r.tags.Blue, sample.players.blue);
  assert.equal(r.result, "r+60.5");
});
