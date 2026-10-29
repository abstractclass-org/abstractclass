// Practice against Stamp Duty (docs/design/33-drawing-board.md, "Practice against Stamp Duty"): Drawing Board's part
// of @abstractclass/practice (Hedge School's design 24). Its keys in this browser, its networks, the visits that its
// bot takes, the bot's half-life, and the bot's name.
import lock from "../../../engine.lock.json" with { type: "json" };
import { botLabel, choicesStore, keptStore, settingsCommands, visitRange, type BotSettings, type KeptPractice as Kept }
  from "@abstractclass/practice/practice.ts";
import { ENGINE_NAME } from "../site.ts";

/** The networks that the site ships (engine.lock.json), the first one first: the settings card offers them. Each by
 *  its release's name, which is the network's own name until a release gives it a number of Stamp Duty. */
export const NETWORKS = lock.artifacts.filter(a => a.kind === "model").map(a => ({ id: a.id, name: a.displayName ?? a.id, bytes: a.bytes }));
export const offersNetwork = (id: string | undefined) => NETWORKS.some(n => n.id === id);
export const networkName = (id: string) => NETWORKS.find(n => n.id === id)?.name ?? id;

/** The least visits that the bot takes for a move. With the root's views, its genmove fails when the visits are at
 *  most twice the views of the position's cover, and the site's games have covers of up to 13 views: it failed on
 *  none with 27 visits or more (the engine repository's games/blueprints/README.md, "The practice bot", "The search").
 *  The engine's fix (abscls-csmy, protocol 0.7.1) lets this go down to 1, Hedge School's least. */
export const LEAST_VISITS = 27;
export const BOT_VISITS = visitRange(LEAST_VISITS);

/** The bot's only form: its one search thread, with the network in its module, on the CPU. */
export type BotForm = "single";
/** The game in progress, with where the bot ran. */
export type KeptPractice = Kept<BotForm>;

const choices = choicesStore("drawing-board:practice-choices:1", NETWORKS[0].id, offersNetwork, BOT_VISITS);
export const { load: loadChoices, save: saveChoices } = choices;
const kept = keptStore<BotForm>("drawing-board:practice-game:1", BOT_VISITS);
export const { load: loadKept, keep } = kept;
/** The key of the hands' panel: its place and its size, which the player chose. */
export const PANEL_KEY = "drawing-board:practice-panel:1";

/** Variety's half-life: GTP's default of 19 moves, as the engine's practice bot gives it for both games (its README,
 *  "The play settings"). */
const HALFLIFE = 19;
/** The commands that give the bot a game's settings, after `blueprints-start`. */
export const botCommands = (bot: BotSettings) => settingsCommands(bot, HALFLIFE);

/** The bot's name on the page: "Stamp Duty (b6c96-s19117184-d446546), 64 visits, Low variety". */
export const botName = (bot: BotSettings) => botLabel(`${ENGINE_NAME} (${networkName(bot.network)})`, bot);
