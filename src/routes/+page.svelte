<script lang="ts">
  // Home: import a game, the player's games, and in the full site the daily puzzle and the next lesson. Lichess's front
  // page leads with play. This site leads with review, its main job (design 01). No sample game: a review opens on a
  // game the player brought (design 11).
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Board from "#lib/board/Board.svelte";
  import { review, PLAYER_NAME } from "#lib/review/model.ts";
  import { puzzlesFrom } from "#lib/puzzles/model.ts";
  import { COURSE } from "#lib/learn/lessons.ts";
  import { parseRecord, playerNames, RecordError, type GameRecord } from "#lib/game/record.ts";
  import { listGames, type StoredGame } from "#lib/game/store.ts";
  import { importRecord } from "#lib/game/import.ts";
  import { errorText } from "#lib/errors.ts";
  import { constellationRecord, isConstellation } from "#lib/game/constellation.ts";
  import { EARLY_ACCESS, SITE_NAME } from "#lib/edition.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import { SAMPLE } from "#lib/mock/sample.ts";

  const R = review(SAMPLE);
  const daily = puzzlesFrom(R)[0];
  const firstLesson = COURSE[0].lessons[0];

  let text = $state("");
  let problem = $state("");
  let checking = $state(false);
  let games = $state<{ game: StoredGame; record: GameRecord }[]>([]);
  onMount(async () => { games = await listGames(); });

  /** Where in the text: line and column, from the record reader's offset. */
  function where(offset: number) {
    const before = text.slice(0, offset).split("\n");
    return `line ${before.length}, column ${before.at(-1)!.length + 1}`;
  }

  async function importGame(event: SubmitEvent) {
    event.preventDefault();
    problem = "";
    let record: GameRecord, recordText = text;
    try {
      // Constellation's export becomes this site's record (constellation.ts), which is checked like any other.
      if (isConstellation(text)) recordText = constellationRecord(text);
      record = parseRecord(recordText);
    } catch (e) {
      problem = e instanceof RecordError && recordText === text ? `${e.message} (${where(e.offset)}).` : errorText(e);
      return;
    }
    checking = true;
    let id: string;
    try {
      id = await importRecord(recordText, record);
    } catch (e) {
      problem = errorText(e);
      return;
    } finally {
      checking = false;
    }
    await goto(`/review?game=${id}`);
  }

  const CARD = "grid gap-1.5 px-4 py-3.5 bg-panel border border-line rounded-lg text-ink no-underline hover:border-accent";
  const EYEBROW = "text-xs font-semibold uppercase tracking-[0.08em] text-muted";

  const title = (r: GameRecord) => { const p = playerNames(r.tags); return `${p.blue} against ${p.red}`; };
</script>

<svelte:head><title>{SITE_NAME}</title></svelte:head>

<main class="box-content max-w-[1000px] mx-auto my-6 px-4 grid gap-5">
  <section class="bg-panel border border-line rounded-lg px-5 py-5">
    <h1 class="mb-1 text-2xl font-bold text-balance">Review your Enclosure game</h1>
    <p class="mb-4 max-w-160 text-muted">See where the game turned, which edges cost you, and what was better. The engine runs in your browser.</p>
    <form onsubmit={importGame}>
      <label for="record" class="block mb-1 text-sm font-semibold">A game record</label>
      <textarea id="record" rows="4" bind:value={text} spellcheck="false"
                class="w-full px-2.5 py-2 font-mono text-sm/[1.4] bg-page text-ink border border-line rounded resize-y focus:outline-2 focus:outline-accent"
                placeholder={'[Blue "you"] [Red "them"]\n1. D10-G10 2. N11-Q10 L10-N11 3. D10-G9 G9-H10 …'}></textarea>
      {#if problem}<p class="mt-1.5 text-blunder" role="alert">{problem}</p>{/if}
      <div class="flex flex-wrap items-center gap-3 mt-2">
        <button class="btn-primary" type="submit" disabled={!text.trim() || checking}>{checking ? "Checking…" : "Review"}</button>
        <span class="flex-1 min-w-56 text-xs text-muted">In the engine's notation: turns as <code>1.</code> and <code>2.</code>, edges as
          <code>D10-G10</code>, a cut as <code>D10-G10x</code>, a timeout as <code>pass</code>. A plain list of edges works too.</span>
      </div>
      <p class="mt-2.5 text-xs text-muted">From meaf.us: use the <a href="/import">bookmarklet</a>, one click on a meaf.us game page.
        From Constellation: paste what the analysis board's <strong>Export</strong> gives.</p>
    </form>
  </section>

  {#if games.length}
    <section class="bg-panel border border-line rounded-lg px-5 py-5">
      <h2 class="mb-2 text-lg font-bold">Your games</h2>
      <ul class="grid gap-1.25 mb-1.5">
        {#each games as { game, record } (game.id)}
          <li class="flex flex-wrap items-baseline gap-2.5">
            <a href="/review?game={game.id}">{title(record)}</a>
            <span class="text-sm text-muted">{record.moves.length} edges{record.result && record.result !== "*" ? ` · ${record.result}` : ""} ·
              imported {new Date(game.added).toLocaleDateString()}</span>
          </li>
        {/each}
      </ul>
      <p class="text-sm text-muted">Kept in this browser only.</p>
    </section>
  {/if}

  {#if !EARLY_ACCESS}
  <div class="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] items-start gap-3">
    <a class={CARD} href="/puzzles">
      <span class={EYEBROW}>Daily puzzle</span>
      <div class="rounded overflow-hidden"><Board position={R.data.positions[daily.index]} layers={{ candidates: false, marks: false, coordinates: false }} /></div>
      <span class="text-sm text-muted">{PLAYER_NAME[daily.player]} to play. Find the only good edge.</span>
    </a>

    <a class={CARD} href="/learn">
      <span class={EYEBROW}>Learn</span>
      <strong>Start with “{firstLesson.title}”</strong>
      <span class="text-sm text-muted">{COURSE[0].title}: {COURSE[0].lessons.length} short lessons on the board.</span>
    </a>
  </div>
  {/if}
</main>

<SiteFooter />
