// The positions of the board's lab page (design 34, "The board"). The real ones are from games of the engine
// repository's alpha-beta bot against itself (games.json, from scripts/board-games.py, with the command that made
// them): each is the TPS after one ply of a game. The hand-made ones show what no short game does, and the page marks
// them. No playtak game and no player's name: this repository is public.
import data from "./games.json" with { type: "json" };
import { emptyBoard } from "../game/tps.ts";

export interface Fixture { name: string; tps: string; source: string }

interface GamePosition { size: number; seed: number; depth: number; ply: number; plies: number; result: string; tps: string }
/** The engine repository's commit, the command that made the games, and the positions taken from them. */
export const GAME_DATA: { commit: string; command: string; positions: GamePosition[] } = data;

const GAMES = GAME_DATA.positions.map((p): Fixture => ({
  name: `${p.size}x${p.size}, game ${p.seed}, ply ${p.ply}`,
  tps: p.tps,
  source: `From a game of the alpha-beta bot against itself (depth ${p.depth}, seed ${p.seed}), after ply ${p.ply} of `
    + `${p.plies}. The result: ${p.result}.`,
}));

/** A full board of 8x8, by a pattern: each kind of piece, alone and on stacks of 2 to 4. */
function full8(): string {
  const square = (x: number, y: number): string => {
    if (x === 3 && y === 4) return "221C";
    if (x === 5 && y === 2) return "12C";
    const n = (x * 3 + y * 5) % 7, owner = (x + y * 2) % 3 ? "1" : "2", other = owner === "1" ? "2" : "1";
    return n === 0 ? `${other}${owner}S` : n === 1 ? `${owner}${other}${other}${owner}` : n === 2 ? `${other}${owner}` : owner;
  };
  const eight = Array.from({ length: 8 }, (_, i) => i);
  return `${eight.map(y => eight.map(x => square(x, y)).join(",")).join("/")} 1 60`;
}

/** Piles of 8 behind each other, and stacks of 19 under a wall of each player, a capstone and a flat. */
function piles8(): string {
  const pile = "12".repeat(4), tall = "12".repeat(9);
  return `x8/x8/x8/x2,${pile},1S,x4/x2,${pile},${pile},${tall}1S,${tall}2S,${tall}2C,${tall}1/x8/x8/x8 1 60`;
}

const HAND = [
  ...[3, 4, 5, 6, 7, 8].map((size): Fixture => ({
    name: `${size}x${size}, empty`, tps: emptyBoard(size), source: `Made by hand: the empty board of ${size}x${size}.`,
  })),
  {
    name: "6x6, stacks of 10 and 20",
    tps: "1,2,x,1,x,2S/x,1S,x,2,1,x/2,x,x,21121221122112122112,x,1/x,2,1212211221C,x,2C,x/1,x,121,x,1S,2/x,2,x,1,12,x 2 34",
    source: "Made by hand: a stack of 10 pieces at c3 and one of 20 at d4, with each kind of piece.",
  },
  { name: "8x8, full", tps: full8(), source: "Made by hand: a full board of 8x8." },
  {
    name: "8x8, full piles", tps: piles8(),
    source: "Made by hand: piles of 8 behind each other, and stacks of 19 with each kind of piece on top.",
  },
  {
    name: "6x6, a stack of 40", tps: `x6/x6/x3,1,x2/x3,${"1121222112".repeat(4)},x2/x3,2,x2/x6 1 30`,
    source: "Made by hand: a stack of 40 pieces at d3, past what a game reaches.",
  },
  {
    name: "6x6, tall neighbours",
    tps: `x,11S,22S,11C,22C,x/x6/x6/x2,${"12".repeat(13)}1,${"21".repeat(13)}2,x2/x6/x6 1 30`,
    source: "Made by hand: two stacks of 27 side by side, and walls and capstones on flats of their own colour.",
  },
];

export const FIXTURES: Fixture[] = [...GAMES, ...HAND];
