<script lang="ts">
  // The review page (Hedge School's designs 05 and 06, design 33): one game of Blueprints analysed in the browser by
  // Stamp Duty, on the CPU (@abstractclass/analysis), in the review's view with Blueprints' parts (blueprintsView.ts).
  // The board works from the engine's rules at once (describe_game), and the record's capture marks are checked
  // against what each move did. Then the sweep, the label stage, the Greats' confirmations, and deeper searches where
  // the player looks (Hedge School's design 05). The engine's settings apply as they change.
  //
  // Cyanotype has no list of games yet: this browser keeps each game that it reviews (its record) in the browser's
  // store of games (@abstractclass/storage/db.ts, STORES.games), under the game's id, and local storage names the game
  // in review. The analysis keeps a game's variations only while its game is in that store. A record that comes after
  // the `#` (`#record=`, from the import page or a link) becomes the game in review, and leaves the address at once, so
  // that a reload keeps the review. The engine's results are kept by position (@abstractclass/analysis/cache.ts), so a
  // review opened again shows them at once.
  import { onDestroy, onMount } from "svelte";
  import { replaceState } from "$app/navigation";
  import { MediaQuery } from "svelte/reactivity";
  import ReviewView, { WIDE, reviewSkeleton } from "@abstractclass/review/ReviewView.svelte";
  import { ReviewBar } from "@abstractclass/review/progress.svelte.ts";
  import { LABEL_VISITS, SWEEP_VISITS, warmCache } from "@abstractclass/analysis/cache.ts";
  import { GameAnalysis } from "@abstractclass/analysis/analysis.svelte.ts";
  import { review, type GameEnding } from "@abstractclass/analysis/model.ts";
  import { EngineSession } from "@abstractclass/analysis/session.svelte.ts";
  import { modelOf, moduleOf } from "@abstractclass/engine/client.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { readLocal, writeLocal } from "@abstractclass/storage/local.ts";
  import { STORES, dbGet, dbPut } from "@abstractclass/storage/db.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { blueprints, type Blueprints, type ReviewData } from "#lib/review/blueprints.ts";
  import { blueprintsView } from "#lib/review/blueprintsView.ts";
  import { loadDisplay } from "#lib/review/display.ts";
  import { loadEngine, reviewVisits, saveEngine, type EngineSettings } from "#lib/analysis/engineSettings.ts";
  import { checkCaptures } from "#lib/game/check.ts";
  import { gamePage, parseRecord, playerNames, type GameRecord } from "#lib/game/record.ts";
  import { REVIEW_GAME_KEY, SITE_NAME } from "#lib/site.ts";

  const MESSAGE = "box-content max-w-184 mx-auto my-8 px-4";

  let game = $state<GameAnalysis<Blueprints> | null>(null);
  let kept = $state.raw<{ id: string; record: GameRecord } | null>(null); // the game in review
  let none = $state(false); // this browser has no game to review
  let error = $state("");
  let current = $state<string[]>([]); // the position on screen: its path in the game's tree
  const engine = $state(loadEngine());
  $effect(() => saveEngine($state.snapshot(engine)));
  const session = new EngineSession({ settings: () => engine, game: () => game, position: () => current, releaseIdle: false,
                                      dropped: () => bar.reset() });
  const failure = $derived(error || session.error);

  const players = $derived<ReviewData["players"]>(kept ? playerNames(kept.record.tags) : { blue: "Blue", red: "Red" });
  const ending = $derived<GameEnding | undefined>(kept ? { result: kept.record.result ?? kept.record.tags.Result ?? null,
                                                           termination: kept.record.tags.Termination } : undefined);
  const siteLink = $derived(kept && gamePage(kept.record.tags));
  const budget = $derived(reviewVisits(engine)); // the label stage's
  const data = $derived(game?.data(players, ending) ?? null);
  // The review shows once the stored results are read, so that a review opened again shows them in its first frame.
  let preloaded = $state(false);
  const R = $derived(data && preloaded ? review(blueprints, data, "lead", LABEL_VISITS) : null);
  const deeperPositions = $derived(game ? game.analysis.filter(a => !!a && a.visits >= 1.5 * budget).length : 0);
  const bar = new ReviewBar({ game: () => game, moves: () => kept?.record.moves.length ?? 0, budget: () => budget });
  const wide = new MediaQuery(WIDE);

  /** A game as this browser keeps it: its record, and when it came. */
  interface KeptGame { record: string; added: string }
  /** A short name of a game's moves, its key in this browser's store: two games with the same moves are one game, and
   *  share their variations, as their positions share the engine's results. FNV-1a, 32 bits. */
  function gameId(moves: string[]): string {
    let h = 0x811c9dc5;
    for (const c of moves.join(" ")) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
    return `review-${moves.length}-${h.toString(16).padStart(8, "0")}`;
  }

  onMount(async () => {
    // A record after the `#` becomes the game in review, kept in this browser's store, and leaves the address.
    const sent = new URLSearchParams(location.hash.slice(1)).get("record");
    if (sent !== null) await replaceState("/review", {}); // async: the address changes only once it resolves
    try {
      let text = sent, id = readLocal(REVIEW_GAME_KEY);
      if (text !== null) {
        id = gameId(parseRecord(text).moves);
        await dbPut(STORES.games, id, { record: text, added: new Date().toISOString() } satisfies KeptGame);
        writeLocal(REVIEW_GAME_KEY, id);
      } else if (id) text = (await dbGet<KeptGame>(STORES.games, id))?.record ?? null;
      if (!text || !id) { none = true; return; }
      const record = parseRecord(text);
      const moves = record.moves;
      kept = { id, record };
      const manifest = await session.load();
      // The stored results, read while the engine starts: the review shows them in its first frame.
      const model = modelOf(manifest, engine.network)?.sha256, search = moduleOf(manifest)?.search;
      const warm = search && model
        ? warmCache(search, model, Array.from({ length: moves.length + 1 }, (_, i) => moves.slice(0, i)), SWEEP_VISITS).catch(() => {})
        : Promise.resolve();
      const g = await session.start(pool => new GameAnalysis(blueprints, pool, moves, kept!.id), async (g, pool) => {
        await g.start();
        // The record's capture marks, against what each move did (design 33, item 6)
        const problem = g.rulesReady
          ? checkCaptures(record, g.played.map(m => ({ captured: Object.keys(m.did.captured).length, points: m.did.points }))).problem
          : null;
        if (problem) { error = `${SITE_NAME} cannot review this game: ${problem}`; return; }
        await warm;
        if (g.rulesReady && pool.search && model) await g.fromStore(pool.search, model).catch(() => {});
        preloaded = true;
        game = g;
      });
      if (!g || error || !g.rulesReady) return; // the rules refused the game: the page shows why
      await g.sweep();
    } catch (e) {
      if (!session.ended) error = errorText(e);
    }
  });
  onDestroy(() => session.end());
</script>

<PageMeta title="{kept ? 'Game review' : 'Review a game'} · {SITE_NAME}" noindex={!!kept}
          description="Review your Blueprints game: Stamp Duty, the engine in your browser, judges each move, and shows where the game turned and what was better." />

{#if none}
  <!-- Text that a player follows: strict Simplified Technical English. -->
  <main class={MESSAGE}>
    <h1 class="mb-3 text-2xl font-bold">Review a game</h1>
    <p class="mb-2">This browser has no game to review.</p>
    <p class="mb-2">To review a game from strategyjam.org, use the <a href="/tools">tools</a>. They open the game on this site.</p>
    <p>To look at the moves of a record, use the <a href="/analysis">Analysis board</a>.</p>
  </main>
{:else if failure}
  <p class="{MESSAGE} text-blunder" role="alert">{failure}</p>
{:else if game?.error && !game.rulesReady}
  <p class="{MESSAGE} text-blunder" role="alert">The engine could not read this game: {game.error}</p>
{:else if R}
  <ReviewView view={blueprintsView} {R} progress={bar.progress} {deeperPositions} {siteLink} game={game ?? undefined}
              deepVisits={engine.visits} onposition={path => (current = path)} onplay={path => game!.addLine(path)}
              reviewVisits={budget} labelVisits={LABEL_VISITS} {engine}
              onengine={(change: Partial<EngineSettings>) => Object.assign(engine, change)} />
{:else if kept}
  {@render reviewSkeleton(blueprintsView, wide.current, loadDisplay().win === "gauge", players, false)}
{:else}
  <p class="{MESSAGE} text-muted">Reading the game with the engine's rules…</p>
{/if}
