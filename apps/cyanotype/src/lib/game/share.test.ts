// Checks the shared review's link with Blueprints' moves (share.ts): each kind of move comes back as it was, every legal
// move of every position of a game by the engine's rules, the variations with their order and their marks, the record
// with the game's turns, and a cut or broken link says so. Run: npm test. The engine's rules come from the site's
// static/engine (CPU, no network): without its files (npm run engine), that test skips.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hasEngine, nodeEngine } from "@abstractclass/engine/node-engine.mjs";
import type { KeptNode } from "@abstractclass/analysis/kept.ts";
import type { DescribeReply } from "../board/described.ts";
import { decodeShare, encodeShare, reviewLink, sharedRecord, type SharedReview } from "./share.ts";
import { parseMove } from "./notation.ts";
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
  // Cut anywhere: every byte holds bits that the reader needs.
  for (let cut = 0; cut < code.length; cut++)
    assert.throws(() => decodeShare(code.slice(0, cut)), /broken|not complete|another version/, `cut at ${cut}`);
});

test("a changed letter gives an Error that says what is wrong, or a game whose moves are in the notation", () => {
  const code = encodeShare(base(GAME.moves, [[[...GAME.moves.slice(0, 40), "1@0,2"].join(" "), 0, 1]]));
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  for (let at = 0; at < code.length; at++) for (const shift of [1, 17, 40]) {
    const changed = code.slice(0, at) + letters[(letters.indexOf(code[at]) + shift) % 64] + code.slice(at + 1);
    let back: SharedReview;
    try {
      back = decodeShare(changed);
    } catch (e) {
      assert.ok(e instanceof Error && e.message, `changed at ${at}: ${String(e)}`);
      continue;
    }
    // The link has no checksum, as Hedge School's: a changed letter can give another game, which the review's rules
    // then check. Its moves are always in the notation.
    for (const m of [...back.moves, ...back.branches.map(b => b[0].split(" ").at(-1)!)])
      if (m !== "pass") assert.doesNotThrow(() => parseMove(m), `changed at ${at}: ${m}`);
  }
});

const app = join(import.meta.dirname, "..", "..", "..");
test("every legal move of every position of a game, by the engine's rules, comes back from a link as it was", {
  skip: hasEngine(app) ? false : "no engine in static/engine (npm run engine)",
}, async () => {
  const { call } = await nodeEngine(app);
  const kinds = new Set<string>();
  let legal = 0;
  for (let n = 0; n <= GAME.moves.length; n++) {
    // The game so far, and each legal move of its position as a variation from it.
    const before = GAME.moves.slice(0, n), d: DescribeReply = call({ id: "d", action: "describe", moves: before });
    const branches = d.legal.map((m, i): KeptNode => [[...before, m].join(" "), i]);
    const back = decodeShare(encodeShare(base(before, branches)));
    assert.deepEqual(back.moves, before, `${n} moves`);
    assert.deepEqual(back.branches.map(b => b[0]), branches.map(b => b[0]), `${n} moves: its legal moves`);
    for (const m of d.legal) kinds.add(m === "pass" ? "pass" : parseMove(m).kind);
    legal += d.legal.length;
  }
  // Placements, with the farthest anchors that the rules allow, and edits. No position of this game has a legal pass:
  // the first test covers the pass.
  assert.ok(kinds.has("place") && kinds.has("edit"), [...kinds].join(", "));
  assert.ok(legal > 100_000, `${legal} legal moves`);
});
