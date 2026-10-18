// The engine's settings (docs/design/09-engine-settings.md), kept in this browser: whether the engine searches, how
// far it searches the position on screen (KaTrain's max_visits and max_time: whichever comes first), the review's
// budget for each position, which network it uses (Lichess's choice of engine), and how many workers search at once
// (Lichess's threads), and whether the visitor's GPU searches too (analysis/gpu.svelte.ts). Storage can be blocked (a private window, blocked site data): then the defaults hold.
import lock from "../../../engine.lock.json" with { type: "json" };
import { DEEP_VISITS, LABEL_VISITS } from "./game.svelte.ts";
import { defaultPoolSize } from "./pool.ts";
import { megabytes } from "#lib/engine/client.ts";
import { readLocalJson, writeLocal } from "#lib/storage/local.ts";
import type { GameSettings, StoredGame } from "#lib/game/store.ts";

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
 *  (analysis/gpu.svelte.ts). */
export type GpuMode = "auto" | "on" | "off";

/** A network's name, as the engine's release names it (its manifest's `displayName`, copied into engine.lock.json):
 *  "HedgeFund 0.2 Lite". A name belongs to one network file for life (the engine repository's
 *  games/enclosure/docs/design/20-network-names.md). The id when the lock gives no name. */
export const networkName = (id: string): string => locked(id)?.displayName ?? id;
/** A network's download in MB, from engine.lock.json, which the deploy fetches by: what a change of network costs, as
 *  Lichess's engine menu gives each engine's size. */
export const networkMB = (id: string): string => megabytes(locked(id)?.bytes ?? 0);
/** Whether the site ships the network `id` (engine.lock.json pins it): the networks of the menus (NETWORKS), and the
 *  earlier ones that the lock keeps off them, so that a game, a review file or a Practice game that names one still
 *  loads it. */
export const shipsNetwork = (id: string): boolean => locked(id)?.kind === "model";
const locked = (id: string) => (lock.artifacts as { id: string; kind: string; displayName?: string; bytes: number }[]).find(a => a.id === id);

/** The networks that the settings and Practice offer, as the manifest names them, the default first. Their parameters
 *  are the trainer's counts (the engine repository's games/enclosure/docs/design/15-network-sizes.md). Their memory in
 *  a worker and on the GPU, measured on one machine: decisions/engine.md, "A review's memory". The settings give no
 *  number for it: it depends on the browser and the graphics card. */
export const NETWORKS = [
  { id: "b10c128-s89066368-d17827487", params: "3.2M" },
  { id: "b15c192-s90436608-d18027147", params: "10.3M" },
];
/** The position on screen's visits: any whole number from 256 to 16,384. Its slider steps by doublings, and each step
 *  doubles the time. The search tree grows with its visits in the worker's memory, and a worker's memory does not
 *  shrink, so the steps stop at 16,384. */
export const DEPTHS = [256, 512, 1024, 2048, 4096, 8192, 16384];
/** The time limits, in seconds: Lichess's search times from 10 seconds, and no limit. A shorter limit adds little: a
 *  new search starts from zero, and shows only once it passes the label pass's 256 visits. */
export const TIME_LIMITS: (number | null)[] = [10, 20, 30, 60, 120, 300, null];
/** The review's visits for each position. Under protocol 0.3, Lite finds two thirds of the mistakes that Standard's
 *  search finds, with 80% of its flags right (256 visits found 42%), and Standard is the reference of that measurement
 *  (decisions/engine.md, "Label agreement against search budget, under protocol 0.3"). KaTrain analyses a move with 500
 *  visits. A custom budget takes the Depth's steps, any whole number from 256 to 16,384: a move gets its label from 256
 *  visits on. The key moments go one doubling deeper (game.svelte.ts, momentVisits), to 32,768 at most. */
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

/** The settings with this network and this review's visits: a preset when one has them, else a custom depth. A game
 *  that keeps its own settings (game/store.ts, `settings`) runs with them. */
export function withReview(s: EngineSettings, network: string, visits: number): EngineSettings {
  const preset = (Object.keys(REVIEW_PRESETS) as (keyof typeof REVIEW_PRESETS)[]).find(k => REVIEW_PRESETS[k] === visits);
  return preset ? { ...s, network, review: preset } : { ...s, network, review: "custom", customReview: visits };
}

/** Whether the settings and Practice offer the network `id` (NETWORKS). */
export const offersNetwork = (id: string | undefined): boolean => NETWORKS.some(n => n.id === id);

/** A stored game as its settings read it (game/store.ts): the settings it came with, and the mark of its last review. */
type GameWithSettings = Pick<StoredGame, "settings" | "reviewed">;
/** A game's own settings, and where they come from: "stored", the settings it came with (game/store.ts, `settings`), or
 *  "mark", those of its last review (its mark), whose network has left the menus. The game stores no settings for the
 *  second kind (design 09). `depth`: its depth per move as the player chose it in the settings on the page (changeOwn),
 *  which the settings show: the game keeps only its visits. */
export interface OwnSettings {
  settings: GameSettings; from: "stored" | "mark"; depth?: Pick<EngineSettings, "review" | "customReview">;
}
/** A game's own settings while the site still ships their network, on the menu or off it, else null: the settings it
 *  came with, else those of its last review when that review's network has left the menus, so that the game opens
 *  with that review's results, as a game from a review file does. */
export function ownSettings(game: GameWithSettings | undefined): OwnSettings | null {
  const mark = game?.reviewed;
  const own: OwnSettings | null = game?.settings ? { settings: game.settings, from: "stored" }
    : mark && !offersNetwork(mark.network) ? { settings: { network: mark.network, visits: mark.visits }, from: "mark" }
    : null;
  return own && shipsNetwork(own.settings.network) ? own : null;
}
/** The settings that a game with its own settings reviews with and the settings show: the browser's `s`, with the
 *  game's network and depth per move. The depth shows as the player chose it on the page, else as withReview gives it:
 *  Custom at Lite's 512 visits stays Custom, and a game opened at 512 shows Lite. */
export const withOwn = (s: EngineSettings, own: OwnSettings): EngineSettings =>
  own.depth ? { ...s, ...own.depth, network: own.settings.network } : withReview(s, own.settings.network, own.settings.visits);
/** A game's own settings after a change in the settings of its network or its depth per move (`change`), on the
 *  browser's `s`. */
export function changeOwn(own: OwnSettings, s: EngineSettings, change: Partial<EngineSettings>): OwnSettings {
  const next = { ...withOwn(s, own), ...change };
  return { ...own, settings: { network: next.network, visits: reviewVisits(next) },
           depth: { review: next.review, customReview: next.customReview } };
}
/** The network and the review's visits that a game reviews with: its own (ownSettings), else the browser's. The review
 *  page, the Review tab's Export and the annotated record from the store take them from here, so that each reads the
 *  results of the same review. */
export const settingsFor = (game: GameWithSettings | undefined, engine: EngineSettings): GameSettings =>
  ownSettings(game)?.settings ?? { network: engine.network, visits: reviewVisits(engine) };

/** The review's depth in words: "Lite (512 visits a position)". */
export function reviewDepthText(visits: number): string {
  const preset = visits === REVIEW_PRESETS.lite ? "Lite" : visits === REVIEW_PRESETS.standard ? "Standard" : "Custom";
  return `${preset} (${visits.toLocaleString("en")} visits a position)`;
}

/** Every core the machine reports: a worker more than that only waits. */
export const maxWorkers = () => Math.max(1, navigator.hardwareConcurrency || 2);

// Version 2: the review's names changed (version 1's "standard" was 256 visits, now Lite's).
const KEY = "learn-enclosure:engine:2";

export const defaultEngine = (): EngineSettings => ({
  on: true, visits: DEEP_VISITS, seconds: 30, review: "lite", customReview: 512, network: NETWORKS[0].id,
  workers: defaultPoolSize(), gpu: "auto",
});

export function loadEngine(): EngineSettings {
  const d = defaultEngine();
  const kept = readLocalJson<Partial<EngineSettings>>(KEY);
  if (!kept) return d;
  return {
    on: typeof kept.on === "boolean" ? kept.on : d.on,
    visits: inSteps(DEPTHS, kept.visits) ? kept.visits : d.visits,
    seconds: kept.seconds !== undefined && TIME_LIMITS.includes(kept.seconds) ? kept.seconds : d.seconds,
    review: kept.review === "standard" || kept.review === "custom" ? kept.review : "lite",
    customReview: inSteps(CUSTOM_REVIEW, kept.customReview) ? kept.customReview : d.customReview,
    network: offersNetwork(kept.network) ? kept.network! : d.network,
    workers: Number.isInteger(kept.workers) ? Math.min(maxWorkers(), Math.max(1, kept.workers!)) : d.workers,
    gpu: kept.gpu === "on" || kept.gpu === "off" ? kept.gpu : d.gpu,
  };
}

export const saveEngine = (s: EngineSettings) => writeLocal(KEY, JSON.stringify(s));
