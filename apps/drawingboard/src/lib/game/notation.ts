// Blueprints' moves in strategyjam.org's strings, as they are (docs/design/33-drawing-board.md, items 5 and 6):
// - A placement `K@q,r`: blueprint K (1, 2 or 3) with its first cell (the least r, then the least q: the cell 0,0 of
//   its own frame) on the hex (q, r) of the board's axial coordinates.
// - An edit `I:q,r>J:q,r`: the cell at (q, r) of blueprint I goes to (q, r) of blueprint J, both in the blueprints'
//   frames as they are before the edit (the target's cell can come before its first cell: `1:0,0>3:1,-1`).
// - `pass`: a player's clock ran out. It counts as one move.
// A placement that removes enemy cells carries the mark `x`, and `x+N` when it scores N points (`2@-3,1x+24`), never
// `+0`. The engine gives the removed cells and the points (check.ts). This module checks the notation, not the rules:
// the engine checks that a move is legal. The move's name, its one spelling, is the string without its mark: the move
// tree, the cache and the engine key on it (@abstractclass/analysis/game.ts).
import type { Moves } from "@abstractclass/analysis/game.ts";
import type { ReadMove } from "@abstractclass/record/record.ts";
export { turnFromCount } from "@abstractclass/analysis/turns.ts";

export type Blueprint = 1 | 2 | 3;
/** A cell of a blueprint, in the blueprint's own frame. */
export interface Cell { blueprint: Blueprint; q: number; r: number }
/** A move, not a pass: a placement on the hex (q, r), or an edit of one cell. */
export type Move = { kind: "place"; blueprint: Blueprint; q: number; r: number } | { kind: "edit"; from: Cell; to: Cell };
/** A placement's capture mark: it removes enemy cells, and scores `points` (0 for the mark `x` alone). */
export interface Capture { points: number }

const N = "(-?\\d+)";
const PLACEMENT = new RegExp(`^(\\d+)@${N},${N}$`);
const EDIT = new RegExp(`^(\\d+):${N},${N}>(\\d+):${N},${N}$`);
/** A capture mark at a word's end: `x`, or `x+N`. */
const CAPTURE = /x(?:\+(\d+))?$/i;

const cellName = (c: Cell) => `${c.blueprint}:${c.q},${c.r}`;

/** The move's name, its one spelling: "pass" for null. */
export function moveName(move: Move | null): string {
  if (!move) return "pass";
  return move.kind === "place" ? `${move.blueprint}@${move.q},${move.r}` : `${cellName(move.from)}>${cellName(move.to)}`;
}

/** The move of a text without its marks, or what is wrong with the text. */
function readName(text: string): Move | string {
  const place = PLACEMENT.exec(text), edit = EDIT.exec(text);
  if (!place && !edit) return "not a move, a turn label or a result";
  // `+ 0` makes -0 a 0, so that "-0" and "0" are one hex.
  const numbers = (place ?? edit)!.slice(1).map(n => Number(n) + 0);
  if (!numbers.every(Number.isSafeInteger)) return "a number of the move is too large";
  const [k, q, r, j, tq, tr] = numbers, blueprint = (b: number) => b >= 1 && b <= 3;
  if (!blueprint(k) || (edit && !blueprint(j))) return "a blueprint's number is 1, 2 or 3";
  if (place) return { kind: "place", blueprint: k as Blueprint, q, r };
  // A blueprint's first cell is its cell 0,0, the least r, then the least q: the cell that an edit takes is not before it.
  if (r < 0 || (r === 0 && q < 0)) return "an edit cannot take a cell before the first cell (0,0) of its blueprint";
  return { kind: "edit", from: { blueprint: k as Blueprint, q, r }, to: { blueprint: j as Blueprint, q: tq, r: tr } };
}

/** The move of a name that is not "pass". Throws on a malformed name. */
export function parseMove(name: string): Move {
  const move = readName(name);
  if (typeof move === "string") throw new Error(`${move}: ${name}`);
  return move;
}

const sameCell = (a: Cell, b: Cell) => a.blueprint === b.blueprint && a.q === b.q && a.r === b.r;

/** Whether two values are one move. The shared code compares moves often, so this compares their fields, not their
 *  names. */
export const sameMove = (a: Move, b: Move): boolean => a.kind === "place"
  ? b.kind === "place" && sameCell(a, b)
  : b.kind === "edit" && sameCell(a.from, b.from) && sameCell(a.to, b.to);

/** Blueprints' moves for the game interface: the shared code compares and keys moves with these. */
export const moves: Moves<Move> = { equal: sameMove, moveName, parseMove };

/** A capture mark as the record writes it: "" for none, `x`, or `x+N`. */
export const captureText = (capture: Capture | null) => (!capture ? "" : capture.points ? `x+${capture.points}` : "x");

/** A move as the record and the move list write it: its name, then its capture mark. */
export const moveText = (name: string, capture: Capture | null) => name + captureText(capture);

/** A move from a record's word without its quality mark (not a pass): its name and its capture mark, or what is wrong
 *  with the word (the record adds the word to the text). The record reads the moves with this (record.ts). */
export function readMove(word: string): ReadMove<Capture | null> | string {
  const mark = CAPTURE.exec(word);
  const move = readName(mark ? word.slice(0, mark.index) : word);
  if (typeof move === "string") return move;
  if (mark && move.kind === "edit") return "only a placement has a capture mark: an edit removes no cells";
  if (mark?.[1] && Number(mark[1]) === 0) return "a placement that scores no points has the mark x, not x+0";
  return { name: moveName(move), mark: mark && { points: Number(mark[1] ?? 0) }, markAt: mark?.index ?? word.length };
}
