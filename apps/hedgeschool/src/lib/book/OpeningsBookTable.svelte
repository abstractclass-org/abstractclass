<script lang="ts">
  // The book's table on Openings (design 32, item 5): the review's table (ReviewBookTable.svelte) with Openings' own
  // lines under its title row. At the start, the first view's box: the main line, one turn a line, each with its
  // sentence (sentences.ts, `mainLine`). At a position that other move orders reach across turns, "Also reached by"
  // with a link to each line (tree.ts, `alsoReached`).
  import type { Snippet } from "svelte";
  import BookTable from "./BookTable.svelte";
  import type { OpeningsPlace } from "./openings.svelte.ts";
  import { bestMoveSentence, bestTurnSentence, moveSentence, turnSentence } from "./sentences.ts";

  let { place, onplay, candidates }: {
    place: OpeningsPlace; onplay: (edges: string[], refutation: boolean) => void; candidates: Snippet;
  } = $props();
</script>

<BookTable at={place.at} source={place.book.source} rows={place.rows} byTurn={place.byTurn} bind:more={place.more}
           bind:show={place.show} bind:pointed={place.pointed} {onplay} onretry={() => place.book.retry()} {candidates}>
  {#snippet lead(p)}
    {#if !p.parents.length}
      <!-- The first view's box: one line to learn before the table. It shrinks and scrolls before the table goes. -->
      <section class="flex-[0_1_auto] min-h-16 mb-2 px-2.5 py-2 overflow-y-auto bg-panel-2/50 border border-line rounded-md text-sm"
               aria-labelledby="main-line-title">
        <h3 id="main-line-title" class="mb-1 font-semibold">The main line</h3>
        {#if place.turns}
          {#each place.turns as t (t.to)}<p class="mb-1 last:mb-0">{t.sentence}</p>{/each}
        {:else}<p class="text-muted">Loading the book…</p>{/if}
      </section>
    {/if}
    {#if place.also.length}
      <p class="flex-none mb-1.5 text-xs">Also reached by:
        {#each place.also as l, k (l.text)}{k ? ", " : ""}<button type="button" class="p-0 text-accent bg-transparent border-0 underline"
                                                                 onclick={() => place.go(l.to)}>{l.text}</button>{/each}
      </p>
    {/if}
  {/snippet}
  {#snippet sentence(row, p)}
    <p class="text-sm">{place.byTurn ? (row ? turnSentence(p, place.rows, row) : bestTurnSentence(p, place.rows))
      : row?.book ? moveSentence(p, row.book) : bestMoveSentence(p)}</p>
  {/snippet}
</BookTable>
