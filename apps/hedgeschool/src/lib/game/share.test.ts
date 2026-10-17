// Checks the shared review's link (share.ts): what it carries comes back as it was, a broken link says so, the record
// is written with the game's turns, and how long the link is for a whole game. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeShare, encodeShare, sharedRecord, type SharedReview } from "./share.ts";
import { parseRecord } from "./record.ts";
import type { BranchNode } from "./store.ts";

// The sample game (review/model's mock): 120 edges.
const sample = JSON.parse(readFileSync(new URL("../mock/review.json", import.meta.url), "utf8")) as { moves: { edge: number[] }[] };
const COLS = "ABCDEFGHJKLMNOPQRST";
const name = ([ax, ay, bx, by]: number[]) => {
  const [p, q] = ax < bx || (ax === bx && ay < by) ? [[ax, ay], [bx, by]] : [[bx, by], [ax, ay]];
  return `${COLS[p[0]]}${p[1] + 1}-${COLS[q[0]]}${q[1] + 1}`;
};
const MOVES = sample.moves.map(m => name(m.edge));
const TAGS = {
  Event: "meaf.us game", Site: "meaf.us", Date: "2026.10.12", Round: "-", Blue: "yshanpudding", Red: "YshanVerboseBot",
  Result: "r+12", Scores: "40/52", TimeControl: "60+15", Termination: "normal", GameId: "ranzn1",
};
const base = (branches: BranchNode[] = []): SharedReview =>
  ({ module: "0123abcd", model: "89ef4567", visits: 512, tags: TAGS, moves: MOVES, branches });
const at = (i: number, ...edges: string[]) => [...MOVES.slice(0, i), ...edges].join(" ");

test("a shared review comes back as it was: the settings, the tags, the moves and the branches with their order", () => {
  const branches: BranchNode[] = [
    [at(30, "D10-G12"), 0], [at(30, "D10-G12", "N9-Q10"), 1, 1], [at(30, "D10-G12", "N9-Q11"), 2], // a fork
    [at(30, "A1-A4"), 3], [at(61, "T16-T19"), 4, 1], [at(120, "B2-B5"), 5], // another line at 30, one at 61, one at the end
  ];
  const back = decodeShare(encodeShare(base(branches)));
  assert.deepEqual({ ...back, branches: [] }, { ...base(), branches: [] });
  // The order is the tree's (each line from its fork, in the player's order), and each node keeps its flag.
  assert.deepEqual(new Set(back.branches.map(b => `${b[0]}|${b[2] ?? 0}`)), new Set(branches.map(b => `${b[0]}|${b[2] ?? 0}`)));
  const order = (key: string) => back.branches.find(b => b[0] === key)![1];
  assert.ok(order(at(30, "D10-G12")) < order(at(30, "A1-A4"))); // the player's order between lines from one position
  assert.ok(order(at(30, "D10-G12", "N9-Q10")) < order(at(30, "D10-G12", "N9-Q11")));
});

test("a broken or cut link says so", () => {
  const link = encodeShare(base());
  assert.throws(() => decodeShare(link.slice(0, 40)), /not complete/);
  assert.throws(() => decodeShare("_" + link.slice(1)), /another version/);
});

test("the record has the game's turns, a pass ending its turn, and reads back", () => {
  const moves = ["D10-G12", "N9-Q10", "O9-Q10", "pass", "D11-G13", "N10-Q11"];
  const text = sharedRecord({ ...base(), moves, tags: { Blue: "a", Red: "b", Result: "*" } });
  assert.match(text, /\n\n1\. D10-G12 2\. N9-Q10 O9-Q10 3\. pass 4\. D11-G13 N10-Q11 \*\n$/);
  assert.deepEqual(parseRecord(text).moves, moves);
  assert.deepEqual(parseRecord(sharedRecord(base())).moves, MOVES);
});

test("how long a link is: a whole game, and each branch edge more", () => {
  const prefix = "https://hedgeschool.abstractclass.org/review#packed=".length;
  const game = prefix + encodeShare(base()).length;
  // A line of 40 edges from the middle of the game: 20 bits each, after a little for its fork.
  const line = Array.from({ length: 40 }, (_, k) => [at(60, ...MOVES.slice(0, k + 1).map((_, j) => `A${(j % 16) + 1}-A${(j % 16) + 4}`)), k] as BranchNode);
  const withLine = prefix + encodeShare(base(line)).length;
  assert.ok(game < 900, `a whole game's link is ${game} characters`);
  assert.ok(Math.abs((withLine - game) / 40 - 20 / 6) < 0.2, `a branch edge costs ${(withLine - game) / 40} characters`);
});
