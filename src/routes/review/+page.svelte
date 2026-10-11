<script lang="ts">
  // The review page: one game analysed in the browser (src/lib/analysis/game.svelte.ts). `?game=ID` opens a game the
  // player imported (src/lib/game/store.ts). Without it, the sample: a bot game from the engine repository's visit
  // ladder. The board works from the engine's rules at once. Then the sweep, the label pass, deeper searches where the
  // player looks, and the key moments deepened after the label pass (docs/design/05-review-analysis.md). The engine's
  // settings (docs/design/09-engine-settings.md) apply as they change: the workers and the network without a reload.
  import { onDestroy, onMount, untrack } from "svelte";
  import ReviewView, { type ReviewProgress } from "#lib/review/ReviewView.svelte";
  import { review, type ReviewData } from "#lib/review/model.ts";
  import { EnginePool } from "#lib/analysis/pool.ts";
  import { GameAnalysis, LABEL_VISITS, SWEEP_VISITS } from "#lib/analysis/game.svelte.ts";
  import { loadEngine, reviewVisits, saveEngine } from "#lib/analysis/engineSettings.ts";
  import { loadManifest, type Manifest } from "#lib/engine/client.ts";
  import { errorText } from "#lib/errors.ts";
  import { playerNames } from "#lib/game/record.ts";
  import { loadGame } from "#lib/game/store.ts";
  import { pathKey } from "#lib/review/tree.ts";
  import { SAMPLE, SAMPLE_MOVES } from "#lib/mock/sample.ts";

  const MESSAGE = "box-content max-w-[1100px] mx-auto my-8 px-4";

  let pool: EnginePool | null = null;
  let manifest: Manifest | null = null;
  let network = ""; // the network of the pool in use, or of the pool that loads to replace it
  let game = $state<GameAnalysis | null>(null);
  let players = $state<ReviewData["players"]>(SAMPLE.players);
  let moveCount = $state(0);
  let error = $state("");
  let deepened = false;
  let current = $state<string[]>([]); // the position on screen: its path in the game's tree (review/tree.ts)
  const engine = $state(loadEngine());
  $effect(() => saveEngine($state.snapshot(engine)));

  // The label pass's budget. An edge gets its label from 256 visits on, in a deeper review too: its label then shows as
  // soon as the Lite review would show it, and changes when the deeper searches arrive, as a label does when a deeper
  // search replaces a shallow one (design 05).
  const budget = $derived(reviewVisits(engine));
  const data = $derived(game?.data(players) ?? null);
  const R = $derived(data ? review(data, "lead", LABEL_VISITS) : null);
  // The review's two passes as one bar, each part as wide as its share of the visits, so the bar moves at an even pace.
  const progress = $derived.by((): ReviewProgress | null => {
    const n = Math.max(1, moveCount);
    const total = SWEEP_VISITS + budget;
    const parts = [
      { share: SWEEP_VISITS / total, done: (game?.swept ?? 0) / n },
      { share: budget / total, done: (game?.labelled ?? 0) / n },
    ];
    if (!game?.engineReady) return { text: "Loading the engine's network…", parts };
    if (game.labelled >= moveCount) return null;
    if (game.paused) return { text: "Engine off. The review is paused.", parts, waiting: true };
    if (game.swept < moveCount) return { text: `Reviewing: the game's shape, ${game.swept} of ${moveCount} positions`, parts };
    return { text: `Reviewing: move quality, ${game.labelled} of ${moveCount} positions`, parts };
  });

  // The engine's settings, given to the analysis as they change. The analysis ignores a value it already has.
  $effect(() => {
    const g = game, off = !engine.on, visits = engine.visits, seconds = engine.seconds, labels = budget;
    if (!g) return;
    untrack(() => {
      g.setPaused(off);
      g.setDepth(visits, seconds);
      g.setReview(labels);
    });
  });
  $effect(() => {
    const workers = engine.workers;
    untrack(() => pool?.resize(workers));
  });
  $effect(() => {
    const id = engine.network;
    untrack(() => void useNetwork(id));
  });

  // The position on screen is searched deeper once the network is loaded, and again when the player moves (on the
  // game's line or in a branch), when the engine is on again, or when its depth changes.
  $effect(() => {
    const g = game, path = current;
    if (!g?.engineReady || g.paused) return;
    void g.focusVisits; void g.focusSeconds; // a new depth focuses again
    untrack(() => g.focus(path));
  });

  /** Another network: a new pool loads it while the old pool still answers the board's rules. The analysis starts
   *  again, since every result came from the old network. The new network's results kept from earlier come from the
   *  cache, which keys them by network. */
  async function useNetwork(id: string) {
    const g = game;
    if (!pool || !manifest || !g || id === network) return;
    network = id;
    g.dropAnalysis();
    deepened = false;
    const next = new EnginePool(engine.workers);
    try {
      await next.start(manifest, id);
    } catch (e) {
      next.terminate();
      if (network === id) error = errorText(e);
      return;
    }
    if (network !== id) { next.terminate(); return; } // another network was chosen meanwhile
    pool = next;
    g.usePool(next);
    await g.sweep();
  }

  // After the label pass: the key moments deeper, both positions of each (its loss needs both).
  $effect(() => {
    if (!R || !game || deepened || game.labelled < moveCount) return;
    deepened = true;
    game.deepen([...new Set(R.keyMoments.flatMap(m => [m.index, m.index + 1]))].filter(i => i < moveCount));
  });

  /** The game to review: the imported one named in the address, or the sample. */
  async function chooseGame(): Promise<string[]> {
    const id = new URLSearchParams(location.search).get("game");
    if (!id) return SAMPLE_MOVES;
    const stored = await loadGame(id);
    if (!stored) throw new Error(`This browser has no game ${id}. Import it on the home page.`);
    players = playerNames(stored.record.tags);
    return stored.record.moves;
  }

  onMount(async () => {
    try {
      const moves = await chooseGame();
      moveCount = moves.length;
      manifest = await loadManifest();
      if (!manifest) throw new Error("no /engine/manifest.json: run `npm run engine` first");
      const first = pool = new EnginePool(engine.workers);
      network = engine.network;
      const g = new GameAnalysis(first, moves);
      g.setPaused(!engine.on);
      g.setDepth(engine.visits, engine.seconds);
      g.setReview(budget);
      game = g;
      try {
        await first.start(manifest, network, () => g.start()); // the rules first, then the sweep
      } catch (e) {
        if (pool === first) throw e; // else another network took over while this one loaded
        return;
      }
      if (!g.rulesReady || pool !== first) return; // the rules refused the game (the page shows why), or another pool took over
      await g.sweep();
    } catch (e) {
      error = errorText(e);
    }
  });
  onDestroy(() => pool?.terminate());
</script>

<svelte:head><title>Game review</title></svelte:head>

{#if error}
  <p class="{MESSAGE} text-blunder">{error}</p>
{:else if game?.error && !game.rulesReady}
  <p class="{MESSAGE} text-blunder">The engine could not read this game: {game.error}</p>
{:else if R}
  <ReviewView {R} {progress} problem={game?.error ?? ""} deepVisits={engine.visits} onposition={path => (current = path)}
              branches={game?.branches ?? {}} onplay={path => game!.addLine(path)} rulesAt={path => game!.rulesAt(path)}
              ondelete={path => game!.deleteFrom(path)} onpromote={path => game!.promote(path)}
              onjudge={path => game!.judge(path)} labelVisits={LABEL_VISITS} {engine} onengine={change => Object.assign(engine, change)}
              timedOut={!!game?.stoppedByTime(current)}
              searching={!!game && game.focusing === pathKey(current)}
              lineSteps={game ? (path, line) => game!.lineSteps(path, line) : undefined} />
{:else}
  <p class="{MESSAGE} text-muted">Reading the game with the engine's rules…</p>
{/if}
