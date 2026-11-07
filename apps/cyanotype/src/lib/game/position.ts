// A Blueprints position in one line of text (docs/design/33-cyanotype.md, "Decision", item 10): what FEN is for chess,
// in the form of Hedge School's position notation for Enclosure (the engine repository's design 04, "A position"). A
// record's `Position` tag, the board editor's field, the Analysis board's Import and a link's start hold it. Seven
// fields, separated by spaces:
//   1. Blue's cells on the board, in reading order (the least r, then the least q), separated by `;`. A cell is its hex
//      `q,r` in the board's coordinates, then its kind's letter: `s` for a star, `w` for a wall, none for a Normal cell.
//      `-` when the player has no cell on the board.
//   2. Red's cells, the same.
//   3. Blue's hand: its three blueprints, separated by `|`, each its cells in its own frame (its anchor cell at 0,0), in
//      reading order, as the cells of the board. `-` for an empty blueprint.
//   4. Red's hand, the same.
//   5. The mover (`b` or `r`) and the moves left in its turn: `b1`, `r2`. A finished game (120 moves) has `r0`.
//   6. The scores, Blue's then Red's: `0/24`.
//   7. The moves played, 0 to 120.
// So one position has one spelling. This module checks the notation's form, not the rules: the engine checks the hands
// and the rest (enginePosition gives it the position in its own form). The site has no rules.
import type { Player } from "@abstractclass/analysis/game.ts";
import { LAST_COUNT, moverOf, turnFromCount } from "@abstractclass/analysis/turns.ts";
import { anchorOf, hexKey, parseHex, type Hex } from "../board/hex.ts";
import type { Blueprint, Hand, Kind, SitePosition } from "../board/position.ts";

/** The standard start: each player's three blueprints, a star with its ring of six cells, on the board at q = -6, -10
 *  and -2 for Blue and 6, 10 and 2 for Red, and the same three in each hand (strategyjam.org's version 3). */
export const STANDARD_START = "-10,-1w;-9,-1s;-6,-1;-5,-1;-2,-1;-1,-1;-11,0s;-10,0s;-9,0w;-7,0;-6,0s;-5,0;-3,0;-2,0s;-1,0;"
  + "-11,1w;-10,1s;-7,1;-6,1;-3,1;-2,1 2,-1;3,-1;6,-1;7,-1;10,-1s;11,-1w;1,0;2,0s;3,0;5,0;6,0s;7,0;9,0w;10,0s;11,0s;1,1;"
  + "2,1;5,1;6,1;9,1s;10,1w 0,0;1,0;-1,1;0,1s;1,1;-1,2;0,2|0,0w;1,0s;-1,1s;0,1s;1,1w;-1,2w;0,2s|0,0;1,0;-1,1;0,1s;1,1;"
  + "-1,2;0,2 0,0;1,0;-1,1;0,1s;1,1;-1,2;0,2|0,0s;1,0w;-1,1w;0,1s;1,1s;-1,2s;0,2w|0,0;1,0;-1,1;0,1s;1,1;-1,2;0,2 b1 0/0 0";

/** A kind's letter in the notation: none for a Normal cell. */
const LETTER: Record<Kind, string> = { plain: "", star: "s", wall: "w" };
const KIND: Record<string, Kind> = { "": "plain", s: "star", w: "wall" };
const PLAYER_LETTERS = "br";

/** Reading order: the least r, then the least q (the anchor cell's rule, design 33, item 5). */
const byReading = (a: Hex, b: Hex) => a[1] - b[1] || a[0] - b[0];
const cellText = (h: Hex, kind: Kind) => `${hexKey(h)}${LETTER[kind]}`;

/** A list of cells, in reading order, or `-` for none. */
function cellList(cells: [Hex, Kind][]): string {
  return cells.length ? cells.sort((a, b) => byReading(a[0], b[0])).map(([h, k]) => cellText(h, k)).join(";") : "-";
}
const blueprintText = (b: Blueprint) => cellList(Object.entries(b).map(([key, kind]) => [parseHex(key), kind]));

/** The position in the notation. */
export function writePosition(p: SitePosition): string {
  const board = (player: Player) =>
    cellList(Object.entries(p.cells).filter(([, [owner]]) => owner === player).map(([key, [, kind]]) => [parseHex(key), kind]));
  const hand = (player: Player) => p.blueprints[player].map(blueprintText).join("|");
  const mover = moverOf(p.ply);
  return `${board(0)} ${board(1)} ${hand(0)} ${hand(1)} ${PLAYER_LETTERS[mover.player]}${mover.left} ${p.scores[0]}/${p.scores[1]} ${p.ply}`;
}

const CELL = /^(-?\d+),(-?\d+)([sw]?)$/;

/** A list of cells in the notation: each cell's hex and kind, each hex once. `what` names the list in an error. */
function readCells(field: string, what: string): [Hex, Kind][] {
  if (field === "-") return [];
  const seen = new Set<string>(), out: [Hex, Kind][] = [];
  for (const item of field.split(";")) {
    const m = CELL.exec(item);
    if (!m) throw new Error(`not a cell of ${what}: "${item}" (a cell is q,r, then s for a star or w for a wall)`);
    const h: Hex = [Number(m[1]), Number(m[2])], key = hexKey(h);
    if (seen.has(key)) throw new Error(`${what} has two cells at ${key}`);
    seen.add(key);
    out.push([h, KIND[m[3]]]);
  }
  return out;
}

/** A hand in the notation: three blueprints, each in its own frame (its anchor cell, the first in reading order, at
 *  0,0). */
function readHand(field: string, player: string): Hand {
  const parts = field.split("|");
  if (parts.length !== 3) throw new Error(`${player}'s hand is three blueprints, separated by |`);
  return parts.map((part, i) => {
    const what = `${player}'s blueprint ${i + 1}`, cells = readCells(part, what), anchor = anchorOf(cells.map(c => c[0]));
    if (anchor && (anchor[0] !== 0 || anchor[1] !== 0))
      throw new Error(`${what} is not in its frame: its anchor cell, the first in reading order, is at ${hexKey(anchor)}, not at 0,0`);
    return Object.fromEntries(cells.map(([h, k]) => [hexKey(h), k]));
  }) as unknown as Hand;
}

/** A position in the notation, read. Throws an Error that says what is wrong with its form. The mover field must be
 *  the one that the moves played give (moverOf), as the notation's turns fix it. */
export function readPosition(text: string): SitePosition {
  const fields = text.trim().split(/\s+/);
  if (fields.length !== 7)
    throw new Error("a position has seven fields: Blue's cells, Red's cells, Blue's hand, Red's hand, the mover, the scores and the moves played");
  const [blue, red, blueHand, redHand, mover, scores, count] = fields;
  const n = Number(count);
  if (!/^\d+$/.test(count) || n > LAST_COUNT) throw new Error(`not a count of moves played from 0 to ${LAST_COUNT}: ${count}`);
  const s = /^(\d+)\/(\d+)$/.exec(scores);
  if (!s) throw new Error(`not two scores: ${scores} (Blue's, then Red's, such as 0/24)`);
  if (!/^[br][0-2]$/.test(mover)) throw new Error(`not a mover and its moves left: ${mover} (such as b1 or r2)`);
  const turn = moverOf(n), expected = `${PLAYER_LETTERS[turn.player]}${turn.left}`;
  if (mover !== expected) throw new Error(`the mover field is ${mover}, but after ${n} moves played it is ${expected}`);
  const cells: Record<string, readonly [Player, Kind]> = {};
  for (const [player, field, name] of [[0, blue, "Blue's cells"], [1, red, "Red's cells"]] as const)
    for (const [h, kind] of readCells(field, name)) {
      const key = hexKey(h);
      if (cells[key]) throw new Error(`Blue and Red both have a cell at ${key}`);
      cells[key] = [player, kind];
    }
  return { ply: n, cells, blueprints: [readHand(blueHand, "Blue"), readHand(redHand, "Red")],
           scores: [Number(s[1]), Number(s[2])] };
}

/** A set-up start as the site keeps it: the position in its one spelling, or undefined for none and for the standard
 *  start, which is no set-up start (a board from it keeps the standard start's stored results). A text that the
 *  notation cannot read stays as it is, with its spaces made single, for the reader that refuses it. */
export function setUpStart(position: string | null | undefined): string | undefined {
  const p = position?.trim().replace(/\s+/g, " ");
  if (!p || p === "?" || p === "-") return undefined;
  let text = p;
  try { text = writePosition(readPosition(p)); } catch { /* the reader that gets it says what is wrong */ }
  return text === STANDARD_START ? undefined : text;
}

/** The turn of a record's first move after its start (`Position`), and whether that move opens its turn: the start's
 *  moves played give it (the engine repository's design 04, "The turns after a set-up start"). */
export function startTurn(position: string | undefined): { turn: number; first: boolean } {
  const count = Number(setUpStart(position)?.split(" ")[6]);
  return Number.isInteger(count) && count >= 0 ? turnFromCount(count) : { turn: 1, first: true };
}

/** The engine's rules board holds 511 x 511 hexes (the engine repository's games/blueprints/README.md, "The rules
 *  board's limit"). */
const RULES_LEN = 511;

/** A position in the engine's one-line form (the engine repository's games/blueprints/README.md, "The port"): the moves
 *  played, the scores, the board with each cell from the rules board's middle (`q,r,T`, psw for Blue and PSW for Red),
 *  the hands (`q,r,t`), no pick, the site's coordinates of the rules board's middle, and no recent placements. The
 *  middle is the middle of the cells' box. The recent placements set the network's view, which follows the play: a
 *  set-up position has none, and the engine puts the view at the middle of the cells. Throws an Error that says what
 *  is wrong with the notation, or that the cells span more hexes than the engine's rules board holds. */
export function enginePosition(position: string): string {
  const p = readPosition(position), entries = Object.entries(p.cells).map(([key, cell]) => [parseHex(key), cell] as const);
  const span = (i: 0 | 1) => {
    const values = entries.map(([h]) => h[i]), lo = Math.min(...values), hi = Math.max(...values);
    if (hi - lo + 1 > RULES_LEN)
      throw new Error(`the cells span ${hi - lo + 1} hexes, and the engine's rules board holds ${RULES_LEN} x ${RULES_LEN}`);
    return Math.floor((lo + hi) / 2);
  };
  const [oq, or] = entries.length ? [span(0), span(1)] : [0, 0];
  const board = entries.map(([[q, r], [owner, kind]]) => {
    const letter = (LETTER[kind] || "p");
    return `${q - oq},${r - or},${owner ? letter.toUpperCase() : letter}`;
  }).join(";") || "-";
  const hand = (h: Hand) => h.map(b => Object.entries(b).map(([key, kind]) => `${key},${LETTER[kind] || "p"}`).join(";") || "-").join("|");
  return `${p.ply} ${p.scores[0]} ${p.scores[1]} ${board} ${hand(p.blueprints[0])} ${hand(p.blueprints[1])} - ${oq},${or} -|-`;
}
