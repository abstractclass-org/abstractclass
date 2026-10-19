// Checks the review's game tree: places on the game's line, the branches' rows in the move list, and the lines kept for
// a game. Run: npm test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { branchChildren, branchLine, branchRows, lastMove, mainIndex, nextFork, pathKey, prevFork, sharedLength, siblingLine, treeLines, withLine } from "./tree.ts";

const main = ["a", "b", "c", "d"];

test("a path on the game's line has its index, a path off it has none", () => {
  assert.equal(mainIndex([], main), 0);
  assert.equal(mainIndex(["a", "b"], main), 2);
  assert.equal(mainIndex(["a", "x"], main), null);
  assert.equal(mainIndex([...main, "e"], main), null);
  assert.equal(sharedLength(["a", "x", "y"], main), 1);
});

test("a branch's preview line starts where the path leaves the game's line, whatever row the move is in", () => {
  // The game A1 A2 A3 A4, with the branches A1 B1 B2 B3 and A1 B1 C1 C2 (B1 shared, so B2 and C1 start rows of their own).
  const game = ["A1", "A2", "A3", "A4"];
  assert.deepEqual(branchLine(["A1", "B1", "B2", "B3"], game), { start: ["A1"], keys: ["A1 B1", "A1 B1 B2", "A1 B1 B2 B3"] });
  assert.deepEqual(branchLine(["A1", "B1", "C1", "C2"], game), { start: ["A1"], keys: ["A1 B1", "A1 B1 C1", "A1 B1 C1 C2"] });
  // A branch of a branch: the line still starts at the game, with every edge of the branch before it.
  assert.deepEqual(branchLine(["A1", "B1", "B2", "D1", "D2"], game).keys.map(lastMove), ["B1", "B2", "D1", "D2"]);
  // A branch from the start.
  assert.deepEqual(branchLine(["X1", "X2"], game), { start: [], keys: ["X1", "X1 X2"] });
  // A branch in place of the game's last move, and one after it.
  assert.deepEqual(branchLine(["A1", "A2", "A3", "E1"], game), { start: ["A1", "A2", "A3"], keys: ["A1 A2 A3 E1"] });
  assert.deepEqual(branchLine([...game, "E1"], game), { start: game, keys: ["A1 A2 A3 A4 E1"] });
  // A move of the game: no line (its own preview shows the position after it, design 07, item 14).
  assert.deepEqual(branchLine(["A1", "A2"], game), { start: ["A1", "A2"], keys: [] });
});

test("a branch's rows: one row to a fork, then each line from the fork one step further in", () => {
  // From the game after "a": x, then y z, with w v as another line from x.
  const nodes = [["a", "x"], ["a", "x", "y"], ["a", "x", "y", "z"], ["a", "x", "w"], ["a", "x", "w", "v"]];
  const kids = branchChildren(nodes);
  const rows = branchRows(["a", "x"], p => kids.get(pathKey(p)) ?? []);
  assert.deepEqual(rows.map(r => [r.depth, r.paths.map(p => p.at(-1)).join("")]), [
    [1, "x"], // the branch to the fork
    [2, "yz"], // the first line from the fork, indented
    [2, "wv"], // the other line, beside it
  ]);
});

test("a branch with no forks is one row", () => {
  const nodes = [["x"], ["x", "y"], ["x", "y", "z"]];
  const kids = branchChildren(nodes);
  assert.deepEqual(branchRows(["x"], p => kids.get(pathKey(p)) ?? []).map(r => r.paths.length), [3]);
});

test("the engine's line merged into the branches: one row where they agree, a fork where they part", () => {
  // From the game after "a", the player's branch x y z. Each line is given as its paths, from the game after "a".
  const kids = branchChildren([["a", "x"], ["a", "x", "y"], ["a", "x", "y", "z"]]);
  const real = (p: string[]) => kids.get(pathKey(p)) ?? [];
  const paths = (...edges: string[]) => edges.map((_, k) => ["a", ...edges.slice(0, k + 1)]);
  const rows = (line: string[][]) => {
    const kidsOf = withLine(real, line);
    return kidsOf(["a"]).flatMap(first => branchRows(first, kidsOf)).map(r => [r.depth, r.paths.map(p => p.at(-1)).join("")]);
  };
  // The line goes on past the branch: one row, the branch's edges, then the line's.
  assert.deepEqual(rows(paths("x", "y", "z", "u")), [[1, "xyzu"]]);
  // The line parts from the branch after x y: a fork there, the line's way first.
  assert.deepEqual(rows(paths("x", "y", "v", "w")), [[1, "xy"], [2, "vw"], [2, "z"]]);
  // A line that has changed and starts elsewhere: its own row first, and the branch on its own.
  assert.deepEqual(rows(paths("q", "r")), [[1, "qr"], [1, "xyz"]]);
  // No line: the branch alone.
  assert.deepEqual(rows([]), [[1, "xyz"]]);
});

test("Lichess's fork keys: the previous and next fork, and the line beside this one", () => {
  // The game a b c d; from after "a", a branch x y, and from after "a x", another line w.
  const main = ["a", "b", "c", "d"];
  const kids = branchChildren([["a", "x"], ["a", "x", "y"], ["a", "x", "w"]]);
  const childrenOf = (p: string[]) => {
    const i = mainIndex(p, main);
    return [...(i !== null && i < main.length ? [[...p, main[i]]] : []), ...(kids.get(pathKey(p)) ?? [])];
  };
  assert.deepEqual(prevFork(["a", "b", "c"], childrenOf), ["a"]); // the game forks after a
  assert.deepEqual(prevFork(["a"], childrenOf), []);
  assert.deepEqual(nextFork([], childrenOf), ["a"]);
  assert.deepEqual(nextFork(["a", "b"], childrenOf), main); // no fork ahead: the line's end
  assert.deepEqual(nextFork(["a", "x"], childrenOf), ["a", "x", "y"]); // x forks itself; on to the end of its first line
  assert.deepEqual(siblingLine(["a", "b", "c"], childrenOf, 1), ["a", "x"]); // from the game to the branch beside it
  assert.deepEqual(siblingLine(["a", "x", "y"], childrenOf, 1), ["a", "x", "w"]);
  assert.deepEqual(siblingLine(["a", "x", "w"], childrenOf, 1), ["a", "x", "y"]); // round
  assert.equal(siblingLine(["a"], childrenOf, 1), null); // no fork above the first move
});

test("the tree's rules: a fork's rule ends at its last line, and passes the lines nested before it", () => {
  // Two lines from the game (depth 1); the first forks into two lines (depth 2).
  const rows = [{ depth: 1, paths: [] }, { depth: 2, paths: [] }, { depth: 2, paths: [] }, { depth: 1, paths: [] }];
  assert.deepEqual(treeLines(rows), [
    { last: false, through: [] },
    { last: false, through: [1] }, // the outer rule passes on to the second line from the game
    { last: true, through: [1] },
    { last: true, through: [] },
  ]);
});
