// A game's tree packed into a link, after the page's `#`, which the browser never sends to a server (Hedge School's
// design 13, item 8, and design 21, item 7): a review shared by link (`/review#packed=…`), and the Analysis board's
// link (`/analysis#packed=…`, boardLink.ts). The link holds no engine results: the recipient's browser searches again.
// Each site packs its own game's moves (`MoveCode`): Hedge School's are two points of 9 bits, and Cyanotype's are
// Blueprints' placements and edits.
//
// The format, version 1, in base64url:
// - bytes: the version, then the first 4 bytes of the engine module's SHA-256 and of the network's;
// - then bits: the review's visits (Elias gamma); the tags as UTF-8, `key<TAB>value` lines (their length in bytes,
//   then the bytes); the game's moves (their number, then each by the site's MoveCode); the variations as a tree: the
//   game's positions that have variations (their number, then each as the gap from the one before), and from each,
//   the variation nodes in order, each with its move, 1 bit for "evaluated", and its number of children (1 bit for
//   one, 2 bits for none, more bits for more).
import { keptNode, type KeptNode } from "./kept.ts";
import { lastMove } from "./tree.ts";

const SHARE_VERSION = 1;
/** A message's length in Discord, where the games' players meet: a link longer than this does not fit in one. */
export const DISCORD_LIMIT = 2000;

export interface SharedReview {
  module: string; // the engine module's SHA-256, its first 8 hex digits
  model: string; // the network's SHA-256, its first 8 hex digits
  visits: number; // the review's visits for each position
  tags: Record<string, string>;
  moves: string[]; // the game's moves, by their names, or "pass"
  branches: KeptNode[]; // as the browser keeps them: the node's path, its order, 1 when it was evaluated
}

export class BitWriter {
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
  /** Any whole number: 0, -1, 1, -2, 2… as 1, 2, 3, 4, 5… in Elias gamma. */
  signed(n: number) { this.gamma(n >= 0 ? 2 * n + 1 : -2 * n); }
}

export class BitReader {
  private n = 0;
  private readonly bytes: Uint8Array;
  constructor(bytes: Uint8Array) { this.bytes = bytes; }
  bit(): number {
    const byte = this.bytes[this.n >> 3];
    if (byte === undefined) throw new Error("the link is not complete");
    return (byte >> (7 - (this.n++ % 8))) & 1;
  }
  get(width: number): number { let v = 0; for (let i = 0; i < width; i++) v = (v << 1) | this.bit(); return v; }
  gamma(): number {
    let zeros = 0;
    while (this.bit() === 0) if (++zeros > 30) throw new Error("the link is broken");
    return (1 << zeros) | this.get(zeros);
  }
  signed(): number { const g = this.gamma(); return g % 2 ? (g - 1) / 2 : -g / 2; }
}

/** A game's moves in the link: each move by its name, or "pass". `get` throws an Error ("the link is broken") on bits
 *  that are no move. */
export interface MoveCode {
  put(w: BitWriter, move: string): void;
  get(r: BitReader): string;
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

/** The variations as a tree: for each position of the game that has variations (by its number of moves), its variation
 *  nodes, each with its children, in the order the player added them. A node whose parent is gone is left out. */
function branchTree(moves: string[], branches: KeptNode[]): [number, Node[]][] {
  const nodes = new Map<string, Node>(branches.map(([key, order, judged]) =>
    [key, { key, move: lastMove(key), order, judged: !!judged, kids: [] }]));
  const roots = new Map<number, Node[]>();
  for (const node of [...nodes.values()].sort((a, b) => a.order - b.order)) {
    const path = node.key.split(" "), parent = path.slice(0, -1);
    const onGame = parent.length <= moves.length && parent.every((m, i) => moves[i] === m); // from the game's end too
    if (onGame) roots.set(parent.length, [...(roots.get(parent.length) ?? []), node]);
    else nodes.get(parent.join(" "))?.kids.push(node);
  }
  return [...roots.entries()].sort((a, b) => a[0] - b[0]);
}

/** The text after `#packed=` for a shared review, with the game's moves packed by `code`. */
export function encodeShare(s: SharedReview, code: MoveCode): string {
  const w = new BitWriter();
  w.gamma(s.visits);
  const tags = new TextEncoder().encode(Object.entries(s.tags)
    .map(([k, v]) => `${k}\t${v}`.replace(/\n/g, " ")).join("\n"));
  w.gamma(tags.length + 1);
  for (const b of tags) w.put(b, 8);
  w.gamma(s.moves.length + 1);
  for (const m of s.moves) code.put(w, m);
  const tree = branchTree(s.moves, s.branches);
  w.gamma(tree.length + 1);
  let last = 0;
  const node = (n: Node) => {
    code.put(w, n.move);
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

/** A shared review from the text after `#packed=`, its moves read by `code`. Throws an Error that says what is wrong
 *  with the link. */
export function decodeShare(text: string, code: MoveCode): SharedReview {
  let bytes: Uint8Array;
  try { bytes = unbase64url(text); } catch { throw new Error("the link is broken"); }
  if (bytes[0] !== SHARE_VERSION) throw new Error("the link is from another version of this site");
  if (bytes.length < 9) throw new Error("the link is not complete");
  const r = new BitReader(bytes.subarray(9));
  const visits = r.gamma();
  const tagBytes = Uint8Array.from({ length: r.gamma() - 1 }, () => r.get(8));
  const tags = Object.fromEntries(new TextDecoder().decode(tagBytes).split("\n").filter(Boolean).map(line => {
    const tab = line.indexOf("\t");
    return [line.slice(0, tab), line.slice(tab + 1)];
  }));
  const moves = Array.from({ length: r.gamma() - 1 }, () => code.get(r));
  const branches: KeptNode[] = [];
  const node = (parent: string[]) => {
    const path = [...parent, code.get(r)], judged = r.bit(), kids = getKids(r);
    branches.push(keptNode(path.join(" "), branches.length, judged));
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

/** What a finished review ran with: the engine module's and the network's SHA-256, and the review's visits. */
export interface ReviewRun { module: string; model: string; visits: number }

/** The link that shares a review (`/review#packed=…`): its game's tags and moves, its variations, and what its finished
 *  review ran with, each SHA-256 by its first 8 hex digits. */
export const reviewLink = (origin: string, run: ReviewRun, game: { tags: Record<string, string>; moves: string[] },
                           branches: KeptNode[], code: MoveCode): string =>
  `${origin}/review#packed=${encodeShare({ module: run.module.slice(0, 8), model: run.model.slice(0, 8), visits: run.visits,
                                           tags: game.tags, moves: game.moves, branches }, code)}`;

/** The note after a review's link is copied: its length, and a warning past a Discord message's limit. `reviewFile`:
 *  whether the site exports review files, which the warning offers in the link's place. */
export function shareNote(length: number, reviewFile = true): string {
  const n = length.toLocaleString("en");
  return length > DISCORD_LIMIT
    ? `Link copied: ${n} characters, more than a Discord message takes (${DISCORD_LIMIT.toLocaleString("en")}). Delete some variations${reviewFile ? ", or send the review file" : ""}.`
    : `Link copied (${n} characters). The recipient's browser reviews the game again.`;
}
