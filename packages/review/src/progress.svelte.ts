// The review's work as one bar (design 06, item 7), each part as wide as its share of the visits, so that the bar
// moves at an even pace: the sweep, the label stage, and the Greats' confirmations. The last is counted from what the
// analysis asks for so far: it grows as labels come, and it is done when its positions have the searches' results in
// the store, whoever ran them (after a change of the review's depth too). The bar shows the step that its line names:
// the steps before are full, the later ones empty, though some of their work can end early, alongside (it shows when
// their step comes). The step's own part never shows less than it has shown (held): a count that grows makes it wait
// instead of going back. Another review depth or game starts it again. After the review, while the area map is on and
// the review's results lack maps, the map stage (design 30) is one more part, which never holds the review's end: the
// review is done without it. Both sites' review pages take it (Hedge School's, Drawing Board's).
import { untrack } from "svelte";
import { SWEEP_VISITS, MAP_VISITS } from "@abstractclass/analysis/cache.ts";
import type { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
import type { GameTypes } from "@abstractclass/analysis/game.ts";
import { NETWORK_LOADS, type ReviewProgress } from "./ReviewView.svelte";

export interface ProgressOptions<G extends GameTypes> {
  game: () => GameAnalysis<G> | null; // the review's analysis, once it has one
  moves: () => number; // the game's moves, before the analysis comes
  budget: () => number; // the label stage's visits
  frozen?: () => boolean; // a review snapshot (Hedge School's design 20): it searches nothing, and the bar shows nothing
  // The analysis on screen holds an earlier engine's results: a review snapshot's, after Review again, until the new
  // review's analysis replaces it
  stale?: () => boolean;
}

/** The review's progress, as the review's view shows it, and whether the review is done. Make it as the page's
 *  component starts: its effects are the page's. */
export class ReviewBar<G extends GameTypes> {
  readonly #o: Required<ProgressOptions<G>>;
  #held = $state({ step: -1, done: 0 });

  /** The bar with the step that its line names, or null when every step has its results. */
  readonly raw = $derived.by((): (ReviewProgress & { step: number }) | null => {
    const { game: gameOf, moves, budget: budgetOf, frozen, stale } = this.#o;
    if (frozen()) return null;
    const game = gameOf(), budget = budgetOf(), passCount = game?.passCount ?? moves();
    const n = Math.max(1, passCount);
    const greats = game?.greatChecks ?? { total: 0, done: 0 };
    const labelled = game?.labelled !== undefined && game.labelled >= passCount;
    // Every step has its results, from the searches or from the browser's store: the review is complete. A review opened
    // again is complete before the engine's network loads: its line says "Review done" at once, and its report's counts
    // are final, so they do not change their lines when the network comes (a layout shift).
    const complete = labelled && greats.done >= greats.total && !stale(), maps = game?.mapPass;
    if (complete && !maps) return null;
    const mapVisits = maps ? MAP_VISITS * maps.total : 0;
    const total = (SWEEP_VISITS + budget) * n + budget * greats.total + mapVisits;
    const parts = [
      { share: (SWEEP_VISITS * n) / total, done: (game?.swept ?? 0) / n },
      { share: (budget * n) / total, done: (game?.labelled ?? 0) / n },
      ...(greats.total ? [{ share: (budget * greats.total) / total, done: greats.done / greats.total }] : []),
      ...(maps ? [{ share: mapVisits / total, done: maps.done / maps.total }] : []),
    ];
    if (complete && maps) return { text: `Maps: ${maps.done} of ${maps.total}`, parts, step: parts.length - 1, maps: true };
    const step = !game || game.swept < passCount ? 0 : !labelled || !greats.total ? 1 : 2;
    if (!game?.engineReady) return { text: NETWORK_LOADS, parts, step };
    if (game.paused) return { text: "Engine off. The review is paused.", parts, waiting: true, step };
    if (step === 0) return { text: `Reviewing: the game's shape, ${game.swept} of ${passCount} positions`, parts, step };
    if (step === 1) return { text: `Reviewing: move quality, ${game.labelled} of ${passCount} positions`, parts, step };
    return { text: `Reviewing: confirming Great moves, ${greats.done} of ${greats.total}`, parts, step };
  });
  readonly #stepDone = $derived(this.raw ? this.raw.parts[this.raw.step]?.done ?? 1 : 0);
  /** The review is done: every step of the bar, the map stage aside. */
  readonly done = $derived.by(() => !this.#o.frozen() && (!this.raw || !!this.raw.maps));
  /** The bar as the view shows it: each step's part at most as it has shown. */
  readonly progress = $derived.by((): ReviewProgress | null => {
    if (!this.raw) return null;
    const { step, ...shown } = this.raw;
    const own = this.#held.step === step ? Math.max(this.#held.done, this.#stepDone) : this.#stepDone;
    return { ...shown, parts: shown.parts.map((p, k) => ({ share: p.share, done: k < step ? 1 : k === step ? own : 0 })) };
  });

  /** Starts the bar's held parts again: the analysis dropped its results for another network. */
  reset() { this.#held = { step: -1, done: 0 }; }

  constructor(options: ProgressOptions<G>) {
    this.#o = { frozen: () => false, stale: () => false, ...options };
    $effect(() => { void this.#o.budget(); void this.#o.game(); this.reset(); });
    $effect(() => {
      const step = this.raw?.step ?? -1, done = this.#stepDone, was = untrack(() => this.#held);
      if (step !== was.step || done > was.done) this.#held = { step, done };
    });
  }
}
