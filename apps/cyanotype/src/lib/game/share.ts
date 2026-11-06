// A review shared by link (Hedge School's design 13, item 8; design 33): the game's record, the player's variations,
// and what the review ran with (the engine's build, the network, the review's visits), packed after the review's `#`
// (`/review#packed=…`). The browser never sends that part of an address to a server. The link holds no engine results:
// the recipient's browser reviews the game again. The format is the shared one (@abstractclass/analysis/share.ts).
//
// Blueprints' part: each move as its kind in 2 bits (0 a placement, 1 an edit, 2 a pass), then its numbers. A
// placement is its blueprint's number less 1 in 2 bits, then the anchor hex's q and r. An edit is its two cells, each
// as its blueprint's number less 1 in 2 bits, then its q and r in the blueprint's frame. Each coordinate is a signed
// Elias gamma: 1 bit for 0, 3 bits for -1 and 1, 5 bits for -3 to 2. So a placement near the board's middle costs
// about 20 bits, and a pass 2.
import * as shared from "@abstractclass/analysis/share.ts";
import type { BitReader, BitWriter, MoveCode, SharedReview } from "@abstractclass/analysis/share.ts";
import type { KeptNode } from "@abstractclass/analysis/kept.ts";
import { turnFromCount } from "@abstractclass/analysis/turns.ts";
import { moveName, parseMove, type BlueprintNumber, type HandCell } from "./notation.ts";
import { writeRecord, type GameRecord } from "./record.ts";
export { DISCORD_LIMIT, type SharedReview } from "@abstractclass/analysis/share.ts";

const PLACE = 0, EDIT = 1, PASS = 2;
const broken = () => new Error("the link is broken");

function putCell(w: BitWriter, c: { blueprint: BlueprintNumber; q: number; r: number }) {
  w.put(c.blueprint - 1, 2);
  w.signed(c.q);
  w.signed(c.r);
}
function getCell(r: BitReader): HandCell {
  const blueprint = r.get(2) + 1;
  if (blueprint > 3) throw broken();
  return { blueprint: blueprint as BlueprintNumber, q: r.signed(), r: r.signed() };
}

/** Blueprints' moves in the link. A move that the notation refuses (an edit of a cell before its blueprint's anchor
 *  cell) is a broken link. */
export const BLUEPRINTS_CODE: MoveCode = {
  put(w, name) {
    if (name === "pass") { w.put(PASS, 2); return; }
    const move = parseMove(name);
    if (move.kind === "place") { w.put(PLACE, 2); putCell(w, move); return; }
    w.put(EDIT, 2);
    putCell(w, move.from);
    putCell(w, move.to);
  },
  get(r) {
    const kind = r.get(2);
    if (kind === PASS) return "pass";
    if (kind === PLACE) return moveName({ kind: "place", ...getCell(r) });
    if (kind !== EDIT) throw broken();
    const name = moveName({ kind: "edit", from: getCell(r), to: getCell(r) });
    try { parseMove(name); } catch { throw broken(); }
    return name;
  },
};

/** The text after `#packed=` for a shared review. */
export const encodeShare = (s: SharedReview): string => shared.encodeShare(s, BLUEPRINTS_CODE);

/** A shared review from the text after `#packed=`. Throws an Error that says what is wrong with the link. */
export const decodeShare = (text: string): SharedReview => shared.decodeShare(text, BLUEPRINTS_CODE);

/** What a finished review ran with: the engine module's and the network's SHA-256, and the review's visits. */
export interface ReviewRun { module: string; model: string; visits: number }

/** The link that shares a review: its game's record, its variations, and what the review ran with. */
export const reviewLink = (origin: string, record: GameRecord, branches: KeptNode[], run: ReviewRun): string =>
  `${origin}/review#packed=${encodeShare({ module: run.module.slice(0, 8), model: run.model.slice(0, 8), visits: run.visits,
                                           tags: record.tags, moves: record.moves, branches })}`;

/** The game's record from a shared review: its tags, then its turns (Blue's first of one move, then two a turn: a
 *  pass is one move). The review checks the moves with the engine's rules, as for any record. */
export function sharedRecord(s: SharedReview): string {
  const turns: { number: number; moves: number }[] = [];
  s.moves.forEach((_, i) => {
    const t = turnFromCount(i);
    if (t.first || !turns.length) turns.push({ number: t.turn, moves: 1 });
    else turns[turns.length - 1].moves++;
  });
  return writeRecord(s.tags, s.moves, turns, s.tags.Result ?? "*");
}
