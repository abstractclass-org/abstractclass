// The game record, as Hedge School's Notation page gives it, for any game whose site names its moves in words (design
// 29, design 33): tag pairs, then the turns. A turn has a number (`1.`, `2.`: the first player's turns are odd, the
// second player's even), then its moves, or `pass` for a timeout. `{ comments }` and `( variations )` nest. A variation at a
// turn's second move writes `...` (`4...`). A move can carry the game's own mark, which repeats what the position shows
// (Enclosure's cut mark `x`, Blueprints' capture mark `x+24`). A reader takes a move with or without it: the engine
// checks a mark, in the site. A turn's quality mark (PGN's `!!`, `!`, `!?`, `?!`, `?`, `??`) follows its last move,
// after the game's mark: `G9-G12x??`. A reader takes a quality mark after any move, and this one drops it. The result
// ends the record (`b+28`, `r+R`, `b+F`, `0`, `*`).
//
// The game gives its moves' syntax and marks (Notation): the reader asks it for each word that is not a turn label, a
// pass or a result. This reader keeps the main line and its tags. It skips comments and variations, but reads `[%clk]`
// and `[%eval]` from the comments after the main line's moves. It checks the notation, not the rules: the engine checks
// that every move is legal. It also accepts a bare list of moves, without turn labels. It checks one tag's value, the
// `Komi` tag's: the game's starting score (GameRecord `komi`), which the review searches at, within the game's limit
// (Notation `maxKomi`).
//
// A record form that a game's community owns, PTN (Tak's, Mistak's design 34, item 6), is read here too, in place of
// Hedge School's form: the game gives PTN's own parts (Notation `ptn`), and this reader reads PTN's numbers (two moves
// each), its branches and its placeholder. Without `ptn`, nothing of PTN's form is read.
//
// The reader notes each tag's value and each comment's text for the error reports (texts.ts). It is the one code that
// reads a record's text, so every page that reads a record notes them (texts.test.ts checks that no other code reads a
// tag's value).
import { noteText } from "./texts.ts";

/** A move as the game reads it from a record's word: its one spelling, its mark, and where in the word its mark
 *  starts (the word's length when it has none), so that a mark can be written there (markMoves). */
export interface ReadMove<Mark> { name: string; mark: Mark; markAt: number }

/** Where a word is in the record: its tags, which have ended, and whether the word gives the record's first move. */
export interface Place { tags: Record<string, string>; first: boolean }

/** PTN's parts that a game gives (Notation `ptn`). The rest of PTN's form is this reader's:
 *  - a number for each two moves, which the second move can repeat (`1... b`, `1. -- b`), as ptn.ninja reads it. A list
 *    of moves with no numbers reads too,
 *  - ptn.ninja's branches: a comment after a blank line, before a number that is not the next move's, is the name of a
 *    branch (`{3w1}`). The main line ends there, and a branch can follow the result,
 *  - a half komi with no 0 before its point (`.5`), which the record keeps as `0.5`,
 *  - no pass, no variations in ( ), no `[%eval]` or `[%clk]`, and no escapes in a tag's value. */
export interface Ptn {
  /** The result that a word or the `Result` tag's value gives, in its one spelling, or null for a word that is not a
   *  result. `*` is the record's end with no result. */
  result(word: string): string | null;
  /** A tag's name in its one spelling: PTN's names are case-insensitive. */
  tagName(name: string): string;
  /** What is wrong with the tags once they end, and the tag it is about (null: the tags as a whole), or null. Its
   *  message comes before the komi's limit. */
  tagsProblem(tags: Record<string, string>): { tag: string | null; problem: string } | null;
}

/** What a game gives the record about its moves. */
export interface Notation<Mark> {
  /** The move of a word without its quality mark (never a pass), or what is wrong with the word. The reader adds the
   *  word to the text: "not a move, a turn label or a result: Z1-A1". */
  read(word: string, place: Place): ReadMove<Mark> | string;
  /** A mark as the record writes it: "" for none. */
  mark(mark: Mark): string;
  /** The mark of a move that has none, and of a pass. */
  none: Mark;
  /** The turn of the record's first move, from its tags (a set-up start's `Position`), and whether that move opens its
   *  turn. Without it, the game has no set-up start: the first move opens turn 1, and the reader refuses a `Position`
   *  tag. */
  start?(tags: Record<string, string>): { turn: number; first: boolean };
  /** The largest komi, either way, that the game's engine takes: its cap, past which a practice module refuses the
   *  komi. The reader refuses a `Komi` tag beyond it: the analysis module searches there with no error, but its
   *  numbers mean nothing (Hedge School's design 24). A game of several board sizes gives the limit by the record's
   *  tags (KomiLimit), and the reader checks the komi when the tags end, so that a size's tag can come after it.
   *  Without it, the reader takes any komi that a tag can give (KOMI). */
  maxKomi?: KomiLimit<Record<string, string>>;
  /** What the game calls its komi's unit, and a komi as an example, for the messages about a `Komi` tag. Without it:
   *  points. */
  komiWords?: { unit: string; example: string };
  /** The record's form is PTN, not Hedge School's. */
  ptn?: Ptn;
}

/** A game's komi limit, either way, as a check of a komi takes it: one number, or the limit at each start, for a game
 *  whose limit depends on the board's size (Tak: each size's trained range, Mistak's design 34, item 8). `S` is what
 *  the check knows of the start: a record's tags, or a board's start in the position notation (null: the standard
 *  start). */
export type KomiLimit<S = string | null> = number | ((start: S) => number);

/** The komi limit at the start `start` (KomiLimit). */
export const limitAt = <S>(limit: KomiLimit<S>, start: S): number => (typeof limit === "number" ? limit : limit(start));

export interface GameRecord<Mark> {
  tags: Record<string, string>;
  moves: string[]; // the moves in their one spelling, or "pass", without their marks
  marked: Mark[]; // by move: the mark that the record gives it
  ends: number[]; // by move: where its text ends, before its mark, so that a mark can be written there (markMoves)
  result: string | null;
  evals: (Eval | null)[]; // by move: the evaluation after it, when the record has one
  clocks: (string | null)[]; // by move: the clock after it, when the record has one
  komi: number; // the `Komi` tag's (komiOf): Red's starting score (Hedge School's design 24), 0 without the tag
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

/** A tag's value with no spaces at its ends, or null for none: no tag, an empty value, or PGN's `?` and `-`. */
export function tagValue(value: string | null | undefined): string | null {
  const v = value?.trim() ?? "";
  return v === "" || v === "?" || v === "-" ? null : v;
}

/** A `Komi` tag's value: a number of whole or half points, with its sign. */
const KOMI = /^[+-]?\d{1,5}(?:\.[05])?$/;

/** The komi of a `Komi` tag's value (Hedge School's design 24): Red's starting score, as the engine counts it, and
 *  below 0 Blue's. KataGo takes whole and half points. No value, and PGN's `?` and `-` for none, are komi 0. Null for a
 *  value that is not a komi. */
export function komiOf(value: string | undefined): number | null {
  const v = tagValue(value);
  if (v === null) return 0;
  return KOMI.test(v) ? Number(v) || 0 : null;
}

/** Whether `n` is a komi that a `Komi` tag can give (komiOf): a number of whole or half points. */
export const isKomi = (n: unknown): n is number => typeof n === "number" && komiOf(String(n)) === n;

/** A game's komi limit `max` (Notation's `maxKomi`) as the site writes its numbers, with thousands separated (the
 *  Practice card's "-3,000 to 3,000"): "from -5,052 to 5,052 points". */
export const komiRange = (max: number, unit = "points"): string =>
  `from ${(-max).toLocaleString("en")} to ${max.toLocaleString("en")} ${unit}`;

/** Why a komi is beyond the game's limit `max`, either way, or null within it: the record's limit, beyond which the
 *  game's analysis module gives numbers that mean nothing. `shown` is the komi as its source writes it, and `what`
 *  names the source: "the Komi tag" for a record and a board's link, which carry it as a tag. "the Komi tag must be
 *  from -5,052 to 5,052 points: 6000". */
export const komiLimitProblem = (komi: number, max: number, shown: string | number, what = "the Komi tag", unit = "points"): string | null =>
  Math.abs(komi) > max ? `${what} must be ${komiRange(max, unit)}: ${shown}` : null;

/** The tags of a game's start, in their order: its set-up start's `Position` tag, then its komi's `Komi` tag, each only
 *  where the game has one. No `Komi` tag at 0, so that such a game's record is as it was before the komi. */
export const startTags = (start: string | null | undefined, komi = 0): Record<string, string> =>
  ({ ...(start ? { Position: start } : {}), ...(komi ? { Komi: String(komi) } : {}) });

/** The text before a game's moves that its id covers at a komi (Hedge School's design 24): `komi K | `, so that the
 *  same moves at another komi are another game. None at komi 0, where a game keeps the id of its moves alone. */
export const komiPrefix = (komi: number): string => (komi ? `komi ${komi} | ` : "");

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

function tokenize(text: string, ptn: boolean): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "[") {
      const m = (ptn ? /^\[\s*([A-Za-z][A-Za-z0-9_]*)\s*"([^"]*)"\s*\]/
        : /^\[\s*([A-Za-z][A-Za-z0-9_]*)\s+"((?:[^"\\]|\\.)*)"\s*\]/).exec(text.slice(i));
      if (!m) throw new RecordError("a tag must look like [Name \"value\"]", i);
      const value = ptn ? m[2] : m[2].replace(/\\(.)/g, "$1");
      tokens.push({ kind: "tag", name: m[1], value, at: i });
      noteText(value); // for the error reports (texts.ts), as is each comment's text
      i += m[0].length;
    } else if (c === "{") {
      const end = text.indexOf("}", i);
      if (end < 0) throw new RecordError("a { has no closing }", i);
      const comment = text.slice(i + 1, end);
      tokens.push({ kind: "comment", text: comment, at: i });
      noteText(comment);
      i = end + 1;
    } else if (!ptn && (c === "(" || c === ")")) {
      tokens.push(c === "(" ? { kind: "open", at: i } : { kind: "close", at: i });
      i++;
    } else {
      const m = (ptn ? /^[^\s{[]+/ : /^[^\s{}()[\]]+/).exec(text.slice(i))!;
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

/** Whether a blank line comes right before the offset `at`. */
function afterBlankLine(text: string, at: number): boolean {
  let newlines = 0;
  while (at > 0 && /\s/.test(text[at - 1])) if (text[--at] === "\n") newlines++;
  return newlines > 1;
}

/** A PTN record's numbers, its placeholder and its branches (Ptn), for a reader that fills `record`. */
function readPtnTurns<Mark>(record: GameRecord<Mark>, notation: Notation<Mark>) {
  let numbered = false, labelled = -1, placeholder = false;
  let start: { turn: number; first: boolean } | undefined; // the first move's, once the tags have ended
  // The number of the next move, and whether it is the first player's.
  const next = () => {
    start ??= notation.start?.(record.tags) ?? { turn: 1, first: true };
    const ply = (start.first ? 0 : 1) + record.moves.length;
    return { number: start.turn + Math.floor(ply / 2), first: ply % 2 === 0 };
  };
  return {
    /** Whether `comment` is the name of a branch (Ptn), by the two tokens after it. The first player's move in a number
     *  that the main line has opened is a branch's too: the main line would write the second player's. */
    branches(text: string, comment: Token & { kind: "comment" }, after?: Token, then?: Token): boolean {
      if (!record.moves.length || after?.kind !== "word" || !afterBlankLine(text, comment.at)) return false;
      const turn = TURN.exec(after.text), { number, first } = next();
      const second = turn?.[2] === "..." || (then?.kind === "word" && then.text === "--");
      return turn !== null && (Number(turn[1]) !== number || (!first && !second));
    },
    /** Whether the word is a number or the placeholder, which it reads. */
    reads(word: string, at: number): boolean {
      const turn = TURN.exec(word), { number, first } = next();
      if (turn) {
        if (Number(turn[1]) !== number) throw new RecordError(`the record gives number ${turn[1]} where the notation gives ${number}`, at);
        if (turn[2] === "..." && first) throw new RecordError(`the record gives ${word} where the notation gives ${number}.`, at);
        numbered ||= !record.moves.length;
        labelled = record.moves.length;
        placeholder = false;
        return true;
      }
      if (word !== "--") return false;
      if (labelled !== record.moves.length || placeholder) throw new RecordError("-- comes right after a number", at);
      if (first) throw new RecordError("-- stands for the first player's move, and the next move is that player's", at);
      placeholder = true;
      return true;
    },
    /** Checks the number before a move, in a record that numbers its moves. */
    move(word: string, at: number): void {
      const { number, first } = next();
      if (numbered && first && labelled !== record.moves.length)
        throw new RecordError(`the record gives no number before this move, where the notation gives ${number}: ${word}`, at);
    },
  };
}

/** Reads a game record, with the game's moves and marks. Throws a RecordError with the offset of the first problem. */
export function readRecord<Mark>(text: string, notation: Notation<Mark>): GameRecord<Mark> {
  const record: GameRecord<Mark> = { tags: {}, moves: [], marked: [], ends: [], result: null, evals: [], clocks: [], komi: 0 };
  const { ptn, komiWords = { unit: "points", example: "300" } } = notation;
  let depth = 0, expectedTurn: number | null = null; // the next turn's number, once the first turn sets it
  const tagAt: Record<string, number> = {}; // where each tag is
  let tagsEnded = false;
  let tagged: string | null = null; // the result that PTN's Result tag claims
  // The Komi tag until the reader checks its limit: at the tag for one limit, and when the tags end for a limit by
  // the tags.
  let komiTag: { value: string; at: number } | null = null;
  const checkKomi = () => {
    if (!komiTag) return;
    const beyond = komiLimitProblem(record.komi, limitAt(notation.maxKomi ?? Infinity, record.tags), komiTag.value,
                                    undefined, komiWords.unit);
    if (beyond) throw new RecordError(beyond, komiTag.at);
    komiTag = null;
  };
  // The tags end at the first word, or at the end of a record of tags alone.
  const endTags = (at: number) => {
    if (!tagsEnded) {
      tagsEnded = true;
      const wrong = ptn?.tagsProblem(record.tags);
      if (wrong) {
        const { tag, problem } = wrong;
        throw new RecordError(tag === null ? problem : `${problem}: ${record.tags[tag]}`, tag === null ? at : tagAt[tag]);
      }
    }
    checkKomi();
  };
  const ptnTurns = ptn && readPtnTurns(record, notation);
  const tokens = tokenize(text, ptn !== undefined);
  for (const [index, t] of tokens.entries()) {
    if (t.kind === "open") { depth++; continue; }
    if (t.kind === "close") {
      if (depth === 0) throw new RecordError("a ) has no opening (", t.at);
      depth--;
      continue;
    }
    if (depth > 0) continue; // a variation: not the main line
    if (t.kind === "tag") {
      if (record.moves.length || (ptn && tagsEnded)) throw new RecordError("tags come before the moves", t.at);
      if (t.name === "Position" && !notation.start && tagValue(t.value) !== null)
        throw new RecordError("this site reads a game from the standard start only: remove the Position tag", t.at);
      const name = ptn ? ptn.tagName(t.name) : t.name;
      const value = ptn && name === "Komi" ? t.value.replace(/^(\s*[+-]?)(?=\.5\s*$)/, (_, sign: string) => `${sign}0`) : t.value;
      // A komi that no reader can take: the game would be reviewed at a komi that the record does not give.
      if (name === "Komi") {
        const komi = komiOf(value);
        if (komi === null)
          throw new RecordError(`the Komi tag must be a number of ${komiWords.unit}, whole or half, ` +
                                `such as "${komiWords.example}" or "-${komiWords.example}": ${t.value}`, t.at);
        record.komi = komi;
        komiTag = { value: t.value, at: t.at };
        if (typeof notation.maxKomi !== "function") checkKomi();
      }
      if (ptn && name === "Result") {
        const claimed = tagValue(value) === null ? "*" : ptn.result(value.trim());
        if (claimed === null) throw new RecordError(`the Result tag is not a result: ${value}`, t.at);
        tagged = claimed === "*" ? null : claimed;
      }
      record.tags[name] = value;
      tagAt[name] = t.at;
    } else if (t.kind === "comment") {
      if (ptnTurns?.branches(text, t, tokens[index + 1], tokens[index + 2])) break; // the main line ends
      if (record.moves.length && !ptn) readCommands(t.text, record, record.moves.length - 1);
    } else {
      endTags(t.at);
      const w = t.text;
      if (record.result !== null) throw new RecordError(`nothing may follow the result (${record.result})`, t.at);
      if (ptnTurns?.reads(w, t.at)) continue;
      const turn = TURN.exec(w), result = ptn ? ptn.result(w) : RESULT.test(w) ? w : null;
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
        if (turn[2] === "...") continue; // only a variation starts at a turn's second move
        if (number !== expectedTurn) throw new RecordError(`the record gives turn ${number} where the notation gives turn ${expectedTurn}`, t.at);
        expectedTurn++;
      } else if (result !== null) {
        record.result = result;
        if (tagged !== null && tagged !== result)
          throw new RecordError(`the Result tag (${record.tags.Result}) is not the result that ends the moves (${w})`, t.at);
      } else {
        const move = w.replace(QUALITY, ""); // the move without its quality mark
        const read = !ptn && move.toLowerCase() === "pass" ? { name: "pass", mark: notation.none, markAt: move.length }
          : notation.read(move, { tags: record.tags, first: !record.moves.length });
        if (typeof read === "string") throw new RecordError(`${read}: ${w}`, t.at);
        ptnTurns?.move(w, t.at);
        record.moves.push(read.name);
        record.marked.push(read.mark);
        record.ends.push(t.at + read.markAt);
      }
    }
  }
  endTags(0);
  record.result ??= tagged;
  if (depth > 0) throw new RecordError("a ( has no closing )", text.length);
  if (!record.moves.length) throw new RecordError("the record has no moves", 0);
  record.evals.length = record.clocks.length = record.moves.length;
  return { ...record, evals: Array.from(record.evals, e => e ?? null), clocks: Array.from(record.clocks, c => c ?? null) };
}

/** Adds the game's mark to every move that the record gives none. `marks` is by move, from the engine (the site's
 *  check). A move that has its mark keeps it: the site's check confirms it first. */
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
    .map(k => tagText(k, String(all[k as keyof typeof all]))).join("\n");
}

/** A tag as a record writes it: `[Name "value"]`, with a quote or a backslash in the value escaped. */
const tagText = (name: string, value: string): string => `[${name} "${value.replace(/(["\\])/g, "\\$1")}"]`;

/** `text` with `tags` before it, in their order, as a record writes them (tagText), each followed by `between`: a new
 *  line before a record's text (withStartTag), a space before the moves of a record on one line (Hedge School's "Study
 *  in Openings"). No tags: the text as it is. */
export const withTags = (text: string, tags: Record<string, string>, between = "\n"): string =>
  Object.entries(tags).map(([name, value]) => tagText(name, value) + between).join("") + text;

/** Writes a game record: the required tags, then the turns. `turns` gives each turn's number and how many moves it has. */
export function writeRecord(tags: Record<string, string>, moves: string[], turns: { number: number; moves: number; second?: boolean }[],
                            result = "*"): string {
  const head = writeTags({ ...tags, Result: result });
  let i = 0;
  // `N...` for a first turn that starts at its second move (a set-up start's, the engine repository's design 04).
  const body = turns.map(t => `${t.number}${t.second ? "..." : "."} ${moves.slice(i, (i += t.moves)).join(" ")}`).join(" ");
  return `${head}\n\n${body} ${result}\n`;
}

/** A record's text with its start given apart (a board's Import, its address's `position`): the start as the record's
 *  own `Position` tag, unless the record has one, so that its turns are read from the start's own number. No start (the
 *  standard start): the text as it is. */
export function withStartTag(text: string, start: string | undefined): string {
  return start && !/\[Position\s/.test(text) ? withTags(text, startTags(start)) : text;
}

/** What a site says when its review refuses a game from a set-up start (a `Position` tag other than the standard start):
 *  the review is of games from the standard start, and the Analysis board takes the others. One text for every site. */
export const setUpRefusal = (site: string): string =>
  `This game starts from another position. ${site} reviews games from the standard start only: open it on the Analysis board.`;

/** A RecordError of `read`, the text that `pasted` became with a start's tag before it (withStartTag), as an Error that
 *  says where the problem is in the pasted text, by line and column. */
export function pastedError(e: RecordError, pasted: string, read: string): Error {
  const tag = read.length - pasted.length; // the start's tag, put before the pasted text
  const before = pasted.slice(0, Math.max(0, e.offset - tag)).split("\n");
  return new Error(`${e.message} (line ${before.length}, column ${before.at(-1)!.length + 1}).`);
}

/** Why a record cannot take its start given apart (withStartTag: a board's Import, its address's `position`), or null:
 *  its own `Position` tag must be that position or absent. `setUpStart` is the game's: a set-up start in its one
 *  spelling, none for the standard start. */
export function givenStartProblem(tags: Record<string, string>, position: string | null,
                                  setUpStart: (p: string) => string | undefined): string | null {
  const tagged = tags.Position?.trim();
  return position && tagged && setUpStart(tagged) !== setUpStart(position)
    ? "the record's Position tag is not the position that you gave" : null;
}
