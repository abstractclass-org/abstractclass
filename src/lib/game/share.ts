// A review shared by link (design 13): the game's record, the player's branches, and what the review ran with (the
// engine's build, the network, the review's visits), packed after the review's `#` (`/review#packed=…`, design 22). The browser
// never sends that part of an address to a server. The link holds no engine results: the recipient's browser reviews
// the game again. The engine gives the same results for the same build, network and visits, so the review is the
// sender's (on the GPU, the network's arithmetic differs a little: design 15).
//
// The format, version 1, in base64url:
// - bytes: the version, then the first 4 bytes of the engine module's SHA-256 and of the network's;
// - then bits: the review's visits (Elias gamma); the tags as UTF-8, `key<TAB>value` lines (their length in bytes,
//   then the bytes); the game's moves (their number, then each as two points of 9 bits, x · 19 + y, or 511 for a
//   pass); the branches as a tree: the game's positions that have branches (their number, then each as the gap from
//   the one before), and from each, the branch nodes in order, each with its edge, 1 bit for "evaluated", and its number
//   of children (1 bit for one, 2 bits for none, more bits for more).
// So a branch costs 20 bits for each edge where it goes on in one line, and a game's move 18 bits.
import { edgeName, parseEdge } from "#lib/engine/notation.ts";
import { writeRecord } from "./record.ts";
import type { BranchNode } from "./store.ts";

export const SHARE_VERSION = 1;
/** A message's length in Discord, where the game's players meet: a link longer than this does not fit in one. */
export const DISCORD_LIMIT = 2000;

export interface SharedReview {
  module: string; // the engine module's SHA-256, its first 8 hex digits
  model: string; // the network's SHA-256, its first 8 hex digits
  visits: number; // the review's visits for each position
  tags: Record<string, string>;
  moves: string[]; // the game's moves: edges in the notation, or "pass"
  branches: BranchNode[]; // as the browser keeps them: the node's path, its order, 1 when it was evaluated
}

class BitWriter {
  readonly bytes: number[] = [];
  private n = 0;
  bit(b: number) {
    if (this.n % 8 === 0) this.bytes.push(0);
    if (b) this.bytes[this.bytes.length - 1] |= 0x80 >> (this.n % 8);
    this.n++;
  }
  put(value: number, width: number) { for (let i = width - 1; i >= 0; i--) this.bit((value >> i) & 1); }
  /** Elias gamma: a whole number from 1, in 2·log2(n) + 1 bits. */
  gamma(n: number) {
    const width = n.toString(2).length;
    this.put(0, width - 1);
    this.put(n, width);
  }
}

class BitReader {
  private n = 0;
  private readonly bytes: Uint8Array;
  constructor(bytes: Uint8Array) { this.bytes = bytes; }
  bit(): number {
    const byte = this.bytes[this.n >> 3];
    if (byte === undefined) throw new Error("the link is cut short");
    return (byte >> (7 - (this.n++ % 8))) & 1;
  }
  get(width: number): number { let v = 0; for (let i = 0; i < width; i++) v = (v << 1) | this.bit(); return v; }
  gamma(): number {
    let zeros = 0;
    while (this.bit() === 0) if (++zeros > 30) throw new Error("the link is broken");
    return (1 << zeros) | this.get(zeros);
  }
}

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
// A node's number of children: one is the common case in a line.
function putKids(w: BitWriter, k: number) {
  if (k === 1) w.bit(1);
  else if (k === 0) w.put(1, 2);
  else { w.put(0, 2); w.gamma(k - 1); }
}
function getKids(r: BitReader): number {
  if (r.bit()) return 1;
  return r.bit() ? 0 : r.gamma() + 1;
}

const hexBytes = (hex: string) => Array.from({ length: 4 }, (_, i) => parseInt(hex.slice(2 * i, 2 * i + 2), 16) || 0);
const hexOf = (bytes: Uint8Array) => [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
const base64url = (bytes: number[]) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unbase64url = (text: string) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));

interface Node { key: string; move: string; order: number; judged: boolean; kids: Node[] }

/** The branches as a tree: for each position of the game that has branches (by its number of moves), its branch
 *  nodes, each with its children, in the order the player added them. A node whose parent is gone is left out. */
function branchTree(moves: string[], branches: BranchNode[]): [number, Node[]][] {
  const nodes = new Map<string, Node>(branches.map(([key, order, judged]) =>
    [key, { key, move: key.slice(key.lastIndexOf(" ") + 1), order, judged: !!judged, kids: [] }]));
  const roots = new Map<number, Node[]>();
  for (const node of [...nodes.values()].sort((a, b) => a.order - b.order)) {
    const path = node.key.split(" "), parent = path.slice(0, -1);
    const onGame = parent.length <= moves.length && parent.every((m, i) => moves[i] === m); // from the game's end too
    if (onGame) roots.set(parent.length, [...(roots.get(parent.length) ?? []), node]);
    else nodes.get(parent.join(" "))?.kids.push(node);
  }
  return [...roots.entries()].sort((a, b) => a[0] - b[0]);
}

/** The text after `#s=` for a shared review. */
export function encodeShare(s: SharedReview): string {
  const w = new BitWriter();
  w.gamma(s.visits);
  const tags = new TextEncoder().encode(Object.entries(s.tags)
    .map(([k, v]) => `${k}\t${v}`.replace(/\n/g, " ")).join("\n"));
  w.gamma(tags.length + 1);
  for (const b of tags) w.put(b, 8);
  w.gamma(s.moves.length + 1);
  for (const m of s.moves) putMove(w, m);
  const tree = branchTree(s.moves, s.branches);
  w.gamma(tree.length + 1);
  let last = 0;
  const node = (n: Node) => {
    putMove(w, n.move);
    w.bit(n.judged ? 1 : 0);
    putKids(w, n.kids.length);
    n.kids.forEach(node);
  };
  for (const [at, kids] of tree) {
    w.gamma(at - last + 1);
    last = at;
    w.gamma(kids.length);
    kids.forEach(node);
  }
  return base64url([SHARE_VERSION, ...hexBytes(s.module), ...hexBytes(s.model), ...w.bytes]);
}

/** A shared review from the text after `#s=`. Throws an Error that says what is wrong with the link. */
export function decodeShare(text: string): SharedReview {
  let bytes: Uint8Array;
  try { bytes = unbase64url(text); } catch { throw new Error("the link is broken"); }
  if (bytes[0] !== SHARE_VERSION) throw new Error("the link is from another version of this site");
  if (bytes.length < 9) throw new Error("the link is cut short");
  const r = new BitReader(bytes.subarray(9));
  const visits = r.gamma();
  const tagBytes = Uint8Array.from({ length: r.gamma() - 1 }, () => r.get(8));
  const tags = Object.fromEntries(new TextDecoder().decode(tagBytes).split("\n").filter(Boolean).map(line => {
    const tab = line.indexOf("\t");
    return [line.slice(0, tab), line.slice(tab + 1)];
  }));
  const moves = Array.from({ length: r.gamma() - 1 }, () => getMove(r));
  const branches: BranchNode[] = [];
  const node = (parent: string[]) => {
    const path = [...parent, getMove(r)], judged = r.bit(), kids = getKids(r);
    branches.push(judged ? [path.join(" "), branches.length, 1] : [path.join(" "), branches.length]);
    for (let k = 0; k < kids; k++) node(path);
  };
  let at = 0;
  for (let roots = r.gamma() - 1; roots > 0; roots--) {
    at += r.gamma() - 1;
    if (at > moves.length) throw new Error("the link is broken");
    for (let k = r.gamma(); k > 0; k--) node(moves.slice(0, at));
  }
  return { module: hexOf(bytes.subarray(1, 5)), model: hexOf(bytes.subarray(5, 9)), visits, tags, moves, branches };
}

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
