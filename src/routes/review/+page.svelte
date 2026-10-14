<script lang="ts">
  // The review page: one game analysed in the browser (src/lib/analysis/game.svelte.ts). `#game=ID` opens a game the
  // player imported (src/lib/game/store.ts): after the `#`, which neither analytics service records (design 17). An
  // older address's `?game=ID` moves there. Without it, the page opens the last game reviewed in this browser, and
  // with none, asks for one: there is no sample game (design 11).
  // The board works from the engine's rules at once. Then the sweep, the label pass, deeper searches where the
  // player looks, and the key moments deepened after the label pass (docs/design/05-review-analysis.md). The engine's
  // settings (docs/design/09-engine-settings.md) apply as they change: the workers, the GPU and the network without a
  // reload. The GPU worker joins the pool once the network is loaded (docs/design/15-gpu.md). One tab reviews a game at
  // a time (src/lib/game/reviewLock.ts). A game that arrives after the `#` (a record, a shared review, a partner's:
  // the review's ways in, docs/design/22-site-map.md) is kept first, by Arrival, then reviewed. A game reviewed with an
  // earlier engine opens as that review, from the stored results with the engine's rules alone, until the player
  // chooses Review again (docs/design/20-snapshot.md).
  import { onDestroy, onMount, untrack } from "svelte";
  import ReviewView, { type ReviewAgain, type ReviewProgress } from "#lib/review/ReviewView.svelte";
  import Arrival from "#lib/review/Arrival.svelte";
  import ReviewHome from "#lib/review/ReviewHome.svelte";
  import { holdsGame } from "#lib/game/importHash.ts";
  import { snapshotSearch } from "#lib/analysis/cache.ts";
  import { review, type ReviewData } from "#lib/review/model.ts";
  import { EnginePool } from "#lib/analysis/pool.ts";
  import { GameAnalysis, LABEL_VISITS, SWEEP_VISITS, momentVisits } from "#lib/analysis/game.svelte.ts";
  import { NETWORKS, loadEngine, reviewVisits, saveEngine, withReview, type EngineSettings } from "#lib/analysis/engineSettings.ts";
  import { trackSettingChange } from "#lib/analysis/settingChanges.ts";
  import { GpuControl, gpuDownloadMB } from "#lib/analysis/gpu.svelte.ts";
  import { loadManifest, modelOf, sameSearch, type Manifest } from "#lib/engine/client.ts";
  import { errorText } from "#lib/errors.ts";
  import { gamePage, playerNames } from "#lib/game/record.ts";
  import type { GamePartner } from "#lib/game/partners.ts";
  import { loadGame, markReviewed, rememberReview, reviewAgainWhy, reviewCovers, reviewMark, setGameSettings, type GameSettings,
           type ReviewMark } from "#lib/game/store.ts";
  import { holdReview } from "#lib/game/reviewLock.ts";
  import { afterNavigate, replaceState } from "$app/navigation";
  import { track, trackOnce } from "#lib/analytics.svelte.ts";
  import { CORE_RANGES, EDGE_RANGES, MINUTE_RANGES, range } from "#lib/measure.ts";
  import { deliverExport, type ExportKind, type ExportResult } from "#lib/game/reviewFile.ts";
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
  // A review by an earlier engine shown as it was (design 20): its depth and its bar's text. Nothing is searched until
  // the player chooses Review again.
  let snapshot = $state<{ visits: number; text: string } | null>(null);
  let players = $state<ReviewData["players"]>({ blue: "Blue", red: "Red" });
  let kept: { id: string; text: string; record: GameRecord; partner?: GamePartner } | null = null; // the stored game, for its export
  // The partner site the game came from by its link (design 18), for the Export menu's "Save to …", and the game's own
  // page from its record's Site tag, for the report's link back.
  let partnerName = $state<string | null>(null);
  let siteLink = $state.raw<{ href: string; host: string } | null>(null);
  let moveCount = $state(0);
  // The positions the passes search: one before each move, and the end of an unfinished game (GameAnalysis.passCount).
  const passCount = $derived(game?.passCount ?? moveCount);
  let error = $state("");
  let current = $state<string[]>([]); // the position on screen: its path in the game's tree (review/tree.ts)
  const engine = $state(loadEngine());
  $effect(() => saveEngine($state.snapshot(engine)));
  // A game that keeps the settings it came with (an imported review file or a shared link, store.ts) reviews with its
  // own network and depth. The settings kept in the browser serve the other games, and the rest of them (the engine on
  // or off, the position on screen, the workers, the GPU) serve this one too. The engine settings show and change the
  // game's two.
  let own = $state<GameSettings | null>(null);
  const settings = $derived(own ? withReview(engine, own.network, own.visits) : engine);
  function changeEngine(change: Partial<EngineSettings>) {
    trackSettingChange(change, settings, !!own); // design 17
    const { network, review, customReview, ...rest } = change;
    if (own && kept && (network !== undefined || review !== undefined || customReview !== undefined)) {
      const next = { ...settings, ...change };
      own = { network: next.network, visits: reviewVisits(next) };
      void setGameSettings(kept.id, own);
      Object.assign(engine, rest);
      return;
    }
    Object.assign(engine, change);
  }

  // The label pass's budget. An edge gets its label from 256 visits on, at every depth: a label search shows its result
  // at 256 visits, then at its budget, and the label changes as it does when a deeper search replaces a shallow one
  // (design 05).
  const budget = $derived(reviewVisits(settings));
  const depth = $derived(snapshot?.visits ?? budget); // the depth of the review on screen
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
  // The game's positions with a result deeper than the review asked for (the review's depth, or the key moments'),
  // from the position on screen searched deeper where the player looked (design 09). The report says how many. The
  // depths step by doublings, so a deeper search has at least twice the visits.
  const deeperPositions = $derived.by(() => {
    if (!game) return 0;
    const moments = new Set(momentPositions);
    return game.analysis.filter((a, i) => !!a && a.visits >= 1.5 * (moments.has(i) ? momentVisits(depth) : depth)).length;
  });
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
    if (snapshot) return null;
    const n = Math.max(1, passCount), momentDepth = momentVisits(budget), deeper = momentDepth - budget;
    const m = momentPositions.length, deepDone = momentPositions.filter(i => (game?.analysis[i]?.visits ?? 0) >= momentDepth).length;
    const greats = game?.greatChecks ?? { total: 0, done: 0 };
    const total = (SWEEP_VISITS + budget) * n + deeper * m + budget * greats.total;
    const parts = [
      { share: (SWEEP_VISITS * n) / total, done: (game?.swept ?? 0) / n },
      { share: (budget * n) / total, done: (game?.labelled ?? 0) / n },
      ...(deeper * m ? [{ share: (deeper * m) / total, done: deepDone / m }] : []),
      ...(greats.total ? [{ share: (budget * greats.total) / total, done: greats.done / greats.total }] : []),
    ];
    const labelled = game?.labelled !== undefined && game.labelled >= passCount, deep = deepDone >= m;
    const step = !game || game.swept < passCount ? 0 : !labelled ? 1 : !deep && deeper * m ? 2 : parts.length - 1;
    if (!game?.engineReady) return { text: "Loading the engine's network…", parts, step };
    if (labelled && deep && greats.done >= greats.total) return null;
    if (game.paused) return { text: "Engine off. The review is paused.", parts, waiting: true, step };
    if (step === 0) return { text: `Reviewing: the game's shape, ${game.swept} of ${passCount} positions`, parts, step };
    if (step === 1) return { text: `Reviewing: move quality, ${game.labelled} of ${passCount} positions`, parts, step };
    if (!deep) return { text: `Reviewing: the key moments, deeper, ${deepDone} of ${m} positions`, parts, step };
    return { text: `Reviewing: confirming Great moves, ${greats.done} of ${greats.total}`, parts, step };
  });
  const rawStepDone = $derived(rawProgress ? rawProgress.parts[rawProgress.step]?.done ?? 1 : 0);
  // The review is done: every step of the bar, with the network loaded. The game keeps the mark of it (store.ts), so
  // that the home page can offer its export, and the Export menu opens (design 13).
  const reviewDone = $derived(!!game?.engineReady && !rawProgress);
  // The review's events (design 17): when it opens and when it ends, with what it ran with and how long it took. The
  // time counts from the review's start, or from a change of its network or depth, which starts it again. A review that
  // opened already done (its results in the store) sends no end.
  let markBefore: ReviewMark | undefined; // the game's mark when the page opened it
  let startedAt = 0, doneBefore = false;
  // A game reviewed before that is reviewed again because the site's engine or network changed (reviewAgainWhy): the
  // view says why under its progress, and in a dialog once in a visit for each game and engine (design 11).
  let again = $state<ReviewAgain | null>(null);
  // After Review again on a snapshot (`chosen`), the line alone: the player knows why.
  function againFor(why: "engine" | "network", want: { module: string }, chosen: boolean): ReviewAgain {
    const name = modelOf(manifest!, network)?.displayName ?? "The network";
    const key = `hedge-school:review-again:${kept!.id}:${want.module}`;
    let dialog = !chosen;
    if (dialog) try { dialog = !sessionStorage.getItem(key); sessionStorage.setItem(key, "1"); } catch { /* blocked storage: each time */ }
    return why === "engine"
      ? { title: "The engine was updated", dialog,
          text: "The engine was updated since this game's last review, so the game is reviewed again.",
          body: "This game's last review used an earlier version of the engine, so the game is reviewed again." }
      : { title: `${name} was updated`, dialog,
          text: `${name} was updated since this game's last review, so the game is reviewed again.`,
          body: `This game's last review used an earlier version of ${name}, so the game is reviewed again.` };
  }
  function reviewParams(): Record<string, string | number | boolean> {
    return {
      network: settings.network.split("-")[0], depth, depth_on_screen: engine.visits, time_limit: engine.seconds ?? 0,
      workers: engine.workers, gpu_mode: engine.gpu, cores: range(navigator.hardwareConcurrency || 1, CORE_RANGES),
      edges: range(moveCount, EDGE_RANGES), own_settings: !!own,
    };
  }
  $effect(() => {
    void budget; void settings.network;
    untrack(() => { if (startedAt) { startedAt = performance.now(); doneBefore = false; } });
  });
  $effect(() => {
    if (!reviewDone) return;
    untrack(() => {
      const mark = manifest && reviewMark(manifest, network, budget);
      if (kept && mark) void markReviewed(kept.id, mark);
      if (!kept || !startedAt || doneBefore) return;
      const seconds = (performance.now() - startedAt) / 1000, speed = pool?.workerSpeed;
      trackOnce(`${kept.id} done ${network} ${budget}`, "review_done", {
        ...reviewParams(), review_seconds: Math.round(seconds), minutes: range(seconds / 60, MINUTE_RANGES),
        gpu_used: gpu?.status.state === "on", ...(speed ? { worker_speed: 5 * Math.round(speed / 5) } : {}),
      });
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
    if (!g || snapshot) return;
    untrack(() => {
      g.setPaused(off);
      g.setDepth(visits, seconds);
      g.setReview(labels);
    });
  });
  $effect(() => {
    const workers = engine.workers;
    untrack(() => { if (!snapshot) pool?.resize(workers); }); // a snapshot's pool has the rules alone
  });
  $effect(() => {
    const id = settings.network;
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
    if (snapshot || !pool || !manifest || !g || id === network) return; // a snapshot: from Review again
    network = id;
    g.dropAnalysis();
    held = { step: -1, done: 0 };
    const next = new EnginePool(engine.workers);
    try {
      await next.start(manifest, id);
    } catch (e) {
      next.terminate();
      if (network === id) { error = errorText(e); track("engine_error", { error_kind: "load" }); }
      return;
    }
    if (network !== id) { next.terminate(); return; } // another network was chosen meanwhile
    next.releaseWhenIdle(); // an idle tab keeps no engine but the rules' (pool.ts, IDLE_RELEASE_MS)
    pool = next;
    g.usePool(next);
    controlGpu(next, id);
    await g.sweep();
  }

  // After the label pass: the key moments deeper (momentPositions), and again whenever they change (a label changed by
  // a deeper search, another review depth). The analysis skips a position already queued or done.
  $effect(() => {
    void momentKey;
    if (!R || !game?.engineReady || game.labelled < passCount) return;
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

  let noGame = $state(false); // the Review tab without a game: ReviewHome
  // Another game named after the `#` than the one the page shows, or a game named where it shows none (the Review tab's
  // list, an address typed, back and forward): the page reviews that one from the start. A change of the `#` alone is
  // the browser's own navigation, with no router's: it fires `hashchange`.
  // Only once the page has chosen what it shows (`shown`): before, the address's game is the one it loads.
  let shown: string | null | undefined; // the game shown, or null for the Review tab's page
  const otherGame = () => { if (!arriving && shown !== undefined && gameInAddress() !== shown) location.reload(); };
  afterNavigate(otherGame);
  onMount(() => {
    window.addEventListener("hashchange", otherGame);
    return () => window.removeEventListener("hashchange", otherGame);
  });
  /** The game the address names: after the `#`, or in an older address's query, which then moves after the `#` at
   *  once, before the analytics start. */
  function gameInAddress(): string | null {
    const named = new URLSearchParams(location.hash.slice(1)).get("game");
    if (named) return named;
    const old = new URLSearchParams(location.search).get("game");
    if (old) replaceState(`/review#game=${old}`, {});
    return old;
  }
  /** The game to review: the one named in the address. Null when there is none: the Review tab then shows its own page,
   *  with the last review a click away (design 22). */
  async function chooseGame(): Promise<string[] | null> {
    const id = gameInAddress();
    shown = id;
    if (!id) return null;
    const stored = await loadGame(id);
    if (!stored) {
      // A review's address opened in a browser that lacks its game (a review's address sent to someone): counted.
      track("game_missing");
      throw new Error(`This browser has no game ${id}. Import it in the Review tab.`);
    }
    rememberReview(id);
    kept = { id, text: stored.game.record, record: stored.record, partner: stored.game.partner };
    partnerName = stored.game.partner?.name ?? null;
    siteLink = gamePage(stored.record.tags);
    markBefore = stored.game.reviewed;
    const s = stored.game.settings;
    own = s && NETWORKS.some(n => n.id === s.network) ? s : null; // a network the site no longer ships: the browser's
    players = playerNames(stored.record.tags);
    return stored.record.moves;
  }

  // The game open in another tab: before this tab's review started ("open"), or after another tab took it ("taken"),
  // which stops the review here. "Review here" takes the game's lock, then loads the page again, which starts the
  // review with the lock held.
  let elsewhere = $state<"open" | "taken" | null>(null);
  let freeLock: (() => void) | null = null;
  async function reviewHere() {
    if (!kept) return;
    (await holdReview(kept.id, true, () => {}))?.();
    location.reload();
  }

  let arriving = $state(false); // the address holds a game to keep first (Arrival)
  onMount(async () => {
    if (holdsGame(location.hash)) { arriving = true; return; }
    try {
      const moves = await chooseGame();
      if (!moves) { noGame = true; return; }
      freeLock = await holdReview(kept!.id, false, () => {
        elsewhere = "taken";
        gpu?.end();
        pool?.terminate();
      });
      if (!freeLock) { elsewhere = "open"; return; }
      moveCount = moves.length;
      manifest = await loadManifest();
      if (!manifest) throw new Error("no /engine/manifest.json: run `npm run engine` first");
      const want = reviewMark(manifest, settings.network, budget);
      const why = reviewCovers(markBefore, want) ? null : reviewAgainWhy(markBefore, want);
      if (why && (await openSnapshot(moves, why))) return;
      await startReview(moves, false);
    } catch (e) {
      // A review stopped for another tab fails its searches: no error to show.
      if (!elsewhere) { error = errorText(e); if (kept) track("engine_error", { error_kind: "load" }); }
    }
  });

  /** Reviews the game with the site's engine: the rules first, then the sweep. `chosen`: the player chose Review again
   *  on a snapshot, whose pool ends once the new one has the rules, so that the board keeps working meanwhile. */
  async function startReview(moves: string[], chosen: boolean) {
    const before = pool, first = pool = new EnginePool(engine.workers);
    network = settings.network;
    const g = new GameAnalysis(first, moves);
    g.setPaused(!engine.on);
    g.setDepth(engine.visits, engine.seconds);
    g.setReview(budget);
    if (!chosen) game = g;
    try {
      await first.start(manifest!, network, async () => { await g.start(); game = g; before?.terminate(); });
    } catch (e) {
      before?.terminate();
      if (pool === first) throw e; // else another network took over while this one loaded
      return;
    }
    if (!g.rulesReady) { track("engine_error", { error_kind: "rules" }); return; } // the rules refused the game: the page shows why
    if (pool !== first) return; // another pool took over
    first.releaseWhenIdle(); // an idle tab keeps no engine but the rules' (pool.ts, IDLE_RELEASE_MS)
    controlGpu(first, network);
    const want = reviewMark(manifest!, network, budget);
    doneBefore = reviewCovers(markBefore, want);
    const why = doneBefore ? null : reviewAgainWhy(markBefore, want);
    again = why && want ? againFor(why, want, chosen) : null;
    startedAt = performance.now();
    if (!chosen) track("review_open", { ...reviewParams(), done_before: doneBefore }); // a snapshot counted the open
    await g.sweep();
  }

  /** Opens the game's last review, by an earlier engine or network file, as it was (design 20): the engine's rules
   *  alone, no network, and the stored results of the build that holds the game's line at the review's depth. The start
   *  is left out of that test: every game shares it. False, with nothing kept, when the store lacks them. */
  async function openSnapshot(moves: string[], why: "engine" | "network"): Promise<boolean> {
    const mark = markBefore!, rules = new EnginePool(0);
    network = settings.network;
    try {
      await rules.start(manifest!, network);
      const sameEngine = sameSearch(manifest!, mark.module); // a new file of the network alone
      const lines = Array.from({ length: Math.max(0, moves.length - 1) }, (_, i) => moves.slice(0, i + 1));
      const search = await snapshotSearch(mark.model, lines, mark.visits, sameEngine ? undefined : rules.search!);
      if (!search) { rules.terminate(); return false; }
      const g = new GameAnalysis(rules, moves);
      g.setReview(mark.visits);
      await g.start();
      if (!g.rulesReady) { rules.terminate(); return false; } // the review shows why
      await g.fromStore(search, mark.model);
      const date = new Date(mark.at).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" });
      const what = why === "engine" ? "the engine" : (modelOf(manifest!, network)?.displayName ?? "the network");
      snapshot = { visits: mark.visits, text: `Reviewed on ${date} with an earlier version of ${what}.` };
      pool = rules;
      game = g;
      track("review_open", { ...reviewParams(), done_before: true });
      trackOnce(`${kept!.id} snapshot opened`, "feature", { feature_name: "snapshot opened" });
      return true;
    } catch {
      rules.terminate();
      return false;
    }
  }
  /** Review again, on a snapshot: the game reviewed with the site's engine, as a new review. The board stays. */
  async function reviewAgain() {
    if (!snapshot || !kept) return;
    trackOnce(`${kept.id} review again`, "feature", { feature_name: "review again" });
    snapshot = null;
    try {
      await startReview(kept.record.moves, true);
    } catch (e) {
      if (!elsewhere) { error = errorText(e); track("engine_error", { error_kind: "load" }); }
    }
  }
  onDestroy(() => { gpu?.end(); pool?.terminate(); freeLock?.(); }); // a GPU worker that starts later then ends (GpuControl)

  /** The review exported (design 13): the review file, with the engine's results, or the annotated record, copied or as
   *  a file. The record's labels are the page's (by turn or by edge). */
  async function exportAs(kind: ExportKind, unit: Unit): Promise<ExportResult | void> {
    const k = kept;
    if (!k) return;
    return deliverExport(kind, k.id, k.text, manifest, SITE_VERSION, () => {
      if (!R) throw new Error("the review is not ready");
      return annotatedText(R, unit, k.record, game?.branches ?? {}, network);
    }, k.partner);
  }
</script>

<svelte:head>{#if !noGame}<title>Game review</title>{/if}</svelte:head> <!-- ReviewHome names its own page -->

{#if arriving}
  <Arrival />
{:else if noGame}
  <ReviewHome />
{:else if elsewhere}
  <div class={MESSAGE}>
    <p class="mb-3">{elsewhere === "taken" ? "This game is now open in another tab, so its review here stopped."
      : "This game is open in another tab."} A game is reviewed in one tab at a time, so that two tabs do not store over
      each other's branches.</p>
    <button class="btn-primary" type="button" onclick={reviewHere}>Review here</button>
  </div>
{:else if error}
  <p class="{MESSAGE} text-blunder">{error}</p>
{:else if game?.error && !game.rulesReady}
  <p class="{MESSAGE} text-blunder">The engine could not read this game: {game.error}</p>
{:else if R}
  <ReviewView {R} {progress} {deeperPositions} {again} snapshot={snapshot && { text: snapshot.text, onagain: reviewAgain }} partner={partnerName} {siteLink} onexport={exportAs} exportReady={reviewDone} problem={game?.error ?? ""} deepVisits={snapshot ? 0 : engine.visits} onposition={path => (current = path)}
              branches={game?.branches ?? {}} onplay={path => game!.addLine(path)} rulesAt={path => game!.rulesAt(path)}
              secondAt={path => game?.secondAt(path)} otherAt={(path, turn) => game?.otherAt(path, turn)}
              turnKeys={path => game?.turnKeys(path) ?? []} pendingAt={path => game?.pending(path) ?? false} reviewVisits={depth}
              ondelete={path => game!.deleteFrom(path)} onpromote={path => game!.promote(path)}
              onjudge={path => game!.judge(path)} labelVisits={LABEL_VISITS} engine={settings} onengine={changeEngine}
              ownSettings={!!own} onfeature={name => kept && trackOnce(`${kept.id} ${name}`, "feature", { feature_name: name })}
              gpu={{ status: gpu?.status ?? { state: "off" }, downloadMB: manifest ? gpuDownloadMB(manifest, settings.network) : "?" }}
              timedOut={!!game?.stoppedByTime(current)}
              searching={!!game && game.focusing === pathKey(current)}
              lineSteps={game ? (path, line) => game!.lineSteps(path, line) : undefined} />
{:else}
  <p class="{MESSAGE} text-muted">Reading the game with the engine's rules…</p>
{/if}
