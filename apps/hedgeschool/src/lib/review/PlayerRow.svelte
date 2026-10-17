<script lang="ts">
  // The row above the board (design 06), in the review, on the Analysis board and in Practice: the players face each
  // other, Blue on the left and Red on the right, as they start, and between them a bar centred on the board. Each
  // player's column is as wide as the wider player: the other player's card is laid under each card, unseen, so that
  // the bar starts and ends at the same distance from the board's edges. With the gauge beside the board, no bar, and
  // each card takes its own width. The unseen card shrinks as the seen one does (min-w-0): a narrow row shortens the
  // names, and never runs out of the page (the layout sweep found it at 360 to 390 pixels).
  import type { Snippet } from "svelte";
  import { stripRow } from "./PlayerCard.svelte";

  let { gauge, label, blue, red, bar }:
    { gauge: boolean; label: string; blue: Snippet; red: Snippet; bar?: Snippet } = $props();
</script>

<div class={stripRow(gauge)} aria-label={label}>
  {#if gauge}
    {@render blue()}<div></div>{@render red()}
  {:else}
    <div class="grid justify-items-start min-w-0">
      <div class="col-start-1 row-start-1 min-w-0 max-w-full">{@render blue()}</div>
      <div class="col-start-1 row-start-1 min-w-0 overflow-hidden invisible" aria-hidden="true" inert>{@render red()}</div>
    </div>
    {#if bar}{@render bar()}{:else}<div></div>{/if}
    <div class="grid justify-items-end min-w-0">
      <div class="col-start-1 row-start-1 min-w-0 max-w-full">{@render red()}</div>
      <div class="col-start-1 row-start-1 min-w-0 overflow-hidden invisible" aria-hidden="true" inert>{@render blue()}</div>
    </div>
  {/if}
</div>
