// A practice game as the site stores it (design 25): what the browser sends when a game ends, and what the server
// checks before it keeps it (functions/api/practice-games.ts). Never the name typed for the record, and never the
// visitor's IP address. This module has no imports but types, so that the server's bundle takes it alone.
import type { BotMode } from "./botMessages.ts";
import type { PracticeOutcome, Variety } from "./hedgefund.ts";

/** How a stored game ended, for the player: Practice's outcomes, and "set_aside", a game in progress left for a new
 *  start that the Analysis board's Play brought (the page asks, and the player chooses the new start). */
export type StoredOutcome = PracticeOutcome | "set_aside";

/** A takeback: the edges played before it, and the edges that it undid, last first as they were undone. */
export interface StoredTakeback { at: number; undone: string[] } // an edge, or "pass"

export interface StoredPractice {
  version: 1;
  id: string; // the game's own random id: a game sent twice is kept once
  browser: string | null; // the browser's random number, with the visitor's consent; null without
  ended: string; // the day the game ended (UTC), YYYY-MM-DD
  site: string; // the site's version (its commit)
  // The bot's settings, where it ran (null: not known, for a game set aside from an earlier visit), and its builds.
  bot: { network: string; visits: number; variety: Variety; form: BotMode | null; builds: string[] };
  side: "blue" | "red"; // the player's
  outcome: StoredOutcome; // the player's
  result: string; // the record's result: `b+12.5`, `r+R`, `0` or `*`
  record: string; // the game's record, with its cuts, the start's Position tag, and no name of the player
  brought: number; // the edges that came with the Analysis board's record: the game's start
  takebacks: StoredTakeback[];
  ms: (number | null)[]; // by move: the player's thinking time, or the bot's search, in milliseconds; null unknown
}

/** The largest game that the server takes, in bytes of its JSON. */
export const STORED_MAX_BYTES = 64 * 1024;

const OUTCOMES: StoredOutcome[] = ["won", "lost", "draw", "resigned", "aborted", "set_aside"];
const VARIETIES: Variety[] = ["low", "medium", "high"];
const FORMS: BotMode[] = ["gpu", "cpu", "single"];
const EDGE = /^[A-T][0-9]{1,2}-[A-T][0-9]{1,2}$/;
export const RANDOM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/; // crypto.randomUUID's form

/** Why a sent game is not one that the site keeps, or null when it is. */
export function storedProblem(x: unknown): string | null {
  if (!x || typeof x !== "object") return "not an object";
  const g = x as Record<string, unknown>, bot = g.bot as Record<string, unknown> | undefined;
  const short = (v: unknown, max: number) => typeof v === "string" && v.length > 0 && v.length <= max;
  const count = (v: unknown, max: number) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;
  if (g.version !== 1) return "version";
  if (typeof g.id !== "string" || !RANDOM_ID.test(g.id)) return "id";
  if (g.browser !== null && (typeof g.browser !== "string" || !RANDOM_ID.test(g.browser))) return "browser";
  if (typeof g.ended !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(g.ended)) return "ended";
  if (!short(g.site, 40)) return "site";
  if (!bot || !short(bot.network, 80) || !count(bot.visits, 1 << 20) || (bot.visits as number) < 1) return "bot";
  if (!VARIETIES.includes(bot.variety as Variety) || (bot.form !== null && !FORMS.includes(bot.form as BotMode))) return "bot";
  if (!Array.isArray(bot.builds) || bot.builds.length > 20 || !bot.builds.every(b => short(b, 40))) return "bot";
  if (g.side !== "blue" && g.side !== "red") return "side";
  if (!OUTCOMES.includes(g.outcome as StoredOutcome)) return "outcome";
  if (!short(g.result, 20)) return "result";
  if (!short(g.record, 20_000)) return "record";
  if (!count(g.brought, 200)) return "brought";
  if (!Array.isArray(g.takebacks) || g.takebacks.length > 500) return "takebacks";
  for (const t of g.takebacks as Record<string, unknown>[]) {
    if (!t || !count(t.at, 400) || !Array.isArray(t.undone) || t.undone.length > 4 || !t.undone.every(e => e === "pass" || (typeof e === "string" && EDGE.test(e)))) return "takebacks";
  }
  if (!Array.isArray(g.ms) || g.ms.length > 400 || !g.ms.every(v => v === null || count(v, 24 * 3600_000))) return "ms";
  return null;
}

/** The edges of a record's main line, passes included: its moves, without its tags, comments and variations. */
export function recordEdges(record: string): number {
  let body = record.replace(/\[[^\]]*\]/g, "").replace(/\{[^}]*\}/g, "");
  while (/\([^()]*\)/.test(body)) body = body.replace(/\([^()]*\)/g, ""); // variations, innermost first
  return (body.match(/\b[A-T]\d{1,2}-[A-T]\d{1,2}x?(?![\w-])|\bpass\b/g) ?? []).length;
}

/** The day of a date in UTC, as a stored game names it. */
export const storedDay = (d: Date) => d.toISOString().slice(0, 10);
