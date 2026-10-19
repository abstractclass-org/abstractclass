// The engine's settings (docs/design/09-engine-settings.md) that every site's analysis shares: their shape, the steps
// of the depth on screen and of the time limit, and the review's depths. Each site keeps its own networks, its storage
// key, its defaults and its games' own settings (Hedge School's src/lib/analysis/engineSettings.ts).
import { LABEL_VISITS } from "./cache.ts";

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
 *  new search starts from zero, and shows only once it passes the label pass's 256 visits. */
export const TIME_LIMITS: (number | null)[] = [10, 20, 30, 60, 120, 300, null];
/** The review's visits for each position. Under protocol 0.3, Lite finds two thirds of the mistakes that Standard's
 *  search finds, with 80% of its flags right (256 visits found 42%), and Standard is the reference of that measurement
 *  (decisions/engine.md, "Label agreement against search budget, under protocol 0.3"). KaTrain analyses a move with 500
 *  visits. A custom budget takes the Depth's steps, any whole number from 256 to 16,384: a move gets its label from 256
 *  visits on. The key moments go one doubling deeper (analysis.svelte.ts, momentVisits), to 32,768 at most. */
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

/** Every core the machine reports: a worker more than that only waits. */
export const maxWorkers = () => Math.max(1, navigator.hardwareConcurrency || 2);
