// A practice game as a site stores it (Hedge School's design 25): what the browser sends when a game ends, and what the
// server checks before it keeps it (storedFunction.ts). Never the name typed for the record, and never the visitor's
// IP address. Each site gives its game's part (StoredRules): the form of a move, and how to count a record's moves
// (Hedge School's src/lib/practice/stored.ts, Cyanotype's). This module has no imports but types, so that the server's
// bundle takes it alone.
import type { BotMode } from "./botMessages.ts";
import type { PracticeOutcome, Takeback, Variety } from "./practice.ts";

/** How a stored game ended, for the player: Practice's outcomes, and "set_aside", a game in progress left for a new
 *  start that the Analysis board's Play brought (the page asks, and the player chooses the new start). */
export type StoredOutcome = PracticeOutcome | "set_aside";

export interface StoredPractice {
  version: 1;
  id: string; // the game's own random id: a game sent twice is kept once
  browser: string | null; // the browser's random number, with the visitor's consent; null without
  ended: string; // the day the game ended (UTC), YYYY-MM-DD
  site: string; // the site's version (its commit)
  // The bot's settings, where it ran (null: not known, for a game set aside from an earlier visit), and its builds.
  bot: { network: string; visits: number; variety: Variety; form: BotMode | null; builds: string[] };
  komi?: number; // the game's komi, Red's starting score (below 0, Blue's), as its record's Komi tag; none: 0
  side: "blue" | "red"; // the player's
  outcome: StoredOutcome; // the player's
  result: string; // the record's result: `b+12.5`, `r+R`, `0` or `*`
  record: string; // the game's record, each move with its game's mark (a cut, a capture), the start's Position tag,
                  // and no name of the player
  brought: number; // the moves that came with the Analysis board's record: the game's start
  takebacks: Takeback[]; // each one's moves: a move, or "pass"
  ms: (number | null)[]; // by move: the player's thinking time, or the bot's search, in milliseconds; null unknown
}

/** A game's part of the check: the form of one of its moves as the bot and the rules name it (not "pass", which every
 *  game takes), and the moves of a record's main line, which the server keeps beside the game for its queries. */
export interface StoredRules {
  move: RegExp;
  recordMoves(record: string): number;
}

/** The largest game that the server takes, in bytes of its JSON. */
export const STORED_MAX_BYTES = 64 * 1024;

const OUTCOMES: StoredOutcome[] = ["won", "lost", "draw", "resigned", "aborted", "set_aside"];
const VARIETIES: Variety[] = ["low", "medium", "high"];
const FORMS: BotMode[] = ["gpu", "cpu", "single"];
// The card's (practice.ts), which this module cannot import: each site's stored.test.ts checks that they agree
export const MAX_KOMI = 3000;
export const RANDOM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/; // crypto.randomUUID's form

/** Why a sent game is not one that the site keeps, or null when it is. */
export function storedProblem(x: unknown, rules: StoredRules): string | null {
  if (!x || typeof x !== "object") return "not an object";
  const g = x as Record<string, unknown>, bot = g.bot as Record<string, unknown> | undefined;
  const short = (v: unknown, max: number) => typeof v === "string" && v.length > 0 && v.length <= max;
  const count = (v: unknown, max: number) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;
  const move = (v: unknown) => v === "pass" || (typeof v === "string" && rules.move.test(v));
  if (g.version !== 1) return "version";
  if (typeof g.id !== "string" || !RANDOM_ID.test(g.id)) return "id";
  if (g.browser !== null && (typeof g.browser !== "string" || !RANDOM_ID.test(g.browser))) return "browser";
  if (typeof g.ended !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(g.ended)) return "ended";
  if (!short(g.site, 40)) return "site";
  if (!bot || !short(bot.network, 80) || !count(bot.visits, 1 << 20) || (bot.visits as number) < 1) return "bot";
  if (!VARIETIES.includes(bot.variety as Variety) || (bot.form !== null && !FORMS.includes(bot.form as BotMode))) return "bot";
  if (!Array.isArray(bot.builds) || bot.builds.length > 20 || !bot.builds.every(b => short(b, 40))) return "bot";
  if (g.komi !== undefined && !(Number.isInteger(g.komi) && Math.abs(g.komi as number) <= MAX_KOMI && g.komi !== 0)) return "komi";
  if (g.side !== "blue" && g.side !== "red") return "side";
  if (!OUTCOMES.includes(g.outcome as StoredOutcome)) return "outcome";
  if (!short(g.result, 20)) return "result";
  if (!short(g.record, 20_000)) return "record";
  if (!count(g.brought, 200)) return "brought";
  if (!Array.isArray(g.takebacks) || g.takebacks.length > 500) return "takebacks";
  for (const t of g.takebacks as Record<string, unknown>[]) {
    if (!t || !count(t.at, 400) || !Array.isArray(t.undone) || t.undone.length > 4 || !t.undone.every(move)) return "takebacks";
  }
  if (!Array.isArray(g.ms) || g.ms.length > 400 || !g.ms.every(v => v === null || count(v, 24 * 3600_000))) return "ms";
  return null;
}

/** The moves of a record's main line that match `move` (a global expression of a move's word, with its game's mark
 *  of a cut or a capture, or "pass"): without its tags, comments and variations. */
export function recordMoves(record: string, move: RegExp): number {
  let body = record.replace(/\[[^\]]*\]/g, "").replace(/\{[^}]*\}/g, "");
  while (/\([^()]*\)/.test(body)) body = body.replace(/\([^()]*\)/g, ""); // variations, innermost first
  return (body.match(move) ?? []).length;
}

/** The day of a date in UTC, as a stored game names it. */
export const storedDay = (d: Date) => d.toISOString().slice(0, 10);
