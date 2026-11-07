// Checks the Analysis board's link (board.ts): the tree comes back whole, the main line first, with the moves evaluated
// and the position on screen. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { KeptBoard } from "@abstractclass/analysis/kept.ts";
import { encodeShare } from "./share.ts";
import { boardLink, readBoardLink } from "./board.ts";

// The main line 2@-6,-2 1@0,0 1:0,0>3:1,-1, evaluated at its second move, and a variation 3@1,1 from the first move.
const BOARD: KeptBoard = { version: 2, main: ["2@-6,-2", "1@0,0", "1:0,0>3:1,-1"],
  nodes: [["2@-6,-2", -1], ["2@-6,-2 1@0,0", -1, 1], ["2@-6,-2 1@0,0 1:0,0>3:1,-1", -1], ["2@-6,-2 3@1,1", 3]] };

test("a link gives back the board's tree: its lines in order, the moves evaluated, and the place on the main line", () => {
  const url = new URL(boardLink("https://example.com", BOARD, 2)), hash = new URLSearchParams(url.hash.slice(1));
  assert.equal(url.pathname, "/analysis");
  const back = readBoardLink(hash.get("packed")!, hash.get("at"));
  assert.equal(back.at, 2);
  assert.equal(back.board.start, undefined);
  const byKey = new Map(back.board.nodes.map(n => [n[0], n]));
  assert.deepEqual([...byKey.keys()].sort(), BOARD.nodes.map(n => n[0]).sort());
  assert.equal(byKey.get("2@-6,-2 1@0,0")![2], 1);
  assert.equal(byKey.get("2@-6,-2 3@1,1")![2], undefined);
  // The main line is the first line: its node comes before the variation from the same position.
  assert.ok(byKey.get("2@-6,-2 1@0,0")![1] < byKey.get("2@-6,-2 3@1,1")![1]);
});

test("the start's link has no place, and an analysis file's link names the file", () => {
  const link = boardLink("", BOARD, 0, "analysis_file"), hash = new URLSearchParams(link.split("#")[1]);
  assert.equal(hash.get("at"), null);
  assert.equal(hash.get("via"), "analysis_file");
  assert.equal(readBoardLink(hash.get("packed")!, null).at, 0);
});

test("a broken link, or one from a set-up start, says so", () => {
  assert.throws(() => readBoardLink("!!", null), /broken/);
  const setUp = encodeShare({ module: "00000000", model: "00000000", visits: 1, tags: { Position: "x" }, moves: [], branches: [] });
  assert.throws(() => readBoardLink(setUp, null), /set-up position/);
});

test("a link whose board has a komi says that the board cannot open it (Hedge School's design 24)", () => {
  // The board starts its analysis before it chooses its board, at komi 0: it cannot search a link's board at a komi.
  const url = new URL(boardLink("https://example.com", { ...BOARD, komi: -300 }, 0));
  assert.throws(() => readBoardLink(new URLSearchParams(url.hash.slice(1)).get("packed")!, null), /komi/);
});
