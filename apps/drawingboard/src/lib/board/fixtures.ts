// The positions of the board's lab page and tests: the start, a middle game with candidates and a line, a capture, an
// edit and an empty blueprint. Each is a game of moves from the standard start that Stamp Duty's build played:
// scripts/board-fixtures.mjs writes what the engine says to fixtures.json, the position, its mover, every legal move
// (describe's `legal`), and what each move did (describe_game). The site has no rules: this module only reads that data
// and gives each move what the board draws of it. The candidates and their lines are hand-made marks, each a legal
// move where it stands. No game of strategyjam.org's archive: this repository is public.
import data from "./fixtures.json" with { type: "json" };
import type { BoardCandidate, BoardLineMove } from "./Board.svelte";
import { boardMove, type EngineStep } from "./described.ts";
import type { BoardMove, Hand, Player, SitePosition } from "./position.ts";

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
