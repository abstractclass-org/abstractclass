// Checks the Analysis board's link and record (board.ts, design 21): the tree comes back whole, the main line first,
// with the moves evaluated. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { boardLink, boardOfRecord, readBoardLink } from "./board.ts";
import { parseRecord } from "./record.ts";
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

test("a broken link says so", () => {
  assert.throws(() => readBoardLink("!!", null), /broken/);
});
