<script lang="ts">
  // The review page: one game analysed in the browser (src/lib/analysis/game.svelte.ts). `?game=ID` opens a game the
  // player imported (src/lib/game/store.ts). Without it, the sample: a bot game from the engine repository's visit
  // ladder. The board works from the engine's rules at once. Then the sweep, the label pass, deeper searches where the
  // player looks, and the key moments deepened after the label pass (docs/design/05-review-analysis.md).
  import { onDestroy, onMount, untrack } from "svelte";
  import ReviewView, { type ReviewProgress } from "#lib/review/ReviewView.svelte";
  import { review, type ReviewData } from "#lib/review/model.ts";
  import { EnginePool, defaultPoolSize } from "#lib/analysis/pool.ts";
  import { GameAnalysis, SWEEP_VISITS, LABEL_VISITS, DEEP_VISITS } from "#lib/analysis/game.svelte.ts";
  import { loadManifest } from "#lib/engine/client.ts";
  import { errorText } from "#lib/errors.ts";
  import { playerNames } from "#lib/game/record.ts";
  import { loadGame } from "#lib/game/store.ts";
  import { pathKey } from "#lib/review/tree.ts";
  import { SAMPLE, SAMPLE_MOVES } from "#lib/mock/sample.ts";

  const MODEL = "b10c128-s46923648-d9407005";

  const MESSAGE = "box-content max-w-[1100px] mx-auto my-8 px-4";

  let pool: EnginePool | null = null;
  let game = $state<GameAnalysis | null>(null);
  let players = $state<ReviewData["players"]>(SAMPLE.players);
  let moveCount = $state(0);
  let error = $state("");
  let deepened = false;
  let current = $state<string[]>([]); // the position on screen: its path in the game's tree (review/tree.ts)

  const data = $derived(game?.data(players) ?? null);
  const R = $derived(data ? review(data, "lead", LABEL_VISITS) : null);
  // The review's two passes as one bar, each part as wide as its share of the visits, so the bar moves at an even pace.
  const progress = $derived.by((): ReviewProgress | null => {
    const n = Math.max(1, moveCount);
    const total = SWEEP_VISITS + LABEL_VISITS;
    const parts = [
      { share: SWEEP_VISITS / total, done: (game?.swept ?? 0) / n },
      { share: LABEL_VISITS / total, done: (game?.labelled ?? 0) / n },
    ];
    if (!game?.engineReady) return { text: "Loading the engine's network…", parts };
    if (game.swept < moveCount) return { text: `Reviewing: the game's shape, ${game.swept} of ${moveCount} positions`, parts };
    if (game.labelled < moveCount) return { text: `Reviewing: move quality, ${game.labelled} of ${moveCount} positions`, parts };
    return null;
  });

  // The position on screen is searched deeper once the network is loaded, and again when the player moves: on the
  // game's line or in a branch.
  $effect(() => {
    const g = game, path = current;
    if (g?.engineReady) untrack(() => g.focus(path));
  });

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
      const manifest = await loadManifest();
      if (!manifest) throw new Error("no /engine/manifest.json: run `npm run engine` first");
      pool = new EnginePool(defaultPoolSize());
      const g = new GameAnalysis(pool, moves);
      game = g;
      await pool.start(manifest, MODEL, () => g.start());  // the rules first, then the sweep
      if (!g.rulesReady) return; // the rules refused the game: the page shows why
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
  <ReviewView {R} {progress} problem={game?.error ?? ""} deepVisits={DEEP_VISITS} onposition={path => (current = path)}
              branches={game?.branches ?? {}} onplay={path => game!.addLine(path)} rulesAt={path => game!.rulesAt(path)}
              ondelete={path => game!.deleteFrom(path)} onpromote={path => game!.promote(path)}
              onjudge={path => game!.judge(path)} labelVisits={LABEL_VISITS}
              searching={!!game && game.focusing === pathKey(current)}
              lineSteps={game ? (path, line) => game!.lineSteps(path, line) : undefined} />
{:else}
  <p class="{MESSAGE} text-muted">Reading the game with the engine's rules…</p>
{/if}
