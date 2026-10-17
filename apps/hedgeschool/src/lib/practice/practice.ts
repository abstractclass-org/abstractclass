// Practice (docs/design/24-practice.md): a game against HedgeFund, the engine's practice bot, in the player's browser.
// What the page and the bot share: the bot's settings, the game kept in this browser, the GTP commands that set the
// bot, the takeback's reach, the result, and the game's record.
import { NETWORKS, inSteps, networkName } from "#lib/analysis/engineSettings.ts";
import { readLocalJson, writeLocal } from "#lib/storage/local.ts";
import { writeRecord } from "#lib/game/record.ts";
import { BOT_SECOND_RANGES, CORE_RANGES, EDGE_RANGES, TAKEBACK_RANGES, range } from "#lib/measure.ts";
import { turnFromCount, type Player } from "#lib/review/model.ts";
import type { BotMode } from "./botMessages.ts";
import type { StoredTakeback } from "./stored.ts";

/** The visits for each bot move: any whole number from 1 to 8,192 (design 24). The slider's stops are the doublings. */
export const MAX_VISITS = 8192;
export const VISIT_STOPS = Array.from({ length: Math.log2(MAX_VISITS) + 1 }, (_, k) => 2 ** k);
export const DEFAULT_VISITS = 64;
/** Whether the bot takes this number of visits. */
export const visitsTaken = (visits: unknown): visits is number => inSteps(VISIT_STOPS, visits);
/** The slider's stop for a number of visits that the bot takes: the doubling at or below it. */
export const visitsStop = (visits: number) => 31 - Math.clz32(visits);

/** Variety, the move temperature (KataGo's chosen-move temperature): at the game's start, halved every HALFLIFE edges,
 *  down to the floor. Low is KataGo's default. Medium and High are the site's own (design 24). */
export const VARIETY = {
  low: { early: 0.5, floor: 0.1 },
  medium: { early: 0.8, floor: 0.3 },
  high: { early: 1.0, floor: 0.6 },
} as const;
export type Variety = keyof typeof VARIETY;
const HALFLIFE = 19;
export const VARIETY_NAME: Record<Variety, string> = { low: "Low", medium: "Medium", high: "High" };

/** The bot's settings for a game, fixed for it. */
export interface BotSettings { network: string; visits: number; variety: Variety }

/** The player's choices on the Practice page, kept in this browser for the next game: the bot's settings, the side, and
 *  the player's name for the record. */
export interface PracticeChoices { bot: BotSettings; side: "blue" | "red" | "random"; name: string }

const CHOICES = "hedge-school:practice-choices:1";
export const defaultChoices = (): PracticeChoices => ({
  bot: { network: NETWORKS[0].id, visits: DEFAULT_VISITS, variety: "low" }, side: "random", name: "",
});
export function loadChoices(): PracticeChoices {
  const d = defaultChoices(), kept = readLocalJson<Partial<PracticeChoices>>(CHOICES);
  const bot = kept?.bot;
  return {
    bot: {
      network: NETWORKS.some(n => n.id === bot?.network) ? bot!.network : d.bot.network,
      visits: visitsTaken(bot?.visits) ? bot.visits : d.bot.visits,
      variety: bot?.variety && bot.variety in VARIETY ? bot.variety : d.bot.variety,
    },
    side: kept?.side === "blue" || kept?.side === "red" ? kept.side : d.side,
    name: typeof kept?.name === "string" ? kept.name.slice(0, 40) : d.name,
  };
}
export const saveChoices = (c: PracticeChoices) => writeLocal(CHOICES, JSON.stringify(c));

/** The game in progress, kept in this browser: its moves and settings, not the bot's state. A new build continues it
 *  from its moves alone (design 24). `human` is the player's side, and `builds` the engine builds that played it, in
 *  order. A game starts at the standard start: the bot takes no set-up start yet (request 20). The counts that the
 *  game's end reports (design 17) are kept with it, across visits: its takebacks, and the bot's turns and their time. */
export interface KeptPractice {
  version: 1;
  bot: BotSettings;
  human: Player;
  name: string;
  seed: number;
  moves: string[];
  builds: string[];
  started: string; // ISO date and time
  start?: string; // a set-up start, in the position notation: the Analysis board's Play from a set-up board
  brought?: number; // the edges that came with the Analysis board's record: the game's start, not played against the bot
  takebacks?: number;
  botTurns?: number;
  botMs?: number;
  // What the stored game holds (design 25, stored.ts): the game's own random id, where the bot ran, each takeback, and
  // each move's time (the player's thinking time, or the bot's search), null where it is not known.
  id?: string;
  form?: BotMode;
  undone?: StoredTakeback[];
  ms?: (number | null)[];
}

const GAME = "hedge-school:practice-game:1";
export function loadKept(): KeptPractice | null {
  const k = readLocalJson<KeptPractice>(GAME);
  return k && k.version === 1 && Array.isArray(k.moves) && (k.human === 0 || k.human === 1) && visitsTaken(k.bot?.visits) ? k : null;
}
export const keep = (k: KeptPractice | null) => writeLocal(GAME, k && JSON.stringify(k));

/** The bot's side in GTP's colours: `b` is Blue, `w` is Red. */
export const gtpColor = (p: Player) => (p === 0 ? "b" : "w");

/** The commands that give the bot a game's settings, after `enclosure-start`. */
export function botCommands(bot: BotSettings): string[] {
  const v = VARIETY[bot.variety];
  return [`kata-set-param maxVisits ${bot.visits}`, `kata-set-param chosenMoveTemperatureEarly ${v.early}`,
          `kata-set-param chosenMoveTemperature ${v.floor}`, `kata-set-param chosenMoveTemperatureHalflife ${HALFLIFE}`];
}

/** A GTP response's text: `= TEXT` gives TEXT. Throws on `? ERROR`, with the bot's message. */
export function gtpAnswer(response: string): string {
  if (response.startsWith("=")) return response.slice(1).trim();
  throw new Error(response.startsWith("?") ? response.slice(1).trim() : `not a GTP response: ${response}`);
}

/** The bot's name in the record and on the board: "HedgeFund 0.2 Lite, 64 visits, Low variety". */
export const botName = (bot: BotSettings) =>
  `${networkName(bot.network)}, ${bot.visits} ${bot.visits === 1 ? "visit" : "visits"}, ${VARIETY_NAME[bot.variety]} variety`;

/** The turn of a game's first move: 1 from the standard start, else the set-up start's, from its edge count, and
 *  whether that move opens its turn (the engine repository's design 04, "The turns after a set-up start"). */
export const practiceTurn = (k: Pick<KeptPractice, "start">) => turnFromCount(k.start ? Number(k.start.split(" ")[4]) : 0);

/** How many edges a takeback undoes (design 24): the bot's turn after the player's last turn, then that turn, whole,
 *  as Lichess undoes the player's move and the reply. `movers` is the player of each move. None before the player's
 *  first move. */
export function takebackCount(movers: Player[], human: Player): number {
  let k = movers.length;
  while (k > 0 && movers[k - 1] !== human) k--;
  const end = k;
  while (k > 0 && movers[k - 1] === human) k--;
  return end === 0 ? 0 : movers.length - k;
}

/** The result when the player resigns: the bot's win, as meaf.ts writes a resignation (`r+R` when Red wins). */
export const resignResult = (human: Player) => (human === 0 ? "r+R" : "b+R");

/** The result of a game that the rules ended, from its scores (Blue's, then Red's), as meaf.ts writes it: `b+12.5`,
 *  `r+3`, or `0`. */
export function scoreResult(scores: [number, number]): string {
  const d = scores[0] - scores[1], points = String(Math.round(Math.abs(d) * 1e6) / 1e6);
  return d > 0 ? `b+${points}` : d < 0 ? `r+${points}` : "0";
}

/** What Google Analytics receives about a practice game (design 17): its settings, the network by its name, with
 *  `cores` and the bot's form (gpu, cpu, single), as `practice_start` and `practice_end` both carry them. Never a move
 *  or the player's name. */
export function practiceParams(k: KeptPractice, form: string, cores: number): Record<string, string | number> {
  return {
    network: networkName(k.bot.network), bot_visits: k.bot.visits, bot_variety: k.bot.variety,
    practice_side: k.human === 0 ? "blue" : "red", bot_form: form, cores: range(cores || 1, CORE_RANGES),
  };
}

export type PracticeOutcome = "won" | "lost" | "draw" | "resigned" | "aborted";

/** The player's outcome of a game that the rules ended, from the scores (Blue's, then Red's), or of a resignation. */
export function practiceOutcome(scores: [number, number], human: Player, resigned: boolean): PracticeOutcome {
  const d = scores[0] - scores[1];
  return resigned ? "resigned" : Math.abs(d) < 0.05 ? "draw" : (d > 0) === (human === 0) ? "won" : "lost";
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
