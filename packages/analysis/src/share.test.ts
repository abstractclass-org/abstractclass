// Checks the shared link's frame (share.ts, boardLink.ts) on a game of words: the numbers' codes, a review's settings,
// tags, moves and variations, and a board's tree, each back as it was. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BitReader, BitWriter, decodeShare, encodeShare, shareNote, type MoveCode } from "./share.ts";
import { boardLink, boardPositionKeys, readBoardLink } from "./boardLink.ts";
import type { KeptBoard, KeptNode } from "./kept.ts";

/** A game whose moves are words of lowercase letters: each as its length, then 5 bits a letter. */
const WORDS: MoveCode = {
  put(w, move) { w.gamma(move.length); for (const c of move) w.put(c.charCodeAt(0) - 96, 5); },
  get(r) { return Array.from({ length: r.gamma() }, () => String.fromCharCode(r.get(5) + 96)).join(""); },
};

test("whole numbers, signed or not, come back as they were", () => {
  const w = new BitWriter(), values = [0, 1, -1, 2, -2, 17, -40, 1000];
  for (const v of values) w.signed(v);
  w.gamma(1);
  w.gamma(513);
  const r = new BitReader(Uint8Array.from(w.bytes));
  assert.deepEqual(values.map(() => r.signed()), values);
  assert.deepEqual([r.gamma(), r.gamma()], [1, 513]);
});

test("a shared review comes back as it was, its variations in the player's order", () => {
  const branches: KeptNode[] = [["ab x", 0], ["ab x y", 1, 1], ["ab z", 2], ["ab cd pass q", 3]];
  const s = { module: "0123abcd", model: "89ef4567", visits: 512, tags: { Blue: "Ann", Red: "Ben\tO'Hara" },
              moves: ["ab", "cd", "pass"], branches };
  const back = decodeShare(encodeShare(s, WORDS), WORDS);
  assert.deepEqual({ ...back, branches: [] }, { ...s, branches: [] });
  assert.deepEqual(back.branches.map(b => b[0]), ["ab x", "ab x y", "ab z", "ab cd pass q"]);
  assert.equal(back.branches[1][2], 1);
});

test("a board's link gives back its tree, its start and its place", () => {
  const board: KeptBoard = { version: 2, main: ["ab", "cd"], nodes: [["ab", -1], ["ab cd", -1, 1], ["ab ef", 2]], start: "a set up start" };
  const link = boardLink("https://example.com", board, 1, WORDS), hash = new URLSearchParams(link.split("#")[1]);
  const back = readBoardLink(hash.get("packed")!, hash.get("at"), WORDS, p => p);
  assert.equal(back.at, 1);
  assert.equal(back.board.start, "a set up start");
  assert.deepEqual(back.board.nodes.map(n => n[0]), ["ab", "ab cd", "ab ef"]);
  // The keys of its positions in the store name its start.
  assert.deepEqual([...boardPositionKeys(board)], ["@a_set_up_start", "@a_set_up_start ab", "@a_set_up_start ab cd", "@a_set_up_start ab ef"]);
});

test("a board's link keeps its komi, and refuses a komi that is not one (Hedge School's design 24)", () => {
  const board: KeptBoard = { version: 2, main: ["ab"], nodes: [["ab", 0]], komi: -300 };
  const packedOf = (b: KeptBoard) => new URLSearchParams(boardLink("https://example.com", b, 0, WORDS).split("#")[1]).get("packed")!;
  assert.equal(readBoardLink(packedOf(board), null, WORDS, p => p).board.komi, -300);
  // The keys of its positions name the komi after the start's mark.
  assert.deepEqual([...boardPositionKeys(board)], ["komi=-300", "komi=-300 ab"]);
  assert.deepEqual([...boardPositionKeys({ ...board, start: "s" })], ["@s komi=-300", "@s komi=-300 ab"]);
  // A board at komi 0 has none: its link and its keys are as before the komi.
  const even: KeptBoard = { version: 2, main: ["ab"], nodes: [["ab", 0]] };
  assert.equal(packedOf({ ...board, komi: 0 }), packedOf(even));
  assert.equal("komi" in readBoardLink(packedOf(even), null, WORDS, p => p).board, false);
  assert.deepEqual([...boardPositionKeys(even)], ["", "ab"]);
  // A link whose Komi tag is not a number of whole or half points cannot open.
  const bad = encodeShare({ module: "00000000", model: "00000000", visits: 1, tags: { Komi: "2.25" }, moves: [], branches: [] }, WORDS);
  assert.throws(() => readBoardLink(bad, null, WORDS, p => p), /komi.*2\.25/);
});

test("a board's link refuses a komi beyond the game's limit, in the record's words (Hedge School's design 24)", () => {
  const packedOf = (komi: number) => new URLSearchParams(boardLink("https://example.com",
    { version: 2, main: [], nodes: [], komi }, 0, WORDS).split("#")[1]).get("packed")!;
  assert.equal(readBoardLink(packedOf(5000), null, WORDS, p => p, 5000).board.komi, 5000);
  assert.equal(readBoardLink(packedOf(-5000), null, WORDS, p => p, 5000).board.komi, -5000);
  for (const beyond of [5000.5, -6000])
    assert.throws(() => readBoardLink(packedOf(beyond), null, WORDS, p => p, 5000),
      (e: Error) => e.message === `the Komi tag must be from -5,000 to 5,000 points: ${beyond}`);
  // Without a limit, the link takes any komi that a tag can give.
  assert.equal(readBoardLink(packedOf(6000), null, WORDS, p => p).board.komi, 6000);
});

test("the note after a link is copied warns past a Discord message's limit", () => {
  assert.match(shareNote(653), /^Link copied \(653 characters\)/);
  assert.match(shareNote(2400), /2,400 characters.*or send the review file\.$/);
  assert.match(shareNote(2400, false), /Delete some variations\.$/);
});
