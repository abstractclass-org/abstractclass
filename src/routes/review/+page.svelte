<script lang="ts">
  // The review page: one game analysed in the browser (src/lib/analysis/game.svelte.ts). `?game=ID` opens a game the
  // player imported (src/lib/game/store.ts). Without it, the page opens the last game reviewed in this browser, and
  // with none, asks for one: there is no sample game (design 11).
  // The board works from the engine's rules at once. Then the sweep, the label pass, deeper searches where the
  // player looks, and the key moments deepened after the label pass (docs/design/05-review-analysis.md). The engine's
  // settings (docs/design/09-engine-settings.md) apply as they change: the workers, the GPU and the network without a
  // reload. The GPU worker joins the pool once the network is loaded (docs/design/15-gpu.md).
  import { onDestroy, onMount, untrack } from "svelte";
  import ReviewView, { type ReviewProgress } from "#lib/review/ReviewView.svelte";
  import { review, type ReviewData } from "#lib/review/model.ts";
  import { EnginePool } from "#lib/analysis/pool.ts";
  import { DEEP_VISITS, GameAnalysis, LABEL_VISITS, SWEEP_VISITS } from "#lib/analysis/game.svelte.ts";
  import { loadEngine, reviewVisits, saveEngine } from "#lib/analysis/engineSettings.ts";
  import { GpuControl, gpuDownloadMB } from "#lib/analysis/gpu.svelte.ts";
  import { loadManifest, type Manifest } from "#lib/engine/client.ts";
  import { errorText } from "#lib/errors.ts";
  import { playerNames } from "#lib/game/record.ts";
  import { lastReview, loadGame, markReviewed, rememberReview, reviewMark } from "#lib/game/store.ts";
  import { replaceState } from "$app/navigation";
  import { deliverExport, type ExportKind } from "#lib/game/reviewFile.ts";
  import { annotatedText } from "#lib/review/exportText.ts";
  import type { Unit } from "#lib/review/model.ts";
  import type { GameRecord } from "#lib/game/record.ts";
  import { SITE_VERSION } from "#lib/edition.ts";
  import { pathKey } from "#lib/review/tree.ts";

  const MESSAGE = "box-content max-w-[1100px] mx-auto my-8 px-4";

  let pool: EnginePool | null = null;
  let manifest = $state.raw<Manifest | null>(null);
  let network = ""; // the network of the pool in use, or of the pool that loads to replace it
  let game = $state<GameAnalysis | null>(null);
  let players = $state<ReviewData["players"]>({ blue: "Blue", red: "Red" });
  let kept: { id: string; text: string; record: GameRecord } | null = null; // the stored game, for its export
  let moveCount = $state(0);
  let error = $state("");
  let current = $state<string[]>([]); // the position on screen: its path in the game's tree (review/tree.ts)
  const engine = $state(loadEngine());
  $effect(() => saveEngine($state.snapshot(engine)));

  // The label pass's budget. An edge gets its label from 256 visits on, at every depth: a label search shows its result
  // at 256 visits, then at its budget, and the label changes as it does when a deeper search replaces a shallow one
  // (design 05).
  const budget = $derived(reviewVisits(engine));
  const data = $derived(game?.data(players) ?? null);
  const R = $derived(data ? review(data, "lead", LABEL_VISITS) : null);
  // The key moments' positions, searched deeper after the label pass: every position of each, from its start to its end
  // (its loss needs both ends, and a turn's note gives its edges' losses too). The key moments by turn and by edge,
  // whichever the page shows: they are mostly the same positions. Before the label pass ends, the labels found so far
  // give them, so that the progress bar has their part from the start.
  const momentPositions = $derived.by(() => {
    if (!R) return [];
    const positions = [...R.keyMoments.turn, ...R.keyMoments.edge].flatMap(m => Array.from({ length: m.last - m.first + 2 }, (_, k) => m.first + k));
    return [...new Set(positions)].filter(i => i < moveCount).sort((a, b) => a - b);
  });
  const momentKey = $derived(momentPositions.join(" ")); // one string, so that a new array with the same positions is no change
  // The review's work as one bar, each part as wide as its share of the visits, so that the bar moves at an even pace:
  // the sweep, the label pass, the key moments searched deeper, and the Great's confirmations. The last two are counted
  // from what the analysis asks for so far: they grow as labels come, and each is done when its positions have the
  // searches, whoever ran them (after a change of the review's depth too). The bar shows the step that its line names:
  // the steps before are full, the later ones empty, though some of their work can end early, alongside (it shows when
  // their step comes). The step's own part never shows less than it has shown (held): a count that grows makes it wait
  // instead of going back. Another review depth, network or game starts it again.
  let held = $state({ step: -1, done: 0 });
  $effect(() => { void budget; void game; held = { step: -1, done: 0 }; });
  const rawProgress = $derived.by((): (ReviewProgress & { step: number }) | null => {
    const n = Math.max(1, moveCount), deeper = Math.max(0, DEEP_VISITS - budget);
    const m = momentPositions.length, deepDone = momentPositions.filter(i => (game?.analysis[i]?.visits ?? 0) >= DEEP_VISITS).length;
    const greats = game?.greatChecks ?? { total: 0, done: 0 };
    const total = (SWEEP_VISITS + budget) * n + deeper * m + budget * greats.total;
    const parts = [
      { share: (SWEEP_VISITS * n) / total, done: (game?.swept ?? 0) / n },
      { share: (budget * n) / total, done: (game?.labelled ?? 0) / n },
      ...(deeper * m ? [{ share: (deeper * m) / total, done: deepDone / m }] : []),
      ...(greats.total ? [{ share: (budget * greats.total) / total, done: greats.done / greats.total }] : []),
    ];
    const labelled = game?.labelled !== undefined && game.labelled >= moveCount, deep = deepDone >= m;
    const step = !game || game.swept < moveCount ? 0 : !labelled ? 1 : !deep && deeper * m ? 2 : parts.length - 1;
    if (!game?.engineReady) return { text: "Loading the engine's network…", parts, step };
    if (labelled && deep && greats.done >= greats.total) return null;
    if (game.paused) return { text: "Engine off. The review is paused.", parts, waiting: true, step };
    if (step === 0) return { text: `Reviewing: the game's shape, ${game.swept} of ${moveCount} positions`, parts, step };
    if (step === 1) return { text: `Reviewing: move quality, ${game.labelled} of ${moveCount} positions`, parts, step };
    if (!deep) return { text: `Reviewing: the key moments, deeper, ${deepDone} of ${m} positions`, parts, step };
    return { text: `Reviewing: confirming Great moves, ${greats.done} of ${greats.total}`, parts, step };
  });
  const rawStepDone = $derived(rawProgress ? rawProgress.parts[rawProgress.step]?.done ?? 1 : 0);
  // The review is done: every step of the bar, with the network loaded. The game keeps the mark of it (store.ts), so
  // that the home page can offer its export, and the Export menu opens (design 13).
  const reviewDone = $derived(!!game?.engineReady && !rawProgress);
  $effect(() => {
    if (!reviewDone) return;
    untrack(() => {
      const mark = manifest && reviewMark(manifest, network, budget);
      if (kept && mark) void markReviewed(kept.id, mark);
    });
  });
  $effect(() => {
    const step = rawProgress?.step ?? -1, done = rawStepDone, was = untrack(() => held);
    if (step !== was.step || done > was.done) held = { step, done };
  });
  const progress = $derived.by((): ReviewProgress | null => {
    if (!rawProgress) return null;
    const { step, ...shown } = rawProgress;
    const own = held.step === step ? Math.max(held.done, rawStepDone) : rawStepDone;
    return { ...shown, parts: shown.parts.map((p, k) => ({ share: p.share, done: k < step ? 1 : k === step ? own : 0 })) };
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
  $effect(() => {
    const mode = engine.gpu;
    untrack(() => { if (game?.engineReady) void gpu?.apply(mode); });
  });

  // The GPU worker (design 15), one control for each pool: Off, On, or Auto, which keeps the GPU where its first-use
  // test found it faster than a worker.
  let gpu = $state<GpuControl | null>(null);
  function controlGpu(p: EnginePool, id: string) {
    gpu?.end();
    gpu = manifest ? new GpuControl(p, manifest, id) : null;
    void gpu?.apply(engine.gpu);
  }

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
    held = { step: -1, done: 0 };
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
    controlGpu(next, id);
    await g.sweep();
  }

  // After the label pass: the key moments deeper (momentPositions), and again whenever they change (a label changed by
  // a deeper search, another review depth). The analysis skips a position already queued or done.
  $effect(() => {
    void momentKey;
    if (!R || !game?.engineReady || game.labelled < moveCount) return;
    untrack(() => game!.deepen(momentPositions));
  });

  // The Greats' confirmations (GameAnalysis.confirmGreats), looked for again as results come: a deeper search can change
  // a position's second choice.
  $effect(() => {
    const g = game;
    if (!g || !g.engineReady || g.paused) return;
    void [g.analysis, g.branches, g.labelVisits];
    untrack(() => g.confirmGreats());
  });

  let noGame = $state(false);
  /** The game to review: the imported one named in the address, else the last one reviewed here. Null when there is
   *  none. */
  async function chooseGame(): Promise<string[] | null> {
    const named = new URLSearchParams(location.search).get("game");
    const id = named ?? lastReview();
    if (!id) return null;
    const stored = await loadGame(id);
    if (!stored) {
      if (named) throw new Error(`This browser has no game ${id}. Import it on the home page.`);
      rememberReview(null); // the last game is gone (its site data was cleared)
      return null;
    }
    if (!named) replaceState(`?game=${id}`, {}); // the address names the game, so a reload keeps it
    rememberReview(id);
    kept = { id, text: stored.game.record, record: stored.record };
    players = playerNames(stored.record.tags);
    return stored.record.moves;
  }

  onMount(async () => {
    try {
      const moves = await chooseGame();
      if (!moves) { noGame = true; return; }
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
      controlGpu(first, network);
      await g.sweep();
    } catch (e) {
      error = errorText(e);
    }
  });
  onDestroy(() => { gpu?.end(); pool?.terminate(); }); // a GPU worker that starts later then ends (GpuControl)

  /** The review exported (design 13): the review file, with the engine's results, or the annotated record, copied or as
   *  a file. The record's labels are the page's (by turn or by edge). */
  async function exportAs(kind: ExportKind, unit: Unit) {
    const k = kept;
    if (!k) return;
    await deliverExport(kind, k.id, k.text, manifest, SITE_VERSION, () => {
      if (!R) throw new Error("the review is not ready");
      return annotatedText(R, unit, k.record, game?.branches ?? {}, network);
    });
  }
</script>

<svelte:head><title>Game review</title></svelte:head>

{#if noGame}
  <p class={MESSAGE}>No game to review yet. <a href="/">Bring one on the home page</a>: paste its record, or use the
    meaf.us bookmarklet.</p>
{:else if error}
  <p class="{MESSAGE} text-blunder">{error}</p>
{:else if game?.error && !game.rulesReady}
  <p class="{MESSAGE} text-blunder">The engine could not read this game: {game.error}</p>
{:else if R}
  <ReviewView {R} {progress} onexport={exportAs} exportReady={reviewDone} problem={game?.error ?? ""} deepVisits={engine.visits} onposition={path => (current = path)}
              branches={game?.branches ?? {}} onplay={path => game!.addLine(path)} rulesAt={path => game!.rulesAt(path)}
              secondAt={path => game?.secondAt(path)} otherAt={(path, turn) => game?.otherAt(path, turn)}
              turnKeys={path => game?.turnKeys(path) ?? []} pendingAt={path => game?.pending(path) ?? false} reviewVisits={budget}
              ondelete={path => game!.deleteFrom(path)} onpromote={path => game!.promote(path)}
              onjudge={path => game!.judge(path)} labelVisits={LABEL_VISITS} {engine} onengine={change => Object.assign(engine, change)}
              gpu={{ status: gpu?.status ?? { state: "off" }, downloadMB: manifest ? gpuDownloadMB(manifest, engine.network) : "?" }}
              timedOut={!!game?.stoppedByTime(current)}
              searching={!!game && game.focusing === pathKey(current)}
              lineSteps={game ? (path, line) => game!.lineSteps(path, line) : undefined} />
{:else}
  <p class="{MESSAGE} text-muted">Reading the game with the engine's rules…</p>
{/if}
