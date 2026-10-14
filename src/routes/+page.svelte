<script lang="ts">
  // Home (design 22): what Hedge School is, and the way into each tab: the Review tab, to import a game and review it,
  // the Analysis board, and its board editor. In the full site, the daily puzzle and the next lesson too. Lichess's front page leads with
  // play. This site leads with review, its main job (design 01).
  import Board from "#lib/board/Board.svelte";
  import { review, PLAYER_NAME } from "#lib/review/model.ts";
  import { puzzlesFrom } from "#lib/puzzles/model.ts";
  import { COURSE } from "#lib/learn/lessons.ts";
  import { EARLY_ACCESS, SITE_NAME } from "#lib/edition.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import { SAMPLE } from "#lib/mock/sample.ts";

  const R = review(SAMPLE);
  const daily = puzzlesFrom(R)[0];
  const firstLesson = COURSE[0].lessons[0];

  const CARD = "grid gap-1.5 px-4 py-3.5 bg-panel border border-line rounded-lg text-ink no-underline hover:border-accent";
  const EYEBROW = "text-xs font-semibold uppercase tracking-[0.08em] text-muted";
</script>

<svelte:head><title>{SITE_NAME}</title></svelte:head>

<main class="box-content max-w-[1000px] mx-auto my-6 px-4 grid gap-5">
  <section class="px-1">
    <h1 class="mb-1 text-2xl font-bold text-balance">Get better at Enclosure</h1>
    <p class="max-w-160 text-muted">Bring your games, and see where they turned, which edges cost you, and what was better.
      The engine runs in your browser.</p>
  </section>

  <div class="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] items-start gap-3">
    <a class={CARD} href="/review">
      <span class={EYEBROW}>Review</span>
      <strong>Review a game</strong>
      <span class="text-sm text-muted">Import a game you played by its record, or load a review file, and the engine judges
        each move. Your games and your last review are there too.</span>
    </a>
    <a class={CARD} href="/analysis">
      <span class={EYEBROW}>Analysis</span>
      <strong>The Analysis board</strong>
      <span class="text-sm text-muted">Play any line from the start, import one, or load an analysis file, and the engine
        searches the position on screen. Ask for a move's quality when you want it.</span>
    </a>
    <a class={CARD} href="/editor">
      <span class={EYEBROW}>Board editor</span>
      <strong>Set up a position</strong>
      <span class="text-sm text-muted">Place each player's edges, and the engine checks that a game can reach the position.
        Then analyze it on the board.</span>
    </a>
  </div>

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
