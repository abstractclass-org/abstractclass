// Practice against Stamp Duty (docs/design/33-cyanotype.md, "Practice against Stamp Duty"): Cyanotype's part
// of @abstractclass/practice (Hedge School's design 24). Its keys in this browser, its networks, the bot's half-life,
// the bot's name and the game's record. Its visits are Hedge School's, 1 to 8,192.
import {
  botLabel, choicesStore, keptStore, practiceTags, practiceTurns, scoreResult, settingsCommands, type BotSettings,
  type KeptPractice as Kept,
} from "@abstractclass/practice/practice.ts";
import type { BotMode } from "@abstractclass/practice/botMessages.ts";
import type { Player } from "@abstractclass/analysis/game.ts";
import { withKomi } from "@abstractclass/analysis/game.ts";
import { NETWORKS, networkName, offersNetwork } from "../analysis/engineSettings.ts";
import type { GamePosition } from "../board/described.ts";
import { startTags, writeRecord } from "../game/record.ts";
import { startTurn } from "../game/position.ts";
import { ENGINE_NAME, SITE_NAME } from "../site.ts";

/** The networks that the site ships, the first one first: the settings card offers them (engineSettings.ts). */
export { NETWORKS, networkName, offersNetwork };

/** The game in progress, with where the bot ran as the bot names it (the stored game keeps it, Hedge School's design
 *  25). */
export type KeptPractice = Kept<BotMode>;

/** The player's choices on the settings card, and the game in progress, in this browser. */
export const practiceChoices = choicesStore("cyanotype:practice-choices:1", NETWORKS[0].id, offersNetwork);
export const keptGame = keptStore<BotMode>("cyanotype:practice-game:1");

/** Variety's half-life: GTP's default of 19 moves, as the engine's practice bot gives it for both games (its README,
 *  "The play settings"). */
const HALFLIFE = 19;
/** The commands that give the bot a game's settings and its komi, after `blueprints-start`. The bot keeps the komi
 *  through `blueprints-set-game` (its `clear_board` keeps KataGo's rules). */
export const botCommands = (bot: BotSettings, komi = 0) => settingsCommands(bot, HALFLIFE, komi);

/** The result of a game that the rules ended, at its last position (`b+N`, `r+N` or `0`): from the scores with the
 *  komi (Hedge School's design 24), by the one rule for a draw. Not the rules' own result: it leaves the komi out. */
export const endResult = (end: Pick<GamePosition, "scores">, komi: number): string =>
  scoreResult(withKomi(end, komi).scores);

/** The bot's name on the page: its network's release name, "Stamp Duty 0.2, 64 visits, Low variety", as Hedge School
 *  names HedgeFund's. A network with no release name has its id as its name: "Stamp Duty (b6c96-s22323968-d845223),
 *  64 visits, Low variety". */
export const botName = (bot: BotSettings) => {
  const name = networkName(bot.network);
  return botLabel(name === bot.network ? `${ENGINE_NAME} (${name})` : name, bot);
};

/** The record's event for a practice game: the review knows a practice game by it (Hedge School's design 17,
 *  `practice_game`). */
export const PRACTICE_EVENT = "Cyanotype practice";

/** A game's record, as Hedge School's Practice writes one (its design 24): both sides named, the event, the date, the
 *  bot in full, the set-up start and the komi when the game has them (the engine's komi, Red's starting score), and the
 *  turns from the start's own number, each move with its capture mark (`moves`, by move: the text that the move list
 *  shows). `movers` is the player of each move: a turn is the moves of one player in a row. `result` is `*` for a game
 *  not finished, and the termination is the record tag's (`normal`, `resignation`) for a game that ended. */
export function practiceRecord(k: KeptPractice, moves: string[], movers: Player[], result: string,
                               termination?: "normal" | "resignation"): string {
  const tags: Record<string, string> = {
    ...practiceTags(k, { event: PRACTICE_EVENT, site: SITE_NAME, bot: botName(k.bot), network: networkName(k.bot.network) }),
    ...startTags(k.start, k.komi),
    ...(termination ? { Termination: termination } : {}),
  };
  return writeRecord(tags, moves, practiceTurns(movers, startTurn(k.start)), result);
}
