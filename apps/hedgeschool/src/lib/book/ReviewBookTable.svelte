<script lang="ts">
  // The book's table in the review's view (@abstractclass/review/game.ts, the game's `book.Table`): the table
  // (BookTable.svelte) on the page's book place (place.svelte.ts), with the sentence of the book move pointed at or of
  // the best move under it. The view gives the engine's table (`candidates`), and shows the table at a book position
  // only.
  import type { Snippet } from "svelte";
  import BookTable from "./BookTable.svelte";
  import type { BookPlace } from "./place.svelte.ts";
  import { bestMoveSentence, moveSentence } from "./sentences.ts";

  let { place, onplay, candidates }: { place: BookPlace; onplay: (edges: string[]) => void; candidates: Snippet } = $props();
</script>

<BookTable at={place.at} source={place.book.source} rows={place.rows} bind:show={place.show}
           bind:pointed={place.pointed} {onplay} onretry={() => place.book.retry()} {candidates}>
  {#snippet sentence(row, p)}
    <p class="text-sm">{row?.book ? moveSentence(p, row.book) : bestMoveSentence(p)}</p>
  {/snippet}
</BookTable>
