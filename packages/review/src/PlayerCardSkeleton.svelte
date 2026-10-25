<script lang="ts" module>
  /** A part of a skeleton (Nielsen Norman Group's skeleton screen): a grey bar where text or a picture will be. */
  export const BONE = "rounded bg-panel-2 motion-safe:animate-pulse";
</script>

<script lang="ts">
  // A player in a skeleton's row above the board (the review's, the Analysis board's, Practice's): the card's own layout
  // (PlayerCard), with bars as high as its text where the text is not known yet, so that the row has the card's height.
  // `second`: the word of the game's second number (Enclosure's "area"), when the card shows one.
  import Swatch from "@abstractclass/site/Swatch.svelte";
  import { NUMBER_DOT, playerBox, playerName, playerNumbers } from "./PlayerCard.svelte";
  import type { Player } from "@abstractclass/analysis/game.ts";

  let { player: p, name, tag = null, second }: { player: Player; name?: string; tag?: string | null; second?: string } = $props();
</script>

<div class={playerBox(p)}>
  <span class={playerName(p)}>
    <Swatch player={p} />
    {#if name}<span class="font-semibold truncate">{name}</span>
    {:else}<span class="font-semibold {BONE}"><span class="invisible">A player</span></span>{/if}
    {#if tag}<span class="text-xs text-muted">{tag}</span>{/if}
  </span>
  <span class={playerNumbers(p)}>
    <span class={BONE}><span class="invisible"><strong class="text-[1.1em]">0</strong> points</span></span>
    {#if second}
      <span class={[NUMBER_DOT, "invisible"]} aria-hidden="true">·</span>
      <span class={BONE}><span class="invisible"><strong class="text-[1.1em]">0</strong> {second}</span></span>
    {/if}
  </span>
</div>
