// Practice (Hedge School's design 24): a game against an engine's practice bot in the player's browser, for a game whose
// bot speaks KataGo's GTP. What each site's practice shares: the bot's settings (the visits for each move and the
// variety), the player's choices and the game in progress, kept in the browser, the GTP commands that set the bot, the
// takeback's reach, the result and the player's outcome. Each site gives its own storage keys, its networks, its bot's
// half-life and its record (Hedge School's src/lib/practice/hedgefund.ts).
import type { Player } from "@abstractclass/analysis/game.ts";
import { inSteps } from "@abstractclass/analysis/settings.ts";
import { readLocalJson, writeLocal } from "@abstractclass/storage/local.ts";

/** The visits for each bot move: any whole number from 1 to 8,192 (design 24). The slider's stops are the doublings. */
export const MAX_VISITS = 8192;
export const VISIT_STOPS = Array.from({ length: Math.log2(MAX_VISITS) + 1 }, (_, k) => 2 ** k);
export const DEFAULT_VISITS = 64;
/** Whether the bot takes this number of visits. */
export const visitsTaken = (visits: unknown): visits is number => inSteps(VISIT_STOPS, visits);
/** The slider's stop for a number of visits that the bot takes: the doubling at or below it. */
export const visitsStop = (visits: number) => 31 - Math.clz32(visits);

/** Variety, the move temperature (KataGo's chosen-move temperature): at the game's start, halved every half-life of
 *  moves (the site's own), down to the floor. Low is KataGo's default. Medium and High are Hedge School's (design 24). */
export const VARIETY = {
  low: { early: 0.5, floor: 0.1 },
  medium: { early: 0.8, floor: 0.3 },
  high: { early: 1.0, floor: 0.6 },
} as const;
export type Variety = keyof typeof VARIETY;
export const VARIETY_NAME: Record<Variety, string> = { low: "Low", medium: "Medium", high: "High" };

/** The bot's settings for a game, fixed for it. */
export interface BotSettings { network: string; visits: number; variety: Variety }

/** The player's choices on the Practice page, kept in this browser for the next game: the bot's settings, the side, and
 *  the player's name for the record. */
export interface PracticeChoices { bot: BotSettings; side: "blue" | "red" | "random"; name: string }

/** The player's choices, kept under a site's key. `network` is the site's first network, and `offers` says whether the
 *  site still offers a kept one: a choice of a network that it no longer offers takes the first. */
export function choicesStore(key: string, network: string, offers: (id: string | undefined) => boolean) {
  const defaults = (): PracticeChoices => ({ bot: { network, visits: DEFAULT_VISITS, variety: "low" }, side: "random", name: "" });
  function load(): PracticeChoices {
    const d = defaults(), kept = readLocalJson<Partial<PracticeChoices>>(key);
    const bot = kept?.bot;
    return {
      bot: {
        network: offers(bot?.network) ? bot!.network : d.bot.network,
        visits: visitsTaken(bot?.visits) ? bot.visits : d.bot.visits,
        variety: bot?.variety && bot.variety in VARIETY ? bot.variety : d.bot.variety,
      },
      side: kept?.side === "blue" || kept?.side === "red" ? kept.side : d.side,
      name: typeof kept?.name === "string" ? kept.name.slice(0, 40) : d.name,
    };
  }
  const save = (c: PracticeChoices) => writeLocal(key, JSON.stringify(c));
  return { defaults, load, save };
}

/** A takeback: the moves played before it, and the moves that it undid, last first as they were undone. */
export interface Takeback { at: number; undone: string[] }

/** The game in progress, kept in this browser: its moves and settings, not the bot's state. A new build continues it
 *  from its moves alone (design 24). `human` is the player's side, and `builds` the engine builds that played it, in
 *  order. The counts that the game's end reports (design 17) are kept with it, across visits: its takebacks, and the
 *  bot's turns and their time. `Form` names where the bot ran, as the site's bot names it. */
export interface KeptPractice<Form extends string = string> {
  version: 1;
  bot: BotSettings;
  human: Player;
  name: string;
  seed: number;
  moves: string[];
  builds: string[];
  started: string; // ISO date and time
  start?: string; // a set-up start, in the game's position notation (Hedge School: the Analysis board's Play)
  brought?: number; // the moves that came with a record: the game's start, not played against the bot
  takebacks?: number;
  botTurns?: number;
  botMs?: number;
  // What a stored game holds (Hedge School's design 25): the game's own random id, where the bot ran, each takeback,
  // and each move's time (the player's thinking time, or the bot's search), null where it is not known.
  id?: string;
  form?: Form;
  undone?: Takeback[];
  ms?: (number | null)[];
}

/** The game in progress, kept under a site's key. */
export function keptStore<Form extends string = string>(key: string) {
  function load(): KeptPractice<Form> | null {
    const k = readLocalJson<KeptPractice<Form>>(key);
    return k && k.version === 1 && Array.isArray(k.moves) && (k.human === 0 || k.human === 1) && visitsTaken(k.bot?.visits) ? k : null;
  }
  const keep = (k: KeptPractice<Form> | null) => writeLocal(key, k && JSON.stringify(k));
  return { load, keep };
}

/** The bot's side in GTP's colours: `b` is Blue, the first player, and `w` is Red. */
export const gtpColor = (p: Player) => (p === 0 ? "b" : "w");

/** The GTP commands that give the bot a game's settings: the visits, and the variety's temperatures, halved every
 *  `halflife` moves. */
export function settingsCommands(bot: BotSettings, halflife: number): string[] {
  const v = VARIETY[bot.variety];
  return [`kata-set-param maxVisits ${bot.visits}`, `kata-set-param chosenMoveTemperatureEarly ${v.early}`,
          `kata-set-param chosenMoveTemperature ${v.floor}`, `kata-set-param chosenMoveTemperatureHalflife ${halflife}`];
}

/** A GTP response's text: `= TEXT` gives TEXT. Throws on `? ERROR`, with the bot's message. */
export function gtpAnswer(response: string): string {
  if (response.startsWith("=")) return response.slice(1).trim();
  throw new Error(response.startsWith("?") ? response.slice(1).trim() : `not a GTP response: ${response}`);
}

/** The bot's name in a record and on the board, from its network's name: "HedgeFund 0.2 Lite, 64 visits, Low
 *  variety". */
export const botLabel = (network: string, bot: BotSettings) =>
  `${network}, ${bot.visits} ${bot.visits === 1 ? "visit" : "visits"}, ${VARIETY_NAME[bot.variety]} variety`;

/** How many moves a takeback undoes (design 24): the bot's turn after the player's last turn, then that turn, whole,
 *  as Lichess undoes the player's move and the reply. `movers` is the player of each move. None before the player's
 *  first move. */
export function takebackCount(movers: Player[], human: Player): number {
  let k = movers.length;
  while (k > 0 && movers[k - 1] !== human) k--;
  const end = k;
  while (k > 0 && movers[k - 1] === human) k--;
  return end === 0 ? 0 : movers.length - k;
}

/** The result when the player resigns: the bot's win, as Hedge School's records write a resignation (`r+R` when Red
 *  wins). */
export const resignResult = (human: Player) => (human === 0 ? "r+R" : "b+R");

/** The result of a game that the rules ended, from its scores (Blue's, then Red's): `b+12.5`, `r+3`, or `0`. */
export function scoreResult(scores: [number, number]): string {
  const d = scores[0] - scores[1], points = String(Math.round(Math.abs(d) * 1e6) / 1e6);
  return d > 0 ? `b+${points}` : d < 0 ? `r+${points}` : "0";
}

export type PracticeOutcome = "won" | "lost" | "draw" | "resigned" | "aborted";

/** The player's outcome of a game that the rules ended, from the scores (Blue's, then Red's), or of a resignation. */
export function practiceOutcome(scores: [number, number], human: Player, resigned: boolean): PracticeOutcome {
  const d = scores[0] - scores[1];
  return resigned ? "resigned" : Math.abs(d) < 0.05 ? "draw" : (d > 0) === (human === 0) ? "won" : "lost";
}
