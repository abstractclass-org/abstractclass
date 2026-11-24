// Tak's game record: a PTN file (docs/design/34-tak-site.md, item 6), with Tak's moves (notation.ts) and its start in TPS
// (tps.ts). The reader is the shared one, in PTN's form (@abstractclass/record/record.ts): it keeps the main line and the
// tags. A record names its board by its `Size` tag or by a set-up start's `TPS` tag.
//
// The reader checks the notation, not the rules: the engine checks that each move is legal and that its `*` is true, and
// the import refuses a size, an opening or a komi that the network does not learn.
import * as shared from "@abstractclass/record/record.ts";
import { komiLimit } from "./komi.ts";
import { readMove } from "./notation.ts";
import { emptyBoard, readPosition, setUpStart, writePosition } from "./tps.ts";
export { RecordError } from "@abstractclass/record/record.ts";

/** A game record of Tak: `marked` gives, by move, whether the record marks it as a flattening (`*`). The `result` is
 *  PTN's, `*` for a game with no result yet, or null where the record gives none. */
export type GameRecord = shared.GameRecord<boolean>;

/** PTN's tags in the order in which a record writes them, playtak's: a tag's name reads in any case. */
const TAGS = ["Site", "Event", "Date", "Time", "Round", "Player1", "Rating1", "Player2", "Rating2", "Clock", "Points",
              "Result", "Size", "Komi", "Flats", "Caps", "Flats1", "Caps1", "Flats2", "Caps2", "Opening", "TPS", "PlayTakID"];

const OPENINGS = ["swap", "no-swap", "double black stack"] as const;
export type Opening = (typeof OPENINGS)[number];

/** A tag's value, or null for none. */
const value = (tags: Record<string, string>, name: string): string | null => shared.tagValue(tags[name]);

/** The opening of a record: the swap opening without an `Opening` tag. Null for a tag that names none. */
export function openingOf(tags: Record<string, string>): Opening | null {
  const named = (value(tags, "Opening") ?? "swap").toLowerCase();
  return OPENINGS.find(o => o === named) ?? null;
}

/** The start of a record that the reader took, in TPS's one spelling: its `TPS` tag's, or its size's empty board. */
export function startOf(tags: Record<string, string>): string {
  const tps = value(tags, "TPS");
  if (tps === null) return emptyBoard(Number(value(tags, "Size")));
  const position = readPosition(tps);
  return typeof position === "string" ? tps : writePosition(position);
}

/** Each player's reserve at the start, by size: the standard game's stones and capstones (docs/design/34-tak-site.md,
 *  "Tak, as the site needs it", and the engine repository's games/tak/docs/research/ptn-ninja.md, 5.2). */
const RESERVES: Record<number, { Flats: number; Caps: number }> = {
  3: { Flats: 10, Caps: 0 }, 4: { Flats: 15, Caps: 0 }, 5: { Flats: 21, Caps: 1 },
  6: { Flats: 30, Caps: 1 }, 7: { Flats: 40, Caps: 2 }, 8: { Flats: 50, Caps: 2 },
};

/** What is wrong with the tags of the reserve (`Flats` and `Caps`, and `Flats1` to `Caps2` for one player each), or
 *  null: another reserve is another game, which the engine would play with the size's own. A tag that names the size's
 *  own count is taken, as playtak writes it on every game. */
function reservesProblem(tags: Record<string, string>, size: number): { tag: string; problem: string } | null {
  for (const [kind, what] of [["Flats", "stones"], ["Caps", "capstones"]] as const) {
    const own = RESERVES[size][kind];
    for (const player of ["", "1", "2"]) {
      const tag = kind + player, count = value(tags, tag);
      if (count !== null && Number(count) !== own)
        return { tag, problem: `the ${tag} tag must be ${own}, each player's ${what} on ${size}x${size}` };
    }
  }
  return null;
}

/** What is wrong with a record's tags. */
function tagsProblem(tags: Record<string, string>): { tag: string | null; problem: string } | null {
  const size = value(tags, "Size"), tps = value(tags, "TPS");
  if (value(tags, "Position") !== null) return { tag: "Position", problem: "a Tak record gives its start in a TPS tag, not in a Position tag" };
  if (size !== null && !/^[3-8]$/.test(size)) return { tag: "Size", problem: "the Size tag must be a number from 3 to 8" };
  let side = Number(size);
  if (tps !== null) {
    const position = readPosition(tps);
    if (typeof position === "string") return { tag: "TPS", problem: position };
    if (size !== null && side !== position.size)
      return { tag: "Size", problem: `the Size tag is not the size of the TPS tag's board (${position.size})` };
    side = position.size;
  } else if (size === null) return { tag: null, problem: "the record must have a Size tag, such as [Size \"6\"]" };
  if (openingOf(tags) === null) return { tag: "Opening", problem: `the Opening tag must be one of ${OPENINGS.join(", ")}` };
  return reservesProblem(tags, side);
}

/** A result in its one spelling, or null. playtak writes `0-0` for a game with no result. */
function readResult(word: string): string | null {
  const result = word.toUpperCase();
  if (result === "*" || result === "0-0") return "*";
  if (result === "1/2" || result === "1/2-1/2") return "1/2-1/2";
  return /^(?:[RF1]-0|0-[RF1])$/.test(result) ? result : null;
}

/** The number of a record's first move, and whether it is White's. */
function startTurn(tags: Record<string, string>): { turn: number; first: boolean } {
  const position = readPosition(startOf(tags));
  return typeof position === "string" ? { turn: 1, first: true } : { turn: position.number, first: position.player === 1 };
}

/** Whether a record's first move is the first of the double black stack opening, which PTN writes with a 2 (`2a1`) and
 *  the engine names without it (`a1`), the form to which ptn.ninja normalizes it. */
const opensWithStack = (tags: Record<string, string>): boolean =>
  openingOf(tags) === "double black stack" && setUpStart(startOf(tags)) === undefined;

/** Tak's moves, marks, starts and tags, for the shared record. */
const moveNotation: shared.Notation<boolean> = {
  read(word, { tags, first }) {
    const stack = first && opensWithStack(tags) && /^2[a-h][1-8](?!.*[<>+-])/i.test(word);
    const move = readMove(stack ? word.slice(1) : word);
    return stack && typeof move !== "string" ? { ...move, markAt: move.markAt + 1 } : move;
  },
  mark: flattens => (flattens ? "*" : ""),
  none: false,
  start: startTurn,
  maxKomi: tags => komiLimit(startOf(tags)),
  komiWords: { unit: "flats", example: "2" },
  ptn: {
    result: readResult,
    tagName: name => [...TAGS, "Position"].find(tag => tag.toLowerCase() === name.toLowerCase()) ?? name,
    tagsProblem,
  },
};

/** Reads a game record. Throws a RecordError with the offset of the first problem. */
export const parseRecord = (text: string): GameRecord => shared.readRecord(text, moveNotation);

/** Adds `*` to every flattening that has none yet. `flattens` is by move, from the engine. */
export const markFlattenings = (text: string, record: GameRecord, flattens: boolean[]): string =>
  shared.markMoves(text, record, flattens, moveNotation);

/** Writes a game record: its tags in PTN's order, then a line for each number, with the result after the last move. The
 *  `Result` tag is the result's, and a game with no result has none, as ptn.ninja takes no `*` there. A tag's value
 *  holds no `"`, because PTN has no escapes: it is written as two `'`, as ptn.ninja writes it. */
export function writeRecord({ tags, moves, marked, result }: Pick<GameRecord, "tags" | "moves" | "marked" | "result">): string {
  const all: Record<string, string> = { ...tags };
  delete all.Result;
  if (result !== null && result !== "*") all.Result = result;
  const names = [...TAGS.filter(name => name in all), ...Object.keys(all).filter(name => !TAGS.includes(name))];
  const head = names.map(name => `[${name} "${all[name].replaceAll('"', "''")}"]`).join("\n");

  const { turn, first } = startTurn(tags);
  const written = moves.map((move, i) => (i === 0 && opensWithStack(tags) ? "2" : "") + move + (marked[i] ? "*" : ""));
  if (!first) written.unshift("--"); // Black's move comes first
  const lines: string[] = [];
  for (let i = 0; i < written.length; i += 2) lines.push(`${turn + i / 2}. ${written.slice(i, i + 2).join(" ")}`);
  return `${head}\n\n${lines.join("\n")} ${result ?? "*"}\n`;
}
