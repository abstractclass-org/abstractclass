// A review shared by link (design 13): the game's record, the player's variations, and what the review ran with (the
// engine's build, the network, the review's visits), packed after the review's `#` (`/review#packed=…`, design 22). The
// browser never sends that part of an address to a server. The link holds no engine results: the recipient's browser
// reviews the game again. The engine gives the same results for the same build, network and visits, so the review is the
// sender's (on the GPU, the network's arithmetic differs a little: design 15).
//
// The format is the shared one (@abstractclass/analysis/share.ts). Enclosure's part: each move as two points of 9 bits,
// x · 19 + y, or 511 for a pass. So a variation costs 20 bits for each edge where it goes on in one line, and a game's
// move 18 bits.
import { edgeName, parseEdge } from "#lib/engine/notation.ts";
import { writeRecord } from "./record.ts";
import * as shared from "@abstractclass/analysis/share.ts";
import type { BitReader, BitWriter, MoveCode, SharedReview } from "@abstractclass/analysis/share.ts";
export { DISCORD_LIMIT, type SharedReview } from "@abstractclass/analysis/share.ts";

const PASS = 511;
const pointCode = (x: number, y: number) => x * 19 + y;
function putMove(w: BitWriter, move: string) {
  if (move === "pass") { w.put(PASS, 9); return; }
  const [ax, ay, bx, by] = parseEdge(move);
  w.put(pointCode(ax, ay), 9);
  w.put(pointCode(bx, by), 9);
}
function getMove(r: BitReader): string {
  const a = r.get(9);
  if (a === PASS) return "pass";
  const b = r.get(9);
  if (a > 360 || b > 360) throw new Error("the link is broken");
  return edgeName([Math.floor(a / 19), a % 19, Math.floor(b / 19), b % 19]);
}
/** Enclosure's moves in the link. */
export const ENCLOSURE_CODE: MoveCode = { put: putMove, get: getMove };

/** The text after `#packed=` for a shared review. */
export const encodeShare = (s: SharedReview): string => shared.encodeShare(s, ENCLOSURE_CODE);

/** A shared review from the text after `#packed=`. Throws an Error that says what is wrong with the link. */
export const decodeShare = (text: string): SharedReview => shared.decodeShare(text, ENCLOSURE_CODE);

/** The game's record from a shared review: its tags, then its turns (the first of one move, each other of two, and a
 *  pass ends a turn, as the rules play them). The import gives it its cut marks. */
export function sharedRecord(s: SharedReview): string {
  const turns: string[][] = [];
  for (const m of s.moves) {
    const t = turns.at(-1);
    if (t && t.length < (turns.length === 1 ? 1 : 2) && t.at(-1) !== "pass") t.push(m);
    else turns.push([m]);
  }
  return writeRecord(s.tags, s.moves, turns.map((t, i) => ({ number: i + 1, moves: t.length })), s.tags.Result ?? "*");
}
