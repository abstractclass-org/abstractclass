// Checks the shared review's link with Blueprints' moves (share.ts): each kind of move comes back as it was, the
// variations come back with their order and their marks, the record is written with the game's turns, and a broken
// link says so. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { KeptNode } from "@abstractclass/analysis/kept.ts";
import { decodeShare, encodeShare, reviewLink, sharedRecord, type SharedReview } from "./share.ts";
import { parseRecord } from "./record.ts";

// A game of the archive: 120 moves of placements, edits and their capture marks.
const GAME = parseRecord(readFileSync(new URL("../review/fixtures/stamp-duty.txt", import.meta.url), "utf8"));
const base = (moves: string[], branches: KeptNode[] = []): SharedReview =>
  ({ module: "0123abcd", model: "89ef4567", visits: 512, tags: { Blue: "Ann", Red: "Ben O'Hara", Result: "b+12" }, moves, branches });

test("every kind of move comes back as it was: placements, edits and passes, with negative and large numbers", () => {
  const moves = ["2@-6,-2", "1@0,0", "3@17,-40", "1:0,0>3:1,-1", "2:0,0>2:1,2", "3:2,1>1:0,0", "pass", "1@-1,1"];
  assert.deepEqual(decodeShare(encodeShare(base(moves))).moves, moves);
});

test("a whole game and its variations come back, with their order and the moves evaluated", () => {
  const at = (i: number, ...more: string[]) => [...GAME.moves.slice(0, i), ...more].join(" ");
  const branches: KeptNode[] = [
    [at(30, "1@0,2"), 0], [at(30, "1@0,2", "2@1,1"), 1, 1], [at(30, "1@0,2", "3@1,1"), 2], // a fork
    [at(30, "1:0,0>2:1,0"), 3], [at(61, "pass"), 4, 1], [at(GAME.moves.length, "2@5,5"), 5], // and at the game's end
  ];
  const back = decodeShare(encodeShare(base(GAME.moves, branches)));
  assert.deepEqual({ ...back, branches: [] }, base(GAME.moves));
  assert.deepEqual(new Set(back.branches.map(b => `${b[0]}|${b[2] ?? 0}`)), new Set(branches.map(b => `${b[0]}|${b[2] ?? 0}`)));
  const order = (key: string) => back.branches.find(b => b[0] === key)![1];
  assert.ok(order(at(30, "1@0,2")) < order(at(30, "1:0,0>2:1,0"))); // the player's order between lines from one position
  assert.ok(order(at(30, "1@0,2", "2@1,1")) < order(at(30, "1@0,2", "3@1,1")));
});

test("the review's link: the game's tags, moves and variations, and what the review ran with", () => {
  const link = reviewLink("https://example.com", GAME, [], { module: "abcdef0123456789", model: "fedcba9876543210", visits: 1024 });
  const url = new URL(link);
  assert.equal(url.pathname, "/review");
  const back = decodeShare(new URLSearchParams(url.hash.slice(1)).get("packed")!);
  assert.deepEqual([back.module, back.model, back.visits], ["abcdef01", "fedcba98", 1024]);
  assert.deepEqual(back.tags, GAME.tags);
  assert.deepEqual(back.moves, GAME.moves);
  // A whole game is short enough for a Discord message.
  assert.ok(link.length < 2000, `${link.length} characters`);
});

test("the shared record numbers the turns as the record does, and reads back as the same game", () => {
  const s = base(["2@-6,-2", "1@0,0", "pass", "3@1,1", "1:0,0>3:1,-1"]);
  const text = sharedRecord(s);
  assert.match(text, /1\. 2@-6,-2 2\. 1@0,0 pass 3\. 3@1,1 1:0,0>3:1,-1 b\+12/);
  const back = parseRecord(text);
  assert.deepEqual(back.moves, s.moves);
  assert.equal(back.tags.Red, "Ben O'Hara");
  assert.deepEqual(parseRecord(sharedRecord(base(GAME.moves))).moves, GAME.moves);
});

test("a broken or cut link says so", () => {
  assert.throws(() => decodeShare("!!"), /broken/);
  const code = encodeShare(base(GAME.moves));
  assert.throws(() => decodeShare(code.slice(0, 40)), /not complete|broken/);
  assert.throws(() => decodeShare(`B${code.slice(1)}`), /another version/);
});
