<script lang="ts">
  // The review page: one game analysed in the browser (@abstractclass/analysis). `#game=ID` opens a game the
  // player imported (src/lib/game/store.ts): after the `#`, which neither analytics service records (design 17). An
  // older address's `?game=ID` moves there. Without it, the page opens the last game reviewed in this browser, and
  // with none, asks for one: there is no sample game (design 11).
  // The board works from the engine's rules at once. Then the sweep, the label stage, the Greats' confirmations, and
  // deeper searches where the player looks (docs/design/05-review-analysis.md). The engine's settings
  // (docs/design/09-engine-settings.md) apply as they change: the workers, the GPU and the network without a reload.
  // The GPU worker joins the pool once the network is loaded (docs/design/15-gpu.md). One tab reviews a game at
  // a time (src/lib/game/reviewLock.ts). A game that arrives after the `#` (a shared review, a partner's, a tool's from
  // before the import page: the review's ways in, docs/design/22-site-map.md) is kept first, by Arrival, then reviewed.
  // A record there, which only the import page takes, gets the Review tab. A game reviewed with an earlier engine opens
  // as that review, from the stored results with the engine's rules alone, until the player chooses Review again
  // (docs/design/20-snapshot.md).
  import { onDestroy, onMount, untrack } from "svelte";
  import { PRACTICE_EVENT } from "#lib/practice/practice.ts";
  import ReviewView, { NETWORK_LOADS, WIDE, reviewSkeleton, type ReviewAgain, type ReviewProgress } from "@abstractclass/review/ReviewView.svelte";
  import { enclosureView } from "#lib/review/enclosureView.ts";
  import { loadDisplay } from "#lib/review/display.ts";
  import ExportMenu from "#lib/ExportMenu.svelte";
  import { MediaQuery } from "svelte/reactivity";
  import Arrival from "#lib/review/Arrival.svelte";
  import ReviewHome from "#lib/review/ReviewHome.svelte";
  import { REVIEW_PAGE_SCRIPT, markReviewPage } from "#lib/review/pageMarks.ts";
  import { reviewArrives } from "#lib/game/importHash.ts";
  import { LABEL_VISITS, MAP_VISITS, SWEEP_VISITS, snapshotExcept, snapshotPositions, snapshotSearch, warmCache } from "@abstractclass/analysis/cache.ts";
  import { enclosure, review, type Enclosure, type GameEnding, type ReviewData } from "#lib/review/enclosure.ts";
  import { EnginePool } from "@abstractclass/engine/pool.ts";
  import { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
  import { EngineSession } from "@abstractclass/analysis/session.svelte.ts";
  import { changeOwn, loadEngine, networkName, offersNetwork, ownSettings, reviewVisits, saveEngine, withOwn,
           type EngineSettings, type OwnSettings } from "#lib/analysis/engineSettings.ts";
  import { trackSettingChange } from "#lib/analysis/settingChanges.ts";
  import { modelOf, moduleOf } from "@abstractclass/engine/client.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { gamePage, playerNames } from "#lib/game/record.ts";
  import type { GamePartner } from "#lib/game/partners.ts";
  import { loadGame, markReviewed, rememberReview, reviewAgainWhy, reviewCovers, reviewMark, setGameSettings,
           type ReviewMark } from "#lib/game/store.ts";
  import { holdReview } from "#lib/game/reviewLock.ts";
  import { afterNavigate, replaceState } from "$app/navigation";
  import { track, trackOnce } from "#lib/analytics.svelte.ts";
  import { CORE_RANGES, EDGE_RANGES, MINUTE_RANGES, range } from "#lib/measure.ts";
  import { deliverExport, reviewExports, type ExportKind, type ExportResult } from "#lib/game/reviewFile.ts";
  import { annotatedText } from "#lib/review/exportText.ts";
  import type { Unit } from "#lib/review/enclosure.ts";
  import type { GameRecord } from "#lib/game/record.ts";
  import { SITE_VERSION } from "#lib/edition.ts";
  import { readSession, writeSession } from "@abstractclass/storage/local.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";

  const MESSAGE = "box-content max-w-[1100px] mx-auto my-8 px-4";

  let game = $state<GameAnalysis<Enclosure> | null>(null);
  // A review by an earlier engine shown as it was (design 20): its depth and its bar's text. Nothing is searched until
  // the player chooses Review again.
  let snapshot = $state<{ visits: number; text: string } | null>(null);
  // The review snapshot's analysis, an earlier engine's results. It stays after Review again, which ends the review snapshot, until
  // the new review's analysis replaces it (rawProgress).
  let snapshotGame = $state.raw<GameAnalysis<Enclosure> | null>(null);
  let kept = $state.raw<{ id: string; text: string; record: GameRecord; partner?: GamePartner } | null>(null); // the stored game
  // A game's review is open: the page's title names it, else the Review tab's (design 23). The review's skeleton shows
  // from the game's read until the review does (ReviewView.svelte, reviewSkeleton). Before, the page shows its line of
  // text. The skeleton waits for the game, so that the players' names are in its first frame: names that came later
  // changed the cards' widths, and moved the row's parts (a layout shift).
  const gameOpen = $derived(!!kept);
  const players = $derived<ReviewData["players"]>(kept ? playerNames(kept.record.tags) : { blue: "Blue", red: "Red" });
  // How the record says the game ended (model.ts, endingText).
  const ending = $derived<GameEnding | undefined>(kept ? { result: kept.record.result ?? kept.record.tags.Result ?? null,
                                                            termination: kept.record.tags.Termination } : undefined);
  // The partner site the game came from by its link (design 18), for the Export menu's "Save to …", and the game's own
  // page from its record's Site tag, for the report's link back.
  const partnerName = $derived(kept?.partner?.name ?? null);
  const siteLink = $derived(kept && gamePage(kept.record.tags));
  const moveCount = $derived(kept?.record.moves.length ?? 0);
  // The positions the stages search: one before each move, and the end of an unfinished game (GameAnalysis.passCount).
  const passCount = $derived(game?.passCount ?? moveCount);
  let error = $state("");
  let current = $state<string[]>([]); // the position on screen: its path in the game's tree (the analysis's tree.ts)
  const engine = $state(loadEngine());
  $effect(() => saveEngine($state.snapshot(engine)));
  // A game that keeps the settings it came with (an imported review file or a shared link, store.ts) reviews with its
  // own network and depth. So does a game whose last review used a network that has left the menus (engineSettings.ts,
  // ownSettings, "mark"): its mark holds them, so a change of its depth lasts for the page alone, and a network of the
  // menu gives it the browser's settings. The settings kept in the browser serve the other games, and the rest of
  // them (the engine on or off, the position on screen, the workers, the GPU) serve this one too. The engine settings
  // show and change the game's two (engineSettings.ts, withOwn and changeOwn). Raw: the store cannot copy a proxy.
  let own = $state.raw<OwnSettings | null>(null);
  const settings = $derived(own ? withOwn(engine, own) : engine);
  // The engine and the GPU worker (session.svelte.ts). A review snapshot searches nothing: the settings wait for Review again.
  const session = new EngineSession({ settings: () => settings, game: () => game, position: () => current, frozen: () => !!snapshot,
                                      tracker: { track, networkName },
                                      dropped: () => (held = { step: -1, done: 0 }) });
  const failure = $derived(error || session.error);
  function changeEngine(change: Partial<EngineSettings>) {
    const { network, review, customReview, ...rest } = change;
    if (own?.from === "mark" && network !== undefined && offersNetwork(network)) own = null;
    trackSettingChange(change, settings, !!own); // design 17
    if (own && kept && (network !== undefined || review !== undefined || customReview !== undefined)) {
      own = changeOwn(own, engine, change);
      if (own.from === "stored") void setGameSettings(kept.id, own.settings);
      Object.assign(engine, rest);
      return;
    }
    Object.assign(engine, change);
  }

  // The label stage's budget. An edge gets its label from 256 visits on, at every depth: a label search shows its result
  // at 256 visits, then at its budget, and the label changes as it does when a deeper search replaces a shallow one
  // (design 05).
  const budget = $derived(reviewVisits(settings));
  const depth = $derived(snapshot?.visits ?? budget); // the depth of the review on screen
  const data = $derived(game?.data(players, ending) ?? null);
  // The review shows once the stored results are read (`preloaded`): a review opened again then shows its labels, notes
  // and report in its first frame, and nothing moves as they come (Cloudflare measured the page's layout shift).
  let preloaded = $state(false);
  const R = $derived(data && preloaded ? review(data, "lead", LABEL_VISITS) : null);
  // The game's positions with a result deeper than the review's depth: from the position on screen searched deeper
  // where the player looked (design 09), or from an older review, which searched some positions at twice its depth.
  // The report says how many. The depths step by doublings, so a deeper search has at least twice the visits.
  const deeperPositions = $derived(game ? game.analysis.filter(a => !!a && a.visits >= 1.5 * depth).length : 0);
  // The review's work as one bar, each part as wide as its share of the visits, so that the bar moves at an even pace:
  // the sweep, the label stage, and the Greats' confirmations. The last is counted from what the analysis asks for so
  // far: it grows as labels come, and it is done when its positions have the searches' results in the store, whoever
  // ran them (after a change of the review's depth too). The bar shows the step that its line names:
  // the steps before are full, the later ones empty, though some of their work can end early, alongside (it shows when
  // their step comes). The step's own part never shows less than it has shown (held): a count that grows makes it wait
  // instead of going back. Another review depth, network or game starts it again. After the review, while the area map
  // is on and the review's results lack maps, the map stage (design 30) is one more part, which never holds the review's
  // end: the review is done without it (reviewDone).
  let held = $state({ step: -1, done: 0 });
  $effect(() => { void budget; void game; held = { step: -1, done: 0 }; });
  const rawProgress = $derived.by((): (ReviewProgress & { step: number }) | null => {
    if (snapshot) return null;
    const n = Math.max(1, passCount);
    const greats = game?.greatChecks ?? { total: 0, done: 0 };
    const labelled = game?.labelled !== undefined && game.labelled >= passCount;
    // Every step has its results, from the searches or from the browser's store: the review is complete. A review opened
    // again is complete before the engine's network loads: its line says "Review done" at once, and its report's counts
    // are final, so they do not change their lines when the network comes (a layout shift). The review snapshot's analysis
    // holds an earlier engine's results: after Review again it stays on screen until the new review's analysis
    // replaces it.
    const complete = labelled && greats.done >= greats.total && game !== snapshotGame, maps = game?.mapPass;
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
  const rawStepDone = $derived(rawProgress ? rawProgress.parts[rawProgress.step]?.done ?? 1 : 0);
  // The review is done: every step of the bar. The game keeps the mark of it (store.ts), so that the home page can offer
  // its export, and the Export menu opens (design 13). Neither waits for the network: the export reads the store.
  const reviewDone = $derived(!snapshot && (!rawProgress || !!rawProgress.maps));
  // The review's events (design 17): when it opens and when it ends, with what it ran with and how long it took. The
  // time counts from the review's start, or from a change of its network or depth, which starts it again. A review that
  // opened already done (doneBefore: its mark covers it, or the store held every step's results) sends no end.
  let markBefore: ReviewMark | undefined; // the game's mark when the page opened it
  let startedAt = 0, doneBefore = false;
  // A game reviewed before that is reviewed again because the site's engine or network changed (reviewAgainWhy): the
  // view says why under its progress, and in a dialog once in a visit for each game and engine (design 11).
  let again = $state<ReviewAgain | null>(null);
  // After Review again on a review snapshot (`chosen`), the line alone: the player knows why.
  function againFor(why: "engine" | "network", want: { module: string }, chosen: boolean): ReviewAgain {
    const what = why === "engine" ? "the engine"
      : modelOf(session.manifest!, session.network)?.displayName ?? "the network";
    const key = `hedge-school:review-again:${kept!.id}:${want.module}`;
    let dialog = !chosen;
    if (dialog) { dialog = !readSession(key); writeSession(key, "1"); } // blocked storage: each time
    return { title: `A new version of ${what}`, dialog,
      text: `We updated ${what} after this game's last review, so the engine reviews the game again.`,
      body: `This game's last review used an earlier version of ${what}, so the engine reviews the game again.` };
  }
  function reviewParams(): Record<string, string | number | boolean> {
    return {
      network: networkName(settings.network), depth, depth_on_screen: engine.visits, time_limit: engine.seconds ?? 0,
      workers: engine.workers, gpu_mode: engine.gpu, cores: range(navigator.hardwareConcurrency || 1, CORE_RANGES),
      edges: range(moveCount, EDGE_RANGES), own_settings: !!own,
      practice_game: kept?.record.tags.Event === PRACTICE_EVENT, // a game against the bot (design 24)
    };
  }
  $effect(() => {
    void budget; void settings.network;
    untrack(() => { if (startedAt) { startedAt = performance.now(); doneBefore = false; } });
  });
  $effect(() => {
    if (!reviewDone) return;
    untrack(() => {
      const mark = session.manifest && reviewMark(session.manifest, session.network, budget);
      if (kept && mark) void markReviewed(kept.id, mark);
      if (!kept || !startedAt || doneBefore) return;
      const seconds = (performance.now() - startedAt) / 1000, speed = session.pool?.workerSpeed;
      trackOnce(`${kept.id} done ${session.network} ${budget}`, "review_done", {
        ...reviewParams(), review_seconds: Math.round(seconds), minutes: range(seconds / 60, MINUTE_RANGES),
        gpu_used: session.gpu?.status.state === "on", ...(speed ? { worker_speed: 5 * Math.round(speed / 5) } : {}),
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

  const wide = new MediaQuery(WIDE);
  // The game shown, or none (null or "") for the Review tab's page (ReviewHome). Undefined until the page has read its
  // address, as in the prerendered page: the page then holds both the Review tab and the line of text, and the marks
  // of the script in its head show one of them (pageMarks.ts). The script runs again here, for an address that a
  // navigation in the page opened.
  let shown = $state<string | null | undefined>(undefined);
  if (typeof document !== "undefined") markReviewPage();
  // Another game named after the `#` than the one the page shows, or a game named where it shows none (the Review tab's
  // list, an address typed, back and forward): the page reviews that one from the start. A change of the `#` alone is
  // the browser's own navigation, with no router's: it fires `hashchange`.
  // Only once the page has chosen what it shows (`shown`): before, the address's game is the one it loads.
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
  /** Reads the game to review, `id`, the one named in the address, and answers its moves. Throws when this browser
   *  lacks it. */
  async function readGame(id: string): Promise<string[]> {
    const stored = await loadGame(id);
    if (!stored) {
      // A review's address opened in a browser that lacks its game (a review's address sent to someone): counted.
      track("game_missing");
      throw new Error(`This browser has no game ${id}. Import it in the Review tab.`);
    }
    rememberReview(id);
    kept = { id, text: stored.game.record, record: stored.record, partner: stored.game.partner };
    markBefore = stored.game.reviewed;
    own = ownSettings(stored.game); // a network the site no longer ships: the browser's
    return stored.record.moves;
  }

  // The game open in another tab: before this tab's review started ("open"), or after another tab took it ("taken"),
  // which stops the review here. "Review here" takes the game's lock, then loads the page again, which starts the
  // review with the lock held.
  let elsewhere = $state<"open" | "taken" | null>(null);
  let lock: Promise<(() => void) | null> = Promise.resolve(null); // the game's lock (holdReview), once asked for
  async function reviewHere() {
    if (!kept) return;
    (await holdReview(kept.id, true, () => {}))?.();
    location.reload();
  }

  let arriving = $state(false); // the address holds a way in that the review takes first (Arrival)
  onMount(async () => {
    if (reviewArrives(location.hash)) { arriving = true; return; }
    // The game to review: the one named in the address. Without one, the Review tab shows its own page, with the last
    // review a click away (design 22).
    const id = gameInAddress();
    shown = id;
    if (!id) return; // the Review tab
    // The game, its lock and the engine's manifest are read at the same time. The rules worker needs only the
    // manifest: it starts once the manifest is read and the lock held, so a game open in another tab starts no
    // engine. The pool that takes it, the review's or a review snapshot's, waits for the game.
    lock = holdReview(id, false, () => {
      elsewhere = "taken";
      session.end();
    });
    const engine = Promise.all([session.load(), lock]).then(([manifest, free]) => {
      if (free) session.startRules(manifest);
      return manifest;
    });
    engine.catch(() => {}); // a missing game is said first
    try {
      const moves = await readGame(id);
      if (!(await lock)) { elsewhere = "open"; return; }
      const manifest = await engine;
      if (session.ended) return; // another tab took the game meanwhile, or the page closed
      const want = reviewMark(manifest, settings.network, budget);
      const why = reviewCovers(markBefore, want) ? null : reviewAgainWhy(markBefore, want);
      if (why && (await openSnapshot(moves, why))) return;
      await startReview(moves, false);
    } catch (e) {
      // A review stopped for another tab, or by the page's close, fails its searches: no error to show.
      if (!session.ended) { error = errorText(e); if (kept) track("engine_error", { error_kind: "load" }); }
      if (!kept) stop(); // a game this browser lacks: its lock free for the tab that imports it
    }
  });

  /** Reviews the game with the site's engine: the rules first, then the sweep. `chosen`: the player chose Review again
   *  on a review snapshot, whose pool ends once the new one has the rules, so that the board keeps working meanwhile. */
  async function startReview(moves: string[], chosen: boolean) {
    const manifest = session.manifest!;
    // The stored results, read while the engine starts: the review shows them in its first frame, and does not wait for
    // them after the rules (cache.ts, warmCache). The search is the manifest's, which scripts/fetch-engine.mjs checks
    // against the module's.
    const model = modelOf(manifest, settings.network)?.sha256, search = moduleOf(manifest)?.search;
    const warm = search && model ? warmCache(search, model, Array.from({ length: moves.length + 1 }, (_, i) => moves.slice(0, i)), SWEEP_VISITS).catch(() => {})
      : Promise.resolve();
    const g = await session.start(pool => new GameAnalysis(enclosure, pool, moves, kept!.id), async (g, pool) => {
      await g.start();
      performance.mark("review:rules"); // the start's steps, for measuring it (the browser's performance timeline)
      await warm;
      if (g.rulesReady && pool.search && model) await g.fromStore(pool.search, model).catch(() => {});
      preloaded = true;
      performance.mark("review:shown");
      game = g;
    });
    if (!g) return; // another pool took over
    if (!g.rulesReady) { track("engine_error", { error_kind: "rules" }); return; } // the rules refused the game: the page shows why
    const want = reviewMark(manifest, session.network, budget);
    doneBefore = reviewCovers(markBefore, want) || reviewDone; // done from the store: nothing has searched yet
    const why = doneBefore ? null : reviewAgainWhy(markBefore, want);
    again = why && want ? againFor(why, want, chosen) : null;
    startedAt = performance.now();
    if (!chosen) track("review_open", { ...reviewParams(), done_before: doneBefore }); // a review snapshot counted the open
    await g.sweep();
  }

  /** Opens the game's last review, by an earlier engine or network file, as it was (design 20): the engine's rules
   *  alone, no network, and the stored results of the mark's search, which hold the game's line at the review's depth
   *  (for an older mark, which names no search: the search that holds it). The start is left out of that test:
   *  every game shares it. False, with nothing kept, when the store lacks them. True, with nothing kept, when the
   *  session ended meanwhile (another tab took the game, or the page closed). */
  async function openSnapshot(moves: string[], why: "engine" | "network"): Promise<boolean> {
    const mark = markBefore!, manifest = session.manifest!, network = settings.network, rules = new EnginePool(0, session.takeRules());
    try {
      // The store is read while the rules worker starts: an earlier engine's search is not the site's.
      const started = rules.start(manifest, network).then(() => snapshotExcept(why, rules.search));
      const search = await snapshotSearch(mark.search, mark.model, snapshotPositions(moves), mark.visits, started);
      if (!search) { rules.terminate(); return false; }
      const g = new GameAnalysis(enclosure, rules, moves, kept!.id);
      g.setReview(mark.visits);
      await g.start();
      if (!g.rulesReady) { rules.terminate(); return false; } // the review shows why
      await g.fromStore(search, mark.model);
      g.freeze(search, mark.model); // its maps from the store alone
      if (session.ended) { rules.terminate(); return true; }
      const date = new Date(mark.at).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" });
      const what = why === "engine" ? "the engine" : (modelOf(manifest, network)?.displayName ?? "the network");
      snapshot = { visits: mark.visits, text: `Reviewed on ${date} with an earlier version of ${what}.` };
      session.pool = rules; // the rules alone, until Review again starts the engine (EngineSession.start)
      session.network = network;
      preloaded = true;
      game = snapshotGame = g;
      track("review_open", { ...reviewParams(), done_before: true });
      trackOnce(`${kept!.id} snapshot opened`, "feature", { feature_name: "snapshot opened" });
      return true;
    } catch {
      rules.terminate();
      return false;
    }
  }
  /** Review again, on a review snapshot: the game reviewed with the site's engine, as a new review. The board stays. */
  async function reviewAgain() {
    if (!snapshot || !kept) return;
    trackOnce(`${kept.id} review again`, "feature", { feature_name: "review again" });
    snapshot = null;
    try {
      await startReview(kept.record.moves, true);
    } catch (e) {
      if (!session.ended) { error = errorText(e); track("engine_error", { error_kind: "load" }); }
    }
  }
  /** Ends the engine and frees the game's lock, now or once it is held: the page closed, or this browser lacks the
   *  game. */
  function stop() {
    session.end();
    void lock.then(free => free?.());
  }
  onDestroy(stop);

  /** The review exported (design 13): the review file, with the engine's results, or the annotated record, copied or as
   *  a file. The record's labels are the page's (by turn or by edge). */
  async function exportAs(kind: ExportKind, unit: Unit): Promise<ExportResult | void> {
    const k = kept;
    if (!k) return;
    return deliverExport(kind, k.id, k.text, session.manifest, SITE_VERSION, () => {
      if (!R) throw new Error("the review is not ready");
      return annotatedText(R, unit, k.record, game?.branches ?? {}, session.network);
    }, k.partner);
  }
</script>

<svelte:head>{@html `<script>${REVIEW_PAGE_SCRIPT}</script>`}</svelte:head>
<!-- The prerendered page, which search engines read, is the Review tab: its address holds no game. -->
{#if gameOpen}<PageMeta title="Game review · Hedge School" />
{:else}<PageMeta title="Review a game · Hedge School"
                 description="Review your Enclosure game: the engine in your browser judges each move, and shows where the game turned and what was better. Import it from strategyjam.org, meaf.us or a record." />{/if}

{#if arriving}
  <Arrival />
{:else if !shown}
  {#if shown === undefined}<p class="{MESSAGE} text-muted hidden review-game:block">Reading the game with the engine's rules…</p>{/if}
  <div class={["contents", shown === undefined && "review-game:hidden"]}><ReviewHome chosen={shown !== undefined} /></div>
{:else if elsewhere}
  <div class={MESSAGE}>
    <p class="mb-3">{elsewhere === "taken" ? "This game is now open in another tab, so its review here stopped."
      : "This game is open in another tab."} Hedge School reviews a game in one tab at a time, so that two tabs do not
      store over each other's variations.</p>
    <button class="btn-primary" type="button" onclick={reviewHere}>Review here</button>
  </div>
{:else if failure}
  <p class="{MESSAGE} text-blunder">{failure}</p>
{:else if game?.error && !game.rulesReady}
  <p class="{MESSAGE} text-blunder">The engine could not read this game: {game.error}</p>
{:else if R}
  <ReviewView view={enclosureView} {R} {progress} {deeperPositions} {again} snapshot={snapshot && { text: snapshot.text, onagain: reviewAgain }} {siteLink}
              game={game ?? undefined}
              deepVisits={snapshot ? 0 : engine.visits} onposition={path => (current = path)} onplay={path => game!.addLine(path)}
              reviewVisits={depth} labelVisits={LABEL_VISITS} engine={settings} onengine={changeEngine} ownSettings={own?.from}
              onfeature={name => kept && trackOnce(`${kept.id} ${name}`, "feature", { feature_name: name })} gpu={session.gpuView}>
    {#snippet tools(unit)}
      <!-- Export (design 13): the review file, with the engine's results, or the annotated record, labelled by the
           view's unit. -->
      <ExportMenu icon run={kind => exportAs(kind, unit)} ready={reviewDone} items={reviewExports(partnerName)}
                  why={snapshot ? "Review again to export: this review used an earlier engine." : "Export once the review is done."} />
    {/snippet}
  </ReviewView>
{:else if gameOpen}
  {@render reviewSkeleton(enclosureView, wide.current, loadDisplay().win === "gauge", players, false)}
{:else}
  <p class="{MESSAGE} text-muted">Reading the game with the engine's rules…</p>
{/if}
