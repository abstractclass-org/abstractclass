// Practice (docs/design/24-practice.md): a game against HedgeFund, the engine's practice bot, in the player's browser.
// Hedge School's part of it: the shared part (@abstractclass/practice/practice.ts: the bot's settings, the kept game,
// the GTP helpers, the takeback's reach, the results) with Hedge School's keys and networks, and Enclosure's own: the
// bot's half-life, the turns after a set-up start, the analytics' parameters and the game's record.
import { NETWORKS, networkName, offersNetwork } from "#lib/analysis/engineSettings.ts";
import { writeRecord } from "#lib/game/record.ts";
import { BOT_SECOND_RANGES, CORE_RANGES, EDGE_RANGES, TAKEBACK_RANGES, range } from "#lib/measure.ts";
import { turnFromCount, type Player } from "#lib/review/enclosure.ts";
import {
  botLabel, choicesStore, keptStore, settingsCommands, VARIETY_NAME, type BotSettings, type KeptPractice as Kept,
  type PracticeOutcome,
} from "@abstractclass/practice/practice.ts";
import type { BotMode } from "./botMessages.ts";

export * from "@abstractclass/practice/practice.ts";

/** The game in progress, with where the bot ran as Hedge School's bot names it. */
export type KeptPractice = Kept<BotMode>;

const choices = choicesStore("hedge-school:practice-choices:1", NETWORKS[0].id, offersNetwork);
export const { defaults: defaultChoices, load: loadChoices, save: saveChoices } = choices;
const kept = keptStore<BotMode>("hedge-school:practice-game:1");
export const { load: loadKept, keep } = kept;

/** Variety's half-life: KataGo's 19 moves of Go, as Enclosure's edges (design 24). */
const HALFLIFE = 19;
/** The commands that give the bot a game's settings, after `enclosure-start`. */
export const botCommands = (bot: BotSettings) => settingsCommands(bot, HALFLIFE);

/** The bot's name in the record and on the board: "HedgeFund 0.2 Lite, 64 visits, Low variety". */
export const botName = (bot: BotSettings) => botLabel(networkName(bot.network), bot);

/** The turn of a game's first move: 1 from the standard start, else the set-up start's, from its edge count, and
 *  whether that move opens its turn (the engine repository's design 04, "The turns after a set-up start"). */
export const practiceTurn = (k: Pick<KeptPractice, "start">) => turnFromCount(k.start ? Number(k.start.split(" ")[4]) : 0);

/** What Google Analytics receives about a practice game (design 17): its settings, the network by its name, with
 *  `cores` and the bot's form (gpu, cpu, single), as `practice_start` and `practice_end` both carry them. Never a move
 *  or the player's name. */
export function practiceParams(k: KeptPractice, form: string, cores: number): Record<string, string | number> {
  return {
    network: networkName(k.bot.network), bot_visits: k.bot.visits, bot_variety: k.bot.variety,
    practice_side: k.human === 0 ? "blue" : "red", bot_form: form, cores: range(cores || 1, CORE_RANGES),
  };
}

/** `practice_end`'s parameters: the game's settings, its outcome, its edges, its takebacks, and the bot's average
 *  seconds a turn, as ranges ("none" before the bot's first turn). */
export function practiceEndParams(k: KeptPractice, form: string, cores: number, outcome: PracticeOutcome, edges: number) {
  const turns = k.botTurns ?? 0;
  return {
    ...practiceParams(k, form, cores), practice_outcome: outcome, edges: range(edges, EDGE_RANGES),
    practice_takebacks: range(k.takebacks ?? 0, TAKEBACK_RANGES),
    bot_seconds: turns ? range(Math.floor((k.botMs ?? 0) / turns / 1000), BOT_SECOND_RANGES) : "none",
  };
}

/** The record's event for a practice game: the review knows a practice game by it (design 17, `practice_game`). */
export const PRACTICE_EVENT = "Hedge School practice";

/** A game's record: both sides named (design 24), the event, the date, the bot in full, and the turns, each move with
 *  its cut mark. `movers` is the player of each move: a turn is the moves of one player in a row. `result` is `*` for a
 *  game not finished, and the termination is the record tag's (`normal`, `resignation`) for a game that ended. */
export function practiceRecord(k: KeptPractice, movers: Player[], cuts: boolean[], result: string,
                               termination?: "normal" | "resignation"): string {
  const human = k.name.trim() || "You", bot = botName(k.bot);
  const date = new Date(k.started), two = (n: number) => String(n).padStart(2, "0");
  const tags: Record<string, string> = {
    Event: PRACTICE_EVENT, Site: "Hedge School", Date: `${date.getFullYear()}.${two(date.getMonth() + 1)}.${two(date.getDate())}`,
    Blue: k.human === 0 ? human : bot, Red: k.human === 1 ? human : bot,
    Bot: `${networkName(k.bot.network)} (${k.bot.network}), ${k.bot.visits} ${k.bot.visits === 1 ? "visit" : "visits"} a move, ` +
         `${VARIETY_NAME[k.bot.variety]} variety, ` +
         `engine ${k.builds.join(", then ")}`,
    ...(k.start ? { Position: k.start } : {}),
    ...(termination ? { Termination: termination } : {}),
  };
  // The turns from the start's own number, and `N...` when it is at a turn's second edge (practiceTurn).
  const first = practiceTurn(k), turns: { number: number; moves: number; second?: boolean }[] = [];
  movers.forEach((p, i) => {
    if (i > 0 && p === movers[i - 1]) turns[turns.length - 1].moves++;
    else turns.push({ number: first.turn + turns.length, moves: 1, ...(i === 0 && !first.first ? { second: true } : {}) });
  });
  return writeRecord(tags, k.moves.map((m, i) => (cuts[i] ? `${m}x` : m)), turns, result);
}
