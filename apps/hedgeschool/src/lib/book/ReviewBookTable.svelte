<script lang="ts">
  // The book's table in the review's view (@abstractclass/review/game.ts, the game's `book.Table`): the table
  // (BookTable.svelte) on the page's book place (place.svelte.ts), with the sentence of the book move pointed at or of
  // the best move under it, or by turn of the turn. The view gives the engine's table (`candidates`), which shows alone
  // outside the book.
  import type { Snippet } from "svelte";
  import BookTable from "./BookTable.svelte";
  import type { BookPlace } from "./place.svelte.ts";
  import { bestMoveSentence, bestTurnSentence, moveSentence, turnSentence } from "./sentences.ts";

  let { place, onplay, candidates }: {
    place: BookPlace; onplay: (edges: string[], refutation: boolean) => void; candidates: Snippet;
  } = $props();
</script>

<BookTable at={place.at} source={place.book.source} rows={place.rows} byTurn={place.byTurn} bind:more={place.more}
           bind:show={place.show} bind:pointed={place.pointed} {onplay} onretry={() => place.book.retry()} {candidates}>
  {#snippet sentence(row, p)}
    <p class="text-sm">{place.byTurn ? (row ? turnSentence(p, place.rows, row) : bestTurnSentence(p, place.rows))
      : row?.book ? moveSentence(p, row.book) : bestMoveSentence(p)}</p>
  {/snippet}
</BookTable>
