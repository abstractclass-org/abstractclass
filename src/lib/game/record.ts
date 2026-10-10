// The game record, the engine repository's PGN-like notation (its docs/design/04-notation-and-protocol.md, "A game
// record"): tag pairs, then the turns. A turn has a number (`1.`, `2.`: Blue's turns are odd, Red's even), then its
// edges, or `pass` for a timeout. `{ comments }` and `( branches )` nest. A branch at a turn's second edge writes `...`
// (`4...`). A move that cuts an opponent's edge carries an `x`: `D10-G10x`. A reader takes a move with or without
// it, and a mark on a move that cuts nothing is an error (the engine checks that: check.ts). The result ends the record
// (`b+28`, `r+R`, `b+F`, `0`, `*`).
//
// This reader keeps the main line and its tags. It skips comments and branches, but reads `[%clk]` and `[%eval]` from the
// comments after the main line's edges. It checks the notation, not the rules: the engine checks that every move is
// legal (describe names the first illegal move). It also accepts a bare list of edges, without turn labels.
import { edgeName, parseEdge } from "#lib/engine/notation.ts";

export interface GameRecord {
  tags: Record<string, string>;
  moves: string[]; // edges in the notation (lower point first), or "pass", without the cut mark
  marked: boolean[]; // by move: the record marks it as a cut (`x`)
  ends: number[]; // by move: where its text ends, so that a cut mark can be written after it (markCuts)
  result: string | null;
  evals: (Eval | null)[]; // by move: the evaluation after it, when the record has one
  clocks: (string | null)[]; // by move: the clock after it, when the record has one
}
export interface Eval { blueWin: number; margin: number; spread: number }

export class RecordError extends Error {
  readonly offset: number; // where in the text the problem is
  constructor(message: string, offset: number) {
    super(message);
    this.offset = offset;
  }
}

const POINT = "[A-HJ-T](?:1[0-9]|[1-9])";
const EDGE = new RegExp(`^${POINT}-${POINT}$`);
const RESULT = /^(?:[br]\+(?:\d+(?:\.\d+)?|R|F)|0|\*)$/;
const TURN = /^(\d+)(\.|\.\.\.)$/;

/** The edge's one spelling: the lower point first (by column, then by row). Throws on a malformed edge. */
export function canonicalEdge(text: string): string {
  const upper = text.toUpperCase();
  if (!EDGE.test(upper)) throw new Error(`not an edge: ${text}`);
  return edgeName(parseEdge(upper));
}

/** The players' names from the record's tags, or the side's name where a tag is missing or "?". */
export function playerNames(tags: Record<string, string>): { blue: string; red: string } {
  const name = (tag: string | undefined, side: string) => (tag && tag !== "?" ? tag : side);
  return { blue: name(tags.Blue, "Blue"), red: name(tags.Red, "Red") };
}

type Token = { kind: "tag"; name: string; value: string; at: number }
  | { kind: "comment"; text: string; at: number }
  | { kind: "open"; at: number }
  | { kind: "close"; at: number }
  | { kind: "word"; text: string; at: number };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "[") {
      const m = /^\[\s*([A-Za-z][A-Za-z0-9_]*)\s+"((?:[^"\\]|\\.)*)"\s*\]/.exec(text.slice(i));
      if (!m) throw new RecordError("a tag must look like [Name \"value\"]", i);
      tokens.push({ kind: "tag", name: m[1], value: m[2].replace(/\\(.)/g, "$1"), at: i });
      i += m[0].length;
    } else if (c === "{") {
      const end = text.indexOf("}", i);
      if (end < 0) throw new RecordError("a comment is not closed with }", i);
      tokens.push({ kind: "comment", text: text.slice(i + 1, end), at: i });
      i = end + 1;
    } else if (c === "(" || c === ")") {
      tokens.push(c === "(" ? { kind: "open", at: i } : { kind: "close", at: i });
      i++;
    } else {
      const m = /^[^\s{}()[\]]+/.exec(text.slice(i))!;
      // A turn label can touch its first edge: "1.A10-D10".
      const label = /^\d+(?:\.\.\.|\.)/.exec(m[0]);
      const word = label && label[0].length < m[0].length ? label[0] : m[0];
      tokens.push({ kind: "word", text: word, at: i });
      i += word.length;
    }
  }
  return tokens;
}

function readCommands(comment: string, record: GameRecord, move: number) {
  const ev = /\[%eval\s+([0-9.]+)\s+([+-]?[0-9.]+)\s+([0-9.]+)\s*\]/.exec(comment);
  if (ev) record.evals[move] = { blueWin: Number(ev[1]), margin: Number(ev[2]), spread: Number(ev[3]) };
  const clk = /\[%clk\s+([0-9:]+)\s*\]/.exec(comment);
  if (clk) record.clocks[move] = clk[1];
}

/** Reads a game record. Throws a RecordError with the offset of the first problem. */
export function parseRecord(text: string): GameRecord {
  const record: GameRecord = { tags: {}, moves: [], marked: [], ends: [], result: null, evals: [], clocks: [] };
  let depth = 0, expectedTurn = 1;
  for (const t of tokenize(text)) {
    if (t.kind === "open") { depth++; continue; }
    if (t.kind === "close") {
      if (depth === 0) throw new RecordError("a ) without its (", t.at);
      depth--;
      continue;
    }
    if (depth > 0) continue; // a branch: not the main line
    if (t.kind === "tag") {
      if (record.moves.length) throw new RecordError("tags come before the moves", t.at);
      record.tags[t.name] = t.value;
    } else if (t.kind === "comment") {
      if (record.moves.length) readCommands(t.text, record, record.moves.length - 1);
    } else {
      const w = t.text;
      if (record.result !== null) throw new RecordError(`nothing may follow the result (${record.result})`, t.at);
      const turn = TURN.exec(w);
      if (turn) {
        if (turn[2] === "...") continue; // only a branch starts at a turn's second edge
        const number = Number(turn[1]);
        if (number !== expectedTurn) throw new RecordError(`turn ${number} where turn ${expectedTurn} was expected`, t.at);
        expectedTurn++;
      } else if (w.toLowerCase() === "pass") {
        record.moves.push("pass");
        record.marked.push(false);
        record.ends.push(t.at + w.length);
      } else if (RESULT.test(w)) {
        record.result = w;
      } else {
        const cut = /x$/i.test(w);
        try { record.moves.push(canonicalEdge(cut ? w.slice(0, -1) : w)); } catch { throw new RecordError(`not an edge, a turn label or a result: ${w}`, t.at); }
        record.marked.push(cut);
        record.ends.push(t.at + w.length - (cut ? 1 : 0));
      }
    }
  }
  if (depth > 0) throw new RecordError("a ( is not closed", text.length);
  if (!record.moves.length) throw new RecordError("the record has no moves", 0);
  record.evals.length = record.clocks.length = record.moves.length;
  return { ...record, evals: Array.from(record.evals, e => e ?? null), clocks: Array.from(record.clocks, c => c ?? null) };
}

/** Adds the cut mark to every move that cuts and has none yet. `cuts` is by move, from the engine (check.ts). */
export function markCuts(text: string, record: GameRecord, cuts: boolean[]): string {
  let out = text;
  for (let i = record.moves.length - 1; i >= 0; i--)
    if (cuts[i] && !record.marked[i]) out = out.slice(0, record.ends[i]) + "x" + out.slice(record.ends[i]);
  return out;
}

/** Writes a game record: the required tags, then the turns. `turns` gives each turn's number and how many moves it has. */
export function writeRecord(tags: Record<string, string>, moves: string[], turns: { number: number; moves: number }[], result = "*"): string {
  const order = ["Event", "Site", "Date", "Round", "Blue", "Red", "Result"];
  const all = { Event: "?", Site: "?", Date: "????.??.??", Round: "-", Blue: "?", Red: "?", Result: result, ...tags };
  const head = [...order, ...Object.keys(all).filter(k => !order.includes(k))]
    .map(k => `[${k} "${String(all[k as keyof typeof all]).replace(/(["\\])/g, "\\$1")}"]`).join("\n");
  let i = 0;
  const body = turns.map(t => `${t.number}. ${moves.slice(i, (i += t.moves)).join(" ")}`).join(" ");
  return `${head}\n\n${body} ${result}\n`;
}
