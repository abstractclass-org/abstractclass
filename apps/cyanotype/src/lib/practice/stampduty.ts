// Practice against Stamp Duty (docs/design/33-cyanotype.md, "Practice against Stamp Duty"): Cyanotype's part
// of @abstractclass/practice (Hedge School's design 24). Its keys in this browser, its networks, the bot's half-life,
// and the bot's name. Its visits are Hedge School's, 1 to 8,192.
import { botLabel, choicesStore, keptStore, scoreResult, settingsCommands, type BotSettings } from "@abstractclass/practice/practice.ts";
import { practiceEvents } from "@abstractclass/practice/practiceEvents.ts";
import { withKomi } from "@abstractclass/analysis/game.ts";
import { NETWORKS, networkName, offersNetwork } from "../analysis/engineSettings.ts";
import type { GamePosition } from "../board/described.ts";
import { ENGINE_NAME } from "../site.ts";

/** The networks that the site ships, the first one first: the settings card offers them (engineSettings.ts). */
export { NETWORKS, networkName, offersNetwork };

/** The game in progress. It does not keep where the bot ran (Hedge School's `form`): only Hedge School's stored games
 *  read it, and Cyanotype stores none yet (design 33, "The gaps from Hedge School"). The events take the bot's form
 *  from the bot itself. */
export type { KeptPractice } from "@abstractclass/practice/practice.ts";

const choices = choicesStore("cyanotype:practice-choices:1", NETWORKS[0].id, offersNetwork);
export const { load: loadChoices, save: saveChoices } = choices;
const kept = keptStore("cyanotype:practice-game:1");
export const { load: loadKept, keep } = kept;

/** What Google Analytics receives about a practice game (Hedge School's design 17,
 *  @abstractclass/practice/practiceEvents.ts): `practice_start`'s parameters, and `practice_end`'s, with the network by
 *  its name. */
export const { practiceParams, practiceEndParams } = practiceEvents(networkName);

/** Variety's half-life: GTP's default of 19 moves, as the engine's practice bot gives it for both games (its README,
 *  "The play settings"). */
const HALFLIFE = 19;
/** The commands that give the bot a game's settings and its komi, after `blueprints-start`. The bot keeps the komi
 *  through `blueprints-set-game` (its `clear_board` keeps KataGo's rules). */
export const botCommands = (bot: BotSettings, komi = 0) => settingsCommands(bot, HALFLIFE, komi);

/** The result of a game that the rules ended, at its last position (`b+N`, `r+N` or `0`): the rules' own at komi 0.
 *  The rules' result leaves the komi out, so at another komi it comes from the scores with the komi (Hedge School's
 *  design 24). */
export const endResult = (end: Pick<GamePosition, "scores" | "outcome">, komi: number): string =>
  komi ? scoreResult(withKomi(end, komi).scores) : end.outcome!.result;

/** The bot's name on the page: its network's release name, "Stamp Duty 0.2, 64 visits, Low variety", as Hedge School
 *  names HedgeFund's. A network with no release name has its id as its name: "Stamp Duty (b6c96-s22323968-d845223),
 *  64 visits, Low variety". */
export const botName = (bot: BotSettings) => {
  const name = networkName(bot.network);
  return botLabel(name === bot.network ? `${ENGINE_NAME} (${name})` : name, bot);
};
