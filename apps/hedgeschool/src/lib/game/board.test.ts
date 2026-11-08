// Checks the Analysis board's link and record (board.ts, design 21): the tree comes back whole, the main line first,
// with the moves evaluated. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { boardLink, boardOfRecord, boardPositionKeys, readBoardLink } from "./board.ts";
import { MAX_RECORD_KOMI, parseRecord } from "./record.ts";
import type { KeptBoard } from "./store.ts";

test("a link gives back the board's tree: its lines in order, and the moves evaluated", () => {
  // The main line A10-D9 N9-Q10, evaluated at its second move, and a variation N11-Q10 from the first.
  const board: KeptBoard = { version: 2, main: ["A10-D9", "N9-Q10"],
    nodes: [["A10-D9", -1], ["A10-D9 N9-Q10", -1, 1], ["A10-D9 N11-Q10", 3]] };
  const link = boardLink("https://example.com", board, 2);
  const url = new URL(link), hash = new URLSearchParams(url.hash.slice(1));
  assert.equal(url.pathname, "/analysis");
  const back = readBoardLink(hash.get("packed")!, hash.get("at"));
  assert.equal(back.at, 2);
  const byKey = new Map(back.board.nodes.map(n => [n[0], n]));
  assert.deepEqual([...byKey.keys()].sort(), ["A10-D9", "A10-D9 N11-Q10", "A10-D9 N9-Q10"]);
  assert.equal(byKey.get("A10-D9 N9-Q10")![2], 1);
  assert.equal(byKey.get("A10-D9 N11-Q10")![2], undefined);
  // The main line is the first line: its node comes before the variation from the same position.
  assert.ok(byKey.get("A10-D9 N9-Q10")![1] < byKey.get("A10-D9 N11-Q10")![1]);
});

test("a record's line becomes the board's main line", () => {
  const board = boardOfRecord(parseRecord("1. D10-G10 2. N11-Q10 L10-N11 *"));
  assert.deepEqual(board.main, ["D10-G10", "N11-Q10", "L10-N11"]);
  assert.deepEqual(board.nodes, [["D10-G10", 0], ["D10-G10 N11-Q10", 0], ["D10-G10 N11-Q10 L10-N11", 0]]);
  // Through a link too: every node comes back.
  const hash = new URLSearchParams(new URL(boardLink("https://example.com", board, 0)).hash.slice(1));
  assert.deepEqual(readBoardLink(hash.get("packed")!, null).board.nodes.map(n => n[0]), board.nodes.map(n => n[0]));
});

test("a record's komi is the board's, and its link and keys keep it (design 24)", () => {
  const board = boardOfRecord(parseRecord('[Komi "-300"]\n\n1. D10-G10 *'));
  assert.equal(board.komi, -300);
  const hash = new URLSearchParams(new URL(boardLink("https://example.com", board, 0)).hash.slice(1));
  assert.equal(readBoardLink(hash.get("packed")!, null).board.komi, -300);
  assert.deepEqual([...boardPositionKeys(board)], ["komi=-300", "komi=-300 D10-G10"]);
  // A board at komi 0 has no komi, and its keys are the moves alone
  const even = boardOfRecord(parseRecord("1. D10-G10 *"));
  assert.equal(even.komi, undefined);
  assert.deepEqual([...boardPositionKeys(even)], ["", "D10-G10"]);
});

test("a broken link says so", () => {
  assert.throws(() => readBoardLink("!!", null), /broken/);
});

test("a link beyond the komi that a record can give does not open, in the record's words (design 24)", () => {
  const packed = (komi: number) =>
    new URLSearchParams(new URL(boardLink("https://example.com", { version: 2, main: [], nodes: [], komi }, 0)).hash.slice(1)).get("packed")!;
  assert.equal(readBoardLink(packed(MAX_RECORD_KOMI), null).board.komi, 5052);
  assert.equal(readBoardLink(packed(-MAX_RECORD_KOMI), null).board.komi, -5052);
  // Komi 6,000: before, the board opened it, and the engine refused it
  assert.throws(() => readBoardLink(packed(6000), null),
    (e: Error) => e.message === "the Komi tag must be from -5,052 to 5,052 points: 6000");
  assert.throws(() => readBoardLink(packed(-5052.5), null), /from -5,052 to 5,052 points: -5052\.5$/);
});
