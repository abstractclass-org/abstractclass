<script lang="ts">
  // The review page: one game analysed in the browser (src/lib/analysis/game.svelte.ts). `?game=ID` opens a game the
  // player imported (src/lib/game/store.ts). Without it, the sample: a bot game from the engine repository's visit
  // ladder. The board works from the engine's rules at once. Then the sweep, the label pass, deeper searches where the
  // player looks, and the key moments deepened after the label pass (docs/design/05-review-analysis.md).
  import { onDestroy, onMount } from "svelte";
  import ReviewView from "#lib/review/ReviewView.svelte";
  import { review, type ReviewData } from "#lib/review/model.ts";
  import { EnginePool } from "#lib/analysis/pool.ts";
  import { GameAnalysis, SWEEP_VISITS, LABEL_VISITS, DEEP_VISITS } from "#lib/analysis/game.svelte.ts";
  import { edgeName, type Edge } from "#lib/engine/notation.ts";
  import type { Manifest } from "#lib/engine/client.ts";
  import { loadGame } from "#lib/game/store.ts";
  import sample from "#lib/mock/review.json";

  const MODEL = "b10c128-s46923648-d9407005";

  let pool: EnginePool | null = null;
  let game = $state<GameAnalysis | null>(null);
  let players = $state<ReviewData["players"]>(sample.players);
  let moveCount = $state(0);
  let error = $state("");
  let deepened = false;

  const data = $derived(game?.data(players) ?? null);
  const R = $derived(data ? review(data, "lead", LABEL_VISITS) : null);
  const note = $derived.by(() => {
    if (!game) return "starting the engine";
    if (game.error) return `engine error: ${game.error}`;
    if (!game.engineReady) return "loading the network";
    if (game.swept < moveCount) return `the game's shape: ${game.swept} of ${moveCount} positions at ${SWEEP_VISITS} visits`;
    if (game.labelled < moveCount) return `labels: ${game.labelled} of ${moveCount} positions at ${LABEL_VISITS} visits`;
    if (game.focusing !== null) return `searching this position deeper (${DEEP_VISITS} visits)`;
    return "";
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
    if (!id) return sample.moves.map(m => edgeName(m.edge as Edge));
    const stored = await loadGame(id);
    if (!stored) throw new Error(`This browser has no game ${id}. Import it on the home page.`);
    const t = stored.record.tags;
    players = { blue: t.Blue && t.Blue !== "?" ? t.Blue : "Blue", red: t.Red && t.Red !== "?" ? t.Red : "Red" };
    return stored.record.moves;
  }

  onMount(async () => {
    try {
      const moves = await chooseGame();
      moveCount = moves.length;
      const response = await fetch("/engine/manifest.json");
      if (!response.ok) throw new Error("no /engine/manifest.json: run `npm run engine` first");
      const manifest: Manifest = await response.json();
      const cores = navigator.hardwareConcurrency || 2;
      pool = new EnginePool(Math.max(1, Math.min(4, Math.floor(cores / 2))));
      const g = new GameAnalysis(pool, moves);
      game = g;
      await pool.start(manifest, MODEL, () => g.start());  // the rules first, then the sweep
      if (!g.rulesReady) return; // the rules refused the game: the page shows why
      await g.sweep();
    } catch (e) {
      error = String(e).replace(/^Error: /, "");
    }
  });
  onDestroy(() => pool?.terminate());
</script>

<svelte:head><title>Game review</title></svelte:head>

{#if error}
  <p class="message error">{error}</p>
{:else if game?.error && !game.rulesReady}
  <p class="message error">The engine could not read this game: {game.error.replace(/^Error: /, "")}</p>
{:else if R}
  <ReviewView {R} {note} onposition={i => game?.focus(i)} />
{:else}
  <p class="message">Reading the game with the engine's rules…</p>
{/if}

<style>
  .message { max-width: 1100px; margin: 2rem auto; padding: 0 1rem; color: var(--muted); }
  .error { color: var(--blunder); }
</style>
