// A page for the session's tests (session.test.ts): what the review's page (Hedge School's src/routes/review) gives its
// EngineSession, as state that the test changes: the settings, the page's analysis, and whether it shows a review snapshot
// (design 20). The session's effects run in a root of their own, as a component's do, and each change runs them at once.
import { flushSync } from "svelte";
import { EngineSession, type SessionOptions } from "../session.svelte.ts";
import type { GameAnalysis } from "../analysis.svelte.ts";
import type { EngineSettings } from "../settings.ts";
import type { Words } from "./game.ts";

export class TestPage {
  settings = $state<EngineSettings>({ on: true, visits: 1024, seconds: null, review: "lite", customReview: 512, network: "",
                                      workers: 2, gpu: "off" });
  game = $state.raw<GameAnalysis<Words> | null>(null);
  snapshot = $state(false);
  readonly session: EngineSession<Words>;
  readonly end: () => void;

  /** A page whose settings name the network `network`, and whose session makes its pools with `pool`. */
  constructor(network: string, pool: SessionOptions<Words>["pool"]) {
    this.settings.network = network;
    let session!: EngineSession<Words>;
    this.end = $effect.root(() => {
      session = new EngineSession({ settings: () => this.settings, game: () => this.game, position: () => [],
                                    frozen: () => this.snapshot, pool });
    });
    this.session = session;
    flushSync();
  }

  /** The page shows the analysis `game`: a review snapshot's, or the review's. */
  show(game: GameAnalysis<Words>, snapshot = false) {
    this.game = game;
    this.snapshot = snapshot;
    flushSync();
  }

  /** Review again, on a review snapshot: the review snapshot ends, and its analysis stays on screen until the review's shows. */
  reviewAgain() {
    this.snapshot = false;
    flushSync();
  }

  /** The player chooses the network `network` in the engine settings. */
  choose(network: string) {
    this.settings.network = network;
    flushSync();
  }
}
