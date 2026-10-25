<script lang="ts">
  // The book's table in the review's view (@abstractclass/review/game.ts, the game's `book.Table`): the table
  // (BookTable.svelte) on the page's book place (place.svelte.ts), with the sentence of the book move pointed at or of
  // the best move under it. The view gives the engine's table (`candidates`), and the line on the last book position
  // outside the book (`outside`).
  import type { Snippet } from "svelte";
  import BookTable from "./BookTable.svelte";
  import type { BookPlace } from "./place.svelte.ts";
  import { bestMoveSentence, moveSentence } from "./sentences.ts";

  let { place, onplay, candidates, outside }:
    { place: BookPlace; onplay: (edges: string[]) => void; candidates: Snippet; outside: Snippet } = $props();
</script>

<BookTable at={place.at} source={place.book.source} rows={place.rows} bind:show={place.show} bind:values={place.values}
           bind:pointed={place.pointed} {onplay} onretry={() => place.book.retry()} {candidates} {outside}>
  {#snippet sentence(row, p)}
    <p class="text-sm">{row?.book ? moveSentence(p, row.book) : bestMoveSentence(p)}</p>
  {/snippet}
</BookTable>
