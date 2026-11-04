<script lang="ts">
  // The book's table in the review's view (@abstractclass/review/game.ts, the game's `book.Table`): the table
  // (BookTable.svelte) on the page's book place (place.svelte.ts), with the sentence of the book move pointed at or of
  // the best move under it, or by turn of the turn, and "Study in Openings" under the sentence where the site has
  // Openings. The view gives the engine's table (`candidates`), which shows alone outside the book. A page can add its
  // own lines under the title row (`lead`), as Openings does (OpeningsBookTable.svelte).
  import type { Snippet } from "svelte";
  import BookTable from "./BookTable.svelte";
  import type { BookPosition } from "./form.ts";
  import type { BookPlace } from "./place.svelte.ts";
  import { bestMoveSentence, bestTurnSentence, moveSentence, turnSentence } from "./sentences.ts";

  let { place, onplay, candidates, lead }: {
    place: BookPlace; onplay: (edges: string[], refutation: boolean) => void; candidates: Snippet;
    lead?: Snippet<[BookPosition]>;
  } = $props();
</script>

<BookTable at={place.at} source={place.book.source} rows={place.rows} byTurn={place.byTurn} bind:more={place.more}
           bind:show={place.show} bind:pointed={place.pointed} {onplay} onretry={() => place.book.retry()} {candidates} {lead}>
  {#snippet sentence(row, p)}
    <p class="text-sm">{place.byTurn ? (row ? turnSentence(p, place.rows, row) : bestTurnSentence(p, place.rows))
      : row?.book ? moveSentence(p, row.book) : bestMoveSentence(p)}</p>
  {/snippet}
  <!-- "Study in Openings" (design 32, items 2 and 8): the position on screen in Openings, where the site has it -->
  {#snippet footer()}
    {#if place.study}<p class="mt-1.5 text-sm"><a href={place.study}>Study in Openings</a></p>{/if}
  {/snippet}
</BookTable>
