// Checks the Analysis board's link (board.ts): the tree comes back whole, the main line first, with the moves evaluated,
// the position on screen and a set-up start, and a record's board. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { boardOfLine, type KeptBoard } from "@abstractclass/analysis/kept.ts";
import { FIXTURE_DATA } from "../board/fixtures.ts";
import { encodeShare } from "./share.ts";
import { boardLink, boardOfRecord, readBoardLink, recordKomiProblem } from "./board.ts";
import { STANDARD_START, writePosition } from "./position.ts";
import { parseRecord } from "./record.ts";

// A set-up start: the lab's middle game, a position of Stamp Duty's own game (board/fixtures.json).
const MIDDLE = writePosition(FIXTURE_DATA.fixtures.find(f => f.name === "A middle game")!.position);

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

test("a set-up start comes back from a link, in its one spelling, and the standard start is none", () => {
  const link = boardLink("", { ...BOARD, start: MIDDLE }, 1), hash = new URLSearchParams(link.split("#")[1]);
  const back = readBoardLink(hash.get("packed")!, hash.get("at"));
  assert.equal(back.board.start, MIDDLE);
  assert.equal(back.at, 1);
  const packed = (Position: string) => encodeShare({ module: "00000000", model: "00000000", visits: 1, tags: { Position }, moves: [], branches: [] });
  assert.equal(readBoardLink(packed(STANDARD_START), null).board.start, undefined);
  // Another spelling of the start (its cells in another order) gives its one spelling, which keys its results.
  const [blue, ...rest] = MIDDLE.split(" ");
  assert.equal(readBoardLink(packed([blue.split(";").reverse().join(";"), ...rest].join(" ")), null).board.start, MIDDLE);
});

test("a record's board: its line, from its Position tag", () => {
  const record = parseRecord(`[Position "${MIDDLE}"]\n\n2@5,-2 *`);
  assert.deepEqual(boardOfRecord(record), boardOfLine(["2@5,-2"], MIDDLE));
  assert.equal(boardOfRecord(record).start, MIDDLE);
  assert.equal(boardOfRecord(parseRecord("1. 2@-6,-2 *")).start, undefined);
});

test("a record with a komi: the board cannot open it, and says where it can (Hedge School's design 24)", () => {
  assert.equal(recordKomiProblem(parseRecord("1. 2@-6,-2 *")), null);
  assert.match(recordKomiProblem(parseRecord('[Komi "300"]\n\n1. 2@-6,-2 *')) ?? "", /a komi\. Open the record in the review$/);
  // From a set-up start, the review does not take it either (setUpProblem)
  assert.match(recordKomiProblem(parseRecord(`[Position "${MIDDLE}"]\n[Komi "300"]\n\n2@5,-2 *`)) ?? "",
               /a komi\. The Analysis board can analyze only at komi 0$/);
});

test("a broken link says so", () => {
  assert.throws(() => readBoardLink("!!", null), /broken/);
});

test("a link whose board has a komi says that the board cannot open it (Hedge School's design 24)", () => {
  // The board's analysis searches at komi 0 (design 33, "The komi"): it cannot search a link's board at a komi.
  const url = new URL(boardLink("https://example.com", { ...BOARD, komi: -300 }, 0));
  assert.throws(() => readBoardLink(new URLSearchParams(url.hash.slice(1)).get("packed")!, null), /komi/);
});

test("a link beyond the komi that a record can give says so first, in the record's words", () => {
  const url = new URL(boardLink("https://example.com", { ...BOARD, komi: 90_980.5 }, 0));
  assert.throws(() => readBoardLink(new URLSearchParams(url.hash.slice(1)).get("packed")!, null),
    (e: Error) => e.message === "the Komi tag must be from -90,980 to 90,980 points: 90980.5");
});
