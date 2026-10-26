// The game record, the engine repository's PGN-like notation (its docs/design/04-notation-and-protocol.md, "A game
// record"): tag pairs, then the turns. The record's frame (the tags, the turns, comments, variations, the quality marks,
// the commands and the result) is the shared one (@abstractclass/record/record.ts). Enclosure's part is here: a move is
// an edge in the notation (lower point first) or `pass`, and a move that cuts an enemy edge carries an `x`:
// `D10-G10x`. A reader takes a move with or without it, and a mark on a move that cuts nothing is an error (the engine
// checks that: check.ts). A turn's quality mark follows the cut mark: `G9-G12x??`. A record from a set-up start numbers
// its turns from its `Position` tag's edge count.
import { edgeName, parseEdge, setUpStart } from "#lib/engine/notation.ts";
import { turnFromCount } from "@abstractclass/analysis/turns.ts";
import * as shared from "@abstractclass/record/record.ts";
export { gamePage, playerNames, RecordError, writeRecord, writeTags, type Eval } from "@abstractclass/record/record.ts";

/** A game record of Enclosure: `marked` gives, by move, whether the record marks it as a cut (`x`). */
export type GameRecord = shared.GameRecord<boolean>;

const POINT = "[A-HJ-T](?:1[0-9]|[1-9])";
const EDGE = new RegExp(`^${POINT}-${POINT}$`);

/** The edge's one spelling: the lower point first (by column, then by row). Throws on a malformed edge. */
export function canonicalEdge(text: string): string {
  const upper = text.toUpperCase();
  if (!EDGE.test(upper)) throw new Error(`not an edge: ${text}`);
  return edgeName(parseEdge(upper));
}

/** The turn that a record's first move belongs to: 1 from the standard start, else the set-up start's (its `Position`
 *  tag's edge count, turnFromCount), and whether that move opens its turn. */
function startTurn(position: string | undefined): { turn: number; first: boolean } {
  const count = Number(setUpStart(position)?.split(" ")[4]);
  return Number.isInteger(count) && count >= 0 ? turnFromCount(count) : { turn: 1, first: true };
}

/** Enclosure's moves and its cut mark, for the shared record. */
const edges: shared.Notation<boolean> = {
  read(move) {
    const cut = /x$/i.test(move);
    try {
      return { name: canonicalEdge(cut ? move.slice(0, -1) : move), mark: cut, markAt: move.length - (cut ? 1 : 0) };
    } catch {
      return "not an edge, a turn label or a result";
    }
  },
  mark: cut => (cut ? "x" : ""),
  none: false,
  start: tags => startTurn(tags.Position),
};

/** A record's text with its start given apart (the Analysis board's Import, its address's `position`): the start as
 *  the record's own `Position` tag, unless the record has one, so that its turns are read from the start's own
 *  number. The standard start adds nothing. */
export function withStart(text: string, position: string | null): string {
  const start = setUpStart(position);
  return start && !/\[Position\s/.test(text) ? `[Position "${start}"]\n${text}` : text;
}

/** Reads a game record. Throws a RecordError with the offset of the first problem. */
export const parseRecord = (text: string): GameRecord => shared.readRecord(text, edges);

/** Adds the cut mark to every move that cuts and has none yet. `cuts` is by move, from the engine (check.ts). */
export const markCuts = (text: string, record: GameRecord, cuts: boolean[]): string => shared.markMoves(text, record, cuts, edges);
