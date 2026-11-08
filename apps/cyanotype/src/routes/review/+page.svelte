<script lang="ts">
  // The review page (Hedge School's designs 05 and 06, design 33): one game of Blueprints analysed in the browser by
  // Stamp Duty (@abstractclass/analysis), in the review's view with Blueprints' parts (blueprintsView.ts).
  // `#game=ID` opens a game kept in this browser (game/store.ts), as on Hedge School. Without it, the page is the Review
  // tab (ReviewHome.svelte): a pasted record, the last review a click away, and the player's games. One tab reviews a
  // game at a time (@abstractclass/analysis/reviewLock.ts). A shared review after the `#` (`#packed=`, game/share.ts)
  // leaves the address at once, and shows what it holds first (SharedArrival.svelte). A record there, which only the
  // import page takes, gets the Review tab, as on Hedge School: the import page keeps the game, then opens its review.
  // The board works from the engine's rules at once (describe_game), and the record's capture marks are checked
  // against what each move did. Then the sweep, the label stage, the Greats' confirmations, and deeper searches where
  // the player looks (Hedge School's design 05). The engine's settings apply as they change: the workers, the GPU and
  // the network. The GPU worker joins the pool once the network is loaded (Hedge School's design 15). A game that keeps
  // its own network and depth (a shared review's, Hedge School's design 09) reviews with them. The engine's results are
  // kept by position (@abstractclass/analysis/cache.ts), so a review opened again shows them at once. Once the review
  // is done, the game keeps its mark (game/store.ts), and its Export menu shares it by link (reviewExports.ts). The
  // page counts its events as Hedge School's review does (Hedge School's design 17): the review's open and end, the
  // engine's errors, the settings changed, the features used and the exports. The
  // analytics start once a game has left the address (holdsGame), else from the layout.
  import { onDestroy, onMount, untrack } from "svelte";
  import { afterNavigate, replaceState } from "$app/navigation";
  import { MediaQuery } from "svelte/reactivity";
  import ReviewView, { WIDE, reviewSkeleton, type ReviewAgain } from "@abstractclass/review/ReviewView.svelte";
  import { ReviewBar } from "@abstractclass/review/progress.svelte.ts";
  import type { ExportKind, ExportResult } from "@abstractclass/review/exports.ts";
  import { LABEL_VISITS, SWEEP_VISITS, lineKeyMoves, warmCache } from "@abstractclass/analysis/cache.ts";
  import { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
  import { review, type GameEnding } from "@abstractclass/analysis/model.ts";
  import { EngineSession } from "@abstractclass/analysis/session.svelte.ts";
  import { holdReview } from "@abstractclass/analysis/reviewLock.ts";
  import { modelOf, moduleOf, type Manifest } from "@abstractclass/engine/client.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { readSession, writeSession } from "@abstractclass/storage/local.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import ExportMenu from "@abstractclass/review/ExportMenu.svelte";
  import { blueprints, type Blueprints, type ReviewData } from "#lib/review/blueprints.ts";
  import { blueprintsView } from "#lib/review/blueprintsView.ts";
  import { loadDisplay } from "#lib/review/display.ts";
  import { changeOwn, loadEngine, networkName, offersNetwork, ownSettings, reviewVisits, saveEngine, withOwn,
           type EngineSettings, type OwnSettings } from "#lib/analysis/engineSettings.ts";
  import { trackSettingChange } from "#lib/analysis/settingChanges.ts";
  import { startAnalytics, track, trackOnce } from "#lib/analytics.svelte.ts";
  import { trackExport } from "#lib/game/sources.ts";
  import { CORE_RANGES, EDGE_RANGES, MINUTE_RANGES, range } from "@abstractclass/site/measure.ts";
  import { startChecked } from "#lib/review/storedReview.ts";
  import { gamePage, playerNames, type GameRecord } from "#lib/game/record.ts";
  import { loadGame, markReviewed, rememberReview, reviewAgainWhy, reviewCovers, reviewMark, setGameSettings,
           type ReviewMark } from "#lib/game/store.ts";
  import { SITE_NAME } from "#lib/site.ts";
  import { REVIEW_EXPORTS, deliverExport } from "#lib/review/reviewExports.ts";
  import SharedArrival from "#lib/review/SharedArrival.svelte";
  import ReviewHome from "#lib/review/ReviewHome.svelte";

  const MESSAGE = "box-content max-w-184 mx-auto my-8 px-4";

  let game = $state<GameAnalysis<Blueprints> | null>(null);
  let kept = $state.raw<{ id: string; record: GameRecord } | null>(null); // the game in review
  let packed = $state<string | null>(null); // a shared review's link, which the page shows first
  let error = $state("");
  let current = $state<string[]>([]); // the position on screen: its path in the game's tree
  const engine = $state(loadEngine());
  $effect(() => saveEngine($state.snapshot(engine)));
  // A game that keeps the settings it came with (a shared review's, game/import.ts) reviews with its own network and
  // depth. So does a game whose last review used a network that has left the menus (engineSettings.ts, ownSettings,
  // "mark"): its mark holds them, so a change of its depth lasts for the page alone, and a network of the menu gives it
  // the browser's settings. The settings kept in the browser serve the other games, and the rest of them (the engine on
  // or off, the position on screen, the workers) serve this one too. The engine settings show and change the game's two
  // (withOwn and changeOwn). Raw: the store cannot copy a proxy.
  let own = $state.raw<OwnSettings | null>(null);
  const settings = $derived(own ? withOwn(engine, own) : engine);
  const session = new EngineSession({ settings: () => settings, game: () => game, position: () => current,
                                      tracker: { track, networkName }, dropped: () => bar.reset() });
  const failure = $derived(error || session.error);
  function changeEngine(change: Partial<EngineSettings>) {
    const { network, review, customReview, ...rest } = change;
    if (own?.from === "mark" && network !== undefined && offersNetwork(network)) own = null;
    trackSettingChange(change, settings, !!own); // Hedge School's design 17
    if (own && kept && (network !== undefined || review !== undefined || customReview !== undefined)) {
      own = changeOwn(own, engine, change);
      if (own.from === "stored") void setGameSettings(kept.id, own.settings);
      Object.assign(engine, rest);
      return;
    }
    Object.assign(engine, change);
  }

  const players = $derived<ReviewData["players"]>(kept ? playerNames(kept.record.tags) : { blue: "Blue", red: "Red" });
  const ending = $derived<GameEnding | undefined>(kept ? { result: kept.record.result ?? kept.record.tags.Result ?? null,
                                                           termination: kept.record.tags.Termination } : undefined);
  const siteLink = $derived(kept && gamePage(kept.record.tags));
  const budget = $derived(reviewVisits(settings)); // the label stage's
  const data = $derived(game?.data(players, ending) ?? null);
  // The review shows once the stored results are read, so that a review opened again shows them in its first frame.
  let preloaded = $state(false);
  const R = $derived(data && preloaded ? review(blueprints, data, "lead", LABEL_VISITS) : null);
  const deeperPositions = $derived(game ? game.analysis.filter(a => !!a && a.visits >= 1.5 * budget).length : 0);
  const bar = new ReviewBar({ game: () => game, moves: () => kept?.record.moves.length ?? 0, budget: () => budget });
  // The review's events (Hedge School's design 17): when it opens and when it ends, with what it ran with and how long
  // it took. The time counts from the review's start, or from a change of its network or depth, which starts it again.
  // A review that opened already done (doneBefore: its mark covers it, or the store held every step's results) sends
  // no end.
  let startedAt = 0, doneBefore = false;
  function reviewParams(): Record<string, string | number | boolean> {
    return {
      network: networkName(settings.network), depth: budget, depth_on_screen: engine.visits, time_limit: engine.seconds ?? 0,
      workers: engine.workers, gpu_mode: engine.gpu, cores: range(navigator.hardwareConcurrency || 1, CORE_RANGES),
      edges: range(kept?.record.moves.length ?? 0, EDGE_RANGES), own_settings: !!own,
      practice_game: false, // Cyanotype keeps no practice game in the player's games yet (abscls-8tl1.50)
    };
  }
  $effect(() => {
    void budget; void settings.network;
    untrack(() => { if (startedAt) { startedAt = performance.now(); doneBefore = false; } });
  });
  // The review is done (bar.done): every step of the bar. The game keeps the mark of it (store.ts), so that the Review
  // tab can offer its export, and the Export menu opens (Hedge School's design 13). The export reads the mark from the
  // store.
  $effect(() => {
    if (!bar.done) return;
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
  const wide = new MediaQuery(WIDE);

  let markBefore: ReviewMark | undefined; // the game's mark when the page opened it
  // A game reviewed before that is reviewed again because the site's engine or network changed (reviewAgainWhy): the
  // view says why under its progress, and in a dialog once in a visit for each game and engine (Hedge School's design
  // 11). Cyanotype keeps no review snapshot yet (abscls-8tl1.35), so the review runs again at once.
  let again = $state<ReviewAgain | null>(null);
  function againFor(why: "engine" | "network", want: { module: string }): ReviewAgain {
    const what = why === "engine" ? "the engine" : modelOf(session.manifest!, session.network)?.displayName ?? "the network";
    const key = `cyanotype:review-again:${kept!.id}:${want.module}`;
    const dialog = !readSession(key); // blocked storage: each time
    writeSession(key, "1");
    return { title: `A new version of ${what}`, dialog,
      text: `We updated ${what} after this game's last review, so the engine reviews the game again.`,
      body: `This game's last review used an earlier version of ${what}, so the engine reviews the game again.` };
  }

  // The game shown, or none (null) for the Review tab. Undefined until the page has read its address.
  let shown = $state<string | null | undefined>(undefined);
  // Another game named after the `#` than the one the page shows, or a game named where it shows none (the Review tab's
  // paste, an address typed, back and forward): the page reviews that one from the start. So does a shared review
  // after the `#`, as a link pasted in the address bar over the Review tab brings it. A change of the `#` alone is the
  // browser's own navigation, with no router's: it fires `hashchange`. Only once the page has chosen what it shows
  // (`shown`): before, the address's game is the one it loads.
  const addressHash = () => new URLSearchParams(location.hash.slice(1));
  const otherGame = () => {
    if (shown === undefined) return;
    const hash = addressHash();
    if (hash.get("game") !== shown || hash.has("packed")) location.reload();
  };
  afterNavigate(otherGame);
  onMount(() => {
    window.addEventListener("hashchange", otherGame);
    return () => window.removeEventListener("hashchange", otherGame);
  });

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

  onMount(async () => {
    const hash = addressHash(), link = hash.get("packed");
    // A shared review. The analytics start once the game has left the address (async: it changes once it resolves).
    if (link !== null) { await replaceState("/review", {}); startAnalytics(); packed = link; return; }
    // The game to review: the one named in the address. Without one, the Review tab.
    const id = hash.get("game");
    shown = id;
    if (!id) return;
    // The game, its lock and the engine's manifest are read at the same time. The rules worker needs only the
    // manifest: it starts once the manifest is read and the lock held, so a game open in another tab starts no engine.
    lock = holdReview(id, false, () => {
      elsewhere = "taken";
      session.end();
    });
    const engineReady = Promise.all([session.load(), lock]).then(([manifest, free]) => {
      if (free) session.startRules(manifest);
      return manifest;
    });
    engineReady.catch(() => {}); // a missing game is said first
    try {
      const record = await readGame(id);
      if (!(await lock)) { elsewhere = "open"; return; }
      const manifest = await engineReady;
      if (session.ended) return; // another tab took the game meanwhile, or the page closed
      await startReview(record, manifest);
    } catch (e) {
      // A review stopped for another tab, or by the page's close, fails its searches: no error to show.
      if (!session.ended) { error = errorText(e); if (kept) track("engine_error", { error_kind: "load" }); }
      if (!kept) stop(); // a game this browser lacks: its lock free for the tab that imports it
    }
  });

  /** Reads the game to review, `id`, the one named in the address, and answers its record. Throws when this browser
   *  lacks it. */
  async function readGame(id: string): Promise<GameRecord> {
    const stored = await loadGame(id);
    if (!stored) {
      // A review's address opened in a browser that lacks its game (a review's address sent to someone): counted.
      track("game_missing");
      throw new Error(`This browser has no game ${id}.`);
    }
    rememberReview(id);
    kept = { id, record: stored.record };
    markBefore = stored.game.reviewed;
    own = ownSettings(stored.game); // a network that the site no longer ships: the browser's
    return stored.record;
  }

  /** Reviews the game with the site's engine: the rules, the record's capture marks, then the sweep. */
  async function startReview(record: GameRecord, manifest: Manifest) {
    // The stored results, read while the engine starts: the review shows them in its first frame. The record's komi:
    // the searches ask at it, and its results' keys name it.
    const moves = record.moves, komi = record.komi;
    const model = modelOf(manifest, settings.network)?.sha256, search = moduleOf(manifest)?.search;
    const warm = search && model
      ? warmCache(search, model, lineKeyMoves(moves, komi), SWEEP_VISITS).catch(() => {})
      : Promise.resolve();
    const g = await session.start(pool => new GameAnalysis(blueprints, pool, moves, kept!.id, null, { komi }), async (g, pool) => {
      // The rules, then the record's capture marks (storedReview.ts, whose steps the label snapshot takes too)
      const problem = await startChecked(g, record, budget);
      if (problem) { error = `${SITE_NAME} cannot review this game: ${problem}`; return; }
      await warm;
      if (g.rulesReady && pool.search && model) await g.fromStore(pool.search, model).catch(() => {});
      preloaded = true;
      game = g;
    });
    if (!g) return; // another pool took over
    // The rules, or the record's capture marks, refused the game: the page shows why
    if (error || !g.rulesReady) { track("engine_error", { error_kind: "rules" }); return; }
    const want = reviewMark(manifest, session.network, budget);
    doneBefore = reviewCovers(markBefore, want) || bar.done; // done from the store: nothing has searched yet
    const why = doneBefore ? null : reviewAgainWhy(markBefore, want);
    again = why && want ? againFor(why, want) : null;
    startedAt = performance.now();
    track("review_open", { ...reviewParams(), done_before: doneBefore });
    await g.sweep();
  }

  /** Ends the engine and frees the game's lock, now or once it is held: the page closed, or this browser lacks the
   *  game. */
  function stop() {
    session.end();
    void lock.then(free => free?.());
  }
  onDestroy(stop);

  /** The review exported (reviewExports.ts): its link, with what the game's mark names. */
  async function exportAs(kind: ExportKind): Promise<ExportResult | void> {
    if (!kept) throw new Error("no game is open");
    return deliverExport(kind, kept.id);
  }
</script>

<PageMeta title="{kept ? 'Game review' : 'Review a game'} · {SITE_NAME}" noindex={!!kept}
          description="Review your Blueprints game: Stamp Duty, the engine in your browser, judges each move, and shows where the game turned and what was better." />

{#if packed !== null}
  <SharedArrival {packed} class={MESSAGE} />
{:else if elsewhere}
  <!-- Text that a player follows: strict Simplified Technical English. -->
  <div class={MESSAGE}>
    <p class="mb-3">{elsewhere === "taken" ? "This game is now open in another tab, so its review here stopped."
      : "This game is open in another tab."} {SITE_NAME} reviews a game in one tab at a time, so that two tabs do not
      store over each other's variations.</p>
    <button class="btn-primary" type="button" onclick={reviewHere}>Review here</button>
  </div>
{:else if failure}
  <div class={MESSAGE}>
    <p class="text-blunder" role="alert">{failure}</p>
    {#if !kept}<p class="mt-2">You can paste a game record in the <a href="/review" data-sveltekit-reload>Review tab</a>.</p>{/if}
  </div>
{:else if shown === null}
  <ReviewHome />
{:else if game?.error && !game.rulesReady}
  <p class="{MESSAGE} text-blunder" role="alert">The engine could not read this game: {game.error}</p>
{:else if R}
  <ReviewView view={blueprintsView} {R} progress={bar.progress} {deeperPositions} {again} {siteLink} game={game ?? undefined}
              deepVisits={engine.visits} onposition={path => (current = path)} onplay={path => game!.addLine(path)}
              reviewVisits={budget} labelVisits={LABEL_VISITS} engine={settings} onengine={changeEngine}
              onfeature={name => kept && trackOnce(`${kept.id} ${name}`, "feature", { feature_name: name })}
              ownSettings={own?.from} gpu={session.gpuView}>
    {#snippet tools()}
      <!-- Export (Hedge School's design 13): once the review is done, a link that shares it. -->
      <ExportMenu icon run={exportAs} items={REVIEW_EXPORTS} ready={bar.done} why="Export once the review is done."
                  ontrack={trackExport} />
    {/snippet}
  </ReviewView>
{:else if kept}
  {@render reviewSkeleton(blueprintsView, wide.current, loadDisplay().win === "gauge", players, false)}
{:else}
  <p class="{MESSAGE} text-muted">Reading the game with the engine's rules…</p>
{/if}
