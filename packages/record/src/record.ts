// The game record, as Hedge School's Notation page gives it, for any game whose site names its moves in words (design
// 29, design 33): tag pairs, then the turns. A turn has a number (`1.`, `2.`: the first player's turns are odd, the
// second player's even), then its moves, or `pass` for a timeout. `{ comments }` and `( branches )` nest. A branch at a
// turn's second move writes `...` (`4...`). A move can carry the game's own mark, which repeats what the position shows
// (Enclosure's cut mark `x`, Blueprints' `x+24`). A reader takes a move with or without it: the engine checks a mark,
// in the site. A turn's quality mark (PGN's `!!`, `!`, `!?`, `?!`, `?`, `??`) follows its last move, after the game's
// mark: `G9-G12x??`. A reader takes a quality mark after any move, and this one drops it. The result ends the record
// (`b+28`, `r+R`, `b+F`, `0`, `*`).
//
// The game gives its moves' syntax and marks (Notation): the reader asks it for each word that is not a turn label, a
// pass or a result. This reader keeps the main line and its tags. It skips comments and branches, but reads `[%clk]`
// and `[%eval]` from the comments after the main line's moves. It checks the notation, not the rules: the engine checks
// that every move is legal. It also accepts a bare list of moves, without turn labels.

/** A move as the game reads it from a record's word: its one spelling, its mark, and where in the word its mark
 *  starts (the word's length when it has none), so that a mark can be written there (markMoves). */
export interface ReadMove<Mark> { name: string; mark: Mark; markAt: number }

/** What a game gives the record about its moves. */
export interface Notation<Mark> {
  /** The move of a word without its quality mark (never a pass), or what is wrong with the word. The reader adds the
   *  word to the text: "not an edge, a turn label or a result: Z1-A1". */
  read(word: string): ReadMove<Mark> | string;
  /** A mark as the record writes it: "" for none. */
  mark(mark: Mark): string;
  /** The mark of a move that has none, and of a pass. */
  none: Mark;
  /** The turn of the record's first move, from its tags (a set-up start's `Position`), and whether that move opens its
   *  turn. Without it, the first move opens turn 1. */
  start?(tags: Record<string, string>): { turn: number; first: boolean };
}

export interface GameRecord<Mark> {
  tags: Record<string, string>;
  moves: string[]; // the moves in their one spelling, or "pass", without their marks
  marked: Mark[]; // by move: the mark that the record gives it
  ends: number[]; // by move: where its text ends, before its mark, so that a mark can be written there (markMoves)
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

/** A quality mark at a move's end: PGN's six suffixes. */
const QUALITY = /(!!|\?\?|!\?|\?!|!|\?)$/;
const RESULT = /^(?:[br]\+(?:\d+(?:\.\d+)?|R|F)|0|\*)$/;
const TURN = /^(\d+)(\.|\.\.\.)$/;

/** The game's own page, when the record's Site tag is a web address (Lichess writes its game's address there): its
 *  address and host. Null for a site's name, such as "meaf.us", or any other kind of address. */
export function gamePage(tags: Record<string, string>): { href: string; host: string } | null {
  try {
    const url = new URL(tags.Site ?? "");
    return url.protocol === "https:" || url.protocol === "http:" ? { href: url.href, host: url.hostname.replace(/^www\./, "") } : null;
  } catch {
    return null;
  }
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
      if (end < 0) throw new RecordError("a { has no closing }", i);
      tokens.push({ kind: "comment", text: text.slice(i + 1, end), at: i });
      i = end + 1;
    } else if (c === "(" || c === ")") {
      tokens.push(c === "(" ? { kind: "open", at: i } : { kind: "close", at: i });
      i++;
    } else {
      const m = /^[^\s{}()[\]]+/.exec(text.slice(i))!;
      // A turn label can touch its first move: "1.A10-D10".
      const label = /^\d+(?:\.\.\.|\.)/.exec(m[0]);
      const word = label && label[0].length < m[0].length ? label[0] : m[0];
      tokens.push({ kind: "word", text: word, at: i });
      i += word.length;
    }
  }
  return tokens;
}

function readCommands<Mark>(comment: string, record: GameRecord<Mark>, move: number) {
  const ev = /\[%eval\s+([0-9.]+)\s+([+-]?[0-9.]+)\s+([0-9.]+)\s*\]/.exec(comment);
  if (ev) record.evals[move] = { blueWin: Number(ev[1]), margin: Number(ev[2]), spread: Number(ev[3]) };
  const clk = /\[%clk\s+([0-9:]+)\s*\]/.exec(comment);
  if (clk) record.clocks[move] = clk[1];
}

/** Reads a game record, with the game's moves and marks. Throws a RecordError with the offset of the first problem. */
export function readRecord<Mark>(text: string, notation: Notation<Mark>): GameRecord<Mark> {
  const record: GameRecord<Mark> = { tags: {}, moves: [], marked: [], ends: [], result: null, evals: [], clocks: [] };
  let depth = 0, expectedTurn: number | null = null; // the next turn's number, once the first turn sets it
  for (const t of tokenize(text)) {
    if (t.kind === "open") { depth++; continue; }
    if (t.kind === "close") {
      if (depth === 0) throw new RecordError("a ) has no opening (", t.at);
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
        const number = Number(turn[1]);
        if (expectedTurn === null) {
          // The first turn: 1, or after a set-up start its own turn, as PGN numbers its moves from a FEN's. A start at a
          // turn's second move opens with `N...`. Only this number (the engine repository's design 04, "The turns after
          // a set-up start"): a record numbered from 1 after a later start gives the wrong player.
          const start = notation.start?.(record.tags) ?? { turn: 1, first: true };
          if (number !== start.turn || (turn[2] === "...") === start.first) {
            throw new RecordError(`the record gives turn ${w} where the notation gives turn ${start.turn}${start.first ? "." : "..."}`, t.at);
          }
          expectedTurn = number + 1;
          continue;
        }
        if (turn[2] === "...") continue; // only a branch starts at a turn's second move
        if (number !== expectedTurn) throw new RecordError(`the record gives turn ${number} where the notation gives turn ${expectedTurn}`, t.at);
        expectedTurn++;
      } else if (RESULT.test(w)) {
        record.result = w;
      } else {
        const move = w.replace(QUALITY, ""); // the move without its quality mark
        if (move.toLowerCase() === "pass") {
          record.moves.push("pass");
          record.marked.push(notation.none);
          record.ends.push(t.at + move.length);
          continue;
        }
        const read = notation.read(move);
        if (typeof read === "string") throw new RecordError(`${read}: ${w}`, t.at);
        record.moves.push(read.name);
        record.marked.push(read.mark);
        record.ends.push(t.at + read.markAt);
      }
    }
  }
  if (depth > 0) throw new RecordError("a ( has no closing )", text.length);
  if (!record.moves.length) throw new RecordError("the record has no moves", 0);
  record.evals.length = record.clocks.length = record.moves.length;
  return { ...record, evals: Array.from(record.evals, e => e ?? null), clocks: Array.from(record.clocks, c => c ?? null) };
}

/** Adds the game's mark to every move that the record gives none. `marks` is by move, from the engine (Hedge School's
 *  check.ts). A move that has its mark keeps it: the site's check confirms it first. */
export function markMoves<Mark>(text: string, record: GameRecord<Mark>, marks: Mark[], notation: Notation<Mark>): string {
  let out = text;
  for (let i = record.moves.length - 1; i >= 0; i--) {
    const mark = notation.mark(marks[i]);
    if (mark && !notation.mark(record.marked[i])) out = out.slice(0, record.ends[i]) + mark + out.slice(record.ends[i]);
  }
  return out;
}

/** A record's tags, one to a line: the seven of PGN's roster first, in their order, with `?` and `-` where a value is not
 *  known, then the others. */
export function writeTags(tags: Record<string, string>): string {
  const order = ["Event", "Site", "Date", "Round", "Blue", "Red", "Result"];
  const all = { Event: "?", Site: "?", Date: "????.??.??", Round: "-", Blue: "?", Red: "?", Result: "*", ...tags };
  return [...order, ...Object.keys(all).filter(k => !order.includes(k))]
    .map(k => `[${k} "${String(all[k as keyof typeof all]).replace(/(["\\])/g, "\\$1")}"]`).join("\n");
}

/** Writes a game record: the required tags, then the turns. `turns` gives each turn's number and how many moves it has. */
export function writeRecord(tags: Record<string, string>, moves: string[], turns: { number: number; moves: number; second?: boolean }[],
                            result = "*"): string {
  const head = writeTags({ ...tags, Result: result });
  let i = 0;
  // `N...` for a first turn that starts at its second move (a set-up start's, the engine repository's design 04).
  const body = turns.map(t => `${t.number}${t.second ? "..." : "."} ${moves.slice(i, (i += t.moves)).join(" ")}`).join(" ");
  return `${head}\n\n${body} ${result}\n`;
}
