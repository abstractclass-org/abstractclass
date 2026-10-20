// The engine behind a page's analysis: in Hedge School, the review's (src/routes/review) and the Analysis board's
// (src/routes/analysis), which runs with the review's engine settings (design 21). It holds the pool of workers (pool.ts) and the GPU worker's
// control for that pool (gpu.svelte.ts, design 15), and gives the engine's settings (design 09) to the page's analysis as
// they change: the engine on or off, the position on screen's depth and time limit, the review's depth, the workers,
// the GPU, and the network, which a new pool loads while the old one still answers the board's rules. It searches the
// position on screen, and looks for the Greats' confirmations as results come. A page makes one as its component
// starts: the session's effects are the page's.
import { untrack } from "svelte";
import { EnginePool } from "@abstractclass/engine/pool.ts";
import type { GameAnalysis } from "./analysis.svelte.ts";
import type { GameTypes } from "./game.ts";
import { reviewVisits, type EngineSettings } from "./settings.ts";
import { GpuControl, gpuDownloadMB, type GpuStatus, type Tracker } from "./gpu.svelte.ts";
import { EngineWorker, loadManifest, type Manifest } from "@abstractclass/engine/client.ts";
import { errorText } from "@abstractclass/engine/errors.ts";

export interface SessionOptions<G extends GameTypes> {
  /** The settings that the analysis runs with. */
  settings: () => EngineSettings;
  /** The page's analysis, once it has one. */
  game: () => GameAnalysis<G> | null;
  /** The position on screen: its path in the tree (tree.ts). */
  position: () => string[];
  /** The analysis searches nothing, and the settings wait: a review by an earlier engine shown as it was (design 20). */
  frozen?: () => boolean;
  /** Runs when the analysis drops its results for another network: the page's own state of them starts again. */
  dropped?: () => void;
  /** The site's analytics (design 17), for a network that did not load and the GPU's test. None by default: no event,
   *  and a network named by its id. */
  tracker?: Tracker;
  /** Makes a pool of `size` search workers, which takes the rules worker `rules` if given: an EnginePool by default, a
   *  test's own pool in a test. */
  pool?: (size: number, rules?: EngineWorker) => EnginePool;
}

export class EngineSession<G extends GameTypes> {
  manifest = $state.raw<Manifest | null>(null);
  gpu = $state<GpuControl | null>(null); // the GPU worker's control for the pool in use
  error = $state(""); // why another network could not load
  pool: EnginePool | null = null;
  network = ""; // the network of the pool in use, or of the pool that loads to replace it
  #rules?: EngineWorker; // the next pool's rules worker, started before the pool (startRules)
  #making = false; // start() makes the analysis, which the page does not show yet
  #ended = false;
  readonly #o: Required<SessionOptions<G>>;
  // The settings that start work when they change, each a value of its own: a change of another setting starts none.
  #budget = $derived.by(() => reviewVisits(this.#o.settings()));
  #workers = $derived.by(() => this.#o.settings().workers);
  #network = $derived.by(() => this.#o.settings().network);
  #gpuMode = $derived.by(() => this.#o.settings().gpu);

  constructor(options: SessionOptions<G>) {
    this.#o = { frozen: () => false, dropped: () => {}, tracker: { track: () => {}, networkName: id => id },
                pool: (size, rules) => new EnginePool(size, rules), ...options };
    const { game, settings, position, frozen } = this.#o;
    // The engine's settings, given to the analysis as they change. The analysis ignores a value it already has.
    $effect(() => {
      const g = game(), s = settings(), off = !s.on, visits = s.visits, seconds = s.seconds, labels = this.#budget;
      if (!g || frozen()) return;
      untrack(() => {
        g.setPaused(off);
        g.setDepth(visits, seconds);
        g.setReview(labels);
      });
    });
    $effect(() => {
      const workers = this.#workers;
      untrack(() => { if (!frozen()) this.pool?.resize(workers); }); // a frozen analysis's pool has the rules alone
    });
    $effect(() => {
      const id = this.#network;
      untrack(() => void this.#useNetwork(id));
    });
    $effect(() => {
      const mode = this.#gpuMode;
      untrack(() => { if (game()?.engineReady) void this.gpu?.apply(mode); });
    });
    // The position on screen is searched once the network is loaded, and again when the player moves (on the game's
    // line or in a branch), when the engine is on again, or when its depth changes.
    $effect(() => {
      const g = game(), path = position();
      if (!g?.engineReady || g.paused) return;
      void g.focusVisits; void g.focusSeconds; // a new depth focuses again
      untrack(() => g.focus(path));
    });
    // The Greats' confirmations (GameAnalysis.confirmGreats), looked for again as results come: a deeper search can
    // change a position's second choice.
    $effect(() => {
      const g = game();
      if (!g || !g.engineReady || g.paused) return;
      void [g.analysis, g.branches, g.judgedMain, g.labelVisits];
      untrack(() => g.confirmGreats());
    });
  }

  /** The manifest of the engine's artifacts. Throws when the site has none. */
  async load(): Promise<Manifest> {
    const manifest = await loadManifest();
    if (!manifest) throw new Error("no /engine/manifest.json: run `npm run engine` first");
    return (this.manifest = manifest);
  }

  /** Starts the next pool's rules worker with the manifest, before the page chooses that pool: the review's (start) or
   *  a snapshot's (design 20), which takes it (takeRules). The worker needs only the manifest, so the rules answer
   *  sooner. Once the session has ended, it starts none. */
  startRules(manifest: Manifest) {
    if (this.#ended || this.#rules) return;
    this.#rules = new EngineWorker();
    this.#rules.init(manifest).catch(() => {}); // the pool that takes it gets the failure
  }

  /** The rules worker that startRules started, for a new pool, once. Without one, the pool starts its own. */
  takeRules(): EngineWorker | undefined {
    const rules = this.#rules;
    this.#rules = undefined;
    return rules;
  }

  /** Whether the session has ended (end): it then starts no worker and no pool. */
  get ended(): boolean { return this.#ended; }

  /** What the GPU does in this analysis, and its first download (ReviewView's `gpu`). */
  get gpuView(): { status: GpuStatus; downloadMB: string } {
    return { status: this.gpu?.status ?? { state: "off" }, downloadMB: this.manifest ? gpuDownloadMB(this.manifest, this.#network) : "?" };
  }

  /** Starts a pool with the settings' network, for the analysis that `make` builds on it once the rules work. Then
   *  `onRules` runs with it and the new pool, before the network loads, and the pool in use before (a snapshot's)
   *  ends. A network chosen before that waits for the analysis, and then applies to it (#useNetwork). Answers the
   *  analysis once the network is loaded. The pool then releases its engines when idle, and the GPU joins it, unless
   *  the rules refused the analysis. When another network was chosen meanwhile, the next pool takes over once it
   *  loads: the start answers the analysis with no GPU, and with no error when the first network failed, or null when
   *  the next pool took over already (its sweep runs). The pool takes the rules worker that startRules started, if no
   *  pool took it before. Once the session has ended, it starts none and answers null. Call after load(). */
  async start(make: (pool: EnginePool) => GameAnalysis<G> | Promise<GameAnalysis<G>>,
              onRules: (g: GameAnalysis<G>, pool: EnginePool) => Promise<void>): Promise<GameAnalysis<G> | null> {
    if (this.#ended) return null;
    const before = this.pool, first = this.pool = this.#o.pool(this.#workers, this.takeRules());
    const network = this.network = this.#network;
    let g = null as GameAnalysis<G> | null;
    this.#making = true;
    try {
      await first.start(this.manifest!, network, async () => {
        const s = this.#o.settings(), made = g = await make(first);
        made.setPaused(!s.on);
        made.setDepth(s.visits, s.seconds);
        made.setReview(this.#budget);
        await onRules(made, first);
        before?.terminate();
        this.#making = false;
        if (made.rulesReady) void this.#useNetwork(this.#network, made); // a network chosen meanwhile, if any
      });
    } catch (e) {
      before?.terminate();
      if (this.pool === first && this.network === network) throw e; // else another network took over, or takes over
    } finally {
      this.#making = false;
    }
    if (this.pool !== first || !g) return null;
    if (this.network !== network) return g; // the next pool gets the GPU (#useNetwork)
    if (g.rulesReady) {
      first.releaseWhenIdle(); // an idle tab keeps no engine but the rules' (pool.ts, IDLE_RELEASE_MS)
      this.#controlGpu(first);
    }
    return g;
  }

  /** Another network: a new pool loads it for the analysis `g`, the page's, while the old pool still answers the
   *  board's rules. The analysis starts again, since every result came from the old network. The new network's results
   *  kept from earlier come from the cache, which keys them by network. Nothing changes while the analysis is frozen,
   *  or while start() makes the next one: the page's analysis is then a snapshot's or none, and start() gives the
   *  network to its own analysis. */
  async #useNetwork(id: string, g = this.#o.game()) {
    if (this.#making || this.#o.frozen() || !this.pool || !this.manifest || !g || id === this.network) return;
    this.network = id;
    g.dropAnalysis();
    this.#o.dropped();
    const next = this.#o.pool(this.#workers);
    try {
      await next.start(this.manifest, id);
    } catch (e) {
      next.terminate();
      if (this.network === id) { this.error = errorText(e); this.#o.tracker.track("engine_error", { error_kind: "load" }); }
      return;
    }
    if (this.network !== id) { next.terminate(); return; } // another network was chosen meanwhile
    next.releaseWhenIdle();
    this.pool = next;
    g.usePool(next);
    this.#controlGpu(next);
    await g.sweep(); // the board's: ready again (GameAnalysis.sweep)
  }

  /** The GPU worker (design 15), one control for each pool: Off, On, or Auto, which keeps the GPU where its first-use
   *  test found it faster than a worker. */
  #controlGpu(p: EnginePool) {
    this.gpu?.end();
    this.gpu = this.manifest ? new GpuControl(p, this.manifest, this.network, this.#o.tracker) : null;
    void this.gpu?.apply(this.#gpuMode);
  }

  /** Ends the engine: the page closed, another tab took the game, or the browser lacks the game. A GPU worker that
   *  starts later then ends (GpuControl), and no rules worker or pool starts (startRules, start). */
  end() {
    this.#ended = true;
    this.takeRules()?.terminate();
    this.gpu?.end();
    this.pool?.terminate();
  }
}
