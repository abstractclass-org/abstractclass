// Practice (Hedge School's design 24): a game against an engine's practice bot in the player's browser, for a game
// whose bot speaks KataGo's GTP. What each site's practice shares: the bot's settings (the visits for each move, the
// variety and the komi), the player's choices and the game in progress, kept in the browser, the GTP commands that set
// the bot, the takeback's reach, the result and the player's outcome. Each site gives its own storage keys, its
// networks, its bot's half-life and its record (Hedge School's src/lib/practice/hedgefund.ts).
import type { Player } from "@abstractclass/analysis/game.ts";
import { inSteps } from "@abstractclass/analysis/settings.ts";
import { resultOfScores } from "@abstractclass/review/game.ts";
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
/** What each variety does, for the settings card. */
export const VARIETY_HELP: Record<Variety, string> = {
  low: "Plays its best move almost always.",
  medium: "Plays other good moves more often, most of all early in the game.",
  high: "Often plays a move other than its best.",
};

/** The komi (Hedge School's design 24): a starting score, as the engine counts it. The card sets it from the player's
 *  side, any whole number of points from −3,000 to 3,000, its slider by steps of 50. One range for both games: their
 *  self-play trains komi out to ±3,000, and people's margins are of the same size in both. */
export const MAX_KOMI = 3000;
export const KOMI_STEP = 50;
/** Whether the card takes this komi. */
export const komiTaken = (komi: unknown): komi is number => Number.isInteger(komi) && Math.abs(komi as number) <= MAX_KOMI;
/** A komi turned from the player's side to the engine's, or back: the engine's komi is Red's starting score, so the
 *  player's head start is it for Red, and its negative for Blue. */
export const komiSide = (komi: number, human: Player) => (human === 1 ? komi : -komi) || 0;
/** What a komi does, from the player's side (`points` ahead: below 0, the bot's head start). */
export function komiHelp(points: number, bot = "The bot"): string {
  const ahead = (n: number) => `${Math.abs(n).toLocaleString("en")} ${Math.abs(n) === 1 ? "point" : "points"} ahead`;
  return points > 0 ? `You start ${ahead(points)}.` : points < 0 ? `${bot} starts ${ahead(points)}.`
    : "Neither side starts ahead, as in a game online.";
}
/** A game's komi in words, from the player's side: "You start 300 points ahead." Empty at komi 0. */
export const komiLine = (k: Pick<KeptPractice, "komi" | "human">, bot = "The bot") =>
  (k.komi ? komiHelp(komiSide(k.komi, k.human), bot) : "");

/** The bot's settings for a game, fixed for it. */
export interface BotSettings { network: string; visits: number; variety: Variety }

/** The player's choices on the Practice page, kept in this browser for the next game: the bot's settings, the komi from
 *  the player's side (the points that the player starts ahead), the side, and the player's name for the record. */
export interface PracticeChoices { bot: BotSettings; komi: number; side: "blue" | "red" | "random"; name: string }

/** The player's choices, kept under a site's key. `network` is the site's first network, and `offers` says whether the
 *  site still offers a kept one: a choice of a network that it no longer offers takes the first. */
export function choicesStore(key: string, network: string, offers: (id: string | undefined) => boolean) {
  const defaults = (): PracticeChoices => ({ bot: { network, visits: DEFAULT_VISITS, variety: "low" }, komi: 0, side: "random", name: "" });
  function load(): PracticeChoices {
    const d = defaults(), kept = readLocalJson<Partial<PracticeChoices>>(key);
    const bot = kept?.bot;
    return {
      bot: {
        network: offers(bot?.network) ? bot!.network : d.bot.network,
        visits: visitsTaken(bot?.visits) ? bot.visits : d.bot.visits,
        variety: bot?.variety && bot.variety in VARIETY ? bot.variety : d.bot.variety,
      },
      komi: komiTaken(kept?.komi) ? kept.komi : d.komi,
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
  start?: string; // a set-up start, in the game's position notation (the Analysis board's Play)
  komi?: number; // the engine's komi, Red's starting score (below 0, Blue's): the record's Komi tag. None: 0
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

/** A game's start brought to Practice (design 24, item 4): a set-up start in the game's notation (null: the standard
 *  start), and the moves of a record from it. The moves are the game's start: they were not played against the bot. */
export interface Brought { start: string | null; moves: string[] }

/** Where a game began, as design 17's `practice_start` counts it (`practice_from`): a new game from the standard start,
 *  from the Analysis board's position (a record's moves), or from its set-up start; or a game kept and resumed. */
export type PracticeFrom = "new" | "analysis_board" | "set_up_start" | "resumed";

/** A new game's `practice_from`, by the start brought (none: the standard start). */
export const practiceFrom = (brought: Brought | null): PracticeFrom =>
  brought?.start ? "set_up_start" : brought ? "analysis_board" : "new";

/** Practice's address from a position, as the Analysis board's "Play the bot from here" opens it (design 24, item 4):
 *  the board's set-up start when it has one (`position`), and the moves from the start to the position on screen, as
 *  a record (`record`). */
export function practiceHref(start: string | null | undefined, moves: readonly string[]): string {
  const p = new URLSearchParams({ ...(start ? { position: start } : {}), ...(moves.length ? { record: moves.join(" ") } : {}) });
  return p.size ? `/practice#${p}` : "/practice";
}

/** The settings card's line on a start brought: from a set-up start, after a record's moves, or both. `word` is the
 *  game's word for a move, singular then plural ("edge", "edges"). */
export function broughtLine(brought: Brought, word: readonly [string, string]): string {
  const n = brought.moves.length, moves = `${n} ${n === 1 ? word[0] : word[1]}`;
  return brought.start ? `The game starts from the Analysis board's set-up position${n ? `, after the record's ${moves}` : ""}.`
    : `The game starts after the record's ${moves}.`;
}

/** A new game with the player's choices: the side picked (Random by `random`), the bot's settings, the name, and the
 *  card's komi, the player's head start, as the engine's (Red's starting score). From a start brought, the game keeps
 *  the set-up start and the record's moves, and counts those moves as its start (`brought`): a takeback stops there. */
export function newPractice<Form extends string = string>(choices: PracticeChoices, brought: Brought | null,
                                                          random: () => number = Math.random): KeptPractice<Form> {
  const side = choices.side, human: Player = side === "blue" ? 0 : side === "red" ? 1 : random() < 0.5 ? 0 : 1;
  return {
    version: 1, bot: { ...choices.bot }, human, name: choices.name.trim(), seed: Math.floor(random() * 2 ** 31),
    ...(choices.komi ? { komi: komiSide(choices.komi, human) } : {}),
    moves: brought ? [...brought.moves] : [], builds: [], started: new Date().toISOString(),
    ...(brought?.start ? { start: brought.start } : {}), ...(brought?.moves.length ? { brought: brought.moves.length } : {}),
  };
}

/** The game in progress, kept under a site's key. */
export function keptStore<Form extends string = string>(key: string) {
  function load(): KeptPractice<Form> | null {
    const k = readLocalJson<KeptPractice<Form>>(key);
    return k && k.version === 1 && Array.isArray(k.moves) && (k.human === 0 || k.human === 1) && visitsTaken(k.bot?.visits) &&
      (k.komi === undefined || komiTaken(k.komi)) ? k : null;
  }
  const keep = (k: KeptPractice<Form> | null) => writeLocal(key, k && JSON.stringify(k));
  return { load, keep };
}

/** The bot's side in GTP's colours: `b` is Blue, the first player, and `w` is Red. */
export const gtpColor = (p: Player) => (p === 0 ? "b" : "w");

/** The GTP commands that give the bot a game's settings: the visits, the variety's temperatures, halved every
 *  `halflife` moves, and the game's komi (the engine's, Red's starting score). A game at komi 0 sends no `komi`: the
 *  bot's own is 0, so the game plays as before the komi. The bot keeps it through `clear_board` and a new start. */
export function settingsCommands(bot: BotSettings, halflife: number, komi = 0): string[] {
  const v = VARIETY[bot.variety];
  return [`kata-set-param maxVisits ${bot.visits}`, `kata-set-param chosenMoveTemperatureEarly ${v.early}`,
          `kata-set-param chosenMoveTemperature ${v.floor}`, `kata-set-param chosenMoveTemperatureHalflife ${halflife}`,
          ...(komi ? [`komi ${komi}`] : [])];
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
 *  first move. The first `brought` moves came with the game's start (design 24, item 4): a takeback stops at them. */
export function takebackCount(movers: readonly Player[], human: Player, brought = 0): number {
  let k = movers.length;
  while (k > brought && movers[k - 1] !== human) k--;
  const end = k;
  while (k > brought && movers[k - 1] === human) k--;
  return end === brought ? 0 : movers.length - k;
}

/** The result when the player resigns: the bot's win, as Hedge School's records write a resignation (`r+R` when Red
 *  wins). */
export const resignResult = (human: Player) => (human === 0 ? "r+R" : "b+R");

/** The result of a game that the rules ended, from its scores (Blue's, then Red's): `b+12.5`, `r+3`, or `0`, by the
 *  view's rule for a draw, with the margin to six decimals (resultOfScores). */
export function scoreResult(scores: [number, number]): string {
  const { winner, margin } = resultOfScores(scores);
  return winner === null ? "0" : `${winner === 0 ? "b" : "r"}+${margin}`;
}

export type PracticeOutcome = "won" | "lost" | "draw" | "resigned" | "aborted";

/** The player's outcome of a game that the rules ended, from the scores (Blue's, then Red's) by the view's rule for a
 *  draw (resultOfScores), or of a resignation. */
export function practiceOutcome(scores: [number, number], human: Player, resigned: boolean): PracticeOutcome {
  const { winner } = resultOfScores(scores);
  return resigned ? "resigned" : winner === null ? "draw" : winner === human ? "won" : "lost";
}
