// Practice (docs/design/24-practice.md): a game against HedgeFund, the engine's practice bot, in the player's browser.
// Hedge School's part of it: the shared part (@abstractclass/practice/practice.ts: the bot's settings, the kept game,
// the GTP helpers, the takeback's reach, the results) with Hedge School's keys and networks, and Enclosure's own: the
// bot's half-life, the turns after a set-up start and the game's record.
import { NETWORKS, networkName, offersNetwork } from "#lib/analysis/engineSettings.ts";
import { startTags, writeRecord } from "#lib/game/record.ts";
import { turnFromCount, type Player } from "#lib/review/enclosure.ts";
import {
  botLabel, choicesStore, keptStore, practiceTags, practiceTurns, settingsCommands, type BotSettings,
  type KeptPractice as Kept,
} from "@abstractclass/practice/practice.ts";
import type { BotMode } from "@abstractclass/practice/botMessages.ts";

export * from "@abstractclass/practice/practice.ts";

/** The game in progress, with where the bot ran as Hedge School's bot names it. */
export type KeptPractice = Kept<BotMode>;

/** The player's choices on the settings card, and the game in progress, in this browser. */
export const practiceChoices = choicesStore("hedge-school:practice-choices:1", NETWORKS[0].id, offersNetwork);
export const keptGame = keptStore<BotMode>("hedge-school:practice-game:1");

/** Variety's half-life: KataGo's 19 moves of Go, as Enclosure's edges (design 24). */
const HALFLIFE = 19;
/** The commands that give the bot a game's settings and its komi, after `enclosure-start`. */
export const botCommands = (bot: BotSettings, komi = 0) => settingsCommands(bot, HALFLIFE, komi);

/** The bot's name on the page, as the komi's words say it (komiHelp, komiLine). */
export const BOT_NAME = "HedgeFund";

/** The bot's name in the record and on the board: "HedgeFund 0.2 Lite, 64 visits, Low variety". */
export const botName = (bot: BotSettings) => botLabel(networkName(bot.network), bot);

/** The turn of a game's first move: 1 from the standard start, else the set-up start's, from its edge count, and
 *  whether that move opens its turn (the engine repository's design 04, "The turns after a set-up start"). */
export const practiceTurn = (k: Pick<KeptPractice, "start">) => turnFromCount(k.start ? Number(k.start.split(" ")[4]) : 0);

/** The record's event for a practice game: the review knows a practice game by it (design 17, `practice_game`). */
export const PRACTICE_EVENT = "Hedge School practice";

/** A game's record: both sides named (design 24), the event, the date, the bot in full, the komi when it is not 0 (the
 *  engine's, Red's starting score), and the turns, each move with its cut mark. `movers` is the player of each move: a
 *  turn is the moves of one player in a row. `result` is `*` for a game not finished, and the termination is the record
 *  tag's (`normal`, `resignation`) for a game that ended. */
export function practiceRecord(k: KeptPractice, movers: Player[], cuts: boolean[], result: string,
                               termination?: "normal" | "resignation"): string {
  const tags: Record<string, string> = {
    ...practiceTags(k, { event: PRACTICE_EVENT, site: "Hedge School", bot: botName(k.bot), network: networkName(k.bot.network) }),
    ...startTags(k.start, k.komi),
    ...(termination ? { Termination: termination } : {}),
  };
  // The turns from the start's own number, and `N...` when it is at a turn's second edge (practiceTurn).
  return writeRecord(tags, k.moves.map((m, i) => (cuts[i] ? `${m}x` : m)), practiceTurns(movers, practiceTurn(k)), result);
}
