// Hand-made positions for the board's lab page and tests: the start, a middle game with candidates and a line, a
// capture, an edit and an empty blueprint. No game of strategyjam.org's archive: this repository is public. The
// builder below only moves cells as each move's data says (the cells that a placement removes are listed by hand). It
// checks no rule: the engine has the rules.
import type { BoardCandidate, BoardLineMove } from "./Board.svelte";
import { firstHex, hexKey, parseHex, shift, type Hex } from "./hex.ts";
import { stamp, type Blueprint, type BlueprintNumber, type BoardMove, type Hand, type Kind, type Player, type SitePosition } from "./position.ts";

export interface Fixture {
  name: string;
  position: SitePosition;
  last: BoardMove | null;
  candidates?: BoardCandidate[];
  /** The line of each candidate that has one, by its name. */
  lines?: Record<string, BoardLineMove[]>;
}

// The start (the engine repository's games/blueprints/README.md): each blueprint is a star with a ring of six cells.
// Blueprints 1 and 3 have plain rings, and blueprint 2 a ring of walls and stars. Red's blueprint 2 is Blue's turned
// half round. Blue's are stamped at q = -6, -10 and -2, Red's at 6, 10 and 2.
const RING: Hex[] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]; // the six directions, round the star
const ringed = (kinds: Kind[]): Blueprint => {
  const cells: [Hex, Kind][] = [[[0, 0], "star"], ...RING.map((d, i) => [d, kinds[i]] as [Hex, Kind])];
  return frame(cells);
};
/** Cells put in their frame, the first cell at 0,0. */
function frame(cells: [Hex, Kind][]): Blueprint {
  const first = firstHex(cells.map(c => c[0]));
  if (!first) return {};
  const hexes = shift(cells.map(c => c[0]), [-first[0], -first[1]]);
  return Object.fromEntries(hexes.map((h, i) => [hexKey(h), cells[i][1]]));
}
const plainRing = ringed(["plain", "plain", "plain", "plain", "plain", "plain"]);
const START_HANDS: [Hand, Hand] = [
  [plainRing, ringed(["wall", "star", "wall", "star", "wall", "star"]), plainRing],
  [plainRing, ringed(["star", "wall", "star", "wall", "star", "wall"]), plainRing],
];
const START_AT: [number, number, number][] = [[-6, -10, -2], [6, 10, 2]];

function start(): SitePosition {
  const cells: Record<string, [Player, Kind]> = {};
  for (const p of [0, 1] as const)
    START_HANDS[p].forEach((b, i) => {
      // The blueprint's star is on (q, 0): its first cell is the ring's cell above it, at (q, -1).
      for (const s of stamp(b, [START_AT[p][i], -1])) cells[hexKey(s.hex)] = [p, s.kind];
    });
  return { ply: 0, cells, blueprints: START_HANDS, scores: [0, 0] };
}

export interface Built { position: SitePosition; last: BoardMove | null }

/** Blueprint `k` of `player` placed with its first cell on `at`, removing the cells at `removed` (by hand), for
 *  `points`. */
export function place(b: Built, player: Player, k: BlueprintNumber, at: Hex, removed: string[] = [], points = 0): Built {
  const p = b.position, cells = { ...p.cells };
  const stamped = stamp(p.blueprints[player][k - 1], at);
  for (const s of stamped) {
    const key = hexKey(s.hex);
    if (cells[key]) throw new Error(`fixture: ${k}@${hexKey(at)} stamps on ${key}, which has a cell`);
    cells[key] = [player, s.kind];
  }
  const gone = removed.map(key => {
    const c = cells[key];
    if (!c || c[0] === player) throw new Error(`fixture: ${key} has no cell of the opponent to remove`);
    delete cells[key];
    return { hex: parseHex(key), owner: c[0], kind: c[1] };
  });
  const scores: [number, number] = [p.scores[0], p.scores[1]];
  scores[player] += points;
  return {
    position: { ply: p.ply + 1, cells, blueprints: p.blueprints, scores },
    last: { type: "place", player, blueprint: k, at, stamped, removed: gone },
  };
}

/** The edit `I:from>J:to` of `player`, with both hexes in the frames before it. The move's hexes are in the frames
 *  after it, as the board draws it with the position after it. */
export function edit(b: Built, player: Player, i: BlueprintNumber, from: Hex, j: BlueprintNumber, to: Hex): Built {
  const hand = b.position.blueprints[player].map(bp => ({ ...bp }));
  const kind = hand[i - 1][hexKey(from)];
  if (!kind) throw new Error(`fixture: blueprint ${i} has no cell at ${hexKey(from)}`);
  if (hand[j - 1][hexKey(to)] && !(i === j && hexKey(from) === hexKey(to))) throw new Error(`fixture: blueprint ${j} has a cell at ${hexKey(to)}`);
  delete hand[i - 1][hexKey(from)];
  // The target's cells, in the source's frame when the two are one blueprint.
  hand[j - 1][hexKey(to)] = kind;
  // Both blueprints go back to their frames: each moves by its new first cell.
  const moved = (n: number): Hex => firstHex(Object.keys(hand[n - 1]).map(parseHex)) ?? [0, 0];
  const di = moved(i), dj = moved(j);
  const reframed = hand.map(bp => frame(Object.entries(bp).map(([k, v]) => [parseHex(k), v] as [Hex, Kind])));
  const blueprints: [Hand, Hand] = [...b.position.blueprints] as [Hand, Hand];
  blueprints[player] = reframed as unknown as Hand;
  const at = (h: Hex, d: Hex): Hex => [h[0] - d[0], h[1] - d[1]];
  return {
    position: { ...b.position, ply: b.position.ply + 1, blueprints },
    last: { type: "edit", player, kind, from: { blueprint: i, hex: at(from, di) }, to: { blueprint: j, hex: at(to, dj) } },
  };
}

const name = (m: BoardMove): string =>
  m.type === "place" ? `${m.blueprint}@${hexKey(m.at)}` : m.type === "edit"
    ? `${m.from.blueprint}:${hexKey(m.from.hex)}>${m.to.blueprint}:${hexKey(m.to.hex)}` : "pass";

// A middle game: nine moves from the start, two of them captures, and two edits.
const startBuilt: Built = { position: start(), last: null };
let g = startBuilt;
g = place(g, 0, 1, [-7, -3]);
g = place(g, 1, 1, [5, -3]);
g = place(g, 1, 3, [1, -3], ["-1,-1", "-1,0"]);
g = place(g, 0, 3, [-3, -3]);
g = edit(g, 0, 1, [1, 1], 3, [2, 1]);
g = place(g, 1, 2, [9, -4]);
g = edit(g, 1, 1, [-1, 2], 1, [2, 0]);
g = place(g, 0, 1, [-11, -3]);
g = place(g, 0, 3, [-1, 1], ["1,1", "1,0", "2,1"]);
const middle = g;

// Red's five candidates in the middle game, and a line for the first three. A candidate's edit is in the position's frames
// (before it).
const candidateMoves: [BoardMove, string][] = [
  [place(middle, 1, 3, [3, 1], ["1,2"]).last!, "Score +1.4"],
  [place(middle, 1, 1, [1, -6]).last!, "−0.6"],
  [{ type: "edit", player: 1, kind: "wall", from: { blueprint: 2, hex: [0, 2] }, to: { blueprint: 2, hex: [2, 0] } }, "−1.1"],
  [place(middle, 1, 2, [4, 2]).last!, "−2.3"],
  [place(middle, 1, 1, [3, 2]).last!, "−2.9"], // four of its hexes are the first choice's: candidates overlap
];
const candidates: BoardCandidate[] = candidateMoves.map(([move, note], i) => ({ name: name(move), move, rank: i + 1, note }));
/** A line: the moves played one after another from the position, each with the hands after it. */
function lineOf(from: Built, steps: ((b: Built) => Built)[]): BoardLineMove[] {
  const out: BoardLineMove[] = [];
  let b = from;
  for (const s of steps) {
    b = s(b);
    out.push({ move: b.last!, hands: b.position.blueprints });
  }
  return out;
}
const lines: Record<string, BoardLineMove[]> = {
  [candidates[0].name]: lineOf(middle, [
    b => place(b, 1, 3, [3, 1], ["1,2"]),
    b => place(b, 1, 1, [1, -6]),
    b => edit(b, 0, 1, [0, 2], 1, [1, 1]),
  ]),
  [candidates[1].name]: lineOf(middle, [
    b => place(b, 1, 1, [1, -6]),
    b => place(b, 1, 3, [3, 1], ["1,2"]),
  ]),
  [candidates[2].name]: lineOf(middle, [
    b => edit(b, 1, 2, [0, 2], 2, [2, 0]),
    b => place(b, 1, 3, [3, 1], ["1,2"]),
  ]),
};

// A capture, hand-made: Red's blueprint 1 (three cells) on Blue's group, which loses two plain cells and a star. The
// wall beside the stamp stays. Red has five stars on the board before the move, so it scores 5.
const captureBefore: Built = {
  position: {
    ply: 41,
    cells: Object.fromEntries(([
      ["0,-1", 0, "plain"], ["1,-1", 0, "plain"], ["-1,0", 0, "plain"], ["0,0", 0, "star"], ["1,0", 0, "plain"],
      ["-1,1", 0, "wall"], ["0,1", 0, "wall"], ["2,-1", 0, "star"], ["2,-2", 0, "plain"], ["1,2", 0, "plain"],
      ["-2,1", 0, "star"], ["-2,2", 0, "plain"], ["-1,2", 0, "wall"], ["-3,1", 0, "plain"],
      ["3,-1", 1, "plain"], ["3,-2", 1, "star"], ["4,-2", 1, "plain"], ["3,0", 1, "wall"], ["4,-1", 1, "star"],
      ["4,0", 1, "plain"], ["5,-1", 1, "star"], ["5,-2", 1, "wall"], ["4,1", 1, "star"], ["3,1", 1, "plain"],
      ["5,0", 1, "star"], ["2,-3", 1, "plain"], ["3,-3", 1, "plain"],
    ] as [string, Player, Kind][]).map(([k, p, kind]) => [k, [p, kind] as const])),
    blueprints: [
      [plainRing, ringed(["wall", "star", "wall", "star", "wall", "star"]), { "0,0": "star", "1,0": "plain", "-1,1": "plain" }],
      [{ "0,0": "plain", "-1,1": "star", "0,1": "plain" }, ringed(["star", "wall", "star", "wall", "star", "wall"]),
       frame([[[0, 0], "plain"], [[1, 0], "plain"], [[2, 0], "star"], [[0, 1], "plain"], [[1, 1], "wall"], [[-1, 2], "plain"], [[0, 2], "star"], [[1, 2], "plain"], [[2, 1], "plain"], [[3, 0], "plain"], [[-1, 1], "plain"]])],
    ],
    scores: [96, 120],
  },
  last: null,
};
const capture = place(captureBefore, 1, 1, [2, 0], ["1,0", "2,-1", "1,2"], 5);

// An edit: Blue's first move moves blueprint 3's first cell to blueprint 1. Blueprint 3 goes back to its frame, so the
// cell's old place is at -1,0 of its new frame.
const editMove = edit(startBuilt, 0, 3, [0, 0], 1, [2, 1]);

// An empty blueprint: Red's blueprint 3 gives its last cell, a star, to blueprint 2. A blueprint with no cells takes
// a cell only at its 0,0.
const emptyBefore: Built = {
  position: {
    ...middle.position, ply: 58,
    blueprints: [middle.position.blueprints[0], [
      frame([[[0, 0], "plain"], [[1, 0], "plain"], [[2, 0], "plain"], [[-1, 1], "plain"], [[0, 1], "star"], [[1, 1], "plain"], [[0, 2], "plain"], [[1, 2], "plain"], [[2, 1], "plain"], [[-1, 2], "plain"]]),
      frame([[[0, 0], "star"], [[1, 0], "wall"], [[-1, 1], "wall"], [[0, 1], "star"], [[1, 1], "star"], [[-1, 2], "star"], [[0, 2], "wall"], [[2, 0], "plain"], [[2, -1], "plain"], [[-2, 2], "plain"]]),
      { "0,0": "star" },
    ]],
  },
  last: null,
};
const empty = edit(emptyBefore, 1, 3, [0, 0], 2, [1, 0]);

export const FIXTURES: Fixture[] = [
  { name: "The start", ...startBuilt },
  { name: "A middle game", ...middle, candidates, lines },
  { name: "A capture", ...capture },
  { name: "An edit", ...editMove },
  { name: "An empty blueprint", ...empty },
];
