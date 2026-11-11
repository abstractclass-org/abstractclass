// The engine's settings (docs/design/09-engine-settings.md) that every site's analysis shares: their shape, the steps
// of the depth on screen and of the time limit, the review's depths, and a game's own network and depth (ownSettingsOf).
// Each site keeps its own networks, its storage key and its defaults (Hedge School's
// src/lib/analysis/engineSettings.ts).
import { LABEL_VISITS } from "./cache.ts";
import type { GameSettings, StoredGame } from "./games.ts";
import { readLocalJson, writeLocal } from "@abstractclass/storage/local.ts";

export type ReviewDepth = "lite" | "standard" | "custom";

export interface EngineSettings {
  on: boolean;
  visits: number; // the position on screen: searched up to this many visits,
  seconds: number | null; // for at most this long (null: no limit)
  review: ReviewDepth;
  customReview: number; // the review's visits for each position when `review` is custom
  network: string; // a model id in the manifest
  workers: number;
  gpu: GpuMode;
}

/** Whether the GPU searches with the workers: on, off, or on where its first-use test found it faster than a worker
 *  (gpu.svelte.ts). */
export type GpuMode = "auto" | "on" | "off";

/** The position on screen's visits: any whole number from 256 to 16,384. Its slider steps by doublings, and each step
 *  doubles the time. The search tree grows with its visits in the worker's memory, and a worker's memory does not
 *  shrink, so the steps stop at 16,384. */
export const DEPTHS = [256, 512, 1024, 2048, 4096, 8192, 16384];
/** The time limits, in seconds: Lichess's search times from 10 seconds, and no limit. A shorter limit adds little: a
 *  new search starts from zero, and shows only once it passes the label stage's 256 visits. */
export const TIME_LIMITS: (number | null)[] = [10, 20, 30, 60, 120, 300, null];
/** The review's visits for each position. Under protocol 0.3, Lite finds two thirds of the mistakes that Standard's
 *  search finds, with 80% of its flags right (256 visits found 42%), and Standard is the reference of that measurement
 *  (decisions/engine.md, "Label agreement against search budget, under protocol 0.3"). KaTrain analyses a move with 500
 *  visits. A custom budget takes the Depth's steps, any whole number from 256 to 16,384: a move gets its label from 256
 *  visits on. */
export const REVIEW_PRESETS = { lite: 2 * LABEL_VISITS, standard: 4 * LABEL_VISITS } as const;
export const CUSTOM_REVIEW = DEPTHS;

/** A number of visits that a setting with these steps (doublings) can take: a whole number in their range. */
export const inSteps = (steps: number[], visits: unknown): visits is number =>
  Number.isInteger(visits) && (visits as number) >= steps[0] && (visits as number) <= steps.at(-1)!;
/** The step nearest a number of visits, by their ratio. */
export const nearestStep = (steps: number[], visits: number) =>
  Math.min(steps.length - 1, Math.max(0, Math.round(Math.log2(visits / steps[0]))));

/** The review's visits for each position, from the settings. */
export const reviewVisits = (s: EngineSettings) => (s.review === "custom" ? s.customReview : REVIEW_PRESETS[s.review]);
/** The review's depth in words: "Lite (512 visits a position)". */
export function reviewDepthText(visits: number): string {
  const preset = visits === REVIEW_PRESETS.lite ? "Lite" : visits === REVIEW_PRESETS.standard ? "Standard" : "Custom";
  return `${preset} (${visits.toLocaleString("en")} visits a position)`;
}

/** The network and the review's visits of the settings, as a game keeps them (games.ts, `settings`). */
const gameSettings = (s: EngineSettings): GameSettings => ({ network: s.network, visits: reviewVisits(s) });

/** The settings with this network and this review's visits: a preset when one has them, else a custom depth. */
function withReview(s: EngineSettings, network: string, visits: number): EngineSettings {
  const preset = (Object.keys(REVIEW_PRESETS) as (keyof typeof REVIEW_PRESETS)[]).find(k => REVIEW_PRESETS[k] === visits);
  return preset ? { ...s, network, review: preset } : { ...s, network, review: "custom", customReview: visits };
}

/** A stored game as its settings read it (games.ts): the settings it came with, and the mark of its last review. */
export type GameWithSettings = Pick<StoredGame, "settings" | "reviewed">;
/** A game's own settings, and where they come from: "stored", the settings it came with (games.ts, `settings`), or
 *  "mark", those of its last review (its mark), whose network has left the menus. The game stores no settings for the
 *  second kind (design 09). */
export interface OwnSettings {
  settings: GameSettings;
  from: "stored" | "mark";
  // The depth per move as the player chose it in the settings on the page (changeOwn), which the settings show. The
  // game keeps only its visits, so the choice lasts while the page is open.
  depthPerMove?: Pick<EngineSettings, "review" | "customReview">;
}
/** The settings that a game with its own settings reviews with and the settings show: the browser's `s`, with the
 *  game's network and depth per move. The depth per move shows as the player chose it on the page, else as the game's
 *  visits give it: Custom at Lite's 512 visits stays Custom, and a game opened at 512 shows Lite. */
export const withOwn = (s: EngineSettings, own: OwnSettings): EngineSettings =>
  own.depthPerMove ? { ...s, ...own.depthPerMove, network: own.settings.network }
    : withReview(s, own.settings.network, own.settings.visits);
/** A game's own settings after a change of its network or its depth per move in the settings (`change`). The browser's
 *  settings `s` give the rest, as withOwn shows them: also the custom visits while the game's depth per move is a
 *  preset. */
export function changeOwn(own: OwnSettings, s: EngineSettings, change: Partial<EngineSettings>): OwnSettings {
  const next = { ...withOwn(s, own), ...change };
  return { ...own, settings: gameSettings(next), depthPerMove: { review: next.review, customReview: next.customReview } };
}
/** The settings that the Analysis board searches with: the browser's `s`, with the board's own network when it has one
 *  (kept.ts, KeptBoard's `network`: an analysis file's, Hedge School's design 21). The board keeps no depth of its own:
 *  a network chosen on it is its own, and the rest of a change is the browser's, so the settings kept in the browser
 *  keep their network for every other page. */
export const withBoardNetwork = (s: EngineSettings, network: string | null): EngineSettings =>
  (network ? { ...s, network } : s);

/** A site's games' own settings, from its networks: those that its settings and Practice offer (`offers`), and those
 *  that it ships (`ships`), which also hold the earlier networks that its engine lock keeps off the menus.
 *  - `ownSettings`: a game's own settings while the site still ships their network, on the menu or off it, else null:
 *    the settings it came with, else those of its last review when that review's network has left the menus, so that
 *    the game opens with that review's results, as a game from a review file does.
 *  - `settingsFor`: the network and the review's visits that a game reviews with: its own, else the browser's. The
 *    review page, the Review tab's Export and the annotated record from the store take them from here, so that each
 *    reads the results of the same review. */
export function ownSettingsOf(networks: { offers: (id: string | undefined) => boolean; ships: (id: string) => boolean }) {
  function ownSettings(game: GameWithSettings | undefined): OwnSettings | null {
    const mark = game?.reviewed;
    const own: OwnSettings | null = game?.settings ? { settings: game.settings, from: "stored" }
      : mark && !networks.offers(mark.network) ? { settings: { network: mark.network, visits: mark.visits }, from: "mark" }
      : null;
    return own && networks.ships(own.settings.network) ? own : null;
  }
  const settingsFor = (game: GameWithSettings | undefined, engine: EngineSettings): GameSettings =>
    ownSettings(game)?.settings ?? gameSettings(engine);
  return { ownSettings, settingsFor };
}

/** Every core the machine reports: a worker more than that only waits. */
export const maxWorkers = () => Math.max(1, navigator.hardwareConcurrency || 2);

/** The settings kept in this browser under `key`, with the site's defaults: a kept value that is not one of the
 *  setting's values gives way to the default, and a network that the site does not offer (`offers`) to the site's
 *  first. Storage can be blocked (a private window, blocked site data): then the defaults hold. */
export function settingsStore(key: string, defaults: () => EngineSettings, offers: (network: string | undefined) => boolean) {
  function load(): EngineSettings {
    const d = defaults();
    const kept = readLocalJson<Partial<EngineSettings>>(key);
    if (!kept) return d;
    return {
      on: typeof kept.on === "boolean" ? kept.on : d.on,
      visits: inSteps(DEPTHS, kept.visits) ? kept.visits : d.visits,
      seconds: kept.seconds !== undefined && TIME_LIMITS.includes(kept.seconds) ? kept.seconds : d.seconds,
      review: kept.review === "standard" || kept.review === "custom" ? kept.review : "lite",
      customReview: inSteps(CUSTOM_REVIEW, kept.customReview) ? kept.customReview : d.customReview,
      network: offers(kept.network) ? kept.network! : d.network,
      workers: Number.isInteger(kept.workers) ? Math.min(maxWorkers(), Math.max(1, kept.workers!)) : d.workers,
      gpu: kept.gpu === "on" || kept.gpu === "off" ? kept.gpu : d.gpu,
    };
  }
  return { load, save: (s: EngineSettings) => writeLocal(key, JSON.stringify(s)) };
}
