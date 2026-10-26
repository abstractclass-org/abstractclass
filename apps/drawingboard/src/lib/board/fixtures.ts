// The positions of the board's lab page and tests: the start, a middle game with candidates and a line, a capture, an
// edit and an empty blueprint. Each is a game of moves from the standard start that Stamp Duty's early build played:
// scripts/board-fixtures.mjs writes what the engine says to fixtures.json, the position, its mover, every legal move
// (describe's `legal`), and what each move did (describe_game). The site has no rules: this module only reads that data
// and gives each move what the board draws of it. The candidates and their lines are hand-made marks, each a legal
// move where it stands. No game of strategyjam.org's archive: this repository is public.
import data from "./fixtures.json" with { type: "json" };
import { parseMove } from "../game/notation.ts";
import type { BoardCandidate, BoardLineMove } from "./Board.svelte";
import { anchorOf, hexKey, parseHex, type Hex } from "./hex.ts";
import { footprintOf, type BoardMove, type Hand, type HandHex, type Kind, type Player, type SitePosition } from "./position.ts";

/** What a move did, as the engine's describe_game gives it: the player who made it, the hexes that a placement filled,
 *  the cells that it captured (as they were before it), its points, and the hands after it. */
export interface EngineStep {
  move: string;
  player: Player;
  footprint: string[];
  captured: Record<string, [Player, Kind]>;
  points: number;
  blueprints: [Hand, Hand];
}
/** A position of the data file: the game's moves, the position after them with its mover and legal moves, the last
 *  move with the hands before it, and the middle game's candidates (with their notes) and lines. */
export interface FixtureData {
  name: string;
  moves: string[];
  position: SitePosition;
  mover: Player;
  legal: string[];
  last: EngineStep | null;
  before: [Hand, Hand] | null;
  candidates?: (EngineStep & { note: string })[];
  lines?: Record<string, EngineStep[]>;
}
/** The data file: the engine's build, and the positions. */
export const FIXTURE_DATA = data as unknown as {
  engine: { tag: string; build: string; protocol: string; sha256: string };
  fixtures: FixtureData[];
};

export interface Fixture {
  name: string;
  position: SitePosition;
  last: BoardMove | null;
  candidates?: BoardCandidate[];
  /** The line of each candidate that has one, by its name. */
  lines?: Record<string, BoardLineMove[]>;
  /** Who moves: Blue's first turn has one move, then two a turn. */
  mover: Player;
  /** Every legal move, as the engine gives it, for the player's own moves. */
  legal: string[];
}

const at = (h: Hex, d: Hex): Hex => [h[0] - d[0], h[1] - d[1]];

/** An edit's two hexes in the frames after it. The string names them in the frames before it (design 33, item 5), and
 *  the two blueprints then go back to their frames: each moves by its anchor cell after the edit. */
export function editAfter(hand: Hand, from: HandHex, to: HandHex): [Hex, Hex] {
  const cells = hand.map(b => Object.keys(b).map(parseHex));
  cells[from.blueprint - 1] = cells[from.blueprint - 1].filter(h => hexKey(h) !== hexKey(from.hex));
  cells[to.blueprint - 1] = [...cells[to.blueprint - 1], to.hex];
  const moved = (n: number): Hex => anchorOf(cells[n - 1]) ?? [0, 0];
  return [at(from.hex, moved(from.blueprint)), at(to.hex, moved(to.blueprint))];
}

/** The board's move of a step. A placement's footprint is its blueprint's cells on its anchor hex, in the hand before
 *  it (a placement leaves the hand as it is). An edit's hexes are in the frames before it (`frames` "before", as a
 *  candidate's name gives them), or after it. */
function boardMove(s: EngineStep, before: readonly [Hand, Hand], frames: "before" | "after"): BoardMove {
  const m = parseMove(s.move), hand = before[s.player];
  if (m.kind === "place") {
    const anchor: Hex = [m.q, m.r];
    const captured = Object.entries(s.captured).map(([key, [owner, kind]]) => ({ hex: parseHex(key), owner, kind }));
    return { type: "place", player: s.player, blueprint: m.blueprint, at: anchor, footprint: footprintOf(hand[m.blueprint - 1], anchor), captured };
  }
  let from: HandHex = { blueprint: m.from.blueprint, hex: [m.from.q, m.from.r] };
  let to: HandHex = { blueprint: m.to.blueprint, hex: [m.to.q, m.to.r] };
  const kind = hand[from.blueprint - 1][hexKey(from.hex)];
  if (frames === "after") {
    const [f, t] = editAfter(hand, from, to);
    [from, to] = [{ ...from, hex: f }, { ...to, hex: t }];
  }
  return { type: "edit", player: s.player, kind, from, to };
}

function fixtureOf(f: FixtureData): Fixture {
  const hands = f.position.blueprints;
  const candidates = f.candidates?.map((c, i): BoardCandidate =>
    ({ name: c.move, move: boardMove(c, hands, "before"), rank: i + 1, note: c.note }));
  /** A line: each move with the hands after it, from the hands before it. */
  const lineOf = (steps: EngineStep[]): BoardLineMove[] =>
    steps.map((s, i) => ({ move: boardMove(s, i ? steps[i - 1].blueprints : hands, "after"), hands: s.blueprints }));
  return {
    name: f.name, position: f.position, mover: f.mover, legal: f.legal,
    last: f.last && f.before ? boardMove(f.last, f.before, "after") : null,
    ...(candidates ? { candidates } : {}),
    ...(f.lines ? { lines: Object.fromEntries(Object.entries(f.lines).map(([name, steps]) => [name, lineOf(steps)])) } : {}),
  };
}

export const FIXTURES: Fixture[] = FIXTURE_DATA.fixtures.map(fixtureOf);
